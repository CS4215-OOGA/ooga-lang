import debug from 'debug';
import { HeapError, HeapOutOfMemoryError } from './oogavm-errors.js';
import { ThreadId } from './oogavm-scheduler.js';
import { getRoots, Thread } from './oogavm-machine.js';

const log = debug('ooga:memory');
// number of bytes each word represents
const wordSize = 8;
// Simpler but wasteful to adopt a fixed node size for all nodes in the heap
const nodeSize = 10;

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

/**
 * The abstraction over the heap.
 *
 * All values are allocated onto the heap as nodes (of 10 words).
 * The first word of the node is a header, and the first byte of the
 * header is a tag that identifies the type of node.
 *
 * The first word's first byte is the tag byte.
 * [1 byte tag, 4 bytes payload, 2 bytes #children, 1 byte unused]
 *
 *
 */
export class Heap {
    // The internal DataView over the actual ArrayBuffer
    private heap: DataView;
    // The next address to assign to
    private free: number;

    private numUsedWords: number;

    private readonly numWords: number;

    // The canonical literals assigned here
    False;
    True;
    Null;
    Unassigned;
    Undefined;
    // Canonical array here for easy use in mark and sweep
    private literals: any[];

    // Pass in getRoots function here to make it easy for mark and sweep
    private threads: Map<ThreadId, Thread>;

    // Store statistics
    private numMarked: number = 0;

    constructor(numWords: number) {
        this.numUsedWords = 0;
        this.numWords = numWords;
        this.heap = new DataView(new ArrayBuffer(numWords * wordSize));
        this.free = 0;
        // Initialize all the next addresses in the free list
        let i;
        for (i = 0; i <= numWords - nodeSize; i += nodeSize) {
            this.setWord(i, i + nodeSize);
        }
        this.setWord(i - nodeSize, emptyFreeList);
        // We allocate canonical values for the primitive literals
        // true, false, undefined, null and unassigned
        // and make sure no such values are created at runtime.
        this.allocateLiteralValues();
    }

    // **************
    // Debug
    // **************

    /**
     * Returns the byte representation of the provided heap.
     * To be used for visualization.
     */
    displayHeap(): string[] {
        const numWords = this.getNumWords();
        const heapBinStr: string[] = [];
        for (let i = 0; i < numWords; i++) {
            heapBinStr.push(this.wordToString(this.getWord(i)));
        }
        return heapBinStr;
    }

    // Helper method that simply prints the string heap
    debugVisualizeHeap() {
        let heap = this.displayHeap();
        for (let i = 0; i < heap.length; i++) {
            log(heap[i]);
        }
    }

    /**
     * Given a word, return the binary form of it.
     * It's 8 bytes, so we expect 64 bits.
     * @param word
     */
    wordToString(word: number): string {
        const buf = new ArrayBuffer(wordSize);
        const view = new DataView(buf);
        view.setFloat64(0, word);
        let binStr = view.getFloat64(0).toString() + ': ';
        for (let i = 0; i < 8; i++) {
            binStr += ('00000000' + view.getUint8(i).toString(2)).slice(-8) + ' ';
        }
        return binStr;
    }

    // *****************
    // Raw Getters and Setters
    // *****************
    /**
     * Get the number of words in the heap
     */
    getNumWords(): number {
        return this.numWords;
    }

    /**
     * Get the i-th word in the heap.
     * @param address
     */
    getWord(address: number): number {
        return this.heap.getFloat64(address * wordSize);
    }

    /**
     * Set heap with value at address.
     * @param addr
     * @param value
     */
    setWord(addr: number, value): void {
        this.heap.setFloat64(addr * wordSize, value);
    }

    /**
     * Get the word at the address. It would just be the first word
     * @param address
     */
    getTag(address: number) {
        return this.heap.getInt8(address * wordSize);
    }

    setTag(address: number, tag: Tag) {
        this.heap.setInt8(address * wordSize, tag);
    }

    getSize(address: number) {
        return this.heap.getUint16(address * wordSize + sizeOffset);
    }

    setSize(address: number, size: number) {
        this.heap.setUint16(address * wordSize + sizeOffset, size);
    }

    getByteAtOffset(address: number, offset: number) {
        return this.heap.getUint8(address * wordSize + offset);
    }

    setByteAtOffset(address: number, offset: number, value: number) {
        this.heap.setUint8(address * wordSize + offset, value);
    }

    get2ByteAtOffset(address: number, offset: number) {
        return this.heap.getUint16(address * wordSize + offset);
    }

    set2ByteAtOffset(address: number, offset: number, value: number) {
        this.heap.setUint16(address * wordSize + offset, value);
    }

    getNumChildren(address: number): number {
        if (this.getTag(address) === Tag.NUMBER) {
            return 0;
        }
        return this.getSize(address) - 1;
    }

    /**
     * Get the i-th child
     * The child is 0-th indexed and from the second word.
     * @param address
     * @param child
     */
    getChild(address: number, child: number) {
        return this.getWord(address + child + 1);
    }

    setChild(address: number, child: number, value) {
        this.setWord(address + 1 + child, value);
    }

    isFalse(address: number) {
        return this.getTag(address) === Tag.FALSE;
    }

    isTrue(address: number) {
        return this.getTag(address) === Tag.TRUE;
    }

    isBoolean(address: number) {
        return this.isFalse(address) || this.isTrue(address);
    }

    isNull(address: number) {
        return this.getTag(address) === Tag.NULL;
    }

    isUnassigned(address: number) {
        return this.getTag(address) === Tag.UNASSIGNED;
    }

    isUndefined(address: number) {
        return this.getTag(address) === Tag.UNDEFINED;
    }

    isBuiltin(address: number) {
        return this.getTag(address) === Tag.BUILTIN;
    }

    // *****************
    // Memory Allocation
    // *****************

    allocate(tag: Tag, size: number) {
        this.numUsedWords += 1;
        if (size > nodeSize) {
            throw new HeapError('Cannot allocate node size more than ' + nodeSize + ' words');
        }
        if (this.free === -1) {
            let roots = getRoots();
            this.markAndSweep(roots);
            if (this.free === -1) {
                // still dead
                throw new HeapOutOfMemoryError();
            }
        }
        const address = this.free;
        // this basically updates free to the next pointer because next is stored in the first word
        this.free = this.getWord(this.free);
        this.setTag(address, tag);
        this.setSize(address, size);
        return address;
    }

    private allocateLiteralValues() {
        this.False = this.allocate(Tag.FALSE, 1);
        this.True = this.allocate(Tag.TRUE, 1);
        this.Null = this.allocate(Tag.NULL, 1);
        this.Unassigned = this.allocate(Tag.UNASSIGNED, 1);
        this.Undefined = this.allocate(Tag.UNDEFINED, 1);
        this.literals = [this.False, this.True, this.Null, this.Unassigned, this.Undefined];
    }

    // *******************
    // Stack
    // *******************
    // Very wasteful, but the first byte was reserved for the header anyways
    // [1 byte tag, 7 bytes unused]
    // followed by the previous OS entry (so that we can officially do a stack)
    // followed by the value of the OS entry (which is an address in the heap)

    // Initializes a stack for either OS or RTS
    initializeStack() {
        const newAddress = this.allocate(Tag.STACK, 3);
        // -1 for both to indicate that this is the very first stack entry (or a 'root')
        this.setWord(newAddress + 1, -1);
        this.setWord(newAddress + 2, -1);
        return newAddress;
    }

    // Really just allocateStack but called push to make it clearer
    pushStack(address: number, value: number) {
        const newAddress = this.allocate(Tag.STACK, 3);
        this.setWord(newAddress + 1, address);
        this.setWord(newAddress + 2, value);
        return newAddress;
    }

    // Pop the stack and return the new OS/RTS address as well as the value
    popStack(address: number): [number, number] {
        const prevAddress = this.getChild(address, 0);
        const value = this.getStackValue(address);
        this.freeMemory(address);
        return [prevAddress, value];
    }

    peekStack(address: number): number {
        return this.getStackValue(address);
    }

    // Return the n-th last value in the stack
    peekStackN(address: number, n: number): number {
        let currAddress = address;
        for (let i = 0; i < n; i++) {
            currAddress = this.getChild(currAddress, 0);
        }
        return this.getStackValue(currAddress);
    }

    // Used for peek OS
    getStackValue(address: number) {
        return this.getChild(address, 1);
    }

    // *******************
    // Closure
    // *******************
    // [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused, 2 bytes #children, 1 byte unused]
    // followed by the environment
    allocateClosure(arity: number, pc: number, envAddress: number) {
        const address = this.allocate(Tag.CLOSURE, 2);
        this.setByteAtOffset(address, 1, arity);
        this.set2ByteAtOffset(address, 2, pc);
        this.setWord(address + 1, envAddress);
        return address;
    }

    getClosureArity(address: number) {
        return this.getByteAtOffset(address, 1);
    }

    getClosurePC(address: number) {
        return this.get2ByteAtOffset(address, 2);
    }

    getClosureEnvironment(address: number) {
        return this.getChild(address, 0);
    }

    isClosure(address: number) {
        return this.getTag(address) === Tag.CLOSURE;
    }

    // *******************
    // Block Frame
    // *******************
    // [1 byte tag, 4 bytes unused, 2 bytes #children, 1 byte unused]
    // followed by the environment
    allocateBlockframe(envAddress: number) {
        const address = this.allocate(Tag.BLOCKFRAME, 2);
        this.setWord(address + 1, envAddress);
        return address;
    }

    getBlockframeEnvironment(address: number) {
        return this.getChild(address, 0);
    }

    isBlockframe(address: number) {
        return this.getTag(address) === Tag.BLOCKFRAME;
    }

    // *******************
    // Call Frame
    // *******************
    // Call frames are
    // [1 byte tag, 1 byte unused, 2 bytes pc, 1 byte unused, 2 bytes #children, 1 byte unused]
    // followed by the address of the env
    allocateCallframe(envAddress: number, pc: number) {
        const address = this.allocate(Tag.CALLFRAME, 2);
        this.set2ByteAtOffset(address, 2, pc);
        this.setWord(address + 1, envAddress);
        return address;
    }

    getCallframeEnvironment(address: number) {
        return this.getChild(address, 0);
    }

    getCallframePC(address: number) {
        return this.get2ByteAtOffset(address, 2);
    }

    isCallframe(address: number) {
        return this.getTag(address) === Tag.CALLFRAME;
    }

    // *******************
    // Environment
    // *******************
    // An environment frame is
    // [1 byte tag, 4 bytes unused, 2 bytes #children, 1 byte unused]
    // followed by the addresses of its value.
    // we are using compile time environment, so we assume that the compiler
    // already knows which frame and which index to access or set.

    allocateEnvironment(numFrames: number) {
        return this.allocate(Tag.ENVIRONMENT, numFrames + 1);
    }

    getEnvironmentValue(envAddress: number, frameIndex: number, valueIndex: number) {
        const frameAddress = this.getChild(envAddress, frameIndex);
        return this.getChild(frameAddress, valueIndex);
    }

    setEnvironmentValue(envAddress: number, frameIndex: number, valueIndex: number, value: number) {
        const frameAddress = this.getChild(envAddress, frameIndex);
        this.setChild(frameAddress, valueIndex, value);
    }

    allocateFrame(numValues: number): number {
        return this.allocate(Tag.FRAME, numValues + 1);
    }

    // extend a given environment by a new frame
    // creates a copy of an environment that is bigger by 1 frame slot than the previous env
    // and copies the frame addresses of the given env to the new env
    // then sets the address of te new frame to the end of the new env
    extendEnvironment(frameAddress: number, envAddress: number) {
        const oldSize = this.getSize(envAddress);
        // this has the increment by 1 because allocateEnvironment assumes 1 for itself
        const newEnvAddress = this.allocateEnvironment(oldSize);
        let i;
        for (i = 0; i < oldSize - 1; i++) {
            this.setChild(newEnvAddress, i, this.getChild(envAddress, i));
        }
        this.setChild(newEnvAddress, i, frameAddress);
        return newEnvAddress;
    }

    // Temporarily unused
    // TODO: Implement the environment visualization here
    //       Should probably have a separate class here? idk
    displayEnvironment(envAddress: number) {
        return undefined;
    }

    // *******************
    // Built-ins
    // *******************
    // [1 byte tag, 1 byte id, 3 bytes unused, 2 bytes #children, 1 byte unused]
    allocateBuiltin(id: number) {
        const address = this.allocate(Tag.BUILTIN, 1);
        this.setByteAtOffset(address, 1, id);
        return address;
    }

    getBuiltinId(address: number) {
        return this.getByteAtOffset(address, 1);
    }

    // *******************
    // Golang structures
    // *******************
    // [1 byte tag, 1 byte numFields, 2 bytes #children, 1 byte unused]
    allocateStruct(numFields: number) {
        const address = this.allocate(Tag.STRUCT, numFields + 1);
        return address;
    }

    setField(structAddress: number, fieldIndex: number, value: number) {
        this.setChild(structAddress, fieldIndex, value);
    }

    getField(structAddress: number, fieldIndex: number) {
        return this.getChild(structAddress, fieldIndex);
    }

    isStruct(address: number) {
        return this.getTag(address) === Tag.STRUCT;
    }

    // TODO: Implement slices
    //       Slices are resizable arrays.
    // TODO: Implement channels
    //       Channels are FIFO queues that can communicate with other goroutines
    // TODO: Implement maps
    //       Maps are simply a type of environments anyways

    allocateNumber(n: number) {
        const numAddress = this.allocate(Tag.NUMBER, 2);
        this.setWord(numAddress + 1, n);
        return numAddress;
    }

    isNumber(address: number) {
        return this.getTag(address) === Tag.NUMBER;
    }

    // *************************************
    // Conversions from TS and addresses
    // *************************************
    // TODO: Add the other golang structures
    //       Also should add strings (using string pooling homework)
    addressToTSValue(address: number) {
        // Error handling here
        if (address == -1) {
            return null;
        }
        if (this.isNull(address)) {
            return null;
        } else if (this.isBoolean(address)) {
            return this.isTrue(address);
        } else if (this.isUndefined(address)) {
            return undefined;
        } else if (this.isUnassigned(address)) {
            return '<unassigned>';
        } else if (this.isNumber(address)) {
            return this.getWord(address + 1);
        } else if (this.isBuiltin(address)) {
            return '<builtin>';
        } else if (this.isClosure(address)) {
            return '<closure>';
        } else if (this.isStruct(address)) {
            return '<struct>';
        } else {
            return 'unknown word tag: ' + this.wordToString(address);
        }
    }

    TSValueToAddress(value: any) {
        if (typeof value === 'boolean') {
            return value ? this.True : this.False;
        } else if (typeof value === 'number') {
            return this.allocateNumber(value);
        } else if (typeof value === 'undefined') {
            return this.Undefined;
        } else if (value === null) {
            // it already went past the undefined check, so this will only
            // return true for null
            // https://stackoverflow.com/questions/28975896/is-there-a-way-to-check-for-both-null-and-undefined
            return this.Null;
        } else {
            throw new Error('not implemented yet, value: ' + JSON.stringify(value, null, 2));
        }
    }

    // *******************
    // Garbage collection
    // *******************
    // Mark and sweep takes in a list of addresses which are denoted as the roots
    // which may include the OS, RTS and E.
    // This has further complications because each thread has its own E, OS and RTS so we must make
    // note to account for all active and inactive threads.
    // So we pass in a function which when invoked, will return the roots for the associated machine.

    private isHeapMarked(addr: number): boolean {
        return this.getTag(addr) < 0;
    }

    // Mark a node and return the original tag
    private heapMark(addr: number): number {
        const originalTag = this.getTag(addr);
        if (this.isHeapMarked(addr)) {
            return originalTag;
        }
        this.heap.setInt8(addr * wordSize, -1 - originalTag);
        return originalTag;
    }

    private heapUnmark(addr: number): number {
        if (!this.isHeapMarked(addr)) {
            return;
        }
        const markedTag = this.getTag(addr);
        this.heap.setInt8(addr * wordSize, -1 - markedTag);
    }

    private sweep() {
        let numFreed = 0;
        for (let i = 0; i <= this.numWords - nodeSize; i += nodeSize) {
            if (!this.isHeapMarked(i)) {
                this.freeMemory(i);
                numFreed += 1;
            } else {
                this.heapUnmark(i);
            }
        }
        log('Freed ' + numFreed + ' nodes after mark and sweep.');
    }

    mark(addr: number) {
        if (this.isHeapMarked(addr)) {
            return;
        }
        const originalTag: Tag = this.heapMark(addr);
        this.numMarked++;
        switch (originalTag) {
            case Tag.BLOCKFRAME:
                this.mark(this.getBlockframeEnvironment(addr));
                break;
            case Tag.CALLFRAME:
                this.mark(this.getCallframeEnvironment(addr));
                break;
            case Tag.CLOSURE:
                this.mark(this.getClosureEnvironment(addr));
                break;
            case Tag.STACK:
                // mark the value of the OS
                // also need to handle null value for base
                const value = this.getStackValue(addr);
                if (value != -1) {
                    this.mark(value);
                }
                // recursively go into the next stack without popping
                // need to handle base case of -1
                const parent = this.getChild(addr, 0);
                if (parent != -1) {
                    this.mark(parent);
                }
                break;
            case Tag.FRAME:
            case Tag.ENVIRONMENT:
                const numChildren = this.getNumChildren(addr);
                for (let i = 0; i < numChildren; i++) {
                    this.mark(this.getChild(addr, i));
                }
                break;
            default:
                return;
        }
    }

    markAndSweep(roots: number[]) {
        for (let root of roots) {
            this.mark(root);
        }
        for (let lit of this.literals) {
            this.heapMark(lit);
        }
        this.sweep();
        if (this.free === -1) {
            throw Error('Heap memory exhausted!');
        }
    }

    // Use the mark and sweep algorithm
    freeMemory(address: number) {
        // this sets the next ptr to free
        // then updates free to point to it, thus extending the linked list
        this.setWord(address, this.free);
        this.free = address;
        this.numUsedWords -= 1;
    }
}

function main() {}

main();
