import {assemble} from "../vm/oogavm-assembler.js";
import { parse } from '../parser/ooga.js';
import { processByteCode } from "../vm/oogavm-machine.js";
import {compile_program} from "../vm/oogavm-compiler.js";
import {run} from "../vm/oogavm-machine.js";

export function testProgram(program: string, expectedValue: any) {
  program = program.trimEnd();
  program = parse(program);
  const instrs = compile_program(program);
  let bytecode = assemble(instrs);
  processByteCode(bytecode);
  let value = run();
  if (value !== expectedValue) {
    throw Error(`Expected ${expectedValue} but got ${value}`);
  }
}

// Testing simple identity function
testProgram(`
func foo(n) {
  return n;
}
foo(5);
`, 5);

// Testing recursive function
testProgram(`
func factorial(n) {
  if (n == 1) {
    return 1;
  } else {
    return n * factorial(n-1);
  }
}
factorial(5);
`, 120);

// Testing goroutine
testProgram(`
var a = 1;
var b = 2;
go func() {
  a = 2;
}

go func() {
  b = 3;
}

a + b;
`, 5);
