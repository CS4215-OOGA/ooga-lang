import * as fs from 'fs';
import * as util from 'util';
import { RoundRobinScheduler, Scheduler, ThreadId } from './oogavm-scheduler.js';
import { fileURLToPath } from 'url';
import debug from 'debug';
import { HeapDeadError, HeapOutOfMemoryError } from './oogavm-errors.js';
import {
    addressToTSValue,
    allocateBlockFrame,
    allocateBuiltin,
    allocateCallFrame,
    allocateClosure,
    allocateEnvironment,
    allocateFrame,
    allocateStruct,
    constructHeap,
    debugHeap,
    extendEnvironment,
    getBlockFrameEnvironment,
    getBuiltinID,
    getCallFrameEnvironment,
    getCallFramePC,
    getClosureEnvironment,
    getClosurePC,
    getEnvironmentValue,
    getField,
    getPrevStackAddress,
    initializeStack,
    isBuiltin,
    isCallFrame,
    isClosure,
    isUnassigned,
    peekStack,
    peekStackN,
    popStack,
    printHeapUsage,
    printStringPoolMapping,
    pushStack,
    setEnvironmentValue,
    setField,
    setFrameValue,
    TSValueToAddress,
    Unassigned,
    Undefined,
} from './oogavm-heap.js';

const log = debug('ooga:vm');

const readFileAsync = util.promisify(fs.readFile);

// ****************************
// Machine 'registers'
// ****************************

// OS represents the operand stack. It uses the address of the OS on the heap.
export let OS: number;
// PC represents the Program Counter. It is just an integer, we assume it is a PC register or something.
let PC: number;
// E represents the environment. It uses the address of E on the heap.
export let E: number;
// RTS represents the runtime stack. It uses the address of the RTS on the heap.
export let RTS: number;
// instrs represents the program instructions.
let instrs: any[];
// TimeQuanta represents the current time quantum for the current running thread
let TimeQuanta: number;
// Indicates whether the machine is currently running.
// Needed because with concurrency, no longer sufficient to check for a DONE
let running: boolean;
// State of the machine. Used to handle runtime errors reporting.
let State: ProgramState;
// Built-in-frame environment
let builtinsFrame: number;
// Temporary value stored as a root to prevent freeing!
// Using a list doesn't work for some reason...
// Javascript is retarded
let tempRoot0: number = -1;
let tempRoot1: number = -1;
let tempRoot2: number = -1;
let tempRoot3: number = -1;
let tempRoot4: number = -1;
// Flag to indicate "true concurrency"
let isAtomicSection: boolean = false;

enum ProgramState {
    NORMAL,
    // TODO: Would this actually be useful? We should make the assumption that this was done at compile time
    TYPE_ERROR,
    DIV_ERROR,
}

// The Thread class holds its own local copies of OS, PC
// When instantiated, it expects a closure on the Operand stack as described in the lecture notes.
// The operand and runtime stack are initialized to be empty stacks.
export class Thread {
    _OS: number;
    _E: number;
    _PC: number;
    _RTS: number;
    // TODO: Do this properly
    constructor(OS: number, E: number, PC: number, RTS: number) {
        this._OS = OS;
        this._E = E;
        this._PC = PC;
        this._RTS = RTS;
    }
}

// ******************
// Concurrency
// ******************

let scheduler: Scheduler;
const threads: Map<ThreadId, Thread> = new Map<ThreadId, Thread>();
let currentThreadId: ThreadId;
let mainThreadId: ThreadId;

function initScheduler() {
    scheduler = new RoundRobinScheduler();
    threads.clear();
    mainThreadId = scheduler.newThread(); // main thread
    const [newMainThreadId, newTimeQuanta] = scheduler.runThread(); // main thread
    mainThreadId = newMainThreadId;
    TimeQuanta = newTimeQuanta;
    threads.set(mainThreadId, new Thread(OS, E, PC, RTS));
    currentThreadId = mainThreadId;
}

function newThread(newOS: number, newRTS: number, newPC: number, newE: number) {
    const newThreadId = scheduler.newThread();
    threads.set(newThreadId, new Thread(newOS, newE, newPC, newRTS));
}

function pauseThread() {
    // save current state
    threads.set(currentThreadId, new Thread(OS, E, PC, RTS));
    scheduler.pauseThread(currentThreadId);
}

function deleteThread() {
    threads.delete(currentThreadId);
    scheduler.deleteCurrentThread(currentThreadId);
    currentThreadId = -1;
}

function runThread() {
    [currentThreadId, TimeQuanta] = scheduler.runThread();
    // TODO: Load thread state
    let thread = threads.get(currentThreadId);
    OS = thread._OS;
    PC = thread._PC;
    RTS = thread._RTS;
    E = thread._E;
}

function timeoutThread() {
    // Don't waste time if only a single thread
    if (threads.size === 1) {
        TimeQuanta = scheduler.getMaxTimeQuanta();
        return;
    }
    pauseThread();
    runThread();
}

const push = (array, ...items) => {
    array.splice(array.length, 0, ...items);
    return array;
};

// return last element without modifying array
const peek = array => array.slice(-1)[0];

// *******************************
// Built-ins: binops, unops
// *******************************

// builtin_mappings is exported to allow compile time environment position look up
// at compile time. They pop directly from the OS to avoid having to create an extra
// frame call.
// oogavm differs from the javascript hw impl in that we do a "hacky" compile time env
// in that its not actually compiled.
export const builtinMappings = {
    print: () => {
        let value: any;
        log('print sys call');
        [OS, value] = popStack(OS);
        console.log(addressToTSValue(value));
        return value;
    },
    // "make": () => {
    //   // TODO: Support channels as priority number 1
    // }
};

let builtins = {};
// The array is required cos we are using CTE which is indexed by integers
let builtinArray: object[] = [];

// This method is called by both Compilation and Machine at runtime
export function initializeBuiltinTable() {
    let i = 0;
    for (const key in builtinMappings) {
        builtins[key] = {
            tag: 'BUILTIN',
            id: i,
            arity: builtinMappings[key].length,
        };
        builtinArray[i++] = builtinMappings[key];
    }
}

function applyBuiltin(builtinId: number) {
    const result = builtinArray[builtinId]();
    let _;
    [OS, _] = popStack(OS); // pop fun
    OS = pushStack(OS, result);
}

function apply_binop(sym: string, left: any, right: any) {
    switch (sym) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            return left / right;
        default:
            // FIXME: Propagate error properly to the VM
            console.error('Unsupported type!');
    }
}

function apply_logic(sym: string, left: any, right: any) {
    switch (sym) {
        case '!=':
            return left != right;
        case '==':
            return left == right;
        case '>=':
            return left >= right;
        case '>':
            return left > right;
        case '<=':
            return left <= right;
        case '<':
            return left < right;
        case '&&':
            return left && right;
        case '||':
            return left || right;
        default:
            throw Error('LOGIC ERROR');
    }
}

function apply_unop(sym: string, value: any) {
    switch (sym) {
        case '++':
            return value + 1;
        case '--':
            return value - 1;
        case '-':
            return -value;
        case '!':
            return !value;
        default:
            throw Error('UNOP ERROR');
    }
}

// **********************************************
// Helper methods for interfacing with heap
// **********************************************

// NOTE to self: So we interface with the OS by pushing LDC which is using TSValueToAddress.
// When we get back the values, to do any meaningful form of computation, we need to convert them back to TS value
// and then convert it back to a heap address!

// There are also a suite of GC safe allocations here.

// Push the raw heap address onto the OS
function pushAddressOS(addr: any) {
    OS = pushStack(OS, addr);
}
// Convert TS Value to address and then push onto stack
function pushTSValueOS(value: any) {
    // A bug can happen here because the heap.TSValueToAddr might cause a GC to happen,
    // which frees the memory at that address!
    let newValue = TSValueToAddress(value);
    tempRoot0 = newValue;
    // A GC may have happened inside the allocate to stack
    // and the address at newValue would have been freed!
    OS = pushStack(OS, newValue);
    tempRoot0 = -1;
}

// Safe RTS Push, same issue with GC being called on the call frame just before
function safePushRTSCallFrame() {
    let newValue = allocateCallFrame(E, PC);
    tempRoot0 = newValue;
    RTS = pushStack(RTS, newValue);
    tempRoot0 = -1;
}

function safePushRTSBlockFrame() {
    let newValue = allocateBlockFrame(E);
    tempRoot0 = newValue;
    RTS = pushStack(RTS, newValue);
    tempRoot0 = -1;
}

// NOTE: I'd really like to use the enum values but for some reason, they aren't allowed in the key of the map =.=
const microcode = {
    LDCI: instr => {
        pushTSValueOS(instr.val);
    },
    LDBI: instr => {
        pushTSValueOS(instr.val);
    },
    LDU: instr => {
        pushTSValueOS(Undefined);
    },
    LDCS: instr => {
        pushTSValueOS(instr.val);
    },
    POP: instr => {
        let _;
        [OS, _] = popStack(OS);
    },
    UNARY: instr => {
        let value;
        [OS, value] = popStack(OS);
        value = addressToTSValue(value);
        value = apply_unop(instr.operator, value);
        log('Value of unop is ' + value);
        pushTSValueOS(value);
    },
    BINOP: instr => {
        let left;
        let right;
        // NOTE: At the moment, this is kinda wonky. There may be a cleaner way to express this
        // But the tuple return value is definitely necessary, so I am not so sure how to make this look nicer
        [OS, right] = popStack(OS);
        right = addressToTSValue(right);
        [OS, left] = popStack(OS);
        left = addressToTSValue(left);
        log(`Left is ${left} and right is ${right}, operator is ${instr.operator}`);
        const value = apply_binop(instr.operator, left, right);
        pushTSValueOS(value);
    },
    LOG: instr => {
        let left;
        let right;
        // NOTE: At the moment, this is kinda wonky. There may be a cleaner way to express this
        // But the tuple return value is definitely necessary, so I am not so sure how to make this look nicer
        [OS, right] = popStack(OS);
        right = addressToTSValue(right);
        [OS, left] = popStack(OS);
        left = addressToTSValue(left);
        const value = apply_logic(instr.operator, left, right);
        pushTSValueOS(value);
    },
    JOF: instr => {
        let value;
        [OS, value] = popStack(OS);
        value = addressToTSValue(value);
        PC = value ? PC : instr.addr;
    },
    ENTER_SCOPE: instr => {
        safePushRTSBlockFrame();
        // This frame can also be lost
        const frameAddress = allocateFrame(instr.num);
        tempRoot0 = frameAddress;
        E = extendEnvironment(frameAddress, E);
        tempRoot0 = -1;
        for (let i = 0; i < instr.num; i++) {
            // this is probably bad design because we are accessing the Unassigned
            setFrameValue(frameAddress, i, Unassigned);
        }
    },
    EXIT_SCOPE: instr => {
        let oldEnvAddr;
        [RTS, oldEnvAddr] = popStack(RTS);
        E = getBlockFrameEnvironment(oldEnvAddr);
    },
    GOTO: instr => {
        PC = instr.addr;
    },
    ASSIGN: instr => {
        let frameIndex = instr.pos[0];
        let valueIndex = instr.pos[1];
        let value;
        value = peekStack(OS);
        log('Assigning value ' + value + ' to frame ' + frameIndex + ' value ' + valueIndex);
        setEnvironmentValue(E, frameIndex, valueIndex, value);
    },
    LD: instr => {
        let frameIndex = instr.pos[0];
        let valueIndex = instr.pos[1];
        const value = getEnvironmentValue(E, frameIndex, valueIndex);
        if (isUnassigned(value)) {
            throw Error('accessing an unassigned variable');
        }
        pushAddressOS(value);
    },
    DONE: instr => {
        // Stop the program if the main thread reaches the DONE. Else terminate the thread
        // and switch over to the next available one.
        if (currentThreadId === mainThreadId) {
            running = false;
        } else {
            deleteThread();
            runThread();
        }
    },
    LDF: instr => {
        const closureAddress = allocateClosure(instr.arity, instr.addr, E);
        tempRoot0 = closureAddress;
        pushAddressOS(closureAddress);
        tempRoot0 = -1;
    },
    CALL: instr => {
        const arity = instr.arity;
        // fun is the closure
        const fun = peekStackN(OS, arity);
        if (isBuiltin(fun)) {
            return applyBuiltin(getBuiltinID(fun));
        }

        let newPC = getClosurePC(fun);
        const newFrame = allocateFrame(arity);
        tempRoot1 = newFrame;
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS, value] = popStack(OS);
            setFrameValue(newFrame, i, value);
        }
        safePushRTSCallFrame();
        let _; // wow can't do _ in typescript =.=
        [OS, _] = popStack(OS); // pop fun
        E = extendEnvironment(newFrame, getClosureEnvironment(fun));
        tempRoot1 = -1;
        log('newPC = ' + newPC);
        log('PC = ' + PC);
        PC = newPC;
    },
    TAIL_CALL: instr => {
        const arity = instr.arity;
        // fun is the closure
        const fun = peekStackN(OS, arity);
        if (isBuiltin(fun)) {
            return applyBuiltin(getBuiltinID(fun));
        }
        const newPC = getClosurePC(fun);
        const newFrame = allocateFrame(arity);
        tempRoot1 = newFrame;
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS, value] = popStack(OS);
            setFrameValue(newFrame, i, value);
        }
        // No pushing onto RTS
        let _; // wow can't do _ in typescript =.=
        [OS, _] = popStack(OS); // pop fun
        E = extendEnvironment(newFrame, getClosureEnvironment(fun));
        tempRoot1 = -1;
        PC = newPC;
    },
    RESET: instr => {
        let topFrame;
        // keep popping until topFrame is a callFrame
        // We cannot do it the same way as the homework because now we have time quantum, and resetting really isn't
        // a thread operation.
        do {
            [RTS, topFrame] = popStack(RTS);
        } while (!isCallFrame(topFrame));
        // At this point, either it is a call frame or our program has crashed.
        PC = getCallFramePC(topFrame);
        E = getCallFrameEnvironment(topFrame);
    },
    NEW_THREAD: instr => {
        // Expects a closure on operand stack
        let closure = peekStackN(OS, instr.arity);
        log('Closure: ' + closure);
        if (!isClosure(closure)) {
            throw Error('NOT A CLOSURE!!!!!!!!!!!!!!!');
        }
        log('Creating new thread with closure ' + closure);
        // allocate new OS and RTS for the new thread
        // there is a danger that the newRTS initialization can cause newOS to be
        // freed, so we must set newOS as a tempRoot here
        let newOS = initializeStack();
        tempRoot0 = newOS;
        let newRTS = initializeStack();
        tempRoot1 = newRTS;
        // call closure using new operand and runtime stack
        let newPC = getClosurePC(closure);
        let arity = instr.arity;
        // likewise this newFrame allocation can free newOS and newRTS
        // so we make sure to temporarily make both tempRoots
        // arity can become undefined
        log('Arity is : ' + arity);
        // FIXME: Temporarily bandaid
        if (arity === undefined) {
            arity = 0;
        }
        const newFrame = allocateFrame(arity);
        tempRoot2 = newFrame;
        // pop values from the old OS
        log('Arity is ' + arity);
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS, value] = popStack(OS);
            log('Heap value is ' + value);
            log('TS value is ' + addressToTSValue(value));
            setFrameValue(newFrame, i, value);
        }
        let newE = extendEnvironment(newFrame, getClosureEnvironment(closure));
        tempRoot3 = newE;
        let _;
        [OS, _] = popStack(OS); // pop fun
        pushTSValueOS(true);
        // Setting the goroutine to jump to current PC which is not incremented by 1
        // means it will kill itself when it reaches RESET
        // this newRTS needs to be handled the same way!
        let newCallFrame = allocateCallFrame(E, PC);
        tempRoot4 = newCallFrame;
        newRTS = pushStack(newRTS, newCallFrame);
        newThread(newOS, newRTS, newPC, newE);
        PC++; // avoid stepping onto DONE as the original thread.
        timeoutThread();
        // finally we can reset the temp roots
        tempRoot0 = -1;
        tempRoot1 = -1;
        tempRoot2 = -1;
        tempRoot3 = -1;
        tempRoot4 = -1;
    },
    NEW_STRUCT: instr => {
        const structAddress = allocateStruct(instr.numFields);
        log('Struct address is ' + structAddress);
        tempRoot0 = structAddress;
        pushAddressOS(structAddress);
        tempRoot0 = -1; // Clear the temp root
    },
    INIT_FIELD: instr => {
        let fieldValue;
        [OS, fieldValue] = popStack(OS); // Next, the value to be set for the field
        log('Field value is ' + addressToTSValue(fieldValue));
        let structAddress;
        [OS, structAddress] = popStack(OS); // Assuming struct is on top of OS
        log('Struct address is ' + structAddress);
        log('Field index is ' + instr.fieldIndex);
        log('Field value is ' + fieldValue);
        setField(structAddress, instr.fieldIndex, fieldValue);
        pushAddressOS(structAddress); // Push back the struct address if necessary, or adjust as per your design
    },
    ACCESS_FIELD: instr => {
        let fieldIndex;
        [OS, fieldIndex] = popStack(OS);
        fieldIndex = addressToTSValue(fieldIndex);
        log('Field index is ' + fieldIndex);
        let structAddress;
        [OS, structAddress] = popStack(OS);
        log('Struct address is ' + structAddress);
        let fieldValue = getField(structAddress, fieldIndex);
        log('Field value is ' + fieldValue);
        OS = pushStack(OS, fieldValue);
    },
    SET_FIELD: instr => {
        let fieldIndex;
        [OS, fieldIndex] = popStack(OS);
        fieldIndex = addressToTSValue(fieldIndex);
        let structAddress;
        [OS, structAddress] = popStack(OS);
        let fieldValue;
        [OS, fieldValue] = popStack(OS);
        setField(structAddress, fieldIndex, fieldValue);
        pushAddressOS(structAddress);
    },
    START_ATOMIC: instr => {
        isAtomicSection = true;
    },
    END_ATOMIC: instr => {
        isAtomicSection = false;
    },
};

// ********************************
// Garbage collection
// ********************************

export function getRoots(): number[] {
    // @ts-ignore
    let roots: number[] = [];
    // No.
    // Using a list has "context" issues.
    if (tempRoot0 != -1) {
        roots.push(tempRoot0);
    }
    if (tempRoot1 != -1) {
        roots.push(tempRoot1);
    }
    if (tempRoot2 != -1) {
        roots.push(tempRoot2);
    }
    if (tempRoot3 != -1) {
        roots.push(tempRoot3);
    }
    if (tempRoot4 != -1) {
        roots.push(tempRoot4);
    }
    // we have to ignore the current thread because it's not updated!
    // make sure to use updated values here
    roots.push(builtinsFrame);
    roots.push(E);
    roots.push(OS);
    roots.push(RTS);
    roots.push(originalE);
    // @ts-ignore
    for (let [threadId, thread] of threads.entries()) {
        if (threadId == currentThreadId) {
            continue;
        }
        roots.push(thread._OS);
        roots.push(thread._E);
        roots.push(thread._RTS);
    }
    return roots;
}

// ****************************************
// Initialization
// ****************************************
// Called before the machine runs a program

let originalE;

function updateRoots(newE: number, newOS: number, newRTS: number) {
    log('original E = ' + E + ' is updated to ' + newE);
    E = newE;
    log('original OS = ' + OS + ' is updated to ' + newOS);
    OS = newOS;
    log('original RTS = ' + RTS + ' is updated to ' + newRTS);
    RTS = newRTS;
}

function initialize(numWords = 1000000) {
    // TODO: Figure out an appropriate number of words
    // There is definitely some bug with the memory management!
    constructHeap(numWords, updateRoots);
    PC = 0;
    OS = initializeStack();
    RTS = initializeStack();
    builtinsFrame = initializeBuiltins();
    originalE = allocateEnvironment(0);
    E = extendEnvironment(builtinsFrame, originalE);
    running = true;
    State = ProgramState.NORMAL;
    initScheduler();
}

function initializeBuiltins() {
    initializeBuiltinTable();
    const builtinValues = Object.values(builtins);
    const frameAddress = allocateFrame(builtinValues.length);
    for (let i = 0; i < builtinValues.length; i++) {
        const builtin = builtinValues[i];
        // @ts-ignore
        setFrameValue(frameAddress, i, allocateBuiltin(builtin.id));
    }
    return frameAddress;
}

// Run a single instruction, for concurrent execution.
function runInstruction() {
    log('Running instruction ' + PC);
    const instr = instrs[PC++];
    log(instr);
    microcode[instr.tag](instr);
    if (!isAtomicSection) {
        TimeQuanta--;
    }
    log('RTS: ' + RTS);
    log('OS: ' + OS);
    log('E: ' + E);
    log('PC: ' + E);
    debugHeap();
    printOSStack();
    printHeapUsage();
    printStringPoolMapping();
}

// TODO: Switch to low level memory representation
export function run(numWords = 1000000) {
    initialize(numWords);
    while (running) {
        // Handle concurrency
        if (TimeQuanta > 0) {
            // printOSStack();
            runInstruction();
        } else if (TimeQuanta === 0) {
            timeoutThread();
        } else {
            throw Error('TimeQuanta cannot be negative. Something has gone horribly wrong.');
        }
        // Handle errors
        if (State !== ProgramState.NORMAL) {
            throw Error('execution aborted due to: ' + getErrorType());
        }
    }
    log('Program value is ' + addressToTSValue(peekStack(OS)));
    return addressToTSValue(peekStack(OS));
}

function getErrorType(): string {
    // TODO: Enumerate all possible runtime errors here
    switch (State) {
        case ProgramState.DIV_ERROR:
            return `Division by 0`;
        case ProgramState.TYPE_ERROR:
            return `Not sure if this should happen here`;
        default:
            return 'illegal error type';
    }
}

// ****************
// Debug
// ****************

// Helper method to print the actual typescript value of the heap address
function printHeapValue(addr: number) {}

// Helper method to print all values of the OS
function printOSStack() {
    log('Printing OS Stack...');
    let currOS = OS;
    while (currOS != -1) {
        log('****************************');
        log('currOS');
        log(currOS);
        let value: any = addressToTSValue(peekStack(currOS));
        log('TS Value');
        log(value);
        log('Raw Value');
        value = peekStack(currOS);
        log(value);
        currOS = getPrevStackAddress(currOS);
        log('****************************');
    }
    log('Done printing OS Stack...');
}

export function processByteCode(bytecode: string) {
    bytecode = bytecode.trimStart();
    bytecode = bytecode.trimEnd();
    // Preserve newlines, etc. - use valid JSON
    bytecode = bytecode
        .replace(/\\n/g, '\\n')
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, '\\&')
        .replace(/\\r/g, '\\r')
        .replace(/\\t/g, '\\t')
        .replace(/\\b/g, '\\b')
        .replace(/\\f/g, '\\f');
    instrs = bytecode.split(/\r?\n/);
    instrs = instrs.map(line => {
        try {
            const parsedLine = JSON.parse(line);
            return parsedLine;
        } catch (error) {
            console.error('Error parsing', line);
        }
    });
}

async function main() {
    if (process.argv.length != 3) {
        console.error('Usage: oogavm-machine <input-file>');
        return;
    }
    const inputFilename = process.argv[2];
    let bytecode = await readFileAsync(inputFilename, 'utf8');
    processByteCode(bytecode);
    return run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error(err);
    });
}
