import debug from 'debug';
import { HeapError, HeapOutOfMemoryError, OogaError } from './oogavm-errors.js';
import { getRoots, E, OS, RTS } from './oogavm-machine.js';
import { head } from '../utils/utils';

const log = debug('ooga:memory');

// number of bytes each word represents
const wordSize = 8;

export enum Tag {
    UNINITIALIZED, // all starting heap are tag 0
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
    STRING,
    MUTEX,
    ARRAY,
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
        case Tag.UNINITIALIZED:
            return 'UNINITIALIZED';
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
        case Tag.STRING:
            return 'STRING';
        case Tag.STRUCT:
            return 'STRUCT';
        case Tag.MUTEX:
            return 'MUTEX';
        case Tag.ARRAY:
            return 'ARRAY';
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
// 2nd word is the forwarding address
// 3rd word onwards is tag dependent interpretation
// Payload is the 3rd word for all tags
// 3rd word onwards is the children
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
// 2 words required for header information
const headerSize = 2;

// Canonical variables
export let False;
export let True;
export let Null;
export let Unassigned;
export let Undefined;

let emptyString;

let literals: number[] = [];

let updateRoots;

/**
 * A heap based memory model that makes use of Lisp 2 garbage collection.
 * @param numWords
 */
export function constructHeap(numWords: number, updateRootsFn): DataView {
    if (numWords > 2 ** 64) {
        throw new HeapError("Can't use a memory model with more than 2**32 words");
    } else if (numWords % 2 !== 0) {
        throw new HeapError('Please use an even number of words for Ooga');
    }
    heap = new DataView(new ArrayBuffer(numWords * wordSize));
    max = numWords;
    free = 0;
    allocateLiteralValues();
    updateRoots = updateRootsFn;
    StringPool.clear();
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

function allocate(tag: Tag, size: number): number {
    if (free === max || free + size >= max) {
        collectGarbage();
    }

    if (free === max || free + size >= max) {
        throw new HeapOutOfMemoryError();
    }

    const address = free;
    free = free + size;
    setTag(address, tag);
    setSize(address, size);
    setForwardingAddress(address, address);
    return address;
}

function allocateLiteralValues() {
    False = allocate(Tag.FALSE, 2);
    True = allocate(Tag.TRUE, 2);
    Null = allocate(Tag.NULL, 2);
    Unassigned = allocate(Tag.UNASSIGNED, 2);
    Undefined = allocate(Tag.UNDEFINED, 2);
    emptyString = allocateString('');
    literals = [False, True, Null, Unassigned, Undefined];
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
// 3rd word is address of previous Stack
// 4th word is address of Stack element value
const prevStackElementOffset = 2;
const stackEntryOffset = 3;
export function initializeStack(): number {
    const address = allocate(Tag.STACK, 4);
    setWord(address + prevStackElementOffset, -1);
    setWord(address + stackEntryOffset, -1);
    return address;
}

export function getPrevStackAddress(address: number): number {
    return getWordOffset(address, prevStackElementOffset);
}

export function pushStack(stackAddress: number[], stackElementAddress: number[]): number {
    const nextStack = allocate(Tag.STACK, 4);
    setWord(nextStack + prevStackElementOffset, stackAddress[0]);
    setWord(nextStack + stackEntryOffset, stackElementAddress[0]);
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

// 2 words
const closureArityOffset = 1;
// 2 word + 2 byte offset
const closurePcOffset = 3;
// 3 words
const closureEnvOffset = 3;
export function allocateClosure(arity: number, pc: number, envAddress: number[]): number {
    const address = allocate(Tag.CLOSURE, 4);
    setByteAtOffset(address + headerSize, closureArityOffset, arity);
    set2ByteAtOffset(address + headerSize, closurePcOffset, pc);
    setWord(address + closureEnvOffset, envAddress[0]);
    return address;
}

export function getClosureArity(address: number): number {
    return getByteAtOffset(address + headerSize, closureArityOffset);
}

export function getClosurePC(address: number): number {
    return get2ByteAtOffset(address + headerSize, closurePcOffset);
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
// 3rd word is blockFrameEnv
const blockFrameEnvOffset = 2;

export function allocateBlockFrame(envAddress: number[]): number {
    const address = allocate(Tag.BLOCKFRAME, 3);
    log('BlockFrame at addr ' + address + ' will point to E=' + envAddress[0]);
    setWord(address + blockFrameEnvOffset, envAddress[0]);
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

// 3rd word
const callFramePCOffset = 2;
// 4th word
const callFrameEnvAddress = 3;

export function allocateCallFrame(envAddress: number[], pc: number): number {
    const address = allocate(Tag.CALLFRAME, 4);
    setWord(address + callFramePCOffset, pc);
    setWord(address + callFrameEnvAddress, envAddress[0]);
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
    return allocate(Tag.ENVIRONMENT, numFrames + headerSize);
}

export function getEnvironmentValue(envAddress: number, frameIndex: number, valueIndex: number) {
    const frameAddress = getWordOffset(envAddress, frameIndex + headerSize);
    return getWordOffset(frameAddress, valueIndex + headerSize);
}

export function setEnvironmentValue(
    envAddress: number,
    frameIndex: number,
    valueIndex: number,
    value: number
) {
    const frameAddress = getWordOffset(envAddress, frameIndex + headerSize);
    setWord(frameAddress + valueIndex + headerSize, value);
}

export function allocateFrame(numValues: number): number {
    return allocate(Tag.FRAME, numValues + headerSize);
}

export function setFrameValue(frameAddress: number, i: number, value: number) {
    setWord(frameAddress + i + headerSize, value);
}

// extend a given environment by a new frame
// creates a copy of an environment that is bigger by 1 frame slot than the previous env
// and copies the frame addresses of the given env to the new env
// then sets the address of te new frame to the end of the new env
export function extendEnvironment(frameAddress: number[], envAddress: number[]): number {
    const oldSize = getSize(envAddress[0]) - headerSize;
    const newEnvAddress = allocateEnvironment(oldSize + 1);
    let i = 0;
    for (i = 0; i < oldSize; i++) {
        setWord(newEnvAddress + i + headerSize, getWordOffset(envAddress[0], i + headerSize));
    }
    setWord(newEnvAddress + i + headerSize, frameAddress[0]);
    return newEnvAddress;
}

// 2 word
const builtinIDOffset = 16;

export function allocateBuiltin(id: number): number {
    const address = allocate(Tag.BUILTIN, 3);
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
    const address = allocate(Tag.STRUCT, numFields + headerSize);
    return address;
}

export function setField(structAddress: number, fieldIndex: number, value: number) {
    setWord(structAddress + headerSize + fieldIndex, value);
}

export function getField(structAddress: number, fieldIndex: number): number {
    return getWordOffset(structAddress, fieldIndex + headerSize);
}

function isStruct(address: number) {
    return getTag(address) === Tag.STRUCT;
}

// *********************
// Number
// *********************
function allocateNumber(n: number): number {
    const numAddress = allocate(Tag.NUMBER, 3);
    setWord(numAddress + headerSize, n);
    return numAddress;
}

function isNumber(address: number): boolean {
    return getTag(address) === Tag.NUMBER;
}

// *********************
// Strings
// *********************
// Strings have their raw values stored in the heap and are never
// garbage collected. They are considered immutable
// As strings are merely char arrays, the size of a string
// is 1byte * length of char
// But we are working in word aligned strings, so the size of a string
// is the closest 8byte ceiling
// Furthermore, we need a way to distinguish the end of the string
// As such, we use the third word to represent the true length of the string
// in chars.
// "" is considered the null string and is a literal
// The StringPool is a Javascript map that maps the string to its address
// This is not low memory thing but we are assuming that OogaVM
// has a dedicated, optimized section for Strings just as in C# or JVM
// Although Strings are never garbage collected, they need to be moved to
// compact the heap, and so the StringPool needs to be updated appropriately
// as well.
let StringPool = new Map<string, number>();

const StringSizeOffset = 2;
const StringValueOffset = 3;

function allocateString(s: string): number {
    log('Inside allocateString for ' + s);
    if (StringPool.has(s)) {
        return StringPool.get(s)!;
    }

    const size = Math.ceil(s.length / 8);
    const actualSize = size + headerSize + 1;
    log('Size of string in words is ' + actualSize);
    // 1 comes from using the third word to store the actual string length
    const sAddress = allocate(Tag.STRING, actualSize);

    // Store the actual length in the second word.
    heap.setUint32((sAddress + StringSizeOffset) * wordSize, s.length);

    log('Length of string in word is ' + heap.getUint32((sAddress + StringSizeOffset) * wordSize));

    // Allocate byte by byte
    for (let i = 0; i < s.length; i++) {
        heap.setUint8((sAddress + StringValueOffset) * wordSize + i, s.charCodeAt(i));
    }

    StringPool.set(s, sAddress);

    log('StringPool set to ' + StringPool.get(s));
    log('StringValue is ' + getStringValue(sAddress));

    return sAddress;
}

function getStringValue(address: number): string {
    // Handle the empty string appropriately
    if (address === emptyString) {
        return '';
    }

    // get the actual string length
    log('getStringValue for ' + address);
    const stringLength = heap.getUint32((address + StringSizeOffset) * wordSize);
    let resultString = '';
    // read byte by byte
    for (let i = 0; i < stringLength; i++) {
        const c = String.fromCharCode(heap.getUint8((address + StringValueOffset) * wordSize + i));
        resultString = resultString + c;
    }
    return resultString;
}

function isString(address: number): boolean {
    return getTag(address) === Tag.STRING;
}

// ********************************
// Mutex
// ********************************
// 1st word: tag and size
// 2nd word: forwarding address
export function allocateMutex() {
    const mutexAddress = allocate(Tag.MUTEX, headerSize);
    return mutexAddress;
}

export function isMutex(address: number): boolean {
    return getTag(address) === Tag.MUTEX;
}

// ********************************
// Array
// ********************************

export function allocateArray(numValues: number): number {
    return allocate(Tag.ARRAY, numValues + headerSize);
}

export function setArrayValue(arrayAddress: number, idx: number, value: number) {
    setWord(arrayAddress + idx + headerSize, value);
}

export function isArray(address: number): boolean {
    return getTag(address) === Tag.ARRAY;
}

// Returns the addresses of the values in the array
export function getArrayValue(address: number): any[] {
    const arrayLength = getSize(address) - headerSize;
    let result: any[] = [];
    for (let i = 0; i < arrayLength; i++) {
        const arrayElementAddress = getWordOffset(address, i + headerSize);
        result.push(arrayElementAddress);
    }
    return result;
}

// returns the address of the element at said index
export function getArrayValueAtIndex(arrayAddress: number, idx: number): any {
    const arrayLength: number = getSize(arrayAddress) - headerSize;
    if (idx < 0) {
        throw new OogaError("Negative indexing not allowed!");
    }
    if (idx >= arrayLength) {
        throw new OogaError("Array out of bounds error!");
    }
    return getWordOffset(arrayAddress, idx + headerSize);
}


// ********************************
// Debug
// ********************************
export function printHeapUsage() {
    log('Heap: ' + free + '/' + max + ' words.');
}

export function printStringPoolMapping() {
    log('************************StringPool************************');
    // @ts-ignore
    for (let key of StringPool.keys()) {
        log(key + ' -> ' + StringPool.get(key));
    }
    log('************************StringPool************************');
}

// TODO: Use this to visualize the heap
export function debugHeap(): void {
    log('DEBUG HEAP');
    let curr = 0;
    while (curr < free) {
        log('**********************************************************');
        log('Address ' + curr + ': ');
        log('Tag: ' + getTagString(getTag(curr)));
        log('Size: ' + getSize(curr));
        switch (getTag(curr)) {
            case Tag.FALSE:
            case Tag.TRUE:
            case Tag.NULL:
            case Tag.UNASSIGNED:
            case Tag.UNDEFINED:
                break;
            case Tag.NUMBER:
                log('Value: ' + addressToTSValue(curr));
                break;
            case Tag.BLOCKFRAME:
                log('Env address: ' + getBlockFrameEnvironment(curr));
                break;
            case Tag.BUILTIN:
                log('ID: ' + getBuiltinID(curr));
                break;
            case Tag.STACK:
                log('Previous: ' + getPrevStackAddress(curr));
                log('Entry: ' + addressToTSValue(peekStack(curr)) + ' at ' + peekStack(curr));
                break;
            case Tag.ENVIRONMENT:
                for (let i = 0; i < getSize(curr) - headerSize; i++) {
                    log('Frame address: ' + getWordOffset(curr, i + headerSize));
                }
                break;
            case Tag.STRUCT:
                for (let i = 0; i < getSize(curr) - headerSize; i++) {
                    log('Field ' + i + ': ' + getWordOffset(curr, i + headerSize));
                }
                break;
            case Tag.CALLFRAME:
                log('PC: ' + getCallFramePC(curr));
                log('Env Addr: ' + getCallFrameEnvironment(curr));
                break;
            case Tag.FRAME:
                for (let i = 0; i < getSize(curr) - headerSize; i++) {
                    log('Frame ' + i + ': ' + getWordOffset(curr, i + headerSize));
                }
                break;
            case Tag.CLOSURE:
                log('Arity: ' + getClosureArity(curr));
                log('PC' + getClosurePC(curr));
                log('Env Addr: ' + getClosureEnvironment(curr));
                break;
            case Tag.STRING:
                log('String value: ' + getStringValue(curr));
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
    log("addressToTSVAlue" + address);
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
        return getWordOffset(address, headerSize);
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
    } else if (isString(address)) {
        return getStringValue(address);
    } else if (isArray(address)) {
        return getArrayValue(address);
    } else {
        throw new Error('bagoog');
    }
}

export function TSValueToAddress(value: any) {
    if (typeof value === 'string') {
        return allocateString(value);
    } else if (typeof value === 'boolean') {
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

// Linear mark and sweep garbage collection with copy compaction
function isMarked(addr) {
    return getTag(addr) < 0;
}

function markTag(addr) {
    const originalTag = getTag(addr);
    if (originalTag === Tag.UNINITIALIZED || isMarked(addr)) {
        return originalTag;
    }
    heap.setInt8(addr * wordSize + tagOffset, -1 - originalTag);
    return originalTag;
}

function unmarkTag(addr) {
    if (!isMarked(addr)) {
        return;
    }
    const markedTag = getTag(addr);
    heap.setInt8(addr * wordSize + tagOffset, -1 - markedTag);
}

function mark(addr) {
    if (isMarked(addr)) {
        return;
    }
    const originalTag: Tag = markTag(addr);
    switch (originalTag) {
        case Tag.BLOCKFRAME:
            mark(getBlockFrameEnvironment(addr));
            break;
        case Tag.CALLFRAME:
            mark(getCallFrameEnvironment(addr));
            break;
        case Tag.CLOSURE:
            mark(getClosureEnvironment(addr));
            break;
        case Tag.STACK:
            // mark values and then recurse to bottom of stack
            // taking care to handle proper nil values
            const value = peekStack(addr);
            if (value !== -1) {
                mark(value);
            }
            const parent = getPrevStackAddress(addr);
            if (parent !== -1) {
                mark(parent);
            }
            break;
        case Tag.FRAME:
        case Tag.ENVIRONMENT:
        case Tag.STRUCT:
            const numChildren = getSize(addr) - 1;
            for (let i = 0; i < numChildren; i++) {
                mark(getWord(addr + i + 1));
            }
            break;
        default:
            // no special case for builtins, struct fields
            return;
    }
}

const forwardingAddressOffset = 1;

function getForwardingAddress(address: number) {
    return heap.getInt32((address + forwardingAddressOffset) * wordSize);
}

function setForwardingAddress(address: number, forwardedAddress: number) {
    heap.setInt32((address + forwardingAddressOffset) * wordSize, forwardedAddress);
}

/**
 * Implements the Lisp 2 garbage collection algorithm.
 * Performs 4 passes over the heap.
 * The first pass is the standard marking phase.
 * The second pass computes the forwarding location for live objects.
 * The third pass updates all pointers
 * The fourth and final pass moves objects.
 * This achieves O(N) time complexity while maximizing usage of the entire heap.
 */

function computeForwardingAddresses() {
    let freePtr = 0;
    let livePtr = 0;
    while (livePtr < free) {
        const size = getSize(livePtr);
        // If it points to a live object, update the forwarding address
        // to the current freePtr and increment the freePtr according to
        // the object's size.
        if (isMarked(livePtr)) {
            const originalTag = -1 - getTag(livePtr);
            log(
                'Forwarding ' +
                    livePtr +
                    ' of <' +
                    getTagString(originalTag) +
                    '>' +
                    ' to ' +
                    freePtr
            );
            setForwardingAddress(livePtr, freePtr);
            rootMappings.set(livePtr, freePtr);
            freePtr += size;
        }
        livePtr += size;
    }
}

// For each live object, update its pointers according to the forwarding
// pointers of the objects they point to
function updateReferences() {
    let curr = 0;
    while (curr < free) {
        const size = getSize(curr);
        if (isMarked(curr)) {
            const markedTag = getTag(curr);
            const originalTag = -1 - markedTag;
            switch (originalTag) {
                case Tag.BLOCKFRAME:
                    const originalBlockEnvAddr = getBlockFrameEnvironment(curr);
                    const forwardedBlockEnvAddr = getForwardingAddress(originalBlockEnvAddr);
                    setWord(curr + blockFrameEnvOffset, forwardedBlockEnvAddr);
                    break;
                case Tag.CALLFRAME:
                    const originalCFEnvAddr = getCallFrameEnvironment(curr);
                    const forwardedCFEnvAddr = getForwardingAddress(originalCFEnvAddr);
                    setWord(curr + callFrameEnvAddress, forwardedCFEnvAddr);
                    break;
                case Tag.CLOSURE:
                    const originalCLEnvAddr = getClosureEnvironment(curr);
                    const forwardedCLEnvAddr = getForwardingAddress(originalCLEnvAddr);
                    setWord(curr + closureEnvOffset, forwardedCLEnvAddr);
                    break;
                case Tag.STACK:
                    // Remember that the value of a stack is just the address
                    let originalValue = peekStack(curr);
                    if (originalValue !== -1) {
                        const forwardedValue = getForwardingAddress(originalValue);
                        setWord(curr + stackEntryOffset, forwardedValue);
                    }
                    let originalPrev = getWordOffset(curr, prevStackElementOffset);
                    if (originalPrev !== -1) {
                        const forwardedPrev = getForwardingAddress(originalPrev);
                        setWord(curr + prevStackElementOffset, forwardedPrev);
                    }
                    break;
                case Tag.FRAME:
                case Tag.ENVIRONMENT:
                case Tag.STRUCT:
                    const numChildren = getSize(curr) - headerSize;
                    for (let i = 0; i < numChildren; i++) {
                        const originalChildAddr = getWord(curr + i + headerSize);
                        const forwardedAddr = getForwardingAddress(originalChildAddr);
                        setWord(curr + i + headerSize, forwardedAddr);
                    }
                    break;
                case Tag.STRING:
                    const stringValue = getStringValue(curr);
                    const forwardedAddr = getForwardingAddress(curr);
                    StringPool.set(stringValue, forwardedAddr);
                    break;
                default:
                    // no special case for builtins, struct fields
                    break;
            }
        }
        curr += size;
    }
}

function moveLiveObjects() {
    let curr = 0;
    let freePtr = 0; // the next free
    while (curr < free) {
        const size = getSize(curr);
        if (!isMarked(curr)) {
            curr += size;
            continue;
        }
        // need to unmark first to make valid,
        // this will also ignore the entry again
        unmarkTag(curr);
        const forwardedAddress = getForwardingAddress(curr);
        // copy each word over
        for (let i = 0; i < size; i++) {
            const value = getWord(curr + i);
            setWord(forwardedAddress + i, value);
        }
        // Explicitly update the forwarding address
        setForwardingAddress(forwardedAddress, forwardedAddress);
        curr += size;
        freePtr += size;
    }
    free = freePtr;
}

let roots: number[][] = [];
let rootMappings = new Map<number, number>();

// Lisp 2 Garbage Collection!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
function collectGarbage() {
    // First pass: marking
    log('Collecting da garbage...');
    roots = getRoots();
    rootMappings.clear();
    for (let root of roots) {
        mark(root[0]);
    }
    for (let literal of literals) {
        mark(literal);
    }
    // To avoid freeing strings, just mark them from the StringPool
    // This is safe to do because we haven't moved anything yet
    // The Strings will then be compacted appropriately
    // @ts-ignore
    for (let sKey of StringPool.keys()) {
        log(sKey + ' -> ' + StringPool.get(sKey));
        mark(StringPool.get(sKey));
    }
    // Second pass: Compute forwarding location for live objects
    computeForwardingAddresses();
    // Third pass: update all pointers to the forwarding addresses
    updateReferences();
    // we need to update the roots first because if the root is at a place
    // after free, the forwarding address there is basically garbage data
    // can't avoid this tight coupling unfortunately
    updateRoots(roots, rootMappings);
    // Final pass: move all live objects to their forwarding address
    moveLiveObjects();
}
