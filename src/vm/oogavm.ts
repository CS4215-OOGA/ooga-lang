import * as fs from 'fs';
import * as util from 'util';

import { compile_program } from './oogavm-compiler.js';
import { assemble } from './oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { checkTypes } from './oogavm-typechecker.js';
import { write } from 'fs';
import debug from 'debug';

const log = debug('ooga:vm');
interface CliOptions {
    compileTo: 'json';
    inputFilename: string;
    outputFilename: string;
}

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

function parseOptions(): CliOptions | null {
    const ret: CliOptions = {
        compileTo: 'json',
        inputFilename: '',
        outputFilename: null,
    };

    let endOfOptions = false;
    let error = false;
    const args = process.argv.slice(2);
    while (args.length > 0) {
        let option = args[0];
        let argument = args[1];

        let argShiftNumber = 2;
        if (!endOfOptions && option.startsWith('--') && option.includes('=')) {
            [option, argument] = option.split('=');
            argShiftNumber = 1;
        }
        if (!endOfOptions && option.startsWith('-')) {
            switch (option) {
                case '--compile-to':
                case '-t':
                    switch (argument) {
                        case 'json':
                            break;
                        default:
                            console.error('Invalid argument to --compile-to: %s', argument);
                            error = true;
                            break;
                    }
                    args.splice(0, argShiftNumber);
                    break;
                case '--out':
                case '-o':
                    ret.outputFilename = argument;
                    args.splice(0, argShiftNumber);
                    break;
                case '--':
                    endOfOptions = true;
                    args.shift();
                    break;
                default:
                    console.error('Unknown option %s', option);
                    args.shift();
                    error = true;
                    break;
            }
        } else {
            if (ret.inputFilename === '') {
                ret.inputFilename = args[0];
            } else {
                console.error('Excess non-option argument: %s', args[0]);
                error = true;
            }
            args.shift();
        }
    }

    if (ret.inputFilename === '') {
        console.error('No input file specified');
        error = true;
    }

    return error ? null : ret;
}

async function main() {
    const options = parseOptions();
    if (options == null) {
        console.error(`Usage: oogavm [options...] <input file>

Options:
-t, --compile-to <option>: [binary]
  json: Compile only, but don't assemble.
  binary: Compile and assemble.
  debug: Compile and pretty-print the compiler output. For debugging the compiler.
  ast: Parse and pretty-print the AST. For debugging the parser.
-o, --out <filename>: [see below]
  Sets the output filename.
  Defaults to the input filename, minus any '.ooga' extension, plus '.bm'.
--:
  Signifies the end of arguments, in case your input filename starts with -.`);
        process.exitCode = 1;
        return;
    }

    let source = await readFileAsync(options.inputFilename, 'utf8');
    source = source.trimEnd();
    let program = parse(source);
    // wrap up the entire ast in a block tag
    program = { tag: 'BlockStatement', body: program };
    log('--------------------------------------------');
    log('Parsed program:');
    log(JSON.stringify(program, null, 2));
    program = checkTypes(program);
    log('--------------------------------------------');
    const instrs = compile_program(program);
    log('--------------------------------------------');
    log('Compiled program:');
    log(instrs);
    log('--------------------------------------------');
    const bytecode = assemble(instrs);
    return writeFileAsync(options.outputFilename, bytecode);
}

main().catch(err => {
    console.error(err);
});
