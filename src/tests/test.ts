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
    console.log(`Expected ${expectedValue} but got ${value}`);
  }
}

testProgram(`
func foo(n) {
  return n;
}
foo(5);
`, 5);
