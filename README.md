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
