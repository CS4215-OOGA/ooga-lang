# Ooga Lang

Ooga is a concurrent virtual machine and interpreter for a subset of the Go programming language. It is implemented in TypeScript and includes a parser, compiler, typechecker, and virtual machine.

## Table of Contents
- [Features](#features)
  - [Language Features](#language-features)
  - [Virtual Machine Features](#virtual-machine-features)
  - [Standard Library](#standard-library)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Toolchain](#running-the-toolchain)
  - [Running Tests](#running-tests)
- [Dev Workflow](#dev-workflow)
- [Usage](#usage)
- [Project Structure](#project-structure)

## Features

### Language Features
- Sequential programming constructs:
  - Variable and constant declarations (with type inference)
  - Function declarations (including higher order functions)
  - Block scoping
  - Conditionals (if/else statements)
  - Expressions
  - For loops
  - Switch statements
- Concurrent programming constructs:
  - Goroutines
  - WaitGroups
  - Channels (buffered and unbuffered)
  - Select statements
- User-defined types:
  - Structs
  - Methods
- Compound types:
  - Arrays (fixed size)
  - Slices (dynamically resizable arrays)
- Strongly statically typed with a typechecker for compile-time type safety
- Designed to be familiar to Go programmers while being a simplified subset

### Virtual Machine Features
- Stack-based bytecode virtual machine
- Lisp 2 mark-compact garbage collection with variable sized nodes (no arbitrary limit on number of declarations)
- Round Robin thread scheduler for concurrency (allows simulation of race conditions)
- Low-level memory model fully accessible from the language
- Visualization of runtime state:
  - Operand stack and stack frames for each goroutine
  - Heap state at each breakpoint
- Debugger with breakpoints

### Standard Library
- Concurrency utilities:
  - Mutexes
  - Semaphores
  - WaitGroups
- fmt package for string formatting and printing
- time package with sleep function

## Architecture

The Ooga toolchain consists of the following components:

1. **Parser**: A Peggy-based parser that parses Ooga source code and generates an abstract syntax tree (AST).

2. **Typechecker**: Performs static type checking on the AST, ensuring the program is well-typed before compilation. Also annotates the AST with type information.

3. **Compiler**: Compiles the type-annotated AST into instructions for the Ooga virtual machine.

4. **Virtual Machine**: A stack-based VM that executes the compiled bytecode. Includes a garbage collector and a scheduler for concurrency.

The toolchain is designed to be modular, with a clean separation between each phase of program processing.

## Getting Started

### Prerequisites
- Node.js (v14 or newer)
- Yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CS4215-OOGA/ooga-lang.git
```

2. Install dependencies:
```bash
cd ooga-lang
yarn install
```

### Running the Toolchain

1. Generate the parser from the Peggy grammar file:
```bash
yarn peggy
```

This command generates `src/parser/ooga.js` from `src/parser/ooga.pegjs`.

2. Compile the TypeScript source code:
```bash
yarn build
```

This command compiles all TypeScript files in the `src` directory into JavaScript in the `dist` directory.

3. Start the server:
```bash
yarn server
```

This command starts the server at http://localhost:3001.

The Ooga playground frontend (in the [ooga-frontend](https://github.com/CS4215-OOGA/ooga-frontend) repo) communicates with this server to execute Ooga code and retrieve debugging information.

### Running Tests


The Ooga test suite is located in `src/tests/test.ts`. It contains a series of integration tests that cover all language features and edge cases.

To run the test suite:
```bash
yarn tooga
```

The test suite will compile and run each test case, checking the output against the expected result. The stdout of each test case is also captured and compared to the expected output. Any discrepancies will cause the test to fail.

Actions are set up to run the test suite on every commit pushed to this repository to ensure that the codebase remains correct.

## Dev Workflow

When working on the Ooga language, follow these steps:

1. If you make changes to the grammar (`src/parser/ooga.pegjs`), regenerate the parser:
   ```bash
   yarn peggy
   ```

2. If you make changes to any TypeScript files, recompile the project:
   ```bash
   yarn build
   ```

3. Write your Ooga code in a file named `booga.ooga`.

4. To compile `booga.ooga` to bytecode:
   ```bash
   yarn compile
   ```
   This command outputs the compiled bytecode to `booga.bm`.

5. To run `booga.bm` in the virtual machine:
   ```bash
   yarn run
   ```

For convenience, you can use `yarn booga` to compile and run `booga.ooga` in one step.

Refer to the `package.json` file for more details on the available scripts.

## Usage

Once the server is running, you can use the Ooga language playground by running the [ooga-frontend](https://github.com/CS4215-OOGA/ooga-frontend) on http://localhost:3000.

Write your Ooga code in the editor. Use the "Run" button to execute the code, and the "Debug" button to view the stacks and heap at each breakpoint.

The playground will display the output and any error messages.

Use `breakpoint;` statements in your code to set breakpoints.

In debug mode, you can inspect the state of each goroutine's operand stack and stack frames, as well as the heap state at each breakpoint.


## Project Structure

The Ooga project is structured as follows:

```
ooga-lang/
│
├── src/
│   ├── vm/
│   │   ├── oogavm-compiler.ts
│   │   ├── oogavm-errors.ts
│   │   ├── oogavm-heap.ts
│   │   ├── oogavm-machine.ts
│   │   ├── oogavm-scheduler.ts
│   │   ├── oogavm-typechecker.ts
│   │   ├── oogavm-types.ts
│   │   └── opcodes.ts
│   │
│   ├── parser/
│   │   ├── ooga.pegjs
│   │   └── ooga.js
│   │
│   ├── tests/
│   │   └── test.ts
│   │
│   ├── server/
│   │   ├── server.ts
│   │   ├── runOogaLang.ts
│   │   └── debug.ts
│   │
│   └── utils/
│       └── utils.ts
│
├── package.json
└── README.md
```

The key directories and files are:

- `src/vm/`: Contains the implementation of the Ooga virtual machine and runtime.
  - `oogavm-compiler.ts`: Compiles the AST into bytecode.
  - `oogavm-errors.ts`: Defines custom error types used throughout the project.
  - `oogavm-heap.ts`: Implements the low-level heap and memory management.
  - `oogavm-machine.ts`: Defines the bytecode virtual machine and its operation.
  - `oogavm-scheduler.ts`: Implements the thread scheduler for concurrency.
  - `oogavm-typechecker.ts`: Performs static type checking on the AST.
  - `oogavm-types.ts`: Defines the types used in the Ooga language and type-related utility functions.
  - `opcodes.ts`: Enumerates the bytecode instruction opcodes.

- `src/parser/`: Contains the Ooga parser.
  - `ooga.pegjs`: Defines the Peggy grammar for the Ooga language.
  - `ooga.js`: The generated parser module (do not edit directly).

- `src/tests/`: Contains the test suite for the Ooga toolchain.
  - `test.ts`: Defines the integration tests for the entire toolchain.

- `src/server/`: Contains the server code for the Ooga playground frontend.
  - `server.ts`: Implements the Express server.
  - `runOogaLang.ts`: Runs user-provided Ooga code and collects debug information.
  - `debug.ts`: Defines the endpoints for retrieving debug information.

- `src/utils/`: Contains utility functions used throughout the project.
  - `utils.ts`: Defines various utility functions.

- `package.json`: Defines the project's dependencies and scripts.