import { assemble } from '../vm/oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { processByteCode } from '../vm/oogavm-machine.js';
import { compile_program } from '../vm/oogavm-compiler.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';

const log = debug('ooga:tests');

export function testProgram(program: string, expectedValue: any) {
    log('--------------------------------------------');
    log('Running program:\n```');
    log(program);
    log('```\nExpected value: ' + expectedValue);

    program = program.trimEnd();
    program = parse(program);
    const instrs = compile_program(program);
    let bytecode = assemble(instrs);
    processByteCode(bytecode);
    let value = run();

    if (value !== expectedValue) {
        // print "Test failed" in red
        log('\x1b[31m%s\x1b[0m', 'Test failed');
        log(`Expected ${expectedValue} but got ${value}`);
        log('--------------------------------------------');
        throw new Error('Test failed');
    } else {
        // print "Test passed" in green
        log('\x1b[32m%s\x1b[0m', 'Test passed');
    }
    log('--------------------------------------------');
}

// Testing simple var expressions
testProgram(
    `
var x = 5;
x;
`,
    5
);

testProgram(
    `
var x = 5;
x + 2;
`,
    7
);

testProgram(
    `
var x = 5;
x - 2;
`,
    3
);

testProgram(
    `
var x = 4;
x / 2;
`,
    2
);

testProgram(
    `
var x = 5;
x * 3;
`,
    15
);

// Test blocks and scope
testProgram(
    `
var x = 5;
{
  x = 6;
}
x;
`,
    6
);

testProgram(
    `
var x = 5;
var y = 10;
{
  var x = 6;
  var y = 6;
}
x + y;
`,
    15
);

// Testing simple identity function
testProgram(
    `
func foo(n) {
  return n;
}
foo(5);
`,
    5
);

// Testing literals
testProgram(
    `
5
`,
    5
);

// Testing conditionals
testProgram(
    `
var x = 5;
if (x == 5) {
  6;
} else {
  7;
}
`,
    6
);

testProgram(
    `
var x = 6;
if (x == 5) {
  6;
} else {
  7;
}
`,
    7
);

// Testing recursive function
testProgram(
    `
func factorial(n) {
  if (n == 1) {
    return 1;
  } else {
    return n * factorial(n-1);
  }
}
factorial(5);
`,
    120
);

// Testing goroutine
testProgram(
    `
var a = 1;
var b = 2;
go func() {
  a = 2;
}

go func() {
  b = 3;
}

a + b;
`,
    5
);
