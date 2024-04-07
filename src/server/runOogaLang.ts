import { assemble } from '../vm/oogavm-assembler.js';
import { parse } from '../parser/ooga.js';
import { processByteCode } from '../vm/oogavm-machine.js';
import { compile_program } from '../vm/oogavm-compiler.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';
import { checkTypes } from '../vm/oogavm-typechecker.js';

const log = debug('ooga:runOogaLang');

/**
 * Executes the given ooga-lang code and captures the output.
 * @param {string} code The ooga-lang code to execute.
 * @returns {Promise<string>} The captured output (including any errors).
 */
export function runOogaLangCode(code: string): Promise<string> {
    log(code);
    debug.disable();
    return new Promise((resolve, reject) => {
        // Redirect console.log to capture output
        const originalConsoleLog = console.log;
        let capturedOutput = '';
        console.log = (message: string): void => {
            capturedOutput += JSON.stringify(message) + '\n';
        };

        try {
            // Trim the code
            code = code.trim();

            // Execute the ooga-lang code
            let program = parse(code);
            program = { tag: 'BlockStatement', body: program };
            program = checkTypes(program);
            const instrs = compile_program(program);
            let bytecode = assemble(instrs);
            processByteCode(bytecode);
            let value = run();
            capturedOutput += 'Output: ' + value + '\n';
            // Restore console.log
            console.log = originalConsoleLog;
            // Resolve the promise with the captured output
            resolve(capturedOutput);
        } catch (error: any) {
            // Restore console.log before rejecting
            console.log = originalConsoleLog;
            log(error);
            // Reject the promise with the error message
            reject(`Error: ${error.message}\n${capturedOutput}`);
        }
    });
}
