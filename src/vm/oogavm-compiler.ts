import Opcodes from './opcodes.js';
import { builtinMappings, initializeBuiltinTable } from './oogavm-machine.js';
import debug from 'debug';
import {
    ArrayType,
    BooleanType,
    ChanType,
    FloatType,
    IntegerType,
    is_type,
    NullType,
    StringType,
    StructType,
    Type,
} from './oogavm-types.js';
import assert from 'assert';
import { CompilerError, OogaError } from './oogavm-errors.js';
import { unparse } from '../utils/utils.js';

const log = debug('ooga:compiler');

let wc: number = 0;
let instrs;
let loopMarkers: any[] = []; // For loop markers

const push = (array: any[], ...items: CompileTimeVariable[][]) => {
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

class Method {
    receiver: string;
    methodName: string;
    isPointer: boolean;
    constructor(receiver: string, methodName: string, isPointer: boolean) {
        this.receiver = receiver;
        this.methodName = methodName;
        this.isPointer = isPointer;
    }

    equals(other: Method) {
        return this.receiver === other.receiver && this.methodName === other.methodName;
    }
}

type CompileTimeVariable = {
    name: string | Method; // This would be an object if it is a method - {receiver: string, methodName: string}
    type: Type | null;
    is_const: boolean;
    // Currently, we are assuming that all variables are of size 1
    // TODO: Keep track of the size of variable here - this is needed for storing structs in structs
};
type CompileTimeFrame = CompileTimeVariable[];
type CompileTimeEnvironment = CompileTimeFrame[];

// Find the position [frame-index, value-index] of a given symbol x
// x could be an object if it is a method as stated above
function compileTimeEnvironmentPosition(env: CompileTimeEnvironment, x: string | Method) {
    let frameIndex = env.length;
    log('Finding position of ' + unparse(x));
    while (frameIndex > 0 && valueIndex(env[--frameIndex], x) === -1) {}
    let vIndex = valueIndex(env[frameIndex], x);
    if (vIndex === -1) {
        throw Error('unbound name: ' + unparse(x));
    }
    return [frameIndex, vIndex];
}

function valueIndex(frame: CompileTimeFrame, x: string | Method) {
    log('Finding value index of ' + unparse(x));
    for (let i = 0; i < frame.length; i++) {
        const name = frame[i].name;
        log(
            'Comparing ' + unparse(name) + ' with ' + unparse(x),
            typeof x === 'string',
            name === x
        );
        if (typeof x === 'string' && name === x) {
            return i;
        } else if (x instanceof Method && name instanceof Method && x.equals(name)) {
            return i;
        }
    }
    return -1;
}

function compileTimeEnvironmentExtend(vs: CompileTimeVariable[], e: CompileTimeEnvironment) {
    // shallow copy of e
    return push([...e], vs);
}

function getCompileTimeVariable(
    env: CompileTimeEnvironment,
    x: string
): CompileTimeVariable | null {
    log('Finding variableType of ' + unparse(x));
    for (let i = env.length - 1; i >= 0; i--) {
        const frame = env[i];
        const variable = frame?.find(v => v.name === x);
        if (variable) {
            return variable;
        }
    }
    return null;
}

const builtinFrame: string[] = Object.keys(builtinMappings);
// TODO: Add builtins and constants frame to this
const globalCompileTimeEnvironment: CompileTimeEnvironment = [
    builtinFrame.map(name => ({ name, type: null, is_const: true })), // TODO: Add types here
];

// TODO: Add type annotation here
// scans out the declarations from the block, ignoring nested blocks
// throws an error if the same variable is declared more than once
function scanForLocalsBlock(compBlock): CompileTimeVariable[] {
    if (compBlock.tag !== 'SequenceStatement') {
        return [];
    }
    let declarations: CompileTimeVariable[] = [];
    for (let i = 0; i < compBlock.body.length; i++) {
        let comp = compBlock.body[i];
        log(comp);
        if (
            comp.tag === 'VariableDeclaration' ||
            comp.tag === 'ConstantDeclaration' ||
            comp.tag === 'FunctionDeclaration'
        ) {
            // could probably use an extra set but i rather have smaller code
            if (declarations.find(decl => decl.name === comp.id.name) !== undefined) {
                throw new CompilerError(
                    'Variable ' + comp.id.name + ' declared more than once in the same block!'
                );
            }
            declarations.push(
                comp.tag === 'VariableDeclaration'
                    ? { name: comp.id.name, type: comp.type, is_const: false }
                    : comp.tag === 'ConstantDeclaration'
                      ? { name: comp.id.name, type: comp.type, is_const: true }
                      : { name: comp.id.name, type: 'function', is_const: false }
            );
        } else if (comp.tag === 'MethodDeclaration') {
            const method = { receiver: comp.receiver.type.name, methodName: comp.id.name };
            if (declarations.find(decl => decl.name === method) !== undefined) {
                const methodName = method.receiver + '.' + method.methodName;
                throw new CompilerError(
                    'Method ' + methodName + ' declared more than once in the same block!'
                );
            }

            declarations.push({
                name: new Method(
                    comp.receiver.type.structName,
                    comp.id.name,
                    comp.receiver.pointer
                ),
                type: comp.type,
                is_const: true,
            });

            log('Added method ' + method.receiver + '.' + method.methodName);
        }
    }
    log('Declarations: ' + unparse(declarations));
    return declarations;
}

// Helper function to scan for declaration within a for init component
function scanForLocalsSingle(comp): CompileTimeVariable[] {
    if (comp.tag === 'VariableDeclaration' || comp.tag === 'ConstantDeclaration') {
        return [
            { name: comp.id.name, type: comp.type, is_const: comp.tag === 'ConstantDeclaration' },
        ];
    } else {
        return [];
    }
}

function defaultInitializeStruct(ce: CompileTimeEnvironment, type: StructType) {
    let instr = {
        tag: 'StructInitializer',
        fields: [],
        named: false,
        type: type,
    };
    for (let field of type.fields) {
        let defaultValue;
        let tag = field.type.name;
        let type = { name: field.type.name };
        if (is_type(field.type, IntegerType)) {
            defaultValue = 0;
        } else if (is_type(field.type, FloatType)) {
            defaultValue = 0;
        } else if (is_type(field.type, BooleanType)) {
            defaultValue = false;
        } else if (is_type(field.type, StringType)) {
            defaultValue = '';
        } else {
            defaultValue = null;
            tag = 'Null';
            type = { name: 'Null' };
        }
        instr.fields.push({
            tag: tag,
            value: defaultValue,
            type: type,
        });
    }
    log('Created fake instr');
    log(instr);
    compile(instr, ce);
}

// Helper function to default initialize a type
function defaultInitialize(ce: CompileTimeEnvironment, type: Type) {
    log('Default initialize');
    log(type);
    if (is_type(type, IntegerType)) {
        log('Default integer');
        instrs[wc++] = { tag: Opcodes.LDCI, val: 0 };
    } else if (is_type(type, FloatType)) {
        log('Default Float');
        instrs[wc++] = { tag: Opcodes.LDCI, val: 0 };
    } else if (is_type(type, BooleanType)) {
        instrs[wc++] = { tag: Opcodes.LDBI, val: false };
    } else if (is_type(type, StringType)) {
        instrs[wc++] = { tag: Opcodes.LDCS, val: '' };
    } else if (is_type(type, StructType)) {
        // If this is a struct, convert the null expression into a StructInitializer compile instruction
        // with default values
        let sType = type as StructType;
        defaultInitializeStruct(ce, sType);
    } else if (is_type(type, ArrayType)) {
        instrs[wc++] = { tag: Opcodes.LDN };
    } else if (is_type(type, ChanType)) {
        instrs[wc++] = { tag: Opcodes.LDN };
    } else {
        throw new CompilerError('Unsupported type for default initialization');
    }
}

// ******************
// Compilation
// ******************
//

/**
 * The `compileComp` object contains various functions that handle the compilation of different AST node types.
 * Each function takes in the AST node and the compile-time environment as parameters and generates the corresponding instructions.
 * The instructions are stored in the `instrs` array and the program counter is updated accordingly.
 */
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
    Float: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCI, val: comp.value };
    },
    Boolean: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDBI, val: comp.value };
    },
    Null: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDN };
    },
    String: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCS, val: comp.value };
    },
    IfStatement: (comp, ce) => {
        compile(comp.test, ce);
        const jof = { tag: Opcodes.JOF, addr: 0 };
        instrs[wc++] = jof;
        compile(comp.consequent, ce);
        const goto_instr = { tag: Opcodes.GOTO, addr: 0 };
        instrs[wc++] = goto_instr;
        jof.addr = wc;
        if (comp.alternate != null) {
            compile(comp.alternate, ce);
        }
        goto_instr.addr = wc;
    },
    SwitchStatement: (comp, ce) => {
        // in ooga, breaks are implicit
        const jumps: number[] = []; // stores all implicit breakpoint instrs
        const goto_instr = { tag: Opcodes.GOTO, addr: undefined };
        for (let i = 0; i < comp.cases.length; i++) {
            const compCase = comp.cases[i];
            let jofInstr;
            if (compCase.test !== null) {
                compile(comp.discriminant, ce);
                compile(compCase.test, ce);
                instrs[wc++] = { tag: Opcodes.LOG, operator: '==' };
                jofInstr = { tag: Opcodes.JOF, addr: undefined };
                instrs[wc++] = jofInstr;
            }
            compile(compCase.consequent, ce);
            // the implicit break to the end
            jumps.push(wc);
            instrs[wc++] = { tag: Opcodes.GOTO, addr: undefined };
            if (compCase.test !== null) {
                jofInstr.addr = wc;
            }
        }
        for (let jumpInstr of jumps) {
            instrs[jumpInstr].addr = wc;
        }
    },
    SelectStatement: (comp, ce) => {
        // iterate through the cases one by one
        // there is no real "randomness"
        // we complete the select case on a single successful case so we need to jump to the end
        let jumps: number[] = [];
        let start: number = wc;
        let hasDefault: boolean = false;
        for (let i = 0; i < comp.cases.length; i++) {
            const compCase = comp.cases[i];
            log('Compiling: ' + unparse(compCase));

            if (compCase.tag === 'SelectReadVariableCase') {
                // This is a ChannelReadExpression that has a variable declaration
                let declarations = scanForLocalsSingle(compCase.operation);
                instrs[wc++] = { tag: Opcodes.ENTER_SCOPE, num: declarations.length };
                ce = compileTimeEnvironmentExtend(declarations, ce);
                compile(compCase.operation.expression.channel, ce);
                // start atomic needed to ensure that no illegal read from channel if context switched
                instrs[wc++] = { tag: Opcodes.START_ATOMIC };
                instrs[wc++] = { tag: Opcodes.CHECK_READ };
                // this pushes either true or false depending on if channel is ready to be read from
                // if channel is not ready to be read from, should jump to the next case
                let jof = { tag: Opcodes.JOF, addr: 0 };
                instrs[wc++] = jof;
                // now if we reach this instruction, channel could be read, so read from channel and assign to
                // variable declaration if there was one, or pop
                compile(compCase.operation, ce); // this handles assignment
                instrs[wc++] = { tag: Opcodes.END_ATOMIC };
                compile(compCase.body, ce);
                instrs[wc++] = { tag: Opcodes.EXIT_SCOPE };
                // same strategy as switch, all these GOTOs will go to the end
                jumps.push(wc);
                instrs[wc++] = { tag: Opcodes.GOTO, addr: 0 };
                // jump to the next select case if possible
                jof.addr = wc;
            } else if (compCase.tag === 'SelectReadCase') {
                // This is a ChannelReadExpression that does not have a variable declaration
                compile(compCase.operation.channel, ce);
                instrs[wc++] = { tag: Opcodes.START_ATOMIC };
                instrs[wc++] = { tag: Opcodes.CHECK_READ };
                // this pushes either true or false depending on if channel is ready to be read from
                // if channel is not ready to be read from, should jump to the next case
                let jof = { tag: Opcodes.JOF, addr: 0 };
                instrs[wc++] = jof;
                // now if we reach this instruction, channel could be read, so read from channel and assign to
                // variable declaration if there was one, or pop
                compile(compCase.operation, ce); // this will read value and then pop
                instrs[wc++] = { tag: Opcodes.POP };
                instrs[wc++] = { tag: Opcodes.END_ATOMIC };
                compile(compCase.body, ce);
                // same strategy as switch, all these GOTOs will go to the end
                jumps.push(wc);
                instrs[wc++] = { tag: Opcodes.GOTO, addr: 0 };
                // jump to the next select case if possible
                jof.addr = wc;
            } else if (compCase.tag === 'SelectWriteCase') {
                // a write expression differs from a read in that no variable declaration
                // push channel value and CHECK_WRITE
                compile(compCase.operation.channel, ce);
                instrs[wc++] = { tag: Opcodes.START_ATOMIC };
                instrs[wc++] = { tag: Opcodes.CHECK_WRITE };
                // this pushes either true or false depending on if channel is ready to be write to
                // if channel is not ready to be write to, should jump to the next case
                let jof = { tag: Opcodes.JOF, addr: 0 };
                instrs[wc++] = jof;
                compile(compCase.operation, ce);
                instrs[wc++] = { tag: Opcodes.END_ATOMIC };
                compile(compCase.body, ce);
                // same strategy as switch, all these GOTOs will go to the end
                jumps.push(wc);
                instrs[wc++] = { tag: Opcodes.GOTO, addr: 0 };
                // jump to the next select case if possible
                jof.addr = wc;
            } else if (compCase.tag === 'SelectDefaultCase') {
                // log('Default case');
                hasDefault = true;
                compile(compCase.body, ce);
                instrs[wc++] = { tag: Opcodes.END_ATOMIC };
                jumps.push(wc);
                instrs[wc++] = { tag: Opcodes.GOTO, addr: 0 };
            } else {
                throw new CompilerError('Unsupported select case in SelectStatement');
            }
        }
        instrs[wc++] = { tag: Opcodes.END_ATOMIC };
        // If none of the cases were handled and there is no default, this is when we reach this compile section
        // we will push a BLOCK_THREAD instruction followed by a GOTO to the start of the case
        if (!hasDefault) {
            instrs[wc++] = { tag: Opcodes.BLOCK_THREAD };
            instrs[wc++] = { tag: Opcodes.GOTO, addr: start };
        }
        for (let jumpInstr of jumps) {
            instrs[jumpInstr].addr = wc;
        }
    },
    BlockStatement: (comp, ce) => {
        if (!comp.body || !comp.body.body || comp.body.body.length === 0) {
            return;
        }
        const declarations: CompileTimeVariable[] = scanForLocalsBlock(comp.body);
        // Only enter and exit scope if there are actually declarations.
        if (declarations.length == 0) {
            return compile(comp.body, ce);
        }
        instrs[wc++] = { tag: Opcodes.ENTER_SCOPE, num: declarations.length };
        ce = compileTimeEnvironmentExtend(declarations, ce);
        log('Extended CE: ' + unparse(ce));
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
    VariableDeclaration: (comp, ce) => {
        // Process the expression as before
        log('Variable Declaration for ');
        log(comp);
        if (comp.expression !== null) {
            compile(comp.expression, ce);
        } else {
            // do default initialization here
            // If the expression is null, the type is guaranteed not to be null by parser
            defaultInitialize(ce, comp.type);
        }
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };
        // Now also include the variable in the current frame with its type
        // const currentFrame = ce[ce.length - 1]; // The last frame is the current scope
        // If the type is 'Unknown' and the RHS is a StructInitializer, we can infer the type
        if (
            comp.type === 'Unknown' &&
            comp.expression &&
            comp.expression.tag === 'StructInitializer'
        ) {
            log('Setting variable ' + comp.id.name + ' to type ' + comp.expression.type.name);
            comp.type = { tag: 'Struct', name: comp.expression.type.name };
            ce[ce.length - 1].find(variable => variable.name === comp.id.name).type = comp.type;
        }
    },
    ConstantDeclaration: (comp, ce) => {
        // Handles expressions of the form
        // const x = 5;
        // note that it is not possible for the RHS to be empty, so if it is, we will throw an error
        if (comp.expression === null) {
            throw new CompilerError('Cannot have a null RHS expression for a const declaration');
        }
        compile(comp.expression, ce);

        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };
    },
    // TODO: The parser treats expressions of the form
    AssignmentExpression: (comp, ce) => {
        log('AssignmentExpression: ' + unparse(comp));
        // Compile the value to be assigned
        compile(comp.right, ce);

        // If LHS is a MemberExpression, handle field assignment
        if (comp.left.tag === 'MemberExpression') {
            log('MemberExpression: ' + unparse(comp.left));

            // Push the struct address onto the stack
            compile(comp.left.object, ce);

            // Determine the struct type and member's index
            const structInfo = comp.left.object.type;
            log('Variable type: ' + unparse(structInfo));

            assert(structInfo instanceof StructType, 'Variable type is not a struct type');

            const fieldIndex = structInfo.fields.findIndex(
                field => field.fieldName === comp.left.property.name
            );
            if (fieldIndex === -1) {
                throw new CompilerError(
                    `Field ${comp.left.property.name} does not exist in struct ${structInfo}`
                );
            }
            // Push the field index onto the stack
            instrs[wc++] = { tag: Opcodes.LDCI, val: fieldIndex };
            // Generate instruction to set the field's value
            instrs[wc++] = { tag: Opcodes.SET_FIELD };
        } else if (comp.left.tag === 'ArraySliceIndex') {
            // If ArraySliceIndex, handle array assignment
            log('ArraySliceIndex: ' + unparse(comp.left));
            // So we push the array, then index, and finally value
            compile(comp.left.arrayExpression, ce);
            compile(comp.left.index, ce);
            compile(comp.right, ce);
            instrs[wc++] = { tag: Opcodes.SET_ARRAY_FIELD };
            // Load
        } else {
            // Handle normal variable assignment
            // Check if left hand side is a const
            const variable = getCompileTimeVariable(ce, comp.left.name);

            if (variable && variable.is_const) {
                throw new CompilerError('Cannot reassign constant ' + comp.left.name);
            }

            instrs[wc++] = {
                tag: Opcodes.ASSIGN,
                pos: compileTimeEnvironmentPosition(ce, comp.left.name),
            };
        }
    },
    Name: (comp, ce) => {
        // TODO: Might have to do type check here?
        log('Name: ' + comp.name);
        instrs[wc++] = {
            tag: Opcodes.LD,
            pos: compileTimeEnvironmentPosition(ce, comp.name),
        };
        log('Exiting Name');
    },
    // This handles expressions of the form
    // ++x;
    // --y;
    UpdateExpression: (comp, ce) => {
        log('UpdateExpression: ' + unparse(comp));
        instrs[wc++] = { tag: Opcodes.START_ATOMIC };
        compile(comp.id, ce);
        log('UpdateExpression: comp ', unparse(comp));
        instrs[wc++] = { tag: Opcodes.UNARY, operator: comp.operator };
        // Check if left hand side is a const
        const variable = getCompileTimeVariable(ce, comp.id.name);

        if (variable && variable.is_const) {
            throw new CompilerError('Cannot reassign constant ' + comp.id.name);
        }

        if (comp.id.tag === 'Name') {
            instrs[wc++] = {
                tag: Opcodes.ASSIGN,
                pos: compileTimeEnvironmentPosition(ce, comp.id.name),
            };
        } else if (comp.id.tag === 'MemberExpression') {
            // We need to push the struct address onto the stack
            // Then we need to push the field index onto the stack
            // Then we need to set the field value

            // Push the struct address onto the stack
            compile(comp.id.object, ce);
            // Determine the struct type and member's index
            const structDefinition = comp.id.object.type;
            log('Variable type: ' + unparse(structDefinition));
            log(structDefinition);
            const fieldIndex = structDefinition.fields.findIndex(
                field => field.fieldName === comp.id.property.name
            );
            if (fieldIndex === -1) {
                throw new CompilerError(
                    `Field ${comp.id.property.name} does not exist in struct ${structDefinition}`
                );
            }
            // Push the field index onto the stack
            instrs[wc++] = { tag: Opcodes.LDCI, val: fieldIndex };
            // Generate instruction to set the field's value
            instrs[wc++] = { tag: Opcodes.SET_FIELD };
        }
        instrs[wc++] = { tag: Opcodes.END_ATOMIC };
        log('Exiting UpdateExpression');
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
        const gotoInstruction = { tag: Opcodes.GOTO, addr: 0 };
        instrs[wc++] = gotoInstruction;

        // TODO: probably want to incorporate type information here in the short future
        let paramNames: CompileTimeVariable[] = [];
        for (let i = 0; i < comp.params.length; i++) {
            paramNames.push({
                name: comp.params[i].name,
                type: comp.params[i].type,
                is_const: true,
            });
        }

        compile(comp.body, compileTimeEnvironmentExtend(paramNames, ce));
        instrs[wc++] = { tag: Opcodes.LDU };
        instrs[wc++] = { tag: Opcodes.RESET };
        gotoInstruction.addr = wc;
    },
    CallExpression: (comp, ce) => {
        log('CallExpression: ' + unparse(comp));
        log(comp);
        if (comp.callee.tag === 'MemberExpression') {
            // Method call
            log('Method call');
            log(unparse(comp.callee));
            const structDefinition = comp.callee.object.type;

            assert(structDefinition instanceof StructType, 'Variable type is not a struct type');

            const methodIndex = structDefinition.methods.findIndex(
                method => method.methodName === comp.callee.property.name
            );

            if (methodIndex === -1) {
                throw new CompilerError(
                    `Method ${comp.callee.property.name} does not exist in struct ${structDefinition.structName}`
                );
            }

            // Push the struct address onto the stack
            compile(
                {
                    tag: 'Name',
                    name: new Method(
                        structDefinition.structName,
                        comp.callee.property.name,
                        structDefinition.methods[methodIndex].isPointer
                    ),
                },
                ce
            );

            // Push the struct address onto the stack as well as the arguments
            for (let arg of comp.arguments) {
                compile(arg, ce);
            }
            compile(
                {
                    tag: 'Name',
                    name: comp.callee.object.name,
                },
                ce
            );
            instrs[wc++] = { tag: Opcodes.CALL, arity: comp.arguments.length + 1 };
        } else {
            compile(comp.callee, ce);
            for (let arg of comp.arguments) {
                compile(arg, ce);
            }
            instrs[wc++] = { tag: Opcodes.CALL, arity: comp.arguments.length };
        }
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
    CallGoroutine: (comp, ce) => {
        if (comp.expression.callee.tag === 'MemberExpression') {
            log('Method call');
            log(unparse(comp));
            // Method call - handle this similarly to CallExpression
            const structInfo = comp.expression.callee.object.type;

            const methodIndex = structInfo.methods.findIndex(
                method => method.methodName === comp.expression.callee.property.name
            );

            if (methodIndex === -1) {
                throw new CompilerError(
                    `Method ${comp.expression.callee.property.name} does not exist in struct ${structInfo.structName}`
                );
            }

            // Push the struct address onto the stack
            compile(
                {
                    tag: 'Name',
                    name: new Method(
                        structInfo.structName,
                        comp.expression.callee.property.name,
                        structInfo.methods[methodIndex].isPointer
                    ),
                },
                ce
            );
            // Push the struct address onto the stack as well as the arguments

            for (let arg of comp.expression.arguments) {
                compile(arg, ce);
            }
            compile(
                {
                    tag: 'Name',
                    name: comp.expression.callee.object.name,
                },
                ce
            );
            instrs[wc++] = { tag: Opcodes.NEW_THREAD, arity: comp.expression.arguments.length + 1 };
            instrs[wc++] = { tag: Opcodes.DONE };
        } else {
            compile(comp.expression.callee, ce);
            for (let arg of comp.expression.arguments) {
                compile(arg, ce);
            }
            instrs[wc++] = { tag: Opcodes.NEW_THREAD, arity: comp.expression.arguments.length };
            instrs[wc++] = { tag: Opcodes.DONE };
        }
    },
    // ForStatements are just syntactic sugar for while loops
    // The difference is that in ooga-lang, all three components are optional!
    // We handle the ForRange statement separately
    ForStatement: (comp, ce) => {
        // We also need to possibly enter scope if there was a variable declaration
        // in the init component
        let declarations: CompileTimeVariable[] = [];
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
        const jof = { tag: Opcodes.JOF, addr: 0 };
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
            throw new CompilerError('Break statement not within loop');
        }
        const breakInstr = { tag: Opcodes.GOTO, addr: null }; // Placeholder for now
        instrs[wc++] = breakInstr;
        // Record this break instruction's address to fix up later
        loopMarkers[loopMarkers.length - 1].breaks.push(wc - 1);
    },
    ContinueStatement: (comp, ce) => {
        if (loopMarkers.length === 0) {
            throw new CompilerError('Continue statement not within loop');
        }
        const continueInstr = { tag: Opcodes.GOTO, addr: null }; // Placeholder for now
        instrs[wc++] = continueInstr;
        // Record this continue instruction's address to fix up later
        loopMarkers[loopMarkers.length - 1].continues.push(wc - 1);
    },
    StructDeclaration: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.LDCI, val: null };
    },
    StructInitializer: (comp, ce) => {
        log('StructInitializer: ' + unparse(comp));

        const structInfo = comp.type;

        assert(structInfo instanceof StructType, 'Variable type is not a struct type');

        // Allocate space for the new struct
        instrs[wc++] = {
            tag: Opcodes.NEW_STRUCT,
            structType: structInfo.structName,
            numFields: structInfo.fields.length,
        };

        // Handle field initialization
        if (comp.named) {
            // Named fields
            comp.fields.forEach(fieldInit => {
                // Find field index in struct definition
                const fieldIndex = structInfo.fields.findIndex(
                    field => field.fieldName === fieldInit.name.name
                );
                if (fieldIndex === -1) {
                    throw new CompilerError(
                        `Field ${fieldInit.name.name} does not exist in struct ${comp.type.name}`
                    );
                }

                // Compile the value to be assigned
                compile(fieldInit.value, ce);

                // Initialize the struct field
                instrs[wc++] = { tag: Opcodes.INIT_FIELD, fieldIndex: fieldIndex };
            });
        } else {
            // Positional fields
            comp.fields.forEach((value, index) => {
                // Compile the value to be assigned
                compile(value, ce);

                // Initialize the struct field
                instrs[wc++] = { tag: Opcodes.INIT_FIELD, fieldIndex: index };
            });
        }
    },
    MemberExpression: (comp, ce) => {
        log('MemberExpression: ' + unparse(comp));

        log('Finding variable type in CE: ' + comp.object.name);
        const structInfo = comp.object.type;
        log('Variable type: ' + unparse(structInfo));

        assert(structInfo instanceof StructType, 'Variable type is not a struct type');

        const fieldIndex = structInfo.fields.findIndex(
            field => field.fieldName === comp.property.name
        );
        const methodIndex = structInfo.methods.findIndex(
            method => method.methodName === comp.property.name
        );

        if (fieldIndex === -1 && methodIndex === -1) {
            throw new CompilerError(
                `Field or method ${comp.property.name} does not exist in struct ${structInfo}`
            );
        }

        if (fieldIndex !== -1) {
            log('Field index: ' + fieldIndex + ', comping field: ' + unparse(comp.object));
            compile(comp.object, ce); // Push the struct's address onto the OS
            instrs[wc++] = { tag: Opcodes.LDCI, val: fieldIndex }; // Field index
            instrs[wc++] = { tag: Opcodes.ACCESS_FIELD }; // Access the field value
        } else if (methodIndex !== -1) {
            // TODO: Implement method calls
        }

        log('Exiting MemberExpression');
    },
    MethodDeclaration: (comp, ce) => {
        log('MethodDeclaration: ' + unparse(comp));
        const structInfo = comp.receiver.type;
        assert(structInfo instanceof StructType, 'Variable type is not a struct type');

        // Generate the method's code
        instrs[wc++] = { tag: Opcodes.LDF, arity: comp.params.length, addr: wc + 1 };
        const gotoInstruction = { tag: Opcodes.GOTO, addr: 0 };
        instrs[wc++] = gotoInstruction;

        let paramNames: CompileTimeVariable[] = [];
        for (let i = 0; i < comp.params.length; i++) {
            paramNames.push({
                name: comp.params[i].name,
                type: comp.params[i].type,
                is_const: false,
            });
        }

        paramNames.push({
            name: comp.receiver.name.name,
            type: comp.receiver.type,
            is_const: false,
        });

        compile(comp.body, compileTimeEnvironmentExtend(paramNames, ce));
        instrs[wc++] = { tag: Opcodes.LDU };
        instrs[wc++] = { tag: Opcodes.RESET };
        gotoInstruction.addr = wc;
        log(unparse(ce));
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(
                ce,
                new Method(comp.receiver.type.structName, comp.id.name, comp.receiver.pointer)
            ),
        };
    },
    ArraySliceLiteral: (comp, ce) => {
        // Length already checked by typechecker
        // Mostly the same as call, push the values in order
        const arrayLength = comp.elements.length;
        for (let i = 0; i < arrayLength; i++) {
            compile(comp.elements[i], ce);
        }
        instrs[wc++] = { tag: Opcodes.LDARR, arity: arrayLength };
    },
    ArraySliceIndex: (comp, ce) => {
        compile(comp.arrayExpression, ce);
        compile(comp.index, ce);
        instrs[wc++] = { tag: Opcodes.LDARRI };
    },
    MakeCallExpression: (comp, ce) => {
        log('Compiling MakeCallExpression');
        log(comp);
        if (is_type(comp.type, ChanType) && comp.args.length === 0) {
            // unbuffered channel
            instrs[wc++] = { tag: Opcodes.CREATE_UNBUFFERED };
        } else if (is_type(comp.type, ChanType)) {
            // buffered channel
            // at the moment, its always length 1, may be subject to change
            compile(comp.args[0], ce);
            instrs[wc++] = { tag: Opcodes.CREATE_BUFFERED };
        } else if (is_type(comp.type, ArrayType)) {
            // Slice which is of initial len and capacity and can grow by appending
            // The format is len, capacity
            if (comp.args.length === 1) {
                // If the user only provides a single value, capacity == len
                // this means that len == capacity
                compile(comp.args[0], ce); // len
                compile(comp.args[0], ce); // capacity
            } else {
                compile(comp.args[0], ce); // len
                compile(comp.args[1], ce); // capacity
            }
            instrs[wc++] = { tag: Opcodes.CREATE_SLICE, elementType: comp.type.elem_type };
        } else {
            throw new OogaError('Unsupported make type at the moment!');
        }
    },
    ChannelReadExpression: (comp, ce) => {
        compile(comp.channel, ce);
        instrs[wc++] = { tag: Opcodes.READ_CHANNEL };
    },
    ChannelWriteExpression: (comp, ce) => {
        compile(comp.value, ce);
        compile(comp.channel, ce);
        // because we don't know the type of the channel here
        // we will push a new Opcode called CHECK_CHANNEL
        instrs[wc++] = { tag: Opcodes.WRITE_CHANNEL };
        instrs[wc++] = { tag: Opcodes.CHECK_CHANNEL };
    },
    AppendExpression: (comp, ce) => {
        compile(comp.args[0], ce);
        compile(comp.name, ce);
        instrs[wc++] = { tag: Opcodes.APPEND };
    },
    BreakpointStatement: (comp, ce) => {
        instrs[wc++] = { tag: Opcodes.BREAKPOINT };
    },
};

// NOTE: We are a left precedence
// we compile the left then the right
function compile(component, ce) {
    log('Compiling: ');
    log(unparse(component));
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
    loopMarkers = [];
    compile(program, globalCompileTimeEnvironment);
    instrs[wc++] = { tag: Opcodes.DONE };
    return instrs;
}
