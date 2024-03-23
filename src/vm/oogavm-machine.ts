import * as fs from 'fs';
import * as util from "util";
import {RoundRobinScheduler, Scheduler, ThreadId} from "./oogavm-scheduler";
import {threadId} from "worker_threads";
import {Heap} from "./oogavm-memory";

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
  _ENV: number;
  _PC: number;
  _RTS: number;
  // TODO: Do this properly
  constructor() {
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
  currentThreadId = -1;
}

function newThread() {
  const newThreadId = scheduler.newThread();
  threads.set(newThreadId, new Thread());
}

function pauseThread() {
  // save current state
  threads.set(currentThreadId, new Thread());
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

function apply_binop(sym, left, right) {
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

const microcode = {
  "LDC": instr => {
    PC++;
    push(OS, instr.val);
  },
  "BINOP": instr => {
    PC++;
    push(OS, apply_binop(instr.sym, OS.pop(), OS.pop()));
  },
  "JOF": instr => {
    const val = OS.pop();
    if (!val) {
      PC = instr.addr;
    }
  }
}

// Called before the machine runs a program
function initialize() {
  // TODO: Figure out an appropriate number of words
  const numWords = 10000;
  heap = new Heap(numWords);
  PC = 0;
  OS = heap.initializeStack();
  RTS = heap.initializeStack();
  E = heap.allocateEnvironment(0);
  // TODO: Allocate built-in function frames
  //       For example, we need built-ins for make(...)
  running = true;
  State = ProgramState.NORMAL;
}

// Run a single instruction, for concurrent execution.
function runInstruction() {
  const instr = instrs[PC++];
  microcode[instr.tag](instr);
}

// TODO: Switch to low level memory representation
function run() {
  initialize();
  while (running) {
    // Handle concurrency
    if (TimeQuanta > 0) {
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
  return peek(OS);
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

async function main() {
  if (process.argv.length != 3) {
    console.error("Usage: ogoavm-machine <input-file>");
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
  console.log(bytecode);
  instrs = bytecode.split(/\r?\n/);
  instrs = instrs.map((line) => {
    try {
      const parsedLine = JSON.parse(line);
      return parsedLine;
    } catch (error) {
      console.error("Error parsing", line);
    }
  });
  console.log(instrs);
  console.log(run());
}

main().catch(err => {
  console.error(err);
})
