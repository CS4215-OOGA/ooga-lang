# Ooga

Ooga is a VM-based sub-language of Go developed using TypeScript.
It includes the Ooga toolchain and a web-based playground website using Microsoft's Monaco
editor for execution of code.

## Quick Start

Set up instructions here.

## Features 

### Sequential Programming Constructs

- Expressions
- Conditionals
- For loops
- Block Scoping
- Function Declarations
- Variable Declarations
- Constant Declarations
- Structs

### Concurrent Programming Constructs

- Goroutines
- WaitGroups

Behind the scenes, Ooga uses a Round Robin scheduler to provide "concurrency" and allows for users
to construct race conditions.

### Garbage Collection

Ooga uses the LISP 2 Garbage Collection algorithm and supports an unlimited number of declarations (up 
to available memory), with no arbitrary node size restriction. Programs such as

```go
func OOGA() int {
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
    return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w +x + y + z;
}
```

### Type Checker

Ooga is a strongly statically typed language that comes with a type checker for ensuring the type safety
of programs.

### Types

Ooga supports integers, floats, booleans, strings and custom Struct expressions.

WORK IN PROGRESS: Slices and Channels

### Test Suite

Ooga comes with a comprehensive test suite that tests all included features. Run `yarn tooga` to see the tests.

### Memory Visualization

Ooga uses a low-level memory model and comes with three built-in functions that lets you visualize
the contents of the heap-based memory model.

The Operating Stack, Runtime Stack and the Environment can be visualized using their corresponding
helper functions.


## Plan

Implementing Type checking
Need to read lecture slides
Grammar already supports it, just need to add type information

Memory management, follow idealized VM

To handle concurrency, there should be a notion of a 'thread' and its registers, aka the 
OS, PC, E separately.

We would use the oogavm-scheduler to do a round robin scheduling of the threads as per js-slang

To do the visualization, we'd need the ability to set breakpoints (how?) and for the heap to be
accessible (interpretably) to the frontend monaco.


## Dev instructions

Everytime you change the grammar, run `yarn peggy`. This will update the `ooga.js` parser.
Everytime you make changes, run `yarn build`. This compiles typescript to js in `dist` folder.
When you want to compile the test file, run `yarn compile`. It will be outputted to `booga.bm`.
When you want to run the file on the VM, run `yarn run`.
More info can be found on the `package.json` file but this should be sufficient for now.

A convenient function that does compile and run is `yarn booga`.

## Structure

`oogavm-assembler`: tbh idk why i put this file, got inspired by martin
`oogavm-compiler`: in charge of compiling `*.ooga` files to `*.bm` files.
`oogavm-errors`: ooga errors to distinguish user error from typescript errors.
`oogavm-heap`: low level memory implementation.
`oogavm-machine`: run the `*.bm` file.
`oogavm-scheduler`: process scheduler.
`oogavm-typechecker`: ooga's typechecker.
`opcodes`: enumeration of machine opcodes.
