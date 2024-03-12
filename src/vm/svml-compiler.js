"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileToIns = exports.compilePreludeToIns = exports.compileForConcurrent = void 0;
var constants_1 = require("../constants");
var errors_1 = require("../errors/errors");
var parser_1 = require("../parser/parser");
var vm_prelude_1 = require("../stdlib/vm.prelude");
var create = require("../utils/astCreator");
var walkers_1 = require("../utils/walkers");
var opcodes_1 = require("./opcodes");
var VALID_UNARY_OPERATORS = new Map([
    ['!', opcodes_1.default.NOTG],
    ['-', opcodes_1.default.NEGG]
]);
var VALID_BINARY_OPERATORS = new Map([
    ['+', opcodes_1.default.ADDG],
    ['-', opcodes_1.default.SUBG],
    ['*', opcodes_1.default.MULG],
    ['/', opcodes_1.default.DIVG],
    ['%', opcodes_1.default.MODG],
    ['<', opcodes_1.default.LTG],
    ['>', opcodes_1.default.GTG],
    ['<=', opcodes_1.default.LEG],
    ['>=', opcodes_1.default.GEG],
    ['===', opcodes_1.default.EQG],
    ['!==', opcodes_1.default.NEQG]
]);
// Array of function headers in the compiled program
var SVMFunctions = [];
function updateFunction(index, stackSize, ins) {
    var f = SVMFunctions[index];
    f[0] = stackSize;
    f[3] = ins;
}
// Individual function's machine code
var functionCode = [];
// three insert functions (nullary, unary, binary)
function addNullaryInstruction(opCode) {
    var ins = [opCode];
    functionCode.push(ins);
}
function addUnaryInstruction(opCode, arg1) {
    var ins = [opCode, arg1];
    functionCode.push(ins);
}
function addBinaryInstruction(opCode, arg1, arg2) {
    var ins = [opCode, arg1, arg2];
    functionCode.push(ins);
}
// toCompile stack keeps track of remaining compiler work:
// these are function bodies that still need to be compiled
var toCompile = [];
function popToCompile() {
    var next = toCompile.pop();
    if (!next) {
        throw Error('Unable to compile');
    }
    return next;
}
function pushToCompile(task) {
    toCompile.push(task);
}
// to compile a function body, we need an index table
// to get the environment indices for each name
// (parameters, globals and locals)
// Each compile function returns the max operand stack
// size needed for running the code. When compilation of
// a function body is done, the function continueToCompile
// writes the max operand stack size and the address of the
// function body to the given addresses.
// must ensure body passed in is something that has an array of nodes
// Program or BlockStatement
function makeToCompileTask(body, functionAddress, indexTable) {
    return [body, functionAddress, indexTable];
}
function toCompileTaskBody(toCompileTask) {
    return toCompileTask[0];
}
function toCompileTaskFunctionAddress(toCompileTask) {
    return toCompileTask[1];
}
function toCompileTaskIndexTable(toCompileTask) {
    return toCompileTask[2];
}
// indexTable keeps track of environment addresses
// assigned to names
function makeEmptyIndexTable() {
    return [];
}
function makeIndexTableWithPrimitivesAndInternals(vmInternalFunctions) {
    var names = new Map();
    for (var i = 0; i < vm_prelude_1.PRIMITIVE_FUNCTION_NAMES.length; i++) {
        var name_1 = vm_prelude_1.PRIMITIVE_FUNCTION_NAMES[i];
        names.set(name_1, { index: i, isVar: false, type: 'primitive' });
    }
    if (vmInternalFunctions) {
        for (var i = 0; i < vmInternalFunctions.length; i++) {
            var name_2 = vmInternalFunctions[i];
            names.set(name_2, { index: i, isVar: false, type: 'internal' });
        }
    }
    return extendIndexTable(makeEmptyIndexTable(), names);
}
function extendIndexTable(indexTable, names) {
    return indexTable.concat([names]);
}
function indexOf(indexTable, node) {
    var name = node.name;
    for (var i = indexTable.length - 1; i >= 0; i--) {
        if (indexTable[i].has(name)) {
            var envLevel = indexTable.length - 1 - i;
            var _a = indexTable[i].get(name), index = _a.index, isVar = _a.isVar, type = _a.type;
            return { envLevel: envLevel, index: index, isVar: isVar, type: type };
        }
    }
    throw new errors_1.UndefinedVariable(name, node);
}
// a small complication: the toplevel function
// needs to return the value of the last statement
var toplevel = true;
var toplevelReturnNodes = new Set([
    'Literal',
    'UnaryExpression',
    'BinaryExpression',
    'CallExpression',
    'Identifier',
    'ArrayExpression',
    'LogicalExpression',
    'MemberExpression',
    'AssignmentExpression',
    'ArrowFunctionExpression',
    'IfStatement',
    'VariableDeclaration'
]);
function continueToCompile() {
    while (toCompile.length !== 0) {
        var nextToCompile = popToCompile();
        var functionAddress = toCompileTaskFunctionAddress(nextToCompile);
        var indexTable = toCompileTaskIndexTable(nextToCompile);
        var body = toCompileTaskBody(nextToCompile);
        body.isFunctionBlock = true;
        var maxStackSize = compile(body, indexTable, true).maxStackSize;
        var functionIndex = functionAddress[0];
        updateFunction(functionIndex, maxStackSize, functionCode);
        functionCode = [];
        toplevel = false;
    }
}
// extracts all name declarations within a function or block,
// renaming every declaration if rename is true.
// if rename is true, rename to name_line_col and recursively rename identifiers in ast if no same scope declaration
// (check for variable, function declaration in each block. Check for params in each function call)
// for any duplicates, rename recursively within scope
// recurse for any blocks with rename = true
function extractAndRenameNames(baseNode, names, rename) {
    var _a, _b;
    if (rename === void 0) { rename = true; }
    // get all declared names of current scope and keep track of names to rename
    var namesToRename = new Map();
    for (var _i = 0, _d = baseNode.body; _i < _d.length; _i++) {
        var stmt = _d[_i];
        if (stmt.type === 'VariableDeclaration') {
            var node = stmt;
            var name_3 = node.declarations[0].id.name;
            if (rename) {
                var loc = ((_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start;
                var oldName = name_3;
                do {
                    name_3 = "".concat(name_3, "-").concat(loc.line, "-").concat(loc.column);
                } while (names.has(name_3));
                namesToRename.set(oldName, name_3);
            }
            var isVar = node.kind === 'let';
            var index = names.size;
            names.set(name_3, { index: index, isVar: isVar });
        }
        else if (stmt.type === 'FunctionDeclaration') {
            var node = stmt;
            if (node.id === null) {
                throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
            }
            var name_4 = node.id.name;
            if (rename) {
                var loc = ((_b = node.loc) !== null && _b !== void 0 ? _b : constants_1.UNKNOWN_LOCATION).start;
                var oldName = name_4;
                do {
                    name_4 = "".concat(name_4, "-").concat(loc.line, "-").concat(loc.column);
                } while (names.has(name_4));
                namesToRename.set(oldName, name_4);
            }
            var isVar = false;
            var index = names.size;
            names.set(name_4, { index: index, isVar: isVar });
        }
    }
    // rename all references within blocks if nested block does not redeclare name
    renameVariables(baseNode, namesToRename);
    // recurse for blocks. Need to manually add all cases to recurse
    for (var _e = 0, _f = baseNode.body; _e < _f.length; _e++) {
        var stmt = _f[_e];
        if (stmt.type === 'BlockStatement') {
            var node = stmt;
            extractAndRenameNames(node, names, true);
        }
        if (stmt.type === 'IfStatement') {
            var nextAlt = stmt;
            while (nextAlt.type === 'IfStatement') {
                // if else if...
                var _g = nextAlt, consequent = _g.consequent, alternate = _g.alternate;
                extractAndRenameNames(consequent, names, true);
                // Source spec must have alternate
                nextAlt = alternate;
            }
            extractAndRenameNames(nextAlt, names, true);
        }
        if (stmt.type === 'WhileStatement') {
            extractAndRenameNames(stmt.body, names, true);
        }
    }
    return names;
}
// rename variables if nested scope does not redeclare names
// redeclaration occurs on VariableDeclaration and FunctionDeclaration
function renameVariables(baseNode, namesToRename) {
    if (namesToRename.size === 0)
        return;
    var baseScope = true;
    function recurseBlock(node, inactive, c) {
        // get names in current scope
        var locals = getLocalsInScope(node);
        // add names to state
        var oldActive = new Set(inactive);
        for (var _i = 0, locals_1 = locals; _i < locals_1.length; _i++) {
            var name_5 = locals_1[_i];
            inactive.add(name_5);
        }
        // recurse
        for (var _a = 0, _b = node.body; _a < _b.length; _a++) {
            var stmt = _b[_a];
            c(stmt, inactive);
        }
        // reset state to normal
        for (var _d = 0, locals_2 = locals; _d < locals_2.length; _d++) {
            var name_6 = locals_2[_d];
            if (oldActive.has(name_6)) {
                continue;
            }
            inactive.delete(name_6); // delete if not in old scope
        }
    }
    (0, walkers_1.recursive)(baseNode, new Set(), {
        VariablePattern: function (node, inactive, _c) {
            // for declarations
            var name = node.name;
            if (inactive.has(name)) {
                return;
            }
            if (namesToRename.has(name)) {
                node.name = namesToRename.get(name);
            }
        },
        Identifier: function (node, inactive, _c) {
            // for lone references
            var name = node.name;
            if (inactive.has(name)) {
                return;
            }
            if (namesToRename.has(name)) {
                node.name = namesToRename.get(name);
            }
        },
        BlockStatement: function (node, inactive, c) {
            if (baseScope) {
                baseScope = false;
                for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
                    var stmt = _a[_i];
                    c(stmt, inactive);
                }
            }
            else {
                recurseBlock(node, inactive, c);
            }
        },
        IfStatement: function (node, inactive, c) {
            c(node.test, inactive);
            var nextAlt = node;
            while (nextAlt.type === 'IfStatement') {
                var consequent = nextAlt.consequent, alternate = nextAlt.alternate;
                recurseBlock(consequent, inactive, c);
                c(nextAlt.test, inactive);
                nextAlt = alternate;
            }
            recurseBlock(nextAlt, inactive, c);
        },
        Function: function (node, inactive, c) {
            if (node.type === 'FunctionDeclaration') {
                if (node.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                c(node.id, inactive);
            }
            var oldActive = new Set(inactive);
            var locals = new Set();
            for (var _i = 0, _a = node.params; _i < _a.length; _i++) {
                var param = _a[_i];
                var id = param;
                locals.add(id.name);
            }
            for (var _b = 0, locals_3 = locals; _b < locals_3.length; _b++) {
                var name_7 = locals_3[_b];
                inactive.add(name_7);
            }
            c(node.body, inactive, node.type === 'ArrowFunctionExpression' && node.expression ? 'Expression' : 'Statement');
            for (var _d = 0, locals_4 = locals; _d < locals_4.length; _d++) {
                var name_8 = locals_4[_d];
                if (oldActive.has(name_8)) {
                    continue;
                }
                inactive.delete(name_8); // delete if not in old scope
            }
        },
        WhileStatement: function (node, inactive, c) {
            c(node.test, inactive);
            recurseBlock(node.body, inactive, c);
        }
    });
}
function getLocalsInScope(node) {
    var locals = new Set();
    for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
        var stmt = _a[_i];
        if (stmt.type === 'VariableDeclaration') {
            var name_9 = stmt.declarations[0].id.name;
            locals.add(name_9);
        }
        else if (stmt.type === 'FunctionDeclaration') {
            if (stmt.id === null) {
                throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
            }
            var name_10 = stmt.id.name;
            locals.add(name_10);
        }
    }
    return locals;
}
function compileArguments(exprs, indexTable) {
    var maxStackSize = 0;
    for (var i = 0; i < exprs.length; i++) {
        var curExpSize = compile(exprs[i], indexTable, false).maxStackSize;
        maxStackSize = Math.max(i + curExpSize, maxStackSize);
    }
    return maxStackSize;
}
// tuple of loop type, breaks, continues and continueDestinationIndex
// break and continue need to know how much to offset for the branch
// instruction. When compiling the individual instruction, that info
// is not available, so need to keep track of the break and continue
// instruction's index to update the offset when the compiler finishes
// compiling the loop. We need to keep track of continue destination as
// a for loop needs to know where the assignment instructions are.
// This works because of the way a for loop is transformed to a while loop.
// If the loop is a for loop, the last statement in the while loop block
// is always the assignment expression
var loopTracker = [];
var LOOP_TYPE = 0;
var BREAK_INDEX = 1;
var CONT_INDEX = 2;
var CONT_DEST_INDEX = 3;
// used to compile block bodies
function compileStatements(node, indexTable, insertFlag) {
    var statements = node.body;
    var maxStackSize = 0;
    for (var i = 0; i < statements.length; i++) {
        if (node.isLoopBlock &&
            i === statements.length - 1 &&
            loopTracker[loopTracker.length - 1][LOOP_TYPE] === 'for') {
            loopTracker[loopTracker.length - 1][CONT_DEST_INDEX] = functionCode.length;
        }
        var curExprSize = compile(statements[i], indexTable, i === statements.length - 1 ? insertFlag : false).maxStackSize;
        if (i !== statements.length - 1 || node.isLoopBlock) {
            addNullaryInstruction(opcodes_1.default.POPG);
        }
        maxStackSize = Math.max(maxStackSize, curExprSize);
    }
    if (statements.length === 0 && !node.isLoopBlock) {
        addNullaryInstruction(opcodes_1.default.LGCU);
        if (insertFlag || node.isFunctionBlock) {
            addNullaryInstruction(opcodes_1.default.RETG);
        }
        maxStackSize++;
    }
    return { maxStackSize: maxStackSize, insertFlag: false };
}
// each compiler should return a maxStackSize
var compilers = {
    // wrapper
    Program: function (node, indexTable, insertFlag) {
        node = node;
        return compileStatements(node, indexTable, insertFlag);
    },
    // wrapper
    BlockStatement: function (node, indexTable, insertFlag) {
        node = node;
        return compileStatements(node, indexTable, insertFlag);
    },
    // wrapper
    ExpressionStatement: function (node, indexTable, insertFlag) {
        node = node;
        return compile(node.expression, indexTable, insertFlag);
    },
    IfStatement: function (node, indexTable, insertFlag) {
        var _a = node, test = _a.test, consequent = _a.consequent, alternate = _a.alternate;
        var m1 = compile(test, indexTable, false).maxStackSize;
        addUnaryInstruction(opcodes_1.default.BRF, NaN);
        var BRFIndex = functionCode.length - 1;
        var m2 = compile(consequent, indexTable, false).maxStackSize;
        addUnaryInstruction(opcodes_1.default.BR, NaN);
        var BRIndex = functionCode.length - 1;
        functionCode[BRFIndex][1] = functionCode.length - BRFIndex;
        // source spec: must have alternate
        var m3 = compile(alternate, indexTable, false).maxStackSize;
        functionCode[BRIndex][1] = functionCode.length - BRIndex;
        var maxStackSize = Math.max(m1, m2, m3);
        return { maxStackSize: maxStackSize, insertFlag: insertFlag };
    },
    // wrapper, compile as an arrow function expression instead
    FunctionDeclaration: function (node, indexTable, insertFlag) {
        if (node.id === null) {
            throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
        }
        return compile(create.constantDeclaration(node.id.name, create.arrowFunctionExpression(node.params, node.body)), indexTable, insertFlag);
    },
    VariableDeclaration: function (node, indexTable, insertFlag) {
        // only supports const / let
        node = node;
        if (node.kind === 'const' || node.kind === 'let') {
            // assumes left side can only be name
            // source spec: only 1 declaration at a time
            var id = node.declarations[0].id;
            var _a = indexOf(indexTable, id), envLevel = _a.envLevel, index = _a.index;
            var maxStackSize = compile(node.declarations[0].init, indexTable, false).maxStackSize;
            if (envLevel === 0) {
                addUnaryInstruction(opcodes_1.default.STLG, index);
            }
            else {
                // this should never happen
                addBinaryInstruction(opcodes_1.default.STPG, index, envLevel);
            }
            addNullaryInstruction(opcodes_1.default.LGCU);
            return { maxStackSize: maxStackSize, insertFlag: insertFlag };
        }
        throw Error('Invalid declaration');
    },
    // handled by insertFlag in compile function
    ReturnStatement: function (node, indexTable, _insertFlag) {
        node = node;
        if (loopTracker.length > 0) {
            throw Error('return not allowed in loops');
        }
        var maxStackSize = compile(node.argument, indexTable, false, true).maxStackSize;
        return { maxStackSize: maxStackSize, insertFlag: true };
    },
    // Three types of calls, normal function calls declared by the Source program,
    // primitive function calls that are predefined, and internal calls.
    // We differentiate them with callType.
    CallExpression: function (node, indexTable, insertFlag, isTailCallPosition) {
        if (isTailCallPosition === void 0) { isTailCallPosition = false; }
        node = node;
        var maxStackOperator = 0;
        var callType = 'normal';
        var callValue = NaN;
        if (node.callee.type === 'Identifier') {
            var callee = node.callee;
            var _a = indexOf(indexTable, callee), envLevel = _a.envLevel, index = _a.index, type = _a.type;
            if (type === 'primitive' || type === 'internal') {
                callType = type;
                callValue = index;
            }
            else if (envLevel === 0) {
                addUnaryInstruction(opcodes_1.default.LDLG, index);
            }
            else {
                addBinaryInstruction(opcodes_1.default.LDPG, index, envLevel);
            }
        }
        else {
            ;
            (maxStackOperator = compile(node.callee, indexTable, false).maxStackSize);
        }
        var maxStackOperands = compileArguments(node.arguments, indexTable);
        if (callType === 'primitive') {
            addBinaryInstruction(isTailCallPosition ? opcodes_1.default.CALLTP : opcodes_1.default.CALLP, callValue, node.arguments.length);
        }
        else if (callType === 'internal') {
            addBinaryInstruction(isTailCallPosition ? opcodes_1.default.CALLTV : opcodes_1.default.CALLV, callValue, node.arguments.length);
        }
        else {
            // normal call. only normal function calls have the function on the stack
            addUnaryInstruction(isTailCallPosition ? opcodes_1.default.CALLT : opcodes_1.default.CALL, node.arguments.length);
            maxStackOperands++;
        }
        // need at least 1 stack slot for the return value!
        return { maxStackSize: Math.max(maxStackOperator, maxStackOperands, 1), insertFlag: insertFlag };
    },
    UnaryExpression: function (node, indexTable, insertFlag) {
        node = node;
        if (VALID_UNARY_OPERATORS.has(node.operator)) {
            var opCode = VALID_UNARY_OPERATORS.get(node.operator);
            var maxStackSize = compile(node.argument, indexTable, false).maxStackSize;
            addNullaryInstruction(opCode);
            return { maxStackSize: maxStackSize, insertFlag: insertFlag };
        }
        throw Error('Unsupported operation');
    },
    BinaryExpression: function (node, indexTable, insertFlag) {
        node = node;
        if (VALID_BINARY_OPERATORS.has(node.operator)) {
            var opCode = VALID_BINARY_OPERATORS.get(node.operator);
            var m1 = compile(node.left, indexTable, false).maxStackSize;
            var m2 = compile(node.right, indexTable, false).maxStackSize;
            addNullaryInstruction(opCode);
            return { maxStackSize: Math.max(m1, 1 + m2), insertFlag: insertFlag };
        }
        throw Error('Unsupported operation');
    },
    // convert logical expressions to conditional expressions
    LogicalExpression: function (node, indexTable, insertFlag, isTailCallPosition) {
        if (isTailCallPosition === void 0) { isTailCallPosition = false; }
        node = node;
        if (node.operator === '&&') {
            var maxStackSize = compile(create.conditionalExpression(node.left, node.right, create.literal(false)), indexTable, false, isTailCallPosition).maxStackSize;
            return { maxStackSize: maxStackSize, insertFlag: insertFlag };
        }
        else if (node.operator === '||') {
            var maxStackSize = compile(create.conditionalExpression(node.left, create.literal(true), node.right), indexTable, false, isTailCallPosition).maxStackSize;
            return { maxStackSize: maxStackSize, insertFlag: insertFlag };
        }
        throw Error('Unsupported operation');
    },
    ConditionalExpression: function (node, indexTable, insertFlag, isTailCallPosition) {
        if (isTailCallPosition === void 0) { isTailCallPosition = false; }
        var _a = node, test = _a.test, consequent = _a.consequent, alternate = _a.alternate;
        var m1 = compile(test, indexTable, false).maxStackSize;
        addUnaryInstruction(opcodes_1.default.BRF, NaN);
        var BRFIndex = functionCode.length - 1;
        var m2 = compile(consequent, indexTable, insertFlag, isTailCallPosition).maxStackSize;
        var BRIndex = NaN;
        if (!insertFlag) {
            addUnaryInstruction(opcodes_1.default.BR, NaN);
            BRIndex = functionCode.length - 1;
        }
        functionCode[BRFIndex][1] = functionCode.length - BRFIndex;
        var m3 = compile(alternate, indexTable, insertFlag, isTailCallPosition).maxStackSize;
        if (!insertFlag) {
            functionCode[BRIndex][1] = functionCode.length - BRIndex;
        }
        var maxStackSize = Math.max(m1, m2, m3);
        return { maxStackSize: maxStackSize, insertFlag: false };
    },
    ArrowFunctionExpression: function (node, indexTable, insertFlag) {
        node = node;
        // node.body is either a block statement or a single node to return
        var bodyNode = node.body.type === 'BlockStatement'
            ? node.body
            : create.blockStatement([create.returnStatement(node.body)]);
        var names = new Map();
        for (var _i = 0, _a = node.params; _i < _a.length; _i++) {
            var param = _a[_i];
            param = param;
            var index = names.size;
            names.set(param.name, { index: index, isVar: true });
        }
        extractAndRenameNames(bodyNode, names);
        var extendedIndexTable = extendIndexTable(indexTable, names);
        var newSVMFunction = [NaN, names.size, node.params.length, []];
        var functionIndex = SVMFunctions.length;
        SVMFunctions.push(newSVMFunction);
        pushToCompile(makeToCompileTask(bodyNode, [functionIndex], extendedIndexTable));
        addUnaryInstruction(opcodes_1.default.NEWC, [functionIndex]);
        return { maxStackSize: 1, insertFlag: insertFlag };
    },
    Identifier: function (node, indexTable, insertFlag) {
        var _a;
        node = node;
        var envLevel;
        var index;
        var type;
        try {
            ;
            (_a = indexOf(indexTable, node), envLevel = _a.envLevel, index = _a.index, type = _a.type);
            if (type === 'primitive') {
                addUnaryInstruction(opcodes_1.default.NEWCP, index);
            }
            else if (type === 'internal') {
                addUnaryInstruction(opcodes_1.default.NEWCV, index);
            }
            else if (envLevel === 0) {
                addUnaryInstruction(opcodes_1.default.LDLG, index);
            }
            else {
                addBinaryInstruction(opcodes_1.default.LDPG, index, envLevel);
            }
        }
        catch (error) {
            // only possible to have UndefinedVariable error
            var matches = vm_prelude_1.CONSTANT_PRIMITIVES.filter(function (f) { return f[0] === error.name; });
            if (matches.length === 0) {
                throw error;
            }
            if (typeof matches[0][1] === 'number') {
                // for NaN and Infinity
                addUnaryInstruction(opcodes_1.default.LGCF32, matches[0][1]);
            }
            else if (matches[0][1] === undefined) {
                addNullaryInstruction(opcodes_1.default.LGCU);
            }
            else {
                throw Error('Unknown primitive constant');
            }
        }
        return { maxStackSize: 1, insertFlag: insertFlag };
    },
    // string, boolean, number or null
    Literal: function (node, indexTable, insertFlag) {
        node = node;
        var value = node.value;
        if (value === null) {
            addNullaryInstruction(opcodes_1.default.LGCN);
        }
        else {
            switch (typeof value) {
                case 'boolean':
                    if (value) {
                        addNullaryInstruction(opcodes_1.default.LGCB1);
                    }
                    else {
                        addNullaryInstruction(opcodes_1.default.LGCB0);
                    }
                    break;
                case 'number': // need to adjust depending on target
                    // LGCI takes a signed 32-bit integer operand (hence the range)
                    if (Number.isInteger(value) && -2147483648 <= value && value <= 2147483647) {
                        addUnaryInstruction(opcodes_1.default.LGCI, value);
                    }
                    else {
                        addUnaryInstruction(opcodes_1.default.LGCF64, value);
                    }
                    break;
                case 'string':
                    addUnaryInstruction(opcodes_1.default.LGCS, value);
                    break;
                default:
                    throw Error('Unsupported literal');
            }
        }
        return { maxStackSize: 1, insertFlag: insertFlag };
    },
    // array declarations
    ArrayExpression: function (node, indexTable, insertFlag) {
        node = node;
        addNullaryInstruction(opcodes_1.default.NEWA);
        var elements = node.elements;
        var maxStackSize = 1;
        for (var i = 0; i < elements.length; i++) {
            // special case when element wasnt specified
            // i.e. [,]. Treat as undefined element
            if (elements[i] === null) {
                continue;
            }
            // keep the array in the stack
            addNullaryInstruction(opcodes_1.default.DUP);
            addUnaryInstruction(opcodes_1.default.LGCI, i);
            var m1 = compile(elements[i], indexTable, false).maxStackSize;
            addNullaryInstruction(opcodes_1.default.STAG);
            maxStackSize = Math.max(1 + 2 + m1, maxStackSize);
        }
        return { maxStackSize: maxStackSize, insertFlag: insertFlag };
    },
    AssignmentExpression: function (node, indexTable, insertFlag) {
        node = node;
        if (node.left.type === 'Identifier') {
            var _a = indexOf(indexTable, node.left), envLevel = _a.envLevel, index = _a.index, isVar = _a.isVar;
            if (!isVar) {
                throw new errors_1.ConstAssignment(node.left, node.left.name);
            }
            var maxStackSize = compile(node.right, indexTable, false).maxStackSize;
            if (envLevel === 0) {
                addUnaryInstruction(opcodes_1.default.STLG, index);
            }
            else {
                addBinaryInstruction(opcodes_1.default.STPG, index, envLevel);
            }
            addNullaryInstruction(opcodes_1.default.LGCU);
            return { maxStackSize: maxStackSize, insertFlag: insertFlag };
        }
        else if (node.left.type === 'MemberExpression' && node.left.computed === true) {
            // case for array member assignment
            var m1 = compile(node.left.object, indexTable, false).maxStackSize;
            var m2 = compile(node.left.property, indexTable, false).maxStackSize;
            var m3 = compile(node.right, indexTable, false).maxStackSize;
            addNullaryInstruction(opcodes_1.default.STAG);
            addNullaryInstruction(opcodes_1.default.LGCU);
            return { maxStackSize: Math.max(m1, 1 + m2, 2 + m3), insertFlag: insertFlag };
        }
        // property assignments are not supported
        throw Error('Invalid Assignment');
    },
    ForStatement: function (_node, _indexTable, _insertFlag) {
        throw Error('Unsupported operation');
    },
    // Loops need to have their own environment due to closures
    WhileStatement: function (node, indexTable, insertFlag) {
        node = node;
        var isFor = node.isFor;
        var condIndex = functionCode.length;
        var m1 = compile(node.test, indexTable, false).maxStackSize;
        addUnaryInstruction(opcodes_1.default.BRF, NaN);
        var BRFIndex = functionCode.length - 1;
        loopTracker.push([isFor ? 'for' : 'while', [], [], NaN]);
        // Add environment for loop and run in new environment
        var locals = extractAndRenameNames(node.body, new Map());
        addUnaryInstruction(opcodes_1.default.NEWENV, locals.size);
        var extendedIndexTable = extendIndexTable(indexTable, locals);
        var body = node.body;
        body.isLoopBlock = true;
        var m2 = compile(body, extendedIndexTable, false).maxStackSize;
        if (!isFor) {
            // for while loops, the `continue` statement should branch here
            loopTracker[loopTracker.length - 1][CONT_DEST_INDEX] = functionCode.length;
        }
        addNullaryInstruction(opcodes_1.default.POPENV);
        var endLoopIndex = functionCode.length;
        addUnaryInstruction(opcodes_1.default.BR, condIndex - endLoopIndex);
        functionCode[BRFIndex][1] = functionCode.length - BRFIndex;
        // update BR instructions within loop
        var curLoop = loopTracker.pop();
        for (var _i = 0, _a = curLoop[BREAK_INDEX]; _i < _a.length; _i++) {
            var b = _a[_i];
            functionCode[b][1] = functionCode.length - b;
        }
        for (var _b = 0, _d = curLoop[CONT_INDEX]; _b < _d.length; _b++) {
            var c = _d[_b];
            functionCode[c][1] = curLoop[CONT_DEST_INDEX] - c;
        }
        addNullaryInstruction(opcodes_1.default.LGCU);
        return { maxStackSize: Math.max(m1, m2), insertFlag: insertFlag };
    },
    BreakStatement: function (node, indexTable, insertFlag) {
        // keep track of break instruction
        addNullaryInstruction(opcodes_1.default.POPENV);
        loopTracker[loopTracker.length - 1][BREAK_INDEX].push(functionCode.length);
        addUnaryInstruction(opcodes_1.default.BR, NaN);
        return { maxStackSize: 0, insertFlag: insertFlag };
    },
    ContinueStatement: function (node, indexTable, insertFlag) {
        // keep track of continue instruction
        // no need to POPENV as continue will go to the end of the while loop
        loopTracker[loopTracker.length - 1][CONT_INDEX].push(functionCode.length);
        addUnaryInstruction(opcodes_1.default.BR, NaN);
        return { maxStackSize: 0, insertFlag: insertFlag };
    },
    ObjectExpression: function (_node, _indexTable, _insertFlag) {
        throw Error('Unsupported operation');
    },
    MemberExpression: function (node, indexTable, insertFlag) {
        node = node;
        if (node.computed) {
            var m1 = compile(node.object, indexTable, false).maxStackSize;
            var m2 = compile(node.property, indexTable, false).maxStackSize;
            addNullaryInstruction(opcodes_1.default.LDAG);
            return { maxStackSize: Math.max(m1, 1 + m2), insertFlag: insertFlag };
        }
        // properties are not supported
        throw Error('Unsupported operation');
    },
    Property: function (_node, _indexTable, _insertFlag) {
        throw Error('Unsupported operation');
    },
    DebuggerStatement: function (_node, _indexTable, _insertFlag) {
        throw Error('Unsupported operation');
    }
};
function compile(expr, indexTable, insertFlag, isTailCallPosition) {
    if (isTailCallPosition === void 0) { isTailCallPosition = false; }
    var compiler = compilers[expr.type];
    if (!compiler) {
        throw Error('Unsupported operation');
    }
    var _a = compiler(expr, indexTable, insertFlag, isTailCallPosition), temp = _a.maxStackSize, newInsertFlag = _a.insertFlag;
    var maxStackSize = temp;
    // insertFlag decides whether we need to introduce a RETG instruction. For some functions
    // where return is not specified, there is an implicit "return undefined", which we do here.
    // Source programs should return the last evaluated statement, which is what toplevel handles.
    // TODO: Don't emit an unnecessary RETG after a tail call. (This is harmless, but wastes an instruction.)
    // (There are unnecessary RETG for many cases at the top level)
    // TODO: Source programs should return last evaluated statement.
    if (newInsertFlag) {
        if (expr.type === 'ReturnStatement') {
            addNullaryInstruction(opcodes_1.default.RETG);
        }
        else if (toplevel && toplevelReturnNodes.has(expr.type)) {
            // conditional expressions already handled
            addNullaryInstruction(opcodes_1.default.RETG);
        }
        else if (expr.type === 'Program' ||
            expr.type === 'ExpressionStatement' ||
            expr.type === 'BlockStatement' ||
            expr.type === 'FunctionDeclaration') {
            // do nothing for wrapper nodes
        }
        else {
            maxStackSize += 1;
            addNullaryInstruction(opcodes_1.default.LGCU);
            addNullaryInstruction(opcodes_1.default.RETG);
        }
    }
    return { maxStackSize: maxStackSize, insertFlag: newInsertFlag };
}
function compileForConcurrent(program, context) {
    // assume vmPrelude is always a correct program
    var prelude = compilePreludeToIns((0, parser_1.parse)(vm_prelude_1.vmPrelude, context));
    (0, vm_prelude_1.generatePrimitiveFunctionCode)(prelude);
    var vmInternalFunctions = vm_prelude_1.INTERNAL_FUNCTIONS.map(function (_a) {
        var name = _a[0];
        return name;
    });
    return compileToIns(program, prelude, vmInternalFunctions);
}
exports.compileForConcurrent = compileForConcurrent;
function compilePreludeToIns(program) {
    // reset variables
    SVMFunctions = [];
    functionCode = [];
    toCompile = [];
    loopTracker = [];
    toplevel = true;
    transformForLoopsToWhileLoops(program);
    // don't rename names at the top level, because we need them for linking
    var locals = extractAndRenameNames(program, new Map(), false);
    var topFunction = [NaN, locals.size, 0, []];
    var topFunctionIndex = 0; // GE + # primitive func
    SVMFunctions[topFunctionIndex] = topFunction;
    var extendedTable = extendIndexTable(makeIndexTableWithPrimitivesAndInternals(), locals);
    pushToCompile(makeToCompileTask(program, [topFunctionIndex], extendedTable));
    continueToCompile();
    return [0, SVMFunctions];
}
exports.compilePreludeToIns = compilePreludeToIns;
function compileToIns(program, prelude, vmInternalFunctions) {
    // reset variables
    SVMFunctions = [];
    functionCode = [];
    toCompile = [];
    loopTracker = [];
    toplevel = true;
    transformForLoopsToWhileLoops(program);
    insertEmptyElseBlocks(program);
    var locals = extractAndRenameNames(program, new Map());
    var topFunction = [NaN, locals.size, 0, []];
    if (prelude) {
        SVMFunctions.push.apply(SVMFunctions, prelude[1]);
    }
    var topFunctionIndex = prelude ? vm_prelude_1.PRIMITIVE_FUNCTION_NAMES.length + 1 : 0; // GE + # primitive func
    SVMFunctions[topFunctionIndex] = topFunction;
    var extendedTable = extendIndexTable(makeIndexTableWithPrimitivesAndInternals(vmInternalFunctions), locals);
    pushToCompile(makeToCompileTask(program, [topFunctionIndex], extendedTable));
    continueToCompile();
    return [0, SVMFunctions];
}
exports.compileToIns = compileToIns;
// transform according to Source 3 spec. Refer to spec for the way of transformation
function transformForLoopsToWhileLoops(program) {
    (0, walkers_1.simple)(program, {
        ForStatement: function (node) {
            var _a = node, test = _a.test, body = _a.body, init = _a.init, update = _a.update;
            var forLoopBody = body;
            // Source spec: init must be present
            if (init.type === 'VariableDeclaration') {
                var loopVarName = init.declarations[0].id
                    .name;
                // loc is used for renaming. It doesn't matter if we use the same location, as the
                // renaming function will notice that they are the same, and rename it further so that
                // there aren't any clashes.
                var loc = init.loc;
                var copyOfLoopVarName = 'copy-of-' + loopVarName;
                var innerBlock = create.blockStatement([
                    create.constantDeclaration(loopVarName, create.identifier(copyOfLoopVarName), loc),
                    body
                ]);
                forLoopBody = create.blockStatement([
                    create.constantDeclaration(copyOfLoopVarName, create.identifier(loopVarName), loc),
                    innerBlock
                ]);
            }
            var assignment1 = init && init.type === 'VariableDeclaration'
                ? init
                : create.expressionStatement(init);
            var assignment2 = create.expressionStatement(update);
            var newLoopBody = create.blockStatement([forLoopBody, assignment2]);
            var newLoop = create.whileStatement(newLoopBody, test);
            newLoop.isFor = true;
            var newBlockBody = [assignment1, newLoop];
            node = node;
            node.body = newBlockBody;
            node.type = 'BlockStatement';
        }
    });
}
function insertEmptyElseBlocks(program) {
    (0, walkers_1.simple)(program, {
        IfStatement: function (node) {
            var _a;
            (_a = node.alternate) !== null && _a !== void 0 ? _a : (node.alternate = {
                type: 'BlockStatement',
                body: []
            });
        }
    });
}
