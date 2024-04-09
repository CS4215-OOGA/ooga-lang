import * as fs from 'fs';
import * as util from 'util';
import { RoundRobinScheduler, Scheduler, ThreadId } from './oogavm-scheduler.js';
import { fileURLToPath } from 'url';
import debug from 'debug';
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
export let OS: number[] = [];
// PC represents the Program Counter. It is just an integer, we assume it is a PC register or something.
let PC: number;
// E represents the environment. It uses the address of E on the heap.
export let E: number[] = [];
// RTS represents the runtime stack. It uses the address of the RTS on the heap.
export let RTS: number[] = [];
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
let tempRoots: number[][] = [];
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
    _OS: number[];
    _E: number[];
    _PC: number;
    _RTS: number[];
    // TODO: Do this properly
    constructor(OS: number[], E: number[], PC: number, RTS: number[]) {
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

function newThread(newOS: number[], newRTS: number[], newPC: number, newE: number[]) {
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
    let thread = threads.get(currentThreadId)!;
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
        [OS[0], value] = popStack(OS[0]);
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
    // @ts-ignore
    const result = [builtinArray[builtinId]()];
    let _;
    [OS[0], _] = popStack(OS[0]); // pop fun
    tempRoots.push(result);
    OS[0] = pushStack(OS, result);
    tempRoots.pop();
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
function pushAddressOS(addr: number[]) {
    OS[0] = pushStack(OS, addr);
}
// Convert TS Value to address and then push onto stack
function pushTSValueOS(value: any) {
    // A bug can happen here because the heap.TSValueToAddr might cause a GC to happen,
    // which frees the memory at that address!
    let newValue = [TSValueToAddress(value)];
    tempRoots.push(newValue);
    // A GC may have happened inside the allocate to stack
    // and the address at newValue would have been freed!
    OS[0] = pushStack(OS, newValue);
    tempRoots.pop();
}

// Safe RTS Push, same issue with GC being called on the call frame just before
function safePushRTSCallFrame() {
    let newValue = [allocateCallFrame(E, PC)];
    tempRoots.push(newValue);
    RTS[0] = pushStack(RTS, newValue);
    tempRoots.pop();
}

function safePushRTSBlockFrame() {
    let newValue = [allocateBlockFrame(E)];
    tempRoots.push(newValue);
    RTS[0] = pushStack(RTS, newValue);
    tempRoots.pop();
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
        [OS[0], _] = popStack(OS[0]);
    },
    UNARY: instr => {
        let value;
        [OS[0], value] = popStack(OS[0]);
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
        [OS[0], right] = popStack(OS[0]);
        right = addressToTSValue(right);
        [OS[0], left] = popStack(OS[0]);
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
        [OS[0], right] = popStack(OS[0]);
        right = addressToTSValue(right);
        [OS[0], left] = popStack(OS[0]);
        left = addressToTSValue(left);
        const value = apply_logic(instr.operator, left, right);
        pushTSValueOS(value);
    },
    JOF: instr => {
        let value;
        [OS[0], value] = popStack(OS[0]);
        value = addressToTSValue(value);
        PC = value ? PC : instr.addr;
    },
    ENTER_SCOPE: instr => {
        safePushRTSBlockFrame();
        // This frame can also be lost
        const frameAddress = [allocateFrame(instr.num)];
        tempRoots.push(frameAddress);
        E[0] = extendEnvironment(frameAddress, E);
        tempRoots.pop();
        for (let i = 0; i < instr.num; i++) {
            // this is probably bad design because we are accessing the Unassigned
            setFrameValue(frameAddress[0], i, Unassigned);
        }
    },
    EXIT_SCOPE: instr => {
        let oldEnvAddr;
        [RTS[0], oldEnvAddr] = popStack(RTS[0]);
        E[0] = getBlockFrameEnvironment(oldEnvAddr);
    },
    GOTO: instr => {
        PC = instr.addr;
    },
    ASSIGN: instr => {
        let frameIndex = instr.pos[0];
        let valueIndex = instr.pos[1];
        let value;
        value = peekStack(OS[0]);
        log('Assigning value ' + value + ' to frame ' + frameIndex + ' value ' + valueIndex);
        setEnvironmentValue(E[0], frameIndex, valueIndex, value);
    },
    LD: instr => {
        let frameIndex = instr.pos[0];
        let valueIndex = instr.pos[1];
        const value = [getEnvironmentValue(E[0], frameIndex, valueIndex)];
        if (isUnassigned(value[0])) {
            throw Error('accessing an unassigned variable');
        }
        tempRoots.push(value);
        pushAddressOS(value);
        tempRoots.pop();
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
        const closureAddress = [allocateClosure(instr.arity, instr.addr, E)];
        tempRoots.push(closureAddress);
        pushAddressOS(closureAddress);
        tempRoots.pop();
    },
    CALL: instr => {
        const arity = instr.arity;
        // fun is the closure
        const fun = [peekStackN(OS[0], arity)];
        if (isBuiltin(fun[0])) {
            return applyBuiltin(getBuiltinID(fun[0]));
        }
        tempRoots.push(fun);
        let newPC = getClosurePC(fun[0]);
        const newFrame = [allocateFrame(arity)];
        tempRoots.push(newFrame);
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS[0], value] = popStack(OS[0]);
            setFrameValue(newFrame[0], i, value);
        }
        safePushRTSCallFrame();
        let _; // wow can't do _ in typescript =.=
        [OS[0], _] = popStack(OS[0]); // pop fun
        const closureEnv = [getClosureEnvironment(fun[0])];
        tempRoots.push(closureEnv);
        E[0] = extendEnvironment(newFrame, closureEnv);
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
        log('newPC = ' + newPC);
        log('PC = ' + PC);
        PC = newPC;
    },
    TAIL_CALL: instr => {
        const arity = instr.arity;
        // fun is the closure
        const fun = [peekStackN(OS[0], arity)];
        tempRoots.push(fun);
        if (isBuiltin(fun[0])) {
            return applyBuiltin(getBuiltinID(fun[0]));
        }

        const newPC = getClosurePC(fun[0]);
        const newFrame = [allocateFrame(arity)];
        tempRoots.push(newFrame);
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS[0], value] = popStack(OS[0]);
            setFrameValue(newFrame[0], i, value);
        }
        // No pushing onto RTS
        let _; // wow can't do _ in typescript =.=
        [OS[0], _] = popStack(OS[0]); // pop fun
        const closureEnv = [getClosureEnvironment(fun[0])];
        tempRoots.push(closureEnv);
        E[0] = extendEnvironment(newFrame, closureEnv);
        tempRoots.pop();
        tempRoots.pop();
        PC = newPC;
    },
    RESET: instr => {
        let topFrame;
        // keep popping until topFrame is a callFrame
        // We cannot do it the same way as the homework because now we have time quantum, and resetting really isn't
        // a thread operation.
        do {
            [RTS[0], topFrame] = popStack(RTS[0]);
        } while (!isCallFrame(topFrame));
        // At this point, either it is a call frame or our program has crashed.
        PC = getCallFramePC(topFrame);
        E[0] = getCallFrameEnvironment(topFrame);
    },
    NEW_THREAD: instr => {
        // Expects a closure on operand stack
        let closure = [peekStackN(OS[0], instr.arity)];
        tempRoots.push(closure);
        log('Closure: ' + closure);
        if (!isClosure(closure[0])) {
            throw Error('NOT A CLOSURE!!!!!!!!!!!!!!!');
        }
        log('Creating new thread with closure ' + closure);
        // allocate new OS and RTS for the new thread
        // there is a danger that the newRTS initialization can cause newOS to be
        // freed, so we must set newOS as a tempRoot here
        let newOS = [initializeStack()];
        tempRoots.push(newOS);
        let newRTS = [initializeStack()];
        tempRoots.push(newRTS);
        // call closure using new operand and runtime stack
        let newPC = getClosurePC(closure[0]);
        let arity = instr.arity;
        // likewise this newFrame allocation can free newOS and newRTS
        // so we make sure to temporarily make both tempRoots
        // arity can become undefined
        log('Arity is : ' + arity);
        // FIXME: Temporarily bandaid
        if (arity === undefined) {
            arity = 0;
        }
        const newFrame = [allocateFrame(arity)];
        tempRoots.push(newFrame);
        // pop values from the old OS
        log('Arity is ' + arity);
        for (let i = arity - 1; i >= 0; i--) {
            let value;
            [OS[0], value] = popStack(OS[0]);
            log('Heap value is ' + value);
            log('TS value is ' + addressToTSValue(value));
            setFrameValue(newFrame[0], i, value);
        }
        const closureEnv = [getClosureEnvironment(closure[0])];
        tempRoots.push(closureEnv);
        let newE = [extendEnvironment(newFrame, closureEnv)];
        tempRoots.push(newE);
        let _;
        [OS[0], _] = popStack(OS[0]); // pop fun
        pushTSValueOS(true);
        // Setting the goroutine to jump to current PC which is not incremented by 1
        // means it will kill itself when it reaches RESET
        // this newRTS needs to be handled the same way!
        let newCallFrame = [allocateCallFrame(E, PC)];
        tempRoots.push(newCallFrame);
        newRTS[0] = pushStack(newRTS, newCallFrame);
        newThread(newOS, newRTS, newPC, newE);
        PC++; // avoid stepping onto DONE as the original thread.
        timeoutThread();
        // finally we can reset the temp roots
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
        tempRoots.pop();
    },
    NEW_STRUCT: instr => {
        const structAddress = [allocateStruct(instr.numFields)];
        log('Struct address is ' + structAddress);
        tempRoots.push(structAddress);
        pushAddressOS(structAddress);
        tempRoots.pop();
    },
    INIT_FIELD: instr => {
        let fieldValue;
        [OS[0], fieldValue] = popStack(OS[0]); // Next, the value to be set for the field
        log('Field value is ' + addressToTSValue(fieldValue));
        let structAddress: number[] = [];
        [OS[0], structAddress[0]] = popStack(OS[0]); // Assuming struct is on top of OS
        log('Struct address is ' + structAddress);
        log('Field index is ' + instr.fieldIndex);
        log('Field value is ' + fieldValue);
        setField(structAddress[0], instr.fieldIndex, fieldValue);
        tempRoots.push(structAddress);
        pushAddressOS(structAddress);
        tempRoots.pop();
    },
    ACCESS_FIELD: instr => {
        let fieldIndex;
        [OS[0], fieldIndex] = popStack(OS[0]);
        fieldIndex = addressToTSValue(fieldIndex);
        log('Field index is ' + fieldIndex);
        let structAddress;
        [OS[0], structAddress] = popStack(OS[0]);
        log('Struct address is ' + structAddress);
        let fieldValue = [getField(structAddress, fieldIndex)];
        log('Field value is ' + fieldValue);
        tempRoots.push(fieldValue);
        OS[0] = pushStack(OS, fieldValue);
        tempRoots.pop();
    },
    SET_FIELD: instr => {
        let fieldIndex;
        [OS[0], fieldIndex] = popStack(OS[0]);
        fieldIndex = addressToTSValue(fieldIndex);
        let structAddress: number[] = [];
        [OS[0], structAddress[0]] = popStack(OS[0]);
        let fieldValue;
        [OS[0], fieldValue] = popStack(OS[0]);
        setField(structAddress[0], fieldIndex, fieldValue);
        tempRoots.push(structAddress);
        pushAddressOS(structAddress);
        tempRoots.pop();
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

export function getRoots(): number[][] {
    // @ts-ignore
    let roots: number[][] = [];
    for (let tempRoot of tempRoots) {
        roots.push(tempRoot);
    }
    // we have to ignore the current thread because it's not updated!
    // make sure to use updated values here
    roots.push([builtinsFrame]);
    roots.push(E);
    roots.push(OS);
    roots.push(RTS);
    roots.push([originalE]);
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

function updateRoots(roots, mapping) {
    for (let root of roots) {
        root[0] = mapping.get(root[0]);
    }
}

function initialize(numWords = 1000000) {
    // TODO: Figure out an appropriate number of words
    // There is definitely some bug with the memory management!
    constructHeap(numWords, updateRoots);
    PC = 0;
    OS[0] = initializeStack();
    RTS[0] = initializeStack();
    builtinsFrame = initializeBuiltins();
    originalE = allocateEnvironment(0);
    E[0] = extendEnvironment([builtinsFrame], originalE);
    running = true;
    State = ProgramState.NORMAL;
    initScheduler();
    log('After initializing: ');
    printHeapUsage();
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
    log('RTS: ' + RTS[0]);
    log('OS: ' + OS[0]);
    log('E: ' + E[0]);
    log('PC: ' + PC);
    debugHeap();
    // printOSStack();
    // printHeapUsage();
    // printStringPoolMapping();
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
    const returnValue = addressToTSValue(peekStack(OS[0]));
    log('Program value is ' + returnValue);
    log('After STD initialization: ');
    printHeapUsage();
    log('Return value: ' + returnValue);
    return returnValue;
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
    let currOS = OS[0];
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

// @ts-ignore
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error(err);
    });
}
