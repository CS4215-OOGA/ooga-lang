import { assemble } from '../vm/oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { processByteCode } from '../vm/oogavm-machine.js';
import { compile_program } from '../vm/oogavm-compiler.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';
import { checkTypes } from '../vm/oogavm-typechecker.js';

const log = debug('ooga:tests');

const defaultNumWords = 100000;

function logTest(message: string, isError: boolean = false) {
    const color = isError ? '\x1b[31m%s\x1b[0m' : '\x1b[32m%s\x1b[0m';
    log(color, message);
}

export function testProgram(
    program: string,
    expectedValue: any,
    numWords: number = defaultNumWords
) {
    debug.disable(); // Disable debug logs initially
    debug.enable('ooga:tests');
    log(`Running program:\n\`\`\`\n${program}\n\`\`\`\nExpected value: ${expectedValue}`);

    let value;
    try {
        const trimmedProgram = program.trimEnd();
        const programObj = parse(trimmedProgram);
        const programBlock = { tag: 'BlockStatement', body: programObj };
        const instrs = compile_program(programBlock);
        checkTypes(programBlock);
        const bytecode = assemble(instrs);
        processByteCode(bytecode);
        value = run(numWords);
    } catch (e) {
        logTest('--------------------------------------------', true);
        logTest('Test failed with exception', true);
        logTest(`Error: ${e.message}`, true);
        logTest('--------------------------------------------', true);
        throw e;
    } finally {
        debug.enable('*');
    }

    if (value !== expectedValue) {
        logTest('--------------------------------------------', true);
        logTest('Test failed', true);
        logTest(`Expected ${expectedValue} but got ${value}`, true);
        logTest('--------------------------------------------', true);
        throw new Error(`Test failed: Expected ${expectedValue} but got ${value}`);
    } else {
        logTest('Test passed');
        logTest('--------------------------------------------');
    }
}

// Testing simple var expressions
testProgram(
    `
var x int = 5;
x;
`,
    5,
    defaultNumWords
);

// Test shorthand
testProgram(
    `
x := 5;
x;
`,
    5,
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x + 2;
`,
    7,
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x - 2;
`,
    3,
    defaultNumWords
);

testProgram(
    `
var x int = 4;
x / 2;
`,
    2,
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x * 3;
`,
    15,
    defaultNumWords
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
    6,
    defaultNumWords
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
    15,
    defaultNumWords
);

// Testing simple identity function
testProgram(
    `
func foo(n int) int {
  return n;
}
foo(5);
`,
    5,
    defaultNumWords
);

// Testing function with brackets around return
testProgram(
    `
func foo(n int) (int) {
    return n;
    }
foo(5);
`,
    5,
    defaultNumWords
);

// Testing function as lambda
testProgram(
    `
foo := func(n int) int {
    return n;
    };
foo(5);
`,
    5,
    defaultNumWords
);

// Testing function as lambda with invocation
testProgram(
    `
foo := func(n int) int {
    return n;
    }(5);
foo;
`,
    5,
    defaultNumWords
);

// Testing function with no return type
testProgram(
    `
func foo(n int) {
    return;
}
foo(5);
`,
    null,
    defaultNumWords
);

// Testing literals
testProgram(
    `
5
`,
    5,
    defaultNumWords
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
    6,
    defaultNumWords
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
    7,
    defaultNumWords
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
    120,
    defaultNumWords
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
    5,
    defaultNumWords
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
    45,
    defaultNumWords
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
    45,
    defaultNumWords
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
    45,
    defaultNumWords
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
    45,
    defaultNumWords
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
    45,
    defaultNumWords
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
    900,
    defaultNumWords
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
    40,
    defaultNumWords
);

// Testing comments
testProgram(
    `
// This is a comment
var x int = 5; // This is another comment
x;
`,
    5,
    defaultNumWords
);

// *******************************
// Testing mark and sweep
// *******************************
// NOTE: All the mark and sweep test cases are super fragile
//       and will break upon any feature we add that increases the
//       number of words used at initialization!
//       For the sake of our sanities, this place will be source of
//       truth for how much memory the operation currently takes!
//       The literal allocations will consume 50 words
//       Allocating the starting OS will consume 20 words
//       Allocating the builtin frame will consume 10 words
//       Allocating the initial global environment will consume 10 words
//       Initializing the environment to point to the builtin frame will consume
//       another 10 words.
//       Entering the global frame (which pushes onto RTS) will consume
//       10 words for each variable/const/func declaration (and can't exceed 10)
//       Then you gotta allocate the new environment frame which is another 10 words
//       for each.
//       And then you need to push two values onto the OS, which is 20 words.
//       So if you do the bare math, the basic minimum number of words OOGAVM
//       needs to run the following test case is 170.
//       50 + 20 + 10 + 10 + 10 + 10 + 20 + 20 + 20
//       If future test cases break cos we do something to the initialization
//       look over here!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
testProgram(
    `
var x int = 5;
var y int = 10;
x;
`,
    5,
    170
);

// Testing mark and sweep, with exactly one variable that should be freed
// LDCI 15 at var w will force mark and sweep and should free
// the block frame which is 170, the frame at 190, E at 200 and the number 15
// allocated at 210. Ok nice it does work!
testProgram(
    `
var x int = 5;
var y int = 10;
{
    var z int = 15;
}
var z int = 10;
var w int = 15;
x;
`,
    5,
    220
);

// Testing structs (no methods for now)
// Structs can be initialized using var, shorthand or const
// Golang style struct initialization

// Structs with var
testProgram(
    `
type Point struct {
    x int;
    y int;
}
var p Point = Point{1, 2};
p.x;
`,
    1,
    defaultNumWords
);

// Structs with shorthand
testProgram(
    `
type Point struct {
    x int;
    y int;
}
p := Point{1, 2};
p.x;
`,
    1,
    defaultNumWords
);

// Structs with const
testProgram(
    `
type Point struct {
    x int;
    y int;
}
const p Point = Point{1, 2};
p.x;
`,
    1,
    defaultNumWords
);

// More complex struct stuff (variable declaration, struct field access)
testProgram(
    `
type Point struct {
    x int;
    y int;
}
var p Point = Point{1, 2};
p.x + p.y;
`,
    3,
    defaultNumWords
);

// Setting struct fields
testProgram(
    `
type Point struct {
    x int;
    y int;
}
var p Point = Point{1, 2};
p.x = 2;
p.x;
`,
    2,
    defaultNumWords
);

// Combine all the above
testProgram(
    `
type Vertex struct {
    X int
    Y int
}

v := Vertex{X: 3, Y: 4}

v.X = 10

var z int = v.X + v.Y

const w = Vertex{2, 3}

w.X = 500
w.Y = 6000

var a Vertex = Vertex{1, 2}

a.X = 10
a.Y = 20

a.X + a.Y + v.X + v.Y + w.X + w.Y + z
`,
    6558,
    defaultNumWords
);
