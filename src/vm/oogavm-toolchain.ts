import { parse } from '../parser/ooga.js';
import { checkTypes } from './oogavm-typechecker.js';
import { compile_program } from './oogavm-compiler.js';
import { assemble } from './oogavm-assembler.js';

import debug from 'debug';
import { writeFileSync } from 'fs';

const log = debug('ooga:vm');

// Common utility function to prepare the program for compilation
export function prepare_and_compile(standardSource: string, programString: string) {
    const source = programString.trimEnd();
    let userProgram = parse(source);
    // If user program parses properly
    standardSource = standardSource.trim();
    let standardProgram = parse(standardSource);
    // wrap up the user program in a block statement
    userProgram = { tag: 'BlockStatement', body: userProgram };
    // This pushes the user program as the final block statement
    // onto the sequence statement of the oogavm-std library
    // This creates a separate frame for the user program that extends the
    // User block program
    // Design speaking wise, this just allows the user to redefine names
    // in the standard library and it's just a matter of preference
    standardProgram['body'].push(userProgram);
    let program = { tag: 'BlockStatement', body: standardProgram };
    log('--------------------------------------------');
    log('Parsed program:');
    writeFileSync("booga.ast.json", JSON.stringify(userProgram, null, 2));
    program = checkTypes(program);
    log('--------------------------------------------');
    const instrs = compile_program(program);
    log('--------------------------------------------');
    log('Compiled program:');
    log(instrs);
    log('--------------------------------------------');
    return assemble(instrs);
}
