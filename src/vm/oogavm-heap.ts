import debug from 'debug';
import { HeapOutOfMemoryError, OogaError } from './oogavm-errors.js';

const log = debug('ooga:memory');

// number of bytes each word represents
const wordSize = 8;

const sizeOffset = 5;

const emptyFreeList = -1;

export enum Tag {
    FALSE,
    TRUE,
    NUMBER,
    NULL,
    UNASSIGNED,
    UNDEFINED,
    BLOCKFRAME,
    CALLFRAME,
    CLOSURE,
    FRAME,
    ENVIRONMENT,
    STACK,
    BUILTIN,
    STRUCT,
    STRUCT_FIELD,
}

function getTagString(tag: Tag): string {
    switch (tag) {
        case Tag.FALSE:
            return 'FALSE';
        case Tag.TRUE:
            return 'TRUE';
        case Tag.NUMBER:
            return 'NUMBER';
        case Tag.NULL:
            return 'NULL';
        case Tag.UNASSIGNED:
            return 'UNASSIGNED';
        case Tag.UNDEFINED:
            return 'UNDEFINED';
        case Tag.BLOCKFRAME:
            return 'BLOCKFRAME';
        case Tag.CALLFRAME:
            return 'CALLFRAME';
        case Tag.CLOSURE:
            return 'CLOSURE';
        case Tag.FRAME:
            return 'FRAME';
        case Tag.ENVIRONMENT:
            return 'ENVIRONMENT';
        case Tag.STACK:
            return 'STACK';
        case Tag.BUILTIN:
            return 'BUILTIN';
        default:
            return 'UNKNOWN';
    }
}

// **************************************************************
// Memory Format
// **************************************************************
// 1st word is header format
//  0-3rd byte: size of node in words
//    E.g. if node's minimum
//  4-7th byte: tag of node
// 2nd word onwards is tag dependent interpretation
// For Tags without children, payload is the 2nd word
// For Tags with children, num children is 2nd word
//
// minimum number of words required to support each node in the
// linear list is = 3 words
//
// The max size of a node is also 2**32 which is more than enough
// This also means the maximum number of words that our memory model supports
// is 2**64 because that's the extent to which we can go from the next pointer

// Heap using Linear allocation: will support multiple allocations
let heap: DataView;
// next address to assign to
let free: number;
// max addressable address
let max: number;
// 4 bytes from start
const tagOffset = 4;

// 2nd word
const nextOffset = 1;
// 3rd word
const numChildrenOffset = 2;

// Canonical variables
export let False;
export let True;
export let Null;
export let Unassigned;
export let Undefined;

export function constructHeap(numWords: number): DataView {
    if (numWords > 2 ** 64) {
        throw new OogaError("Can't use a memory model with more than 2**32 words");
    }
    heap = new DataView(new ArrayBuffer(numWords * wordSize));
    max = numWords;
    free = 0;
    allocateLiteralValues();
    return heap;
}

function setSize(address: number, size: number) {
    heap.setInt32(address * wordSize, size);
}

function getSize(address: number): number {
    return heap.getInt32(address * wordSize);
}

// we have 4 bytes, use a signed integer to make it easy to recognize free
function setTag(address: number, tag: Tag) {
    heap.setInt8(address * wordSize + tagOffset, tag);
}

function getTag(address: number): number {
    return heap.getInt8(address * wordSize + tagOffset);
}

function getWordOffset(address: number, offset: number): number {
    return getWord(address + offset);
}

function getByteAtOffset(address: number, offset: number) {
    return heap.getUint8(address * wordSize + offset);
}

function setByteAtOffset(address: number, offset: number, value: number) {
    heap.setUint8(address * wordSize + offset, value);
}

function get2ByteAtOffset(address: number, offset: number) {
    return heap.getUint16(address * wordSize + offset);
}

function set2ByteAtOffset(address: number, offset: number, value: number) {
    heap.setUint16(address * wordSize + offset, value);
}

function getNumChildren(address: number): number {
    if (getTag(address) === Tag.NUMBER) {
        return 0;
    }
    return heap.getFloat64((address + numChildrenOffset) * wordSize);
}

function allocate(tag: Tag, size: number): number {
    if (free === max) {
        collectGarbage();
    }
    if (free === max) {
        throw new HeapOutOfMemoryError();
    }
    const address = free;
    free = free + size;
    setTag(address, tag);
    setSize(address, size);
    return address;
}

function collectGarbage() {

}

function allocateLiteralValues() {
    False = allocate(Tag.FALSE, 1);
    True = allocate(Tag.TRUE, 1);
    Null = allocate(Tag.NULL, 1);
    Unassigned = allocate(Tag.UNASSIGNED, 1);
    Undefined = allocate(Tag.UNDEFINED, 1);
}

function isTrue(address: number): boolean {
    return getTag(address) === Tag.TRUE;
}

function isFalse(address: number): boolean {
    return getTag(address) === Tag.FALSE;
}

function isBoolean(address: number): boolean {
    return isTrue(address) || isFalse(address);
}

function isNull(address: number): boolean {
    return getTag(address) === Tag.NULL;
}

export function isUnassigned(address: number): boolean {
    return getTag(address) === Tag.UNASSIGNED;
}

function isUndefined(address: number): boolean {
    return getTag(address) === Tag.UNDEFINED;
}

export function isBuiltin(address: number): boolean {
    return getTag(address) === Tag.BUILTIN;
}

function getWord(address: number): number {
    return heap.getFloat64(address * wordSize);
}

function setWord(addr: number, value): void {
    heap.setFloat64(addr * wordSize, value);
}

// ****************************
// Stack
// ****************************
// 2nd word is address of previous Stack
// 3rd word is address of Stack element value
const prevStackElementOffset = 1;
const stackEntryOffset = 2;
export function initializeStack(): number {
    const address = allocate(Tag.STACK, 3);
    setWord(address + prevStackElementOffset, -1);
    setWord(address + stackEntryOffset, -1);
    return address;
}

export function getPrevStackAddress(address: number): number {
    return getWordOffset(address, prevStackElementOffset);
}

export function pushStack(stackAddress: number, stackElementAddress: number): number {
    const nextStack = allocate(Tag.STACK, 3);
    setWord(nextStack + prevStackElementOffset, stackAddress);
    setWord(nextStack + stackEntryOffset, stackElementAddress);
    return nextStack;
}

export function popStack(stackAddress: number): [number, number] {
    const prevAddress = getPrevStackAddress(stackAddress);
    const value = peekStack(stackAddress);
    return [prevAddress, value];
}

export function peekStack(stackAddress: number): number {
    return getWordOffset(stackAddress, stackEntryOffset);
}

export function peekStackN(stackAddress: number, n: number): number {
    let currAddress = stackAddress;
    for (let i = 0; i < n; i++) {
        currAddress = getWordOffset(currAddress, prevStackElementOffset);
    }
    return peekStack(currAddress);
}

function isStack(address: number): boolean {
    return getTag(address) === Tag.STACK;
}

// *****************************
// Closure
// *****************************
//

// 1 word
const closureArityOffset = 1;
// 1 word + 2 byte offset
const closurePcOffset = 3;
// 2 words
const closureEnvOffset = 2;
export function allocateClosure(arity: number, pc: number, envAddress: number): number {
    const address = allocate(Tag.CLOSURE, 3);
    setByteAtOffset(address + 1, closureArityOffset, arity);
    set2ByteAtOffset(address + 1, closurePcOffset, pc);
    setWord(address + closureEnvOffset, envAddress);
    return address;
}

export function getClosureArity(address: number): number {
    return getByteAtOffset(address + 1, closureArityOffset);
}

export function getClosurePC(address: number): number {
    return get2ByteAtOffset(address + 1, closurePcOffset);
}

export function getClosureEnvironment(address: number): number {
    return getWord(address + closureEnvOffset);
}

export function isClosure(address: number): boolean {
    return getTag(address) === Tag.CLOSURE;
}

// **************************************
// Block Frame
// **************************************

// 1 word
const blockFrameEnvOffset = 1;

export function allocateBlockFrame(envAddress: number): number {
    const address = allocate(Tag.BLOCKFRAME, 2);
    setWord(address + blockFrameEnvOffset, envAddress);
    return address;
}

export function getBlockFrameEnvironment(address: number): number {
    return getWordOffset(address, blockFrameEnvOffset);
}

function isBlockFrame(address: number): boolean {
    return getTag(address) === Tag.BLOCKFRAME;
}

// ********************************
// Call Frame
// ********************************

// 2nd word
const callFramePCOffset = 1;
// 3rd word
const callFrameEnvAddress = 2;

export function allocateCallFrame(envAddress: number, pc: number): number {
    const address = allocate(Tag.CALLFRAME, 3);
    setWord(address + callFramePCOffset, pc);
    setWord(address + callFrameEnvAddress, envAddress);
    return address;
}

export function getCallFrameEnvironment(address: number): number {
    return getWordOffset(address, callFrameEnvAddress);
}

export function getCallFramePC(address: number): number {
    return getWordOffset(address, callFramePCOffset);
}

export function isCallFrame(address: number): boolean {
    return getTag(address) === Tag.CALLFRAME;
}

// *********************
// Environment
// *********************

export function allocateEnvironment(numFrames: number): number {
    return allocate(Tag.ENVIRONMENT, numFrames + 1);
}

export function getEnvironmentValue(envAddress: number, frameIndex: number, valueIndex: number) {
    const frameAddress = getWordOffset(envAddress, frameIndex + 1);
    return getWordOffset(frameAddress, valueIndex + 1);
}

export function setEnvironmentValue(envAddress: number, frameIndex: number, valueIndex: number, value: number) {
    const frameAddress = getWordOffset(envAddress, frameIndex + 1);
    setWord(frameAddress + valueIndex + 1, value);
}

export function allocateFrame(numValues: number): number {
    return allocate(Tag.FRAME, numValues + 1);
}

export function setFrameValue(frameAddress: number, i: number, value: number) {
    setWord(frameAddress + i + 1, value);
}

// extend a given environment by a new frame
// creates a copy of an environment that is bigger by 1 frame slot than the previous env
// and copies the frame addresses of the given env to the new env
// then sets the address of te new frame to the end of the new env
export function extendEnvironment(frameAddress: number, envAddress: number): number {
    const oldSize = getSize(envAddress);
    // this has the increment by 1 because allocateEnvironment assumes 1 for itself
    const newEnvAddress = allocateEnvironment(oldSize);
    let i = 0;
    for (i = 0; i < oldSize - 1; i++) {
        setWord(newEnvAddress + i + 1, getWordOffset(envAddress, i + 1));
    }
    setWord(newEnvAddress + i + 1, frameAddress);
    return newEnvAddress;
}

// 1 word
const builtinIDOffset = 8;

export function allocateBuiltin(id: number): number {
    const address = allocate(Tag.BUILTIN, 2);
    setByteAtOffset(address, builtinIDOffset, id);
    return address;
}

export function getBuiltinID(address: number): number {
    return getByteAtOffset(address, builtinIDOffset);
}

// **************************
// Golang structures
// **************************
export function allocateStruct(numFields: number): number {
    const address = allocate(Tag.STRUCT, numFields + 1);
    return address;
}

export function setField(structAddress: number, fieldIndex: number, value: number) {
    setWord(structAddress + 1 + fieldIndex, value);
}

export function getField(structAddress: number, fieldIndex: number): number {
    return getWordOffset(structAddress, fieldIndex + 1);
}

function isStruct(address: number) {
    return getTag(address) === Tag.STRUCT;
}

// *********************
// Number
// *********************
function allocateNumber(n: number): number {
    const numAddress = allocate(Tag.NUMBER, 2);
    setWord(numAddress + 1, n);
    return numAddress;
}

function isNumber(address: number): boolean {
    return getTag(address) === Tag.NUMBER;
}

// TODO: Use this to visualize the heap
export function debugHeap(): void {
    log("DEBUG HEAP");
    let curr = 0;
    while (curr < free) {
        log("**********************************************************");
        log("Address " + curr + ": ");
        log("Tag: " + getTagString(getTag(curr)));
        log("Size: " + getSize(curr));
        switch (getTag(curr)) {
            case Tag.FALSE:
            case Tag.TRUE:
            case Tag.NULL:
            case Tag.UNASSIGNED:
            case Tag.UNDEFINED:
                break;
            case Tag.NUMBER:
                log("Value: " + addressToTSValue(curr));
                break;
            case Tag.BLOCKFRAME:
                log("Env address: " + getBlockFrameEnvironment(curr));
                break;
            case Tag.BUILTIN:
                log("ID: " + getBuiltinID(curr));
                break;
            case Tag.STACK:
                log("Previous: " + getPrevStackAddress(curr));
                log("Entry: " + addressToTSValue(peekStack(curr)));
                break;
            case Tag.ENVIRONMENT:
                for (let i = 0; i < getSize(curr) - 1; i++) {
                    log("Frame address: " + getWordOffset(curr, i + 1));
                }
                break;
            case Tag.STRUCT:
                // TODO
                break;
            case Tag.CALLFRAME:
                log("PC: " + getCallFramePC(curr));
                log("Env Addr: " + getCallFrameEnvironment(curr));
                break;
            case Tag.FRAME:
                for (let i = 0; i < getSize(curr) - 1; i++) {
                    log("Frame " + i + ": " + getWordOffset(curr, i + 1));
                }
                break;
            case Tag.CLOSURE:
                log("Arity: " + getClosureArity(curr));
                log("PC" + getClosurePC(curr));
                log("Env Addr: " + getClosureEnvironment(curr));
                break;
            default:
                break;
        }
        curr = curr + getSize(curr);
    }
}

// **************************
// Conversions
// **************************

export function addressToTSValue(address: number) {
    if (address === -1) {
        return null;
    }
    if (isNull(address)) {
        return null;
    } else if (isBoolean(address)) {
        return isTrue(address);
    } else if (isUndefined(address)) {
        return undefined;
    } else if (isUnassigned(address)) {
        return '<unassigned>';
    } else if (isNumber(address)) {
        return getWordOffset(address, 1);
    } else if (isBuiltin(address)) {
        return '<builtin>';
    } else if (isClosure(address)) {
        return '<closure>';
    } else if (isStruct(address)) {
        return '<struct>';
    } else if (isBlockFrame(address)) {
        return '<blockframe>';
    } else if (isCallFrame(address)) {
        return '<callframe>';
    } else {
        throw new Error("bagoog");
    }
}

export function TSValueToAddress(value: any) {
    if (typeof value === 'boolean') {
        return value ? True : False;
    } else if (typeof value === 'number') {
        return allocateNumber(value);
    } else if (typeof value === 'undefined') {
        return Undefined;
    } else if (value === null) {
        // it already went past the undefined check, so this will only
        // return true for null
        // https://stackoverflow.com/questions/28975896/is-there-a-way-to-check-for-both-null-and-undefined
        return Null;
    } else {
        throw new Error('not implemented yet, value: ' + JSON.stringify(value, null, 2));
    }
}
