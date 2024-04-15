import { processByteCode } from '../vm/oogavm-machine.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';
import { readFileSync } from 'fs';
import { prepare_and_compile } from '../vm/oogavm-toolchain.js';

const log = debug('ooga:tests');

const defaultNumWords = 100000;

function logTest(message: string, isError: boolean = false) {
    const color = isError ? '\x1b[31m%s\x1b[0m' : '\x1b[32m%s\x1b[0m';
    log(color, message);
}

const standardSource = readFileSync('std/ooga-std.ooga', 'utf8');

export function testProgram(
    program: string,
    expectedValue: any,
    expectedOutput: string,
    numWords: number = defaultNumWords
) {
    debug.disable(); // Disable debug logs initially
    debug.enable('ooga:tests');
    // debug.enable('ooga:typechecker');
    log(
        `Running program:\n\`\`\`${program}\`\`\`\nExpected value: ${expectedValue}\nExpected output: ${expectedOutput}`
    );

    let value;
    let capturedOutput = '';
    try {
        const bytecode = prepare_and_compile(standardSource, program);
        processByteCode(bytecode);

        const originalLog = console.log;
        console.log = console.log = (message: any): void => {
            capturedOutput += JSON.stringify(message) + '\n';
        };
        value = run(numWords);
        console.log = originalLog;
    } catch (e) {
        if (e.message === expectedValue) {
            logTest('Test passed');
            logTest('--------------------------------------------');
            return;
        }
        logTest('--------------------------------------------', true);
        logTest('Test failed with exception', true);
        console.log(e.message);
        logTest(`Error: ${e.message}`, true);
        logTest('--------------------------------------------', true);
        throw e;
    } finally {
        debug.enable('*');
    }

    if (value !== expectedValue) {
        logTest('--------------------------------------------', true);
        logTest('Test failed', true);
        logTest(`Expected result: ${expectedValue} but got ${value}`, true);
        logTest('--------------------------------------------', true);
        throw new Error(`Test failed: Expected ${expectedValue} but got ${value}`);
    } else if (capturedOutput.trim() !== expectedOutput?.trim()) {
        logTest('--------------------------------------------', true);
        logTest('Test failed', true);
        logTest(`Expected output:\n${expectedOutput}\nBut got:\n${capturedOutput}`, true);
        logTest('--------------------------------------------', true);
        throw new Error(
            `Test failed: Expected output:\n${expectedOutput}\nBut got:\n${capturedOutput}`
        );
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
    '',
    defaultNumWords
);

// Testing float64
testProgram(
    `
var x float64 = 5.5;
x;
`,
    5.5,
    '',
    defaultNumWords
);

// Testing simple arithmetic
testProgram(
    `
var x int = 5;
var y int = 10;
var z float64 = 5.5;

x + y + z;
`,
    20.5,
    '',
    defaultNumWords
);

// Test shorthand
testProgram(
    `
x := 5;
x;
`,
    5,
    '',
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x + 2;
`,
    7,
    '',
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x - 2;
`,
    3,
    '',
    defaultNumWords
);

testProgram(
    `
var x int = 4;
x / 2;
`,
    2,
    '',
    defaultNumWords
);

testProgram(
    `
var x int = 5;
x * 3;
`,
    15,
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
    defaultNumWords
);

// Testing literals
testProgram(
    `
5
`,
    5,
    '',
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
    '',
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
    '',
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
    '',
    defaultNumWords
);

// Testing goroutine
testProgram(
    `
var a int = 1;
var b int = 2;
go func() {
  a = 2;
}()

go func() {
  b = 3;
}()

a + b;
`,
    5,
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
    defaultNumWords
);

// *******************************
// Notes on Memory Model
// *******************************
// Minimal memory required for the OOGA-VM: 32 words or 32 * 8 = 256 bytes
// Built-ins occupy up till address 10
// OS first entry is at address 10
// RTS first entry is at address 14
// Builtin Frame is at address 18
// // TODO: This will change as we add more builtins
// E Frame is at address 24
// Second E frame that contains Builtin frame is at address 26
// BlockFrame that contains entire program is at address 29 up till 32
// The standard library occupies up till 104 memory

testProgram(
    `
var x int = 5;
var y int = 10;
x;
`,
    5,
    '',
    300
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
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
    '',
    defaultNumWords
);

// Testing structs with methods
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

var p Point = Point{1, 2};

p.getX();
`,
    1,
    '',
    defaultNumWords
);

// Testing structs with methods and arguments
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

func (p Point) addX(n int) int {
    return p.x + n;
}

var p Point = Point{1, 2};

p.addX(5);
`,
    6,
    '',
    defaultNumWords
);

// Testing structs with methods and arguments
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

func (p Point) addX(n int) int {
    return p.x + n;
}

var p Point = Point{1, 2};

p.addX(p.getX());
`,
    2,
    '',
    defaultNumWords
);

// More complex struct stuff (variable declaration, struct field access) with methods
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

var p Point = Point{1, 2};

p.getX() + p.y;
`,
    3,
    '',
    defaultNumWords
);

// Setting struct fields with methods
testProgram(
    `
type Vertex struct {
    X int
}

func (v *Vertex) GetX() int {
    return v.X
}

var v Vertex = Vertex{3}

print(v.GetX());

const w = Vertex{4}

func (v *Vertex) AddX(y int) int {
    v.X = v.X + y
    return v.X + y
}

print(w.AddX(5));
w.X;
`,
    9,
    `
3
14
`,
    defaultNumWords
);

// Functions that return structs
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func makePoint(x int, y int) Point {
    return Point{x, y};
}

var p Point = makePoint(1, 2);
p.x;
`,
    1,
    '',
    defaultNumWords
);

// Functions that return structs using shorthand
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func makePoint(x int, y int) Point {
    return Point{x, y};
}

p := makePoint(1, 2);
p.x;
`,
    1,
    '',
    defaultNumWords
);

// Testing struct methods with goroutines (goroutines cannot return anything)
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

func (p Point) addX(n int) int {
    return p.x + n;
}

var p Point = Point{1, 2};

go func() {
    p.addX(5);
}()

go func() {
    p.getX();
}()

p.x;
`,
    1,
    '',
    defaultNumWords
);

testProgram(
    `
// USER PROGRAM
type Vertex struct {
    X int
}

func (v *Vertex) Add(w Vertex) {
    v.X = v.X + w.X
}


v := Vertex{1}
w := Vertex{2}
wg := WaitGroup{1}
go func() {
    v.Add(w)
    wg.Done()
}()
wg.Wait()

v.X // 3
    `,
    3,
    '',
    defaultNumWords
);

// Test WaitGroups

testProgram(
    `

type Vertex struct {
    X int
}

func (v *Vertex) Add(w Vertex) {
    v.X = v.X + w.X;
}

v := Vertex{1};
w := Vertex{2};

go func() {
    for i := 0; i < 100; i++ { // iterate for 100 times to prove that waitgroup works as intended
    }
    v.Add(w);
}()

v.X; //1
`,
    1,
    '',
    defaultNumWords
);

testProgram(
    `

type Vertex struct {
    X int
}

func (v *Vertex) Add(w Vertex) {
    v.X = v.X + w.X;
}

v := Vertex{1};
w := Vertex{2};

wg := WaitGroup{1};

go func() {

    for i := 0; i < 100; i++ { // iterate for 100 times to prove that waitgroup works as intended
    }
    v.Add(w);
    wg.Done();
}()

wg.Wait();

v.X; //3

`,
    3,
    '',
    defaultNumWords
);

// Testing struct methods with goroutines (goroutines cannot return anything)
testProgram(
    `
type Vertex struct {
    X int
    Y int
}

func (v *Vertex) AddX(x int) int {
    v.X = v.X + x
    return v.X
}

var v Vertex = Vertex{1, 2}

func main() {
    go v.AddX(3)
}

main();
v.X;
    `,
    4,
    '',
    defaultNumWords
);

// Complex struct stuff with methods, using var, shorthand and const
testProgram(
    `
type Point struct {
    x int;
    y int;
}

func (p Point) getX() int {
    return p.x;
}

func (p Point) addX(n int) int {
    return p.x + n;
}

var p Point = Point{1, 2};
const q = Point{3, 4};
r := q;
r.x = 5;
p.addX(r.getX());
`,
    6,
    '',
    defaultNumWords
);

// Test a lot of declarations
testProgram(
    `
var a int = 1;
var b int = 2;
var c int = 3;
var d int = 4;
var e int = 5;
var f int = 6;
var g int = 7;
var h int = 8;
var i int = 9;
var j int = 10;
var k int = 11;
var l int = 12;
var m int = 13;
var n int = 14;
var o int = 15;
var p int = 16;
var q int = 17;
var r int = 18;
var s int = 19;
var t int = 20;
var u int = 21;
var v int = 22;
var w int = 23;
var x int = 24;
var y int = 25;
var z int = 26;
a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w +x + y + z;
`,
    351,
    '',
    defaultNumWords
);

// Negative test for more than once variable declaration
testProgram(
    `
var x int = 5;
var x int = 5;
`,
    'Variable x declared more than once in the same block!',
    '',
    defaultNumWords
);

// Test String works locally
testProgram(
    `
var x string = "Jotham";
var y string = "Wong";
x + " " + y;
`,
    'Jotham Wong',
    '',
    defaultNumWords
);

// Test String with GC
// 104 is just sufficient
testProgram(
    `
var x string = "Jotham";
var y string = "Wong";
{
    var z int = 5;
}
print(x + " " + y);
`,
    'Jotham Wong',
    '"Jotham Wong"',
    200
);

// Test GC with NEW_THREAD instruction to make sure everything works
testProgram(
    `
var x int = 5;
var y int = 10;

func googa(x int, y int) int {
    fmt.Println(x + y);
    return x + y;
}

go googa(x, y);
`,
    true,
    '15',
    206
);

// Test various array expressions

// Simple arr indexing
testProgram(
    `
var x [5]int = [5]int{1, 2, 3, 4, 5};
x[0];
`,
    1,
    '',
    defaultNumWords
);

testProgram(
    `
var x [5]int = [5]int{1, 2, 3, 4, 5};
x[3];
`,
    4,
    '',
    defaultNumWords
);

// out of bounds
testProgram(
    `
var x [5]int = [5]int{1, 2, 3, 4, 5};
x[99];
`,
    'Array out of bounds error!',
    '',
    defaultNumWords
);

// negative indexing
testProgram(
    `
var x [5]int = [5]int{1, 2, 3, 4, 5};
x[-1];
`,
    'Negative indexing not allowed!',
    '',
    defaultNumWords
);

// test for functions that return arrays
testProgram(
    `
func googa() []int {
    return []int{1, 2, 3};
}

x := googa();
x[0];
`,
    1,
    '',
    defaultNumWords
);

// test array length static
testProgram(
    `
var x [5]int = [5]int{1, 2, 3, 4, 5};
len(x);
`,
    5,
    '',
    defaultNumWords
);

// test array length dynamic
testProgram(
    `
func googa() []int {
    return []int{1, 2, 3, 4, 5, 6, 7, 8, 9};
}
len(googa());
`,
    9,
    '',
    defaultNumWords
);

// test for functions that return arrays and operate on array variables
testProgram(
    `
func booga(x []int) int {
    var n int = len(x);
    var sum int = 0;
    for var i int = 0; i < n; i++ {
        sum = sum + x[i];
    }
    return sum;
}


func googa() []int {
    return []int{1, 2, 3};
}

booga(googa());
`,
    6,
    '',
    defaultNumWords
);

// Test array assignment on static
testProgram(
    `
var x [5]int = [5]int{1, 2, 3, -1, 5};
x[3] = 4;
x[3];
`,
    4,
    '',
    defaultNumWords
);

// Test array assignment on dynamic
testProgram(
    `
func googaDaBooga() []int {
    return []int{1, 2, 3, 4, 5, 6};
}
// Adds one to all elements
func addOne(x []int) []int {
    for i := 0; i < len(x); i++ {
        x[i] = x[i] + 1;
    }
    return x;
}


var x = googaDaBooga();
x = addOne(x);
for i := 0; i < len(x); i++ {
    print(x[i]);
}
x[0];
`,
    2,
    '2\n3\n4\n5\n6\n7\n',
    defaultNumWords
);

// Test unbuffered goroutines
testProgram(
    `
func fooga(x chan int) {
    // writes to x, should block
    print(0);
    x <- 1;
    print("fooga"); // this should print after booga
}

func booga(x chan int) {
    var y int = <-x; // reads from x
    print("booga"); // this should print before fooga
    print(y); // check that 1 was received
}

var x chan int = make(chan int); // unbuffered channel
go fooga(x);
go booga(x);

for i := 0; i < 10; i++ {
    // do nothing to stall to see 'fooga' being printed
}
10;
`,
    10,
    '0\n"booga"\n1\n"fooga"',
    defaultNumWords
);

// Test unblocking buffered goroutine
testProgram(
    `
func fooga(x chan int) {
    // writes to x, should be unblocking
    print(0);
    x <- 1;
    print("fooga"); // this should print after 0
}

func booga(x chan int) {
    var y int = <-x; // reads from x
    print("booga"); // this should print after fooga
    print(y); // check that 1 was received
}

var x chan int = make(chan int, 1); // buffered channel of size 1, will be unblocking
go fooga(x);
go booga(x);

for i := 0; i < 10; i++ {
    // do nothing to stall to see 'fooga' being printed
}
10;
`,
    10,
    '0\n"fooga"\n"booga"\n1',
    defaultNumWords
);

// Test blocking buffered goroutine
testProgram(
    `
func foo(x chan int) {
    print(0);
    x <- 1; // unblocking write
    print("foo"); // should print immediately after 0
}

func goo(x chan int) {
    print(2);
    x <- 2; // blocking write
    print("goo"); // should not print after 2
}

func hoo(x chan int) {
    print(3);
    var y int = <-x; // shud be an unblocking read
    print(y); // verify that y is equal to 1
}

var x chan int = make(chan int, 1); // buffered channel of size 1
go foo(x);
go goo(x);
go hoo(x);

for i := 0; i < 10; i++ {
    // do nothing to stall to see everything being printed
}
10;
`,
    10,
    '0\n"foo"\n2\n3\n1\n"goo"',
    defaultNumWords
);

// test pushing strings onto channels
testProgram(
    `
func foo(x chan string) {
    print("before foo");
    x<- "Jotham";         // non blocking write
    print("after foo");
}

func goo(x chan string) {
    print("before goo");
    x<- "Wong";         // non blocking write
    print("after goo");
}

func hoo(x chan string) {
    print("before hoo");
    x<- "Yi"; // blocking write
    print("after hoo");
}

var x chan string = make(chan string, 2); // buffered channel of size 2

go foo(x);
go goo(x);
go hoo(x);

var y string = <-x; // Jotham
var z string = <-x; // Wong
print(y + " " + z); // Jotham Wong

for i := 0; i < 100; i++ {
    // do nothing to stall to see everything being printed
}
10;
`,
    10,
    '"before foo"\n"after foo"\n"before goo"\n"after goo"\n"before hoo"\n"Jotham Wong"\n"after hoo"',
    defaultNumWords
);

// test that main will expire before blocking progresses
testProgram(
    `
func foo(x chan int) {
    var y = <-x; // blocking since no actual value in x yet
    print("This will not show");
}

func goo(x chan int) {
    x <- 5; // unblocking write to channel
    print("This will show");
}

var x chan int = make(chan int, 1); // buffered channel
go foo(x);
go goo(x);
print("This is the end");
10; // do not give time for foo to read
`,
    10,
    '"This will show"\n"This is the end"',
    defaultNumWords
);

// Simple test for deadlock detection
testProgram(
    `
func foo(x chan int) {
    x <- 5;
}

var x chan int = make(chan int); // unbuffered channel
go foo(x);
x <- 6; // will deadlock here
`,
    'Deadlock detected!',
    '',
    defaultNumWords
);

// Simple test for doomed forever
testProgram(
    `
var x chan int = make(chan int); // unbuffered channel
<-x; // will block forever
`,
    'Stuck forever!',
    '',
    defaultNumWords
);

// Simple switch test
testProgram(
    `
var x int = 1;

// the switch statement also returns 1
switch (x) {
    case 1:
        print(1);
    case 2:
        print(2);
    default:
        print(5);
}
`,
    1,
    '1',
    defaultNumWords
);

// Testing that no other values print
testProgram(
    `
var x int = 2;

// the switch statement also returns 1
switch (x) {
    case 1:
        print(1);
    case 2:
        print(2);
    default:
        print(5);
}
`,
    2,
    '2',
    defaultNumWords
);

// Testing that default works

testProgram(
    `
var x int = 3;

// the switch statement also returns 1
switch (x) {
    case 1:
        print(1);
    case 2:
        print(2);
    default:
        print(5);
}
`,
    5,
    '5',
    defaultNumWords
);

// Test that switch with no match and no default shud match nothing
testProgram(
    `
var x int = 5;

switch (x) {
    case 1:
        print(1);
}
`,
    null,
    '',
    defaultNumWords
);

// Testing return values of switch statements
testProgram(
    `
func foo(x int) int {
    switch (x) {
        case 1:
            print("booga"); // wont print
            return 1;
        case 2:
            print("booga"); // wont print
            return 2;
        case 3:
            print("booga"); // wont print
            return 3;
        default:
            print("googa"); // will print
            return 5;
    }
}

foo(5);
`,
    5,
    '"googa"',
    defaultNumWords
);

// test that non-return value of switch in typechecker is handled
testProgram(
    `
func foo(x int) int {
    switch (x) {
        case 1:
            return true; // will return type checker error
        default:
            return 1;
    }
}

foo(5);
`,
    'type error in return statement; expected return type: {\n' +
        '  "name": "Integer"\n' +
        '}, actual return type: {\n' +
        '  "name": "Boolean"\n' +
        '}',
    '',
    defaultNumWords
);

// test that non-return value of switch without default in typechecker is handled
testProgram(
    `
func foo(x int) int {
    switch (x) {
        case 1:
            return 1;
    }
}

foo(5);
`,
    'type error in function declaration; declared return type: {\n' +
        '  "name": "Integer"\n' +
        '}, actual return type: {\n' +
        '  "name": "Null"\n' +
        '}',
    '',
    defaultNumWords
);

// Test for select programs
testProgram(
    `
var x chan int = make(chan int, 5);

func foo() {
    x<- 1;
}

go foo();
go foo();

for i := 0; i < 4; i++ {
    select {
        case i := <-x:  // this will happen twice first, so print 1 twice, then finally print 5
            print(i);
        case x<- 5:     // finally this will happen and we will push 5 inside
            print(3);
        default:
            break;
    }
}

// in the end, print 1 1 3 5
10;
`,
    10,
    '1\n1\n3\n5\n',
    defaultNumWords
);

testProgram(
    `
var x chan int = make(chan int, 5);

func foo() {
    x<- 1;
}

go foo();
go foo();

for i := 0; i < 4; i++ {
    select {
        case i := <-x: // print 1 1 then break
            print(i);
        default:
            break;
    }
}

10;
`,
    10,
    '1\n1\n',
    defaultNumWords
);

testProgram(
    `
var x chan int = make(chan int, 5);

func foo() {
    x<- 1;
}

for i := 0; i < 4; i++ {
    select {
        case i := <-x:
            print(i);
        default:
            print(100); // print 100 4 times cos no valid
    }
}
10;
`,
    10,
    '100\n100\n100\n100\n',
    defaultNumWords
);

// test without valid select at first
testProgram(
    `
var x chan int = make(chan int, 5);

func foo() {
    x<- 1;
}

for i := 0; i < 4; i++ {
    select {
        case i := <-x:
            print(i); // print 5
        default:
            print(100); // print 100 and push 5 to channel
            x <- 5;
    }
}

// expected outcome, print: 100, 5, 100, 5 then break for loop
10;
`,
    10,
    '100\n5\n100\n5\n',
    defaultNumWords
);

// Test with no valid select at all until Done context times out
testProgram(
    `
// Test using "Context"

func timeout(done chan int) {
    // do "busy" work for 100 iterations then push done value
    for i := 0; i < 100; i++ {}
    done<- 1;
}

var done chan int = make(chan int);

go timeout(done);

for {
    select {
    case <-done:
        break;
    default:
        1 + 1;
    }
}

// I can't really print expected number of 1s because the timequanta is random
// so i test for correctness by checking that eventually program ends
10;
`,
    10,
    '',
    defaultNumWords
);

// Testing slices
testProgram(
    `
var x []int = make([]int, 5, 10); // create a slice of len 5 and capacity 10
x = append(x, 5);
for i := 0; i < len(x); i++ {
    print(x[i]);
}
x[5];
`,
    5,
    '0\n0\n0\n0\n0\n5\n',
    defaultNumWords
);

// Testing re-allocation
testProgram(
    `
var x []int = make([]int, 5, 5); // create a slice of len 5 and capacity 5
var y []int = append(x, 10); // this should point to a new y

print(y[5]); // shud be 10
print(len(x)); // should be 5
y[0]; // should be 0
`,
    0,
    '10\n5\n',
    defaultNumWords
);

// Testing default initialization
testProgram(
    `
var x []bool = make([]bool, 5, 5); // create a slice of len 5 and capacity 5

for i := 0; i < len(x); i++ {
    print(x[i]);
}
0;
`,
    0,
    'false\nfalse\nfalse\nfalse\nfalse\n',
    defaultNumWords
);

testProgram(
    `
var x []string = make([]string, 5, 5); // create a slice of len 5 and capacity 5
x = append(x, "Jotham");

for i := 0; i < len(x); i++ {
    print(x[i]);
}
0;
`,
    0,
    '""\n""\n""\n""\n""\n"Jotham"\n',
    defaultNumWords
);

testProgram(
    `
type Vector struct {
    x int
    y int
}

var vs []Vector = make([]Vector, 5, 10);
for i := 0; i < len(vs); i++ {
    print(vs[i]); // null 5 times
}
10;
`,
    10,
    '"nil"\n"nil"\n"nil"\n"nil"\n"nil"\n',
    defaultNumWords
);

// Test out of bounds error
testProgram(
    `
var x []int = make([]int, 5, 5);
x[6];
`,
    'Array out of bounds error!',
    '',
    defaultNumWords
);

testProgram(
    `
var x []int = make([]int, 5, 10);
x[6]; // still garbage data
`,
    'Array out of bounds error!',
    '',
    defaultNumWords
);

// Test the standard library mutex. It forces the thread that fails to lock to yield and pass on control
// to the next thread. It also demonstrates that the WaitGroup works as intended.
testProgram(
    `
var x int = 0;
wg := WaitGroup{10};

func goo(i int, m Mutex) {
    print(i + " just started");
    m.Lock();
    print(i + " is locking");
    yieldThread(); // immediately give up again
    print(i + " is incrementing");
    x = x + 5;
    m.Unlock();
    wg.Done();
}

m := NewMutex();

for i := 0; i < 10; i++ {
    go goo(i, m);
}

wg.Wait();
print(x);
`,
    50,
    '"0 just started"\n' +
        '"0 is locking"\n' +
        '"1 just started"\n' +
        '"0 is incrementing"\n' +
        '"1 is locking"\n' +
        '"2 just started"\n' +
        '"1 is incrementing"\n' +
        '"2 is locking"\n' +
        '"3 just started"\n' +
        '"2 is incrementing"\n' +
        '"3 is locking"\n' +
        '"4 just started"\n' +
        '"3 is incrementing"\n' +
        '"4 is locking"\n' +
        '"5 just started"\n' +
        '"4 is incrementing"\n' +
        '"5 is locking"\n' +
        '"6 just started"\n' +
        '"5 is incrementing"\n' +
        '"6 is locking"\n' +
        '"7 just started"\n' +
        '"6 is incrementing"\n' +
        '"7 is locking"\n' +
        '"8 just started"\n' +
        '"7 is incrementing"\n' +
        '"8 is locking"\n' +
        '"9 just started"\n' +
        '"8 is incrementing"\n' +
        '"9 is locking"\n' +
        '"9 is incrementing"\n50',
    defaultNumWords
);

// test default initialization
testProgram(
    `
type Vector struct {
    x int
    y int
    z Vector
}

var x int; // defaults to 0
print(x); // 0

var y bool;
print(y); // false

var z string;
print(z); // ""

var a Vector;
var b Vector = Vector{1, 2, Vector{3, 4, nil} };

print(a.x); // 0
print(a.y); // 0
print(a.z); // "nil"

print(b.x); // 1
print(b.y); // 2
print(b.z); // "<struct>"

print(nil); // "nil"
print(a.z == nil); // true
5;
`,
    5,
    '0\nfalse\n""\n0\n0\n"nil"\n1\n2\n"<struct>"\n"nil"\ntrue',
    defaultNumWords
);

// Test cases for higher order functions
testProgram(
    `
func foo(f func(int) int) int {
    return f(5);
}

func goo(x int) int {
    return x + 5;
}

foo(goo);
`,
    10,
    '',
    defaultNumWords
);

testProgram(
    `
func sum(x int, y int) int {
    return x + y
}
func partialSum(x int) func(int) int {
    return func(y int) int {
        return sum(x, y)
    }
}

var i int = partialSum(1)(2)
    `,
    3,
    '',
    defaultNumWords
);

testProgram(
    `
func sum(x int, y int) int {
    return x + y
}
func partialSum(x int) func(int) int {
    return func(y int) int {
        return sum(x, y)
    }
}

var i int = partialSum(1)(2)
var j int = partialSum(3)(4)
i + j
    `,
    10,
    '',
    defaultNumWords
);

testProgram(
    `
func sum(x int, y int) int {
    return x + y
}
func partialSum(x int) func(int) int {
    return func(y int) int {
        return sum(x, y)
    }
}

var i func(int) int = partialSum(10)
var j int = i(2)
`,
    12,
    '',
    defaultNumWords
);
