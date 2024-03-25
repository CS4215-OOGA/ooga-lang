import * as fs from 'fs';
import * as util from "util";
import {RoundRobinScheduler, Scheduler, ThreadId} from "./oogavm-scheduler.js";
import {Heap} from "./oogavm-memory.js";

const readFileAsync = util.promisify(fs.readFile);


// ****************************
// Machine 'registers'
// ****************************

// OS represents the operand stack. It uses the address of the OS on the heap.
let OS;
// PC represents the Program Counter. It is just an integer, we assume it is a PC register or something.
let PC;
// E represents the environment. It uses the address of E on the heap.
let E;
// RTS represents the runtime stack. It uses the address of the RTS on the heap.
let RTS;
// instrs represents the program instructions.
let instrs;
// TimeQuanta represents the current time quantum for the current running thread
let TimeQuanta;
// Indicates whether the machine is currently running.
// Needed because with concurrency, no longer sufficient to check for a DONE
let running;
// The heap that contains all memory related operations.
let heap: Heap;
// State of the machine. Used to handle runtime errors reporting.
let State: ProgramState;

enum ProgramState {
  NORMAL,
  // TODO: Would this actually be useful? We should make the assumption that this was done at compile time
  TYPE_ERROR,
  DIV_ERROR,
}

// The Thread class holds its own local copies of OS, PC
// When instantiated, it expects a closure on the Operand stack as described in the lecture notes.
// The operand and runtime stack are initialized to be empty stacks.
class Thread {
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

function initScheduler() {
  scheduler = new RoundRobinScheduler();
  threads.clear();
  currentThreadId = scheduler.newThread(); // main thread
  TimeQuanta = scheduler.getMaxTimeQuanta();
}

function newThread() {
  const newThreadId = scheduler.newThread();
  threads.set(newThreadId, new Thread(OS, E, PC, RTS));
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
}

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
  "print": () => {
    let value: any;
    console.log("print sys call");
    [OS, value] = heap.popStack(OS);
    console.log(heap.addressToTSValue(value));
    return value;
  },
  // "make": () => {
  //   // TODO: Support channels as priority number 1
  // }
}

let builtins = {};
// The array is required cos we are using CTE which is indexed by integers
let builtinArray = [];

{
  console.log("Initializing builtin");
  let i = 0;
  for (const key in builtinMappings) {
    builtins[key] = {
      tag: "BUILTIN",
      id: i,
      arity: builtinMappings[key].length
    }
    builtinArray[i++] = builtinMappings[key];
  }
}

function applyBuiltin(builtinId: number) {
  const result = builtinArray[builtinId]();
  let _;
  [OS, _] = heap.popStack(OS); // pop fun
  OS = heap.pushStack(OS, result);
}

function apply_binop(sym: string, left: any, right: any) {
  switch (sym) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    default:
      // FIXME: Propagate error properly to the VM
      console.error("Unsupported type!");
  }
}

function apply_logic(sym: string, left: any, right: any) {
  switch (sym) {
    case "!=":
      return left != right;
    case "==":
      return left == right;
      case ">=":
      return left >= right;
      case ">":
      return left > right;
      case "<=":
      return left <= right;
      case "<":
      return left < right;
    default:
      throw Error("LOGIC ERROR");
  }
}

function apply_unop(sym: string, value: any) {
  switch (sym) {
    default:
      throw Error("UNOP ERROR");
  }
}

// **********************************************
// Helper methods for interfacing with heap
// **********************************************

// NOTE to self: So we interface with the OS by pushing LDC which is using TSValueToAddress.
// When we get back the values, to do any meaningful form of computation, we need to convert them back to TS value
// and then convert it back to a heap address!

// Push the raw heap address onto the OS
function pushAddressOS(addr: any) {
  OS = heap.pushStack(OS, addr);
}
// Convert TS Value to address and then push onto stack
function pushTSValueOS(value: any) {
  OS = heap.pushStack(OS, heap.TSValueToAddress(value));
}

// NOTE: I'd really like to use the enum values but for some reason, they aren't allowed in the key of the map =.=
const microcode = {
  "LDCI": instr => {
    pushTSValueOS(instr.val);
  },
  "LDBI": instr => {
    pushTSValueOS(instr.val);
  },
  "LDU": instr => {
    pushTSValueOS(heap.Undefined);
  },
  "POP": instr => {
    let _;
    [OS, _] = heap.popStack(OS);
  },
  "BINOP": instr => {
    let left;
    let right;
    // NOTE: At the moment, this is kinda wonky. There may be a cleaner way to express this
    // But the tuple return value is definitely necessary, so I am not so sure how to make this look nicer
    [OS, right] = heap.popStack(OS);
    right = heap.addressToTSValue(right);
    [OS, left] = heap.popStack(OS);
    left = heap.addressToTSValue(left);
    const value = apply_binop(instr.operator, left, right);
    pushTSValueOS(value);
  },
  "LOG": instr => {
    let left;
    let right;
    // NOTE: At the moment, this is kinda wonky. There may be a cleaner way to express this
    // But the tuple return value is definitely necessary, so I am not so sure how to make this look nicer
    [OS, right] = heap.popStack(OS);
    right = heap.addressToTSValue(right);
    [OS, left] = heap.popStack(OS);
    left = heap.addressToTSValue(left);
    const value = apply_logic(instr.operator, left, right);
    pushTSValueOS(value);
  },
  "JOF": instr => {
    let value;
    [OS, value] = heap.popStack(OS);
    value = heap.addressToTSValue(value);
    PC = (value) ? PC : instr.addr;
  },
  "ENTER_SCOPE": instr => {
    RTS = heap.pushStack(RTS, heap.allocateBlockframe(E));
    const frameAddress = heap.allocateFrame(instr.num);
    E = heap.extendEnvironment(frameAddress, E);
    for (let i = 0; i < instr.num; i++) {
      // this is probably bad design because we are accessing the Unassigned
      heap.setChild(frameAddress, i, heap.Unassigned);
    }
  },
  "EXIT_SCOPE": instr => {
    let oldEnvAddr;
    [RTS, oldEnvAddr] = heap.popStack(RTS);
    E = heap.getBlockframeEnvironment(oldEnvAddr);
  },
  "GOTO": instr => {
    PC = instr.addr;
  },
  "ASSIGN": instr => {
    let frameIndex = instr.pos[0];
    let valueIndex = instr.pos[1];
    let value;
    value = heap.peekStack(OS);
    heap.setEnvironmentValue(E, frameIndex, valueIndex, value);
  },
  "LD": instr => {
    let frameIndex = instr.pos[0];
    let valueIndex = instr.pos[1];
    const value = heap.getEnvironmentValue(E, frameIndex, valueIndex);
    console.log("Value inside LD");
    console.log(value);
    if (heap.isUnassigned(value)) {
      throw Error("accessing an unassigned variable");
    }
    pushAddressOS(value);
  },
  "DONE": instr => {
    running = false;
  },
  "LDF": instr => {
    const closureAddress = heap.allocateClosure(instr.arity, instr.addr, E);
    pushAddressOS(closureAddress);
  },
  "CALL": instr => {
    const arity = instr.arity;
    // fun is the closure
    const fun = heap.peekStackN(OS, arity);
    if (heap.isBuiltin(fun)) {
      return applyBuiltin(heap.getBuiltinId(fun));
    }

    console.log("fun");
    console.log(fun);
    let newPC = heap.getClosurePC(fun);
    console.log("newPC");
    console.log(newPC);
    const newFrame = heap.allocateFrame(arity);
    for (let i = arity - 1; i >= 0; i--) {
      let value;
      [OS, value] = heap.popStack(OS);
      heap.setChild(newFrame, i, value);
    }
    RTS = heap.pushStack(RTS, heap.allocateCallframe(E, PC));
    let _;  // wow can't do _ in typescript =.=
    [OS, _] = heap.popStack(OS); // pop fun
    E = heap.extendEnvironment(newFrame, heap.getClosureEnvironment(fun));
    PC = newPC;
  },
  "TAIL_CALL": instr => {
    const arity = instr.arity;
    // fun is the closure
    const fun = heap.peekStackN(OS, arity);
    if (heap.isBuiltin(fun)) {
      return applyBuiltin(heap.getBuiltinId(fun));
    }
    const newPC = heap.getClosurePC(fun);
    const newFrame = heap.allocateFrame(arity);
    for (let i = arity - 1; i >= 0; i--) {
      let value;
      [OS, value] = heap.popStack(OS);
      heap.setChild(newFrame, i, value);
    }
    // No pushing onto RTS
    let _;  // wow can't do _ in typescript =.=
    [OS, _] = heap.popStack(OS); // pop fun
    E = heap.extendEnvironment(newFrame, heap.getClosureEnvironment(fun));
    PC = newPC;
  },
  "RESET": instr => {
    let topFrame;
    // keep popping until topFrame is a callFrame
    // We cannot do it the same way as the homework because now we have time quantum, and resetting really isn't
    // a thread operation.
    do {
      console.log("Popping RTS");
      [RTS, topFrame] = heap.popStack(RTS);
    } while (!heap.isCallframe(topFrame));
    // At this point, either it is a call frame or our program has crashed.
    PC = heap.getCallframePC(topFrame);
    E = heap.getCallframeEnvironment(topFrame);
  }

}

// ****************************************
// Initialization
// ****************************************
// Called before the machine runs a program

function initialize() {
  // TODO: Figure out an appropriate number of words
  // There is definitely some bug with the memory management!
  const numWords = 10000;
  heap = new Heap(numWords);
  PC = 0;
  OS = heap.initializeStack();
  RTS = heap.initializeStack();
  const builtinsFrame = initializeBuiltins();
  E = heap.allocateEnvironment(0);
  E = heap.extendEnvironment(builtinsFrame, E);
  // TODO: Allocate built-in function frames
  //       For example, we need built-ins for make(...)
  running = true;
  State = ProgramState.NORMAL;
  initScheduler();
}

function initializeBuiltins() {
  const builtinValues = Object.values(builtins);
  const frameAddress = heap.allocateFrame(builtinValues.length);
  for (let i = 0; i < builtinValues.length; i++) {
    const builtin = builtinValues[i];
    console.log(builtin);
    // @ts-ignore
    heap.setChild(frameAddress, i, heap.allocateBuiltin(builtin.id));
  }
  return frameAddress;
}

// Run a single instruction, for concurrent execution.
function runInstruction() {
  const instr = instrs[PC++];
  console.log("Running ");
  console.log(instr);
  microcode[instr.tag](instr);
}

// TODO: Switch to low level memory representation
function run() {
  initialize();
  while (running) {
    // Handle concurrency
    if (TimeQuanta > 0) {
      printOSStack();
      runInstruction();
    } else if (TimeQuanta === 0) {
      timeoutThread();
    } else {
      throw Error("TimeQuanta cannot be negative. Something has gone horribly wrong.");
    }
    // Handle errors
    if (State !== ProgramState.NORMAL) {
      throw Error("execution aborted due to: " + getErrorType());
    }
  }
  console.log("DONE");
  console.log(heap.addressToTSValue(heap.peekStack(OS)));
  return heap.addressToTSValue(heap.peekStack(OS));
}

function getErrorType(): string {
  // TODO: Enumerate all possible runtime errors here
  switch (State) {
    case ProgramState.DIV_ERROR:
      return `Division by 0`;
    case ProgramState.TYPE_ERROR:
      return `Not sure if this should happen here`;
    default:
      return "illegal error type";
  }
}

// ****************
// Debug
// ****************

// Helper method to print the actual typescript value of the heap address
function printHeapValue(addr: number) {

}

// Helper method to print all values of the OS
function printOSStack() {
  console.log("Printing OS Stack...");
  let currOS = OS;
  while (currOS != -1) {
    console.log("currOS");
    console.log(currOS);
    let value: any = heap.addressToTSValue(heap.peekStack(currOS));
    console.log("TS Value");
    console.log(value);
    console.log("Raw Value");
    value = heap.peekStack(currOS);
    console.log(value);
    currOS = heap.getChild(currOS, 0);
  }
  console.log("Done printing OS Stack...");
}



async function main() {
  if (process.argv.length != 3) {
    console.error("Usage: ogoavm-machine <input-file>");
    return;
  }
  const inputFilename = process.argv[2];
  let bytecode = await readFileAsync(inputFilename, 'utf8');
  bytecode = bytecode.trimStart();
  bytecode = bytecode.trimEnd();
  // Preserve newlines, etc. - use valid JSON
  bytecode = bytecode.replace(/\\n/g, "\\n")
    .replace(/\\'/g, "\\'")
    .replace(/\\"/g, '\\"')
    .replace(/\\&/g, "\\&")
    .replace(/\\r/g, "\\r")
    .replace(/\\t/g, "\\t")
    .replace(/\\b/g, "\\b")
    .replace(/\\f/g, "\\f");
  instrs = bytecode.split(/\r?\n/);
  instrs = instrs.map((line) => {
    try {
      const parsedLine = JSON.parse(line);
      return parsedLine;
    } catch (error) {
      console.error("Error parsing", line);
    }
  });
  return run();
}


main().catch(err => {
  console.error(err);
})
