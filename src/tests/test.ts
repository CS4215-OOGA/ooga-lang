import { assemble } from '../vm/oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { processByteCode } from '../vm/oogavm-machine.js';
import { compile_program } from '../vm/oogavm-compiler.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';
import { checkTypes } from '../vm/oogavm-typechecker.js';

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
        let program_obj: Object = parse(program);
        program_obj = { tag: 'BlockStatement', body: program_obj };
        log(JSON.stringify(program_obj, null, 2));
        const instrs = compile_program(program_obj);
        checkTypes(program_obj);
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
var x int = 5;
x;
`,
    5
);

// Test shorthand
testProgram(
    `
x := 5;
x;
`,
    5
);

testProgram(
    `
var x int = 5;
x + 2;
`,
    7
);

testProgram(
    `
var x int = 5;
x - 2;
`,
    3
);

testProgram(
    `
var x int = 4;
x / 2;
`,
    2
);

testProgram(
    `
var x int = 5;
x * 3;
`,
    15
);

// Test blocks and scope
testProgram(
    `
var x int = 5;
{
  x = 6;
}
x;
`,
    6
);

testProgram(
    `
var x int = 5;
var y int = 10;
{
  var x int = 6;
  var y int = 6;
}
x + y;
`,
    15
);

// Testing simple identity function
testProgram(
    `
func foo(n int) int {
  return n;
}
foo(5);
`,
    5
);

// Testing function with brackets around return
testProgram(
    `
func foo(n int) (int) {
    return n;
    }
foo(5);
`,
    5
);

// Testing function as lambda
testProgram(
    `
foo := func(n int) int {
    return n;
    };
foo(5);
`,
    5
);

// Testing function as lambda with invocation
testProgram(
    `
foo := func(n int) int {
    return n;
    }(5);
foo;
`,
    5
);

// Testing function with no return type
testProgram(
    `
func foo(n int) {
    return;
}
foo(5);
`,
    null
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
var x int = 5;
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
var x int = 6;
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
func factorial(n int) int {
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
var a int = 1;
var b int = 2;
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
var sum int = 0;
for var i int = 0; i < 10; i = i + 1 {
  sum = sum + i;
}
sum;
`,
    45
);

// Testing for loop with init; condition; update using shorthand
testProgram(
    `
var sum int = 0;
for i := 0; i < 10; i = i + 1 {
  sum = sum + i;
}
sum;
`,
    45
);

// Testing for loop with init; condition; update using var and ++
testProgram(
    `
var sum int = 0;
for var i int = 0; i < 10; i++ {
  sum = sum + i;
}
sum;
`,
    45
);

// Testing for loop with only condition
testProgram(
    `
var sum int = 0;
var i int= 0;
for i < 10 {
  sum = sum + i;
  i = i + 1;
}
sum;
`,
    45
);

// Testing infinite loop with break
testProgram(
    `
var sum int = 0;
var i int = 0;
for {
  if (i == 10) {
    break;
  }
  sum = sum + i;
  i = i + 1;
}
sum;
`,
    45
);

// Testing nested for loop - one with var and one with shorthand
testProgram(
    `
var sum int = 0;
for var i int = 0; i < 10; i = i + 1 {
  for j := 0; j < 10; j++ {
    sum = sum + i + j;
  }
}
sum;
`,
    900
);

// Test continue in for loop
testProgram(
    `
var sum int = 0;
for var i int = 0; i < 10; i = i + 1 {
  if (i == 5) {
    continue;
  }
  sum = sum + i;
}
sum;
`,
    40
);

// Testing comments
testProgram(
    `
// This is a comment
var x int = 5; // This is another comment
x;
`,
    5
);

debug.enable(namespaces);
