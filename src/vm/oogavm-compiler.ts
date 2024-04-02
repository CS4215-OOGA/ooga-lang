import Opcodes from './opcodes.js';
import { builtinMappings, initializeBuiltinTable } from './oogavm-machine.js';
import debug from 'debug';
const log = debug('ooga:compiler');

let wc;
let instrs;
let loopMarkers: any[] = []; // For loop markers
const push = (array, ...items) => {
    for (let item of items) {
        array.push(item);
    }
    return array;
};

// **************************
// Compile time environment
// **************************
// Reuse the existing compile time environment as much as possible for safer guarantee on correctness
// A compile-time environment is an array of compile-time frames and a compile-time frame is an array of symbols
type CompileTimeFrame = string[];
type CompileTimeEnvironment = CompileTimeFrame[];

// Find the position [frame-index, value-index] of a given symbol x
function compileTimeEnvironmentPosition(env: CompileTimeEnvironment, x: string) {
    let frameIndex = env.length;
    while (frameIndex > 0 && valueIndex(env[--frameIndex], x) === -1) {}
    let vIndex = valueIndex(env[frameIndex], x);
    if (vIndex === -1) {
        throw Error('unbound name: ' + x);
    }
    return [frameIndex, vIndex];
}

function valueIndex(frame: CompileTimeFrame, x: string) {
    for (let i = 0; i < frame.length; i++) {
        if (frame[i] === x) return i;
    }
    return -1;
}

function compileTimeEnvironmentExtend(vs: string[], e: CompileTimeEnvironment) {
    // shallow copy of e
    return push([...e], vs);
}

const builtinFrame = Object.keys(builtinMappings);
// TODO: Add builtins and constants frame to this
const globalCompileTimeEnvironment: CompileTimeEnvironment = [builtinFrame];

// TODO: Add type annotation here
// scans out the declarations from the block, ignoring nested blocks
// throws an error if the same variable is declared more than once
function scanForLocalsBlock(compBlock): string[] {
    if (compBlock.tag !== 'SequenceStatement') {
        return [];
    }
    let declarations: string[] = [];
    for (let i = 0; i < compBlock.body.length; i++) {
        let comp = compBlock.body[i];
        log('OOGA');
        log(comp);
        if (
            comp.tag === 'VariableDeclaration' ||
            comp.tag === 'ConstantDeclaration' ||
            comp.tag === 'FunctionDeclaration'
        ) {
            // could probably use an extra set but i rather have smaller code
            if (declarations.includes(comp.id.name)) {
                throw Error(
                    'Variable ' + comp.id.name + ' declared more than once in the same block!'
                );
            }
            declarations.push(comp.id.name);
        }
    }
    return declarations;
}

// Helper function to scan for declaration within a for init component
function scanForLocalsSingle(comp): string[] {
    if (comp.tag === 'VariableDeclaration' || comp.tag === 'ConstantDeclaration') {
        return [comp.id.name];
    } else {
        return [];
    }
}

// ******************
// Compilation
// ******************
//

const compileComp = {
    UnaryExpression: (comp, ce) => {
        compile(comp.argument, ce);
        instrs[wc++] = { tag: Opcodes.UNARY, operator: comp.operator };
    },
    BinaryExpression: (comp, ce) => {
        compile(comp.left, ce);
        compile(comp.right, ce);
        instrs[wc++] = { tag: Opcodes.BINOP, operator: comp.operator };
    },
    LogicalExpression: (comp, ce) => {
        compile(comp.left, ce);
        compile(comp.right, ce);
        instrs[wc++] = { tag: Opcodes.LOG, operator: comp.operator };
    },
    Integer: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCI, val: comp.value };
    },
    Boolean: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDBI, val: comp.value };
    },
    Null: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCI, val: comp.value };
    },
    String: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCS, val: comp.value };
    },
    IfStatement: (comp, ce) => {
        compile(comp.test, ce);
        const jof = { tag: Opcodes.JOF, addr: undefined };
        instrs[wc++] = jof;
        compile(comp.consequent, ce);
        const goto_instr = { tag: Opcodes.GOTO, addr: undefined };
        instrs[wc++] = goto_instr;
        jof.addr = wc;
        if (comp.alternate != null) {
            compile(comp.alternate, ce);
        }
        goto_instr.addr = wc;
    },
    BlockStatement: (comp, ce) => {
        const declarations = scanForLocalsBlock(comp.body);
        // Only enter and exit scope if there are actually declarations.
        if (declarations.length == 0) {
            return compile(comp.body, ce);
        }
        instrs[wc++] = { tag: Opcodes.ENTER_SCOPE, num: declarations.length };
        ce = compileTimeEnvironmentExtend(declarations, ce);
        // TODO: Add enclosing environment
        // See: https://go101.org/article/blocks-and-scopes.html
        // For now, we simply compile as per normal
        // For Block statement, we should put a POP instruction after every statement
        // except for the last statement???
        compile(comp.body, ce);
        instrs[wc++] = { tag: Opcodes.EXIT_SCOPE };
    },
    SequenceStatement: (comp, ce) => {
        if (comp.body.length === 0) {
            instrs[wc++] = { tag: Opcodes.LDU };
            return;
        }
        let first = true;
        for (let i = 0; i < comp.body.length; i++) {
            if (first) {
                first = false;
            } else {
                instrs[wc++] = { tag: Opcodes.POP };
            }
            compile(comp.body[i], ce);
        }
    },
    // TODO: Our parser currently treats all the following equivalent
    //       var x int;
    //       var x int = 5;
    //       var x = 5;
    //       x := 5
    //       Since we do not intend to do type inference for now, we will throw an error here.
    //       A possible type inference hack (?) is to evaluate the expression then return the type.
    //       As I type this, I realise its probably the best way and probably not that hard (?)
    VariableDeclaration: (comp, ce) => {
        // If the expression is null, the comp is of the form
        // var x int
        // and we can safely skip it.
        if (comp.expression !== null) {
            compile(comp.expression, ce);
        }
        // Note that this allows the value of the expression to be nil
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };
        // TODO: To handle the types here
    },
    ConstantDeclaration: (comp, ce) => {
        // Handles expressions of the form
        // const x = 5;
        // note that it is not possible for the RHS to be empty, so if it is, we will throw an error
        if (comp.expression === null) {
            throw Error('Cannot have a null RHS expression for a const declaration');
        }
        compile(comp.expression, ce);
        // TODO: Actually prevent constant reassignment
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };
    },
    // TODO: The parser treats expressions of the form
    AssignmentExpression: (comp, ce) => {
        compile(comp.right, ce);
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.left.name),
        };
    },
    Name: (comp, ce) => {
        // TODO: Might have to do type check here?
        instrs[wc++] = {
            tag: Opcodes.LD,
            sym: comp.name,
            pos: compileTimeEnvironmentPosition(ce, comp.name),
        };
    },
    // This handles expressions of the form
    // ++x;
    // --y;
    UpdateExpression: (comp, ce) => {
        compile(comp.id, ce);
        instrs[wc++] = { tag: Opcodes.UNARY, operator: comp.operator };
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };
    },
    FunctionDeclaration: (comp, ce) => {
        // similarly, we treat function declaration as constant declarations for anonymous functions
        // This allows us to treat functions as expressions themselves
        // compile({
        //   tag: "ConstantDeclaration",
        //
        // })
        compile(
            {
                tag: 'ConstantDeclaration',
                id: comp.id,
                expression: {
                    tag: 'LambdaDeclaration',
                    params: comp.params,
                    body: comp.body,
                    type: null,
                },
            },
            ce
        );
    },
    LambdaDeclaration: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDF, arity: comp.params.length, addr: wc + 1 };
        const gotoInstruction = { tag: Opcodes.GOTO, addr: undefined };
        instrs[wc++] = gotoInstruction;

        // TODO: probably want to incorporate type information here in the short future
        let paramNames: string[] = [];
        for (let i = 0; i < comp.params.length; i++) {
            paramNames.push(comp.params[i].name);
        }

        compile(comp.body, compileTimeEnvironmentExtend(paramNames, ce));
        instrs[wc++] = { tag: Opcodes.LDU };
        instrs[wc++] = { tag: Opcodes.RESET };
        gotoInstruction.addr = wc;
    },
    CallExpression: (comp, ce) => {
        compile(comp.callee, ce);
        for (let arg of comp.arguments) {
            compile(arg, ce);
        }
        instrs[wc++] = { tag: Opcodes.CALL, arity: comp.arguments.length };
    },
    ReturnStatement: (comp, ce) => {
        if (comp.expression === null) {
            instrs[wc++] = { tag: Opcodes.LDCI, val: null };
            instrs[wc++] = { tag: Opcodes.RESET };
            return;
        }

        compile(comp.expression, ce);
        // TODO: Handle tail call recursion properly, (that is handle the other cases)
        if (comp.expression.tag === 'CallExpression') {
            instrs[wc - 1].tag = Opcodes.TAIL_CALL;
        } else {
            instrs[wc++] = { tag: Opcodes.RESET };
        }
    },
    GoroutineDeclaration: (comp, ce) => {
        compile(comp.expression, ce);
        instrs[wc++] = { tag: Opcodes.NEW_THREAD };
        instrs[wc++] = { tag: Opcodes.DONE };
    },
    CallGoroutine: (comp, ce) => {
        compile(comp.expression.callee, ce);
        for (let arg of comp.expression.arguments) {
            compile(arg, ce);
        }
        instrs[wc++] = { tag: Opcodes.NEW_THREAD, arity: comp.expression.arguments.length };
        instrs[wc++] = { tag: Opcodes.DONE };
    },
    // ForStatements are just syntactic sugar for while loops
    // The difference is that in ooga-lang, all three components are optional!
    // We handle the ForRange statement separately
    ForStatement: (comp, ce) => {
        // We also need to possibly enter scope if there was a variable declaration
        // in the init component
        let declarations: string[] = [];
        if (comp.init !== null) {
            declarations = scanForLocalsSingle(comp.init);
            if (declarations.length > 0) {
                instrs[wc++] = { tag: Opcodes.ENTER_SCOPE, num: declarations.length };
                ce = compileTimeEnvironmentExtend(declarations, ce);
            }
            compile(comp.init, ce);
        }

        // Mark the start of the loop for continues to jump back to the update or the test
        const loopStart = wc;
        loopMarkers.push({ breaks: [], continues: [] }); // Push new loop marker

        if (comp.test !== null) {
            compile(comp.test, ce);
        }
        const jof = { tag: Opcodes.JOF, addr: undefined };
        instrs[wc++] = jof;

        if (comp.body !== null) {
            compile(comp.body, ce);
            instrs[wc++] = { tag: Opcodes.POP };
        }

        // This marks where a continue statement should jump to, if present
        const continueTarget = wc;
        if (comp.update !== null) {
            compile(comp.update, ce);
        } else {
            // If there's no update part, continue should jump back to the test
            // If there's no test, it effectively jumps to the start of the body
            loopMarkers[loopMarkers.length - 1].continues.forEach(index => {
                instrs[index].addr = loopStart;
            });
        }

        instrs[wc++] = { tag: Opcodes.GOTO, addr: loopStart };
        jof.addr = wc; // Update the jump-on-false address to the instruction after the loop

        // Update break and continue statements within the loop
        const loopMarker = loopMarkers.pop(); // Remove the current loop marker
        loopMarker.breaks.forEach(breakIndex => {
            instrs[breakIndex].addr = wc; // Set the break GOTO address to loop end
        });
        loopMarker.continues.forEach(continueIndex => {
            instrs[continueIndex].addr = continueTarget; // Set the continue GOTO address to the update part or the test
        });

        if (declarations.length > 0) {
            instrs[wc++] = { tag: Opcodes.EXIT_SCOPE };
        }
    },
    BreakStatement: (comp, ce) => {
        if (loopMarkers.length === 0) {
            throw new Error('Break statement not within loop');
        }
        const breakInstr = { tag: Opcodes.GOTO, addr: null }; // Placeholder for now
        instrs[wc++] = breakInstr;
        // Record this break instruction's address to fix up later
        loopMarkers[loopMarkers.length - 1].breaks.push(wc - 1);
    },
    ContinueStatement: (comp, ce) => {
        if (loopMarkers.length === 0) {
            throw new Error('Continue statement not within loop');
        }
        const continueInstr = { tag: Opcodes.GOTO, addr: null }; // Placeholder for now
        instrs[wc++] = continueInstr;
        // Record this continue instruction's address to fix up later
        loopMarkers[loopMarkers.length - 1].continues.push(wc - 1);
    },
};

// TODO: Make everything proper classes so that its clearer
// NOTE: We are a left precedence
// we compile the left then the right
function compile(component, ce) {
    log('Compiling: ');
    log(component);
    return compileComp[component.tag](component, ce);
}

// FIXME: The problem with the current impl is that our PC does not start
//        at the first line, but really the main function (and the init function)
//        So we need a way for the machine to know where it must start
//        The termination condition for the program should also be when main ends
//        So, we should compile the entire thing, find where main ends and put DONE there.
//        To handle the main function entry point, perhaps the first line of the bytecode
//        can be reserved to indicating the start location for the PC.
//        But this seems like a band-aid fix.
export function compile_program(program) {
    initializeBuiltinTable();
    wc = 0;
    instrs = [];
    compile(program, globalCompileTimeEnvironment);
    instrs[wc++] = { tag: Opcodes.DONE };
    return instrs;
}
