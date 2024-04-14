import { processByteCode } from '../vm/oogavm-machine.js';
import { run } from '../vm/oogavm-machine.js';
import debug from 'debug';
import { readFileSync } from 'fs';
import { prepare_and_compile } from '../vm/oogavm-toolchain.js';
import { getHeaps, getStacks, resetHeapsAndStacks } from './debug.js';

const log = debug('ooga:runOogaLang');
const standardSource = readFileSync('std/ooga-std.ooga', 'utf8');

let heaps: any[] = [];
let stacks: any[] = [];

export const appendHeap = (heap: any) => {
    heaps.push(heap);
};

export const appendStack = (stack: any) => {
    stacks.push(stack);
};

/**
 * Executes the given ooga-lang code and captures the output.
 * @param {string} code The ooga-lang code to execute.
 * @returns {Promise<string>} The captured output (including any errors).
 */
export function runOogaLangCode(
    code: string
): Promise<{ capturedOutput: string; heaps: any[]; stacks: any[] }> {
    log(code);
    resetHeapsAndStacks();
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
            const bytecode = prepare_and_compile(standardSource, code);
            processByteCode(bytecode);
            let value = run();
            capturedOutput += 'Output: ' + value + '\n';
            // Restore console.log
            console.log = originalConsoleLog;
            const heaps = getHeaps();
            const stacks = getStacks();
            // Resolve the promise with the captured output
            resolve({ capturedOutput, heaps, stacks });
        } catch (error: any) {
            // Restore console.log before rejecting
            console.log = originalConsoleLog;
            log(error);
            // Reject the promise with the error message
            reject(`Error: ${error.message}\n${capturedOutput}`);
        }
    });
}
