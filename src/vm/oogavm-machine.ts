import * as fs from 'fs';
import * as util from "util";

const readFileAsync = util.promisify(fs.readFile);

let OS;
let PC;
let E;
let RTS;
let instrs;


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

// TODO: Switch to low level memory representation
function run() {
  console.log("RUNNING");
  OS = [];
  PC = 0;
  while (! (instrs[PC].tag === "DONE")) {
    const instr = instrs[PC];
    microcode[instr.tag](instr);
    console.log(OS);
  }
  return peek(OS);
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
