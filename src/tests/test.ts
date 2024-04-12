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
