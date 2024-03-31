import { assemble } from '../vm/oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { processByteCode } from '../vm/oogavm-machine.js';
import { compile_program } from '../vm/oogavm-compiler.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';

let namespaces = debug.disable(); // remove this line to enable debug logs
const log = debug('ooga:tests');
debug.enable('ooga:tests');

export function testProgram(program: string, expectedValue: any) {
    log('Running program:\n```');
    log(program);
    log('```\nExpected value: ' + expectedValue);
    let value;
    try {
        program = program.trimEnd();
        program = parse(program);
        const instrs = compile_program(program);
        let bytecode = assemble(instrs);
        processByteCode(bytecode);
        value = run();
    } catch (e) {
        log('--------------------------------------------');
        log('\x1b[31m%s\x1b[0m', 'Test failed with exception');
        log(`Error: ${e.message}`);
        log('--------------------------------------------');
        throw e;
    }
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

// Testing for loop with init; condition; update using var
testProgram(
    `
var sum = 0;
for var i = 0; i < 10; i = i + 1 {
  sum = sum + i;
}
sum;
`,
    45
);

// Testing for loop with init; condition; update using shorthand - this currently fails for some reason
// testProgram(
//     `
// var sum = 0;
// for i := 0; i < 10; i := i + 1 {
//   sum = sum + i;
// }
// sum;
// `,
//     45
// );

// Testing for loop with init; condition; update using var and ++
testProgram(
    `
var sum = 0;
for var i = 0; i < 10; i++ {
  sum = sum + i;
}
sum;
`,
    45
);

// Testing for loop with only condition
testProgram(
    `
var sum = 0;
var i = 0;
for i < 10 {
  sum = sum + i;
  i = i + 1;
}
sum;
`,
    45
);

// Testing infinite loop does not work because the VM does not support break
// testProgram(
//     `
// var sum = 0;
// var i = 0;
// for {
//   if (i == 10) {
//     break;
//   }
//   sum = sum + i;
//   i = i + 1;
// }
// sum;
// `,
//     45
// );

debug.enable(namespaces);
