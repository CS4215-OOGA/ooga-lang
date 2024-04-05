import Opcodes from './opcodes.js';
import { builtinMappings, initializeBuiltinTable } from './oogavm-machine.js';
import debug from 'debug';
const log = debug('ooga:compiler');

let wc;
let instrs;
let loopMarkers: any[] = []; // For loop markers
let StructTable = {
    // StructName: {
    // fields: [
    //    {name: "memberName", type: "memberType"},
    //   ...],
    // methods: [{methodName: "methodName", params: [{name: "paramName", type: "paramType"}], body: "methodBody, type: "methodType"}]
    // }
}; // For struct declarations
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
    type: string | Object | null;
    // Currently, we are assuming that all variables are of size 1
    // TODO: Keep track of the size of variable here - this is needed for storing structs in structs
};
type CompileTimeFrame = CompileTimeVariable[];
type CompileTimeEnvironment = CompileTimeFrame[];

// Find the position [frame-index, value-index] of a given symbol x
// x could be an object if it is a method as stated above
function compileTimeEnvironmentPosition(env: CompileTimeEnvironment, x: string | Method) {
    let frameIndex = env.length;
    log('Finding position of ' + JSON.stringify(x, null, 2));
    while (frameIndex > 0 && valueIndex(env[--frameIndex], x) === -1) {}
    let vIndex = valueIndex(env[frameIndex], x);
    if (vIndex === -1) {
        throw Error('unbound name: ' + JSON.stringify(x, null, 2));
    }
    return [frameIndex, vIndex];
}

function valueIndex(frame: CompileTimeFrame, x: string | Method) {
    for (let i = 0; i < frame.length; i++) {
        if (typeof x === 'string' && frame[i].name === x) {
            return i;
        } else if (
            x instanceof Method &&
            frame[i].name instanceof Method &&
            x.equals(frame[i].name)
        ) {
            return i;
        }
    }
    return -1;
}

function compileTimeEnvironmentExtend(vs: CompileTimeVariable[], e: CompileTimeEnvironment) {
    // shallow copy of e
    return push([...e], vs);
}

const builtinFrame: string[] = Object.keys(builtinMappings);
// TODO: Add builtins and constants frame to this
const globalCompileTimeEnvironment: CompileTimeEnvironment = [
    builtinFrame.map(name => ({ name, type: null })), // TODO: Add types here
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
                throw Error(
                    'Variable ' + comp.id.name + ' declared more than once in the same block!'
                );
            }
            declarations.push(
                comp.tag === 'VariableDeclaration' || comp.tag === 'ConstantDeclaration'
                    ? { name: comp.id.name, type: comp.type }
                    : { name: comp.id.name, type: 'function' }
            );
        } else if (comp.tag === 'MethodDeclaration') {
            const method = { receiver: comp.receiver.type.name, methodName: comp.id.name };
            if (declarations.find(decl => decl.name === method) !== undefined) {
                const methodName = method.receiver + '.' + method.methodName;
                throw Error('Method ' + methodName + ' declared more than once in the same block!');
            }

            declarations.push({
                name: new Method(comp.receiver.type.name, comp.id.name, comp.receiver.pointer),
                type: 'method',
            });

            log('Added method ' + method.receiver + '.' + method.methodName);
        }
    }
    return declarations;
}

// Helper function to scan for declaration within a for init component
function scanForLocalsSingle(comp): CompileTimeVariable[] {
    if (comp.tag === 'VariableDeclaration' || comp.tag === 'ConstantDeclaration') {
        return [{ name: comp.id.name, type: comp.type }];
    } else {
        return [];
    }
}

function findVariableTypeInCE(
    ce: CompileTimeEnvironment,
    variableName: string
): string | Object | null {
    // We should start from the last frame and go backwards
    for (let i = ce.length - 1; i >= 0; i--) {
        const variable = ce[i].find(variable => variable.name === variableName);
        if (variable) {
            return variable.type;
        }
    }
    return null;
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
        const declarations: CompileTimeVariable[] = scanForLocalsBlock(comp.body);
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

        let startWc;
        let lastPop;

        for (let i = 0; i < comp.body.length; i++) {
            startWc = wc;
            compile(comp.body[i], ce);
            if (startWc !== wc) {
                // We only need to pop if we actually did something
                // e.g. StructDeclaration does not do anything with the instruction set
                instrs[wc++] = { tag: Opcodes.POP };
                lastPop = wc - 1;
            }
        }

        if (lastPop !== undefined && lastPop === wc - 1) {
            instrs.pop();
            wc--;
        }
    },
    VariableDeclaration: (comp, ce) => {
        // Process the expression as before
        if (comp.expression !== null) {
            compile(comp.expression, ce);
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
            throw Error('Cannot have a null RHS expression for a const declaration');
        }
        compile(comp.expression, ce);
        // TODO: Actually prevent constant reassignment
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(ce, comp.id.name),
        };

        if (comp.type === 'Unknown' && comp.expression.tag === 'StructInitializer') {
            log('Setting constant ' + comp.id.name + ' to type ' + comp.expression.type.name);
            comp.type = { tag: 'Struct', name: comp.expression.type.name };
            ce[ce.length - 1].find(variable => variable.name === comp.id.name).type = comp.type;
        }
    },
    // TODO: The parser treats expressions of the form
    AssignmentExpression: (comp, ce) => {
        // Compile the value to be assigned
        compile(comp.right, ce);

        // If LHS is a MemberExpression, handle field assignment
        if (comp.left.tag === 'MemberExpression') {
            // Push the struct address onto the stack
            compile(comp.left.object, ce);
            // Determine the struct type and member's index
            const variableType = findVariableTypeInCE(ce, comp.left.object.name);
            log(variableType);
            if (
                !variableType ||
                typeof variableType !== 'object' ||
                variableType.tag !== 'Struct' ||
                !StructTable[variableType.name]
            ) {
                throw new Error(
                    `Type of variable ${comp.left.object.name} is undefined or not a struct.`
                );
            }
            const structDefinition = StructTable[variableType.name].fields;
            const fieldIndex = structDefinition.findIndex(
                field => field.name === comp.left.property.name
            );
            if (fieldIndex === -1) {
                throw new Error(
                    `Field ${comp.left.property.name} does not exist in struct ${variableType}`
                );
            }
            // Push the field index onto the stack
            instrs[wc++] = { tag: Opcodes.LDCI, val: fieldIndex };
            // Generate instruction to set the field's value
            instrs[wc++] = { tag: Opcodes.SET_FIELD };
        } else {
            // Handle normal variable assignment
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
            sym: comp.name,
            pos: compileTimeEnvironmentPosition(ce, comp.name),
        };
        log('Exiting Name');
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
        let paramNames: CompileTimeVariable[] = [];
        for (let i = 0; i < comp.params.length; i++) {
            paramNames.push({
                name: comp.params[i].name,
                type: comp.params[i].type,
            });
        }

        compile(comp.body, compileTimeEnvironmentExtend(paramNames, ce));
        instrs[wc++] = { tag: Opcodes.LDU };
        instrs[wc++] = { tag: Opcodes.RESET };
        gotoInstruction.addr = wc;
    },
    CallExpression: (comp, ce) => {
        if (comp.callee.tag === 'MemberExpression') {
            // Method call
            const variableType = findVariableTypeInCE(ce, comp.callee.object.name);
            if (
                !variableType ||
                typeof variableType !== 'object' ||
                variableType.tag !== 'Struct' ||
                !StructTable[variableType.name]
            ) {
                throw new Error(
                    `Type of variable ${comp.callee.object.name} is undefined or not a struct.`
                );
            }
            const structDefinition = StructTable[variableType.name];
            const methodIndex = structDefinition.methods.findIndex(
                method => method.methodName === comp.callee.property.name
            );

            if (methodIndex === -1) {
                throw new Error(
                    `Method ${comp.callee.property.name} does not exist in struct ${variableType}`
                );
            }

            // Push the struct address onto the stack
            compile(
                {
                    tag: 'Name',
                    name: new Method(
                        variableType.name,
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
    GoroutineDeclaration: (comp, ce) => {
        compile(comp.expression, ce);
        instrs[wc++] = { tag: Opcodes.NEW_THREAD };
        instrs[wc++] = { tag: Opcodes.DONE };
    },
    CallGoroutine: (comp, ce) => {
        if (comp.expression.callee.tag === 'MemberExpression') {
            // Method call
            const variableType = findVariableTypeInCE(ce, comp.expression.callee.object.name);
            if (
                !variableType ||
                typeof variableType !== 'object' ||
                variableType.tag !== 'Struct' ||
                !StructTable[variableType.name]
            ) {
                throw new Error(
                    `Type of variable ${comp.expression.callee.object.name} is undefined or not a struct.`
                );
            }
            const structDefinition = StructTable[variableType.name];
            const methodIndex = structDefinition.methods.findIndex(
                method => method.methodName === comp.expression.callee.property.name
            );

            if (methodIndex === -1) {
                throw new Error(
                    `Method ${comp.expression.callee.property.name} does not exist in struct ${variableType}`
                );
            }

            // Push the struct address onto the stack
            compile(
                {
                    tag: 'Name',
                    name: new Method(
                        variableType.name,
                        comp.expression.callee.property.name,
                        structDefinition.methods[methodIndex].isPointer
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
    StructDeclaration: (comp, ce) => {
        StructTable[comp.id.name] = {
            fields: comp.fields.map(f => ({ name: f.name.name, type: f.type })),
            methods: [],
        };
        instrs[wc++] = { tag: Opcodes.LDCI, val: null };
    },
    StructInitializer: (comp, ce) => {
        // First, verify the struct type exists
        const structInfo = StructTable[comp.type.name]?.fields;
        if (!structInfo) {
            throw new Error(`Undefined struct type: ${comp.type.name}`);
        }

        // Allocate space for the new struct
        instrs[wc++] = {
            tag: Opcodes.NEW_STRUCT,
            structType: comp.type.name,
            numFields: structInfo.length,
        };

        // Handle field initialization
        if (comp.named) {
            // Named fields
            comp.fields.forEach(fieldInit => {
                // Find field index in struct definition
                const fieldIndex = structInfo.findIndex(f => f.name === fieldInit.name.name);
                if (fieldIndex === -1) {
                    throw new Error(
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
        log('MemberExpression: ' + JSON.stringify(comp, null, 2));
        const variableType = findVariableTypeInCE(ce, comp.object.name);
        if (
            !variableType ||
            typeof variableType !== 'object' ||
            variableType.tag !== 'Struct' ||
            !StructTable[variableType.name]
        ) {
            throw new Error(
                `Type of variable ${comp.object.name} is undefined or not a struct. It is ${variableType}`
            );
        }
        log('Variable type: ' + JSON.stringify(variableType, null, 2));
        const structDefinition = StructTable[variableType.name];
        const fieldIndex = structDefinition.fields.findIndex(
            field => field.name === comp.property.name
        );
        const methodIndex = structDefinition.methods.findIndex(
            method => method.methodName === comp.property.name
        );

        if (fieldIndex !== -1) {
            compile(comp.object, ce); // Push the struct's address onto the OS
            instrs[wc++] = { tag: Opcodes.LDCI, val: fieldIndex }; // Field index
            instrs[wc++] = { tag: Opcodes.ACCESS_FIELD }; // Access the field value
        } else if (methodIndex !== -1) {
            // TODO: Implement method calls
        } else {
            throw new Error(`Field ${comp.property.name} does not exist in struct ${variableType}`);
        }
    },
    MethodDeclaration: (comp, ce) => {
        const structName = comp.receiver.type.name;
        if (!StructTable[structName]) {
            throw new Error(`Undefined struct type: ${structName}`);
        }
        const structInfo = StructTable[structName];
        const methodIndex = structInfo.methods.findIndex(
            method => method.methodName === comp.id.name
        );
        if (methodIndex !== -1) {
            throw new Error(`Method ${comp.id.name} already exists in struct ${structName}`);
        }

        // Generate the method's code
        instrs[wc++] = { tag: Opcodes.LDF, arity: comp.params.length, addr: wc + 1 };
        const gotoInstruction = { tag: Opcodes.GOTO, addr: undefined };
        instrs[wc++] = gotoInstruction;

        let paramNames: CompileTimeVariable[] = [];
        for (let i = 0; i < comp.params.length; i++) {
            paramNames.push({
                name: comp.params[i].name,
                type: comp.params[i].type,
            });
        }

        paramNames.push({ name: comp.receiver.name.name, type: comp.receiver.type });

        compile(comp.body, compileTimeEnvironmentExtend(paramNames, ce));
        instrs[wc++] = { tag: Opcodes.LDU };
        instrs[wc++] = { tag: Opcodes.RESET };
        gotoInstruction.addr = wc;
        log(JSON.stringify(ce, null, 2));
        instrs[wc++] = {
            tag: Opcodes.ASSIGN,
            pos: compileTimeEnvironmentPosition(
                ce,
                new Method(comp.receiver.type.name, comp.id.name, comp.receiver.pointer)
            ),
        };
        // Store the method in the struct's method table
        structInfo.methods.push({
            methodName: comp.id.name,
            params: comp.params,
            body: comp.body,
            type: comp.type,
            addr: gotoInstruction.addr,
            isPointer: comp.receiver.pointer,
        });
    },
};

// NOTE: We are a left precedence
// we compile the left then the right
function compile(component, ce) {
    log('Compiling: ');
    log(JSON.stringify(component, null, 2));
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
