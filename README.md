# Ooga

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


## Structure

`oogavm-compiler`: in charge of compiling `*.ooga` files to `*.bm` files.
`oogavm-assembler`: tbh idk why i put this file, got inspired by martin
`oogavm-machine`: run the `*.bm` file.

## TODOs

1. Think at high level how we want to implement all 3 stretch features.
2. The basic features can be directly mapped from the existing HW and really don't require that much IQ

Some differences from the Homework VM that I know of
1. we do not start from the first line
2. we need to spawn goroutines, therefore, each thread needs its own copies of OS, E and so on
3. I am thinking that we use oogavm-scheduler as in martin, with the main thread spawning a copy of itself for goroutines
4. we would need to handle the goroutine case of binding to heap for closure (see cs3211)
5. we need proper error handling and type system as in golang, return errors???
