import { assemble } from '../vm/oogavm-assembler.js'
import { parse } from '../parser/ooga.js'
import { processByteCode } from '../vm/oogavm-machine.js'
import { compile_program } from '../vm/oogavm-compiler.js'
import { run } from '../vm/oogavm-machine.js'

export function testProgram(program: string, expectedValue: any) {
  console.log('--------------------------------------------')
  console.log('Running program:\n```')
  console.log(program)
  console.log('```\nExpected value: ' + expectedValue)
  let cl = console.log
  console.log = () => {}
  program = program.trimEnd()
  program = parse(program)
  const instrs = compile_program(program)
  let bytecode = assemble(instrs)
  processByteCode(bytecode)
  let value = run()

  console.log = cl
  if (value !== expectedValue) {
    // print "Test failed" in red
    console.log('\x1b[31m%s\x1b[0m', 'Test failed')
    console.log(`Expected ${expectedValue} but got ${value}`)
    console.log('--------------------------------------------')
    throw new Error('Test failed')
  } else {
    // print "Test passed" in green
    console.log('\x1b[32m%s\x1b[0m', 'Test passed')
  }
  console.log('--------------------------------------------')
}

// Testing simple var expressions
testProgram(
  `
var x = 5;
x;
`,
  5
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
