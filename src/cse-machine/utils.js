"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasContinueStatement = exports.hasContinueStatementIf = exports.hasBreakStatement = exports.hasBreakStatementIf = exports.hasReturnStatement = exports.hasReturnStatementIf = exports.checkStackOverFlow = exports.checkNumberOfArguments = exports.handleRuntimeError = exports.setVariable = exports.getVariable = exports.defineVariable = exports.hasImportDeclarations = exports.hasDeclarations = exports.declareFunctionsAndVariables = exports.declareIdentifier = exports.createBlockEnvironment = exports.pushEnvironment = exports.popEnvironment = exports.createEnvironment = exports.currentEnvironment = exports.isSimpleFunction = exports.envChanging = exports.valueProducing = exports.reduceConditional = exports.handleSequence = exports.isAssmtInstr = exports.isRestElement = exports.isRawBlockStatement = exports.isBlockStatement = exports.isIfStatement = exports.isReturnStatement = exports.isIdentifier = exports.isNode = exports.isInstr = exports.Stack = void 0;
var lodash_1 = require("lodash");
var errors = require("../errors/errors");
var closure_1 = require("../interpreter/closure");
var ast = require("../utils/astCreator");
var instr = require("./instrCreator");
var types_1 = require("./types");
var Stack = /** @class */ (function () {
    function Stack() {
        // Bottom of the array is at index 0
        this.storage = [];
    }
    Stack.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        for (var _a = 0, items_1 = items; _a < items_1.length; _a++) {
            var item = items_1[_a];
            this.storage.push(item);
        }
    };
    Stack.prototype.pop = function () {
        return this.storage.pop();
    };
    Stack.prototype.peek = function () {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.storage[this.size() - 1];
    };
    Stack.prototype.size = function () {
        return this.storage.length;
    };
    Stack.prototype.isEmpty = function () {
        return this.size() == 0;
    };
    Stack.prototype.getStack = function () {
        // return a copy of the stack's contents
        return __spreadArray([], this.storage, true);
    };
    Stack.prototype.some = function (predicate) {
        return this.storage.some(predicate);
    };
    // required for first-class continuations,
    // which directly mutate this stack globally.
    Stack.prototype.setTo = function (otherStack) {
        this.storage = otherStack.storage;
    };
    return Stack;
}());
exports.Stack = Stack;
/**
 * Typeguard for Instr to distinguish between program statements and instructions.
 *
 * @param command A ControlItem
 * @returns true if the ControlItem is an instruction and false otherwise.
 */
var isInstr = function (command) {
    return command.instrType !== undefined;
};
exports.isInstr = isInstr;
/**
 * Typeguard for esNode to distinguish between program statements and instructions.
 *
 * @param command A ControlItem
 * @returns true if the ControlItem is an esNode and false if it is an instruction.
 */
var isNode = function (command) {
    return command.type !== undefined;
};
exports.isNode = isNode;
/**
 * Typeguard for esIdentifier. To verify if an esNode is an esIdentifier.
 *
 * @param node an esNode
 * @returns true if node is an esIdentifier, false otherwise.
 */
var isIdentifier = function (node) {
    return node.name !== undefined;
};
exports.isIdentifier = isIdentifier;
/**
 * Typeguard for esReturnStatement. To verify if an esNode is an esReturnStatement.
 *
 * @param node an esNode
 * @returns true if node is an esReturnStatement, false otherwise.
 */
var isReturnStatement = function (node) {
    return node.type == 'ReturnStatement';
};
exports.isReturnStatement = isReturnStatement;
/**
 * Typeguard for esIfStatement. To verify if an esNode is an esIfStatement.
 *
 * @param node an esNode
 * @returns true if node is an esIfStatement, false otherwise.
 */
var isIfStatement = function (node) {
    return node.type == 'IfStatement';
};
exports.isIfStatement = isIfStatement;
/**
 * Typeguard for esBlockStatement. To verify if an esNode is a block statement.
 *
 * @param node an esNode
 * @returns true if node is an esBlockStatement, false otherwise.
 */
var isBlockStatement = function (node) {
    return node.type == 'BlockStatement';
};
exports.isBlockStatement = isBlockStatement;
/**
 * Typeguard for RawBlockStatement. To verify if an esNode is a raw block statement (i.e. passed environment creation).
 *
 * @param node an esNode
 * @returns true if node is a RawBlockStatement, false otherwise.
 */
var isRawBlockStatement = function (node) {
    return node.isRawBlock === 'true';
};
exports.isRawBlockStatement = isRawBlockStatement;
/**
 * Typeguard for esRestElement. To verify if an esNode is a block statement.
 *
 * @param node an esNode
 * @returns true if node is an esRestElement, false otherwise.
 */
var isRestElement = function (node) {
    return node.type == 'RestElement';
};
exports.isRestElement = isRestElement;
/**
 * Typeguard for AssmtInstr. To verify if an instruction is an assignment instruction.
 *
 * @param instr an instruction
 * @returns true if instr is an AssmtInstr, false otherwise.
 */
var isAssmtInstr = function (instr) {
    return instr.instrType === types_1.InstrType.ASSIGNMENT;
};
exports.isAssmtInstr = isAssmtInstr;
/**
 * A helper function for handling sequences of statements.
 * Statements must be pushed in reverse order, and each statement is separated by a pop
 * instruction so that only the result of the last statement remains on stash.
 * Value producing statements have an extra pop instruction.
 *
 * @param seq Array of statements.
 * @returns Array of commands to be pushed into control.
 */
var handleSequence = function (seq) {
    var result = [];
    var valueProduced = false;
    for (var _i = 0, seq_1 = seq; _i < seq_1.length; _i++) {
        var command = seq_1[_i];
        if (!isImportDeclaration(command)) {
            if ((0, exports.valueProducing)(command)) {
                // Value producing statements have an extra pop instruction
                if (valueProduced) {
                    result.push(instr.popInstr(command));
                }
                else {
                    valueProduced = true;
                }
            }
            result.push(command);
        }
    }
    // Push statements in reverse order
    return result.reverse();
};
exports.handleSequence = handleSequence;
/**
 * This function is used for ConditionalExpressions and IfStatements, to create the sequence
 * of control items to be added.
 */
var reduceConditional = function (node) {
    return [instr.branchInstr(node.consequent, node.alternate, node), node.test];
};
exports.reduceConditional = reduceConditional;
/**
 * To determine if a control item is value producing. JavaScript distinguishes value producing
 * statements and non-value producing statements.
 * Refer to https://sourceacademy.nus.edu.sg/sicpjs/4.1.2 exercise 4.8.
 *
 * @param command Control item to determine if it is value producing.
 * @returns true if it is value producing, false otherwise.
 */
var valueProducing = function (command) {
    var type = command.type;
    return (type !== 'VariableDeclaration' &&
        type !== 'FunctionDeclaration' &&
        type !== 'ContinueStatement' &&
        type !== 'BreakStatement' &&
        type !== 'DebuggerStatement' &&
        (type !== 'BlockStatement' || command.body.some(exports.valueProducing)));
};
exports.valueProducing = valueProducing;
/**
 * To determine if a control item changes the environment.
 * There is a change in the environment when
 *  1. pushEnvironment() is called when creating a new frame, if there are variable declarations.
 *     Called in Program, BlockStatement, and Application instructions.
 *  2. there is an assignment.
 *     Called in Assignment and Array Assignment instructions.
 *
 * @param command Control item to check against.
 * @returns true if it changes the environment, false otherwise.
 */
var envChanging = function (command) {
    if ((0, exports.isNode)(command)) {
        var type = command.type;
        return type === 'Program' || (type === 'BlockStatement' && hasDeclarations(command));
    }
    else {
        var type = command.instrType;
        return (type === types_1.InstrType.ASSIGNMENT ||
            type === types_1.InstrType.ARRAY_ASSIGNMENT ||
            (type === types_1.InstrType.APPLICATION && command.numOfArgs > 0));
    }
};
exports.envChanging = envChanging;
/**
 * To determine if the function is simple.
 * Simple functions contain a single return statement.
 *
 * @param node The function to check against.
 * @returns true if the function is simple, false otherwise.
 */
var isSimpleFunction = function (node) {
    if (node.body.type !== 'BlockStatement') {
        return true;
    }
    else {
        var block = node.body;
        return block.body.length === 1 && block.body[0].type === 'ReturnStatement';
    }
};
exports.isSimpleFunction = isSimpleFunction;
/**
 * Environments
 */
var currentEnvironment = function (context) { return context.runtime.environments[0]; };
exports.currentEnvironment = currentEnvironment;
var createEnvironment = function (closure, args, callExpression) {
    var environment = {
        name: (0, exports.isIdentifier)(callExpression.callee) ? callExpression.callee.name : closure.functionName,
        tail: closure.environment,
        head: {},
        id: (0, lodash_1.uniqueId)(),
        callExpression: __assign(__assign({}, callExpression), { arguments: args.map(ast.primitive) })
    };
    closure.node.params.forEach(function (param, index) {
        if ((0, exports.isRestElement)(param)) {
            environment.head[param.argument.name] = args.slice(index);
        }
        else {
            environment.head[param.name] = args[index];
        }
    });
    return environment;
};
exports.createEnvironment = createEnvironment;
var popEnvironment = function (context) { return context.runtime.environments.shift(); };
exports.popEnvironment = popEnvironment;
var pushEnvironment = function (context, environment) {
    context.runtime.environments.unshift(environment);
    context.runtime.environmentTree.insert(environment);
};
exports.pushEnvironment = pushEnvironment;
var createBlockEnvironment = function (context, name, head) {
    if (name === void 0) { name = 'blockEnvironment'; }
    if (head === void 0) { head = {}; }
    return {
        name: name,
        tail: (0, exports.currentEnvironment)(context),
        head: head,
        id: (0, lodash_1.uniqueId)()
    };
};
exports.createBlockEnvironment = createBlockEnvironment;
/**
 * Variables
 */
var UNASSIGNED_CONST = Symbol('const declaration');
var UNASSIGNED_LET = Symbol('let declaration');
function declareIdentifier(context, name, node, environment, constant) {
    if (constant === void 0) { constant = false; }
    if (environment.head.hasOwnProperty(name)) {
        var descriptors = Object.getOwnPropertyDescriptors(environment.head);
        return (0, exports.handleRuntimeError)(context, new errors.VariableRedeclaration(node, name, descriptors[name].writable));
    }
    environment.head[name] = constant ? UNASSIGNED_CONST : UNASSIGNED_LET;
    return environment;
}
exports.declareIdentifier = declareIdentifier;
function declareVariables(context, node, environment) {
    for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
        var declaration = _a[_i];
        // Retrieve declaration type from node
        var constant = node.kind === 'const';
        declareIdentifier(context, declaration.id.name, node, environment, constant);
    }
}
function declareFunctionsAndVariables(context, node, environment) {
    for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        switch (statement.type) {
            case 'VariableDeclaration':
                declareVariables(context, statement, environment);
                break;
            case 'FunctionDeclaration':
                // FunctionDeclaration is always of type constant
                declareIdentifier(context, statement.id.name, statement, environment, true);
                break;
        }
    }
}
exports.declareFunctionsAndVariables = declareFunctionsAndVariables;
function hasDeclarations(node) {
    for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        if (statement.type === 'VariableDeclaration' || statement.type === 'FunctionDeclaration') {
            return true;
        }
    }
    return false;
}
exports.hasDeclarations = hasDeclarations;
function hasImportDeclarations(node) {
    for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        if (statement.type === 'ImportDeclaration') {
            return true;
        }
    }
    return false;
}
exports.hasImportDeclarations = hasImportDeclarations;
function isImportDeclaration(node) {
    return node.type === 'ImportDeclaration';
}
function defineVariable(context, name, value, constant, node) {
    if (constant === void 0) { constant = false; }
    var environment = (0, exports.currentEnvironment)(context);
    if (environment.head[name] !== UNASSIGNED_CONST && environment.head[name] !== UNASSIGNED_LET) {
        return (0, exports.handleRuntimeError)(context, new errors.VariableRedeclaration(node, name, !constant));
    }
    Object.defineProperty(environment.head, name, {
        value: value,
        writable: !constant,
        enumerable: true
    });
    return environment;
}
exports.defineVariable = defineVariable;
var getVariable = function (context, name, node) {
    var environment = (0, exports.currentEnvironment)(context);
    while (environment) {
        if (environment.head.hasOwnProperty(name)) {
            if (environment.head[name] === UNASSIGNED_CONST ||
                environment.head[name] === UNASSIGNED_LET) {
                return (0, exports.handleRuntimeError)(context, new errors.UnassignedVariable(name, node));
            }
            else {
                return environment.head[name];
            }
        }
        else {
            environment = environment.tail;
        }
    }
    return (0, exports.handleRuntimeError)(context, new errors.UndefinedVariable(name, node));
};
exports.getVariable = getVariable;
var setVariable = function (context, name, value, node) {
    var environment = (0, exports.currentEnvironment)(context);
    while (environment) {
        if (environment.head.hasOwnProperty(name)) {
            if (environment.head[name] === UNASSIGNED_CONST ||
                environment.head[name] === UNASSIGNED_LET) {
                break;
            }
            var descriptors = Object.getOwnPropertyDescriptors(environment.head);
            if (descriptors[name].writable) {
                environment.head[name] = value;
                return undefined;
            }
            return (0, exports.handleRuntimeError)(context, new errors.ConstAssignment(node, name));
        }
        else {
            environment = environment.tail;
        }
    }
    return (0, exports.handleRuntimeError)(context, new errors.UndefinedVariable(name, node));
};
exports.setVariable = setVariable;
var handleRuntimeError = function (context, error) {
    context.errors.push(error);
    throw error;
};
exports.handleRuntimeError = handleRuntimeError;
var checkNumberOfArguments = function (context, callee, args, exp) {
    var _a;
    if (callee instanceof closure_1.default) {
        // User-defined or Pre-defined functions
        var params = callee.node.params;
        var hasVarArgs = ((_a = params[params.length - 1]) === null || _a === void 0 ? void 0 : _a.type) === 'RestElement';
        if (hasVarArgs ? params.length - 1 > args.length : params.length !== args.length) {
            return (0, exports.handleRuntimeError)(context, new errors.InvalidNumberOfArguments(exp, hasVarArgs ? params.length - 1 : params.length, args.length, hasVarArgs));
        }
    }
    else {
        // Pre-built functions
        var hasVarArgs = callee.minArgsNeeded != undefined;
        if (hasVarArgs ? callee.minArgsNeeded > args.length : callee.length !== args.length) {
            return (0, exports.handleRuntimeError)(context, new errors.InvalidNumberOfArguments(exp, hasVarArgs ? callee.minArgsNeeded : callee.length, args.length, hasVarArgs));
        }
    }
    return undefined;
};
exports.checkNumberOfArguments = checkNumberOfArguments;
/**
 * This function can be used to check for a stack overflow.
 * The current limit is set to be a control size of 1.0 x 10^5, if the control
 * flows beyond this limit an error is thrown.
 * This corresponds to about 10mb of space according to tests ran.
 */
var checkStackOverFlow = function (context, control) {
    if (control.size() > 100000) {
        var stacks = [];
        var counter = 0;
        for (var i = 0; counter < errors.MaximumStackLimitExceeded.MAX_CALLS_TO_SHOW &&
            i < context.runtime.environments.length; i++) {
            if (context.runtime.environments[i].callExpression) {
                stacks.unshift(context.runtime.environments[i].callExpression);
                counter++;
            }
        }
        (0, exports.handleRuntimeError)(context, new errors.MaximumStackLimitExceeded(context.runtime.nodes[0], stacks));
    }
};
exports.checkStackOverFlow = checkStackOverFlow;
/**
 * Checks whether an `if` statement returns in every possible branch.
 * @param body The `if` statement to be checked
 * @return `true` if every branch has a return statement, else `false`.
 */
var hasReturnStatementIf = function (statement) {
    var hasReturn = true;
    // Parser enforces that if/else have braces (block statement)
    hasReturn = hasReturn && (0, exports.hasReturnStatement)(statement.consequent);
    if (statement.alternate) {
        if ((0, exports.isIfStatement)(statement.alternate)) {
            hasReturn = hasReturn && (0, exports.hasReturnStatementIf)(statement.alternate);
        }
        else if ((0, exports.isBlockStatement)(statement.alternate)) {
            hasReturn = hasReturn && (0, exports.hasReturnStatement)(statement.alternate);
        }
    }
    return hasReturn;
};
exports.hasReturnStatementIf = hasReturnStatementIf;
/**
 * Checks whether a block returns in every possible branch.
 * @param body The block to be checked
 * @return `true` if every branch has a return statement, else `false`.
 */
var hasReturnStatement = function (block) {
    var hasReturn = false;
    for (var _i = 0, _a = block.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        if ((0, exports.isReturnStatement)(statement)) {
            hasReturn = true;
        }
        else if ((0, exports.isIfStatement)(statement)) {
            // Parser enforces that if/else have braces (block statement)
            hasReturn = hasReturn || (0, exports.hasReturnStatementIf)(statement);
        }
    }
    return hasReturn;
};
exports.hasReturnStatement = hasReturnStatement;
var hasBreakStatementIf = function (statement) {
    var hasBreak = false;
    // Parser enforces that if/else have braces (block statement)
    hasBreak = hasBreak || (0, exports.hasBreakStatement)(statement.consequent);
    if (statement.alternate) {
        if ((0, exports.isIfStatement)(statement.alternate)) {
            hasBreak = hasBreak || (0, exports.hasBreakStatementIf)(statement.alternate);
        }
        else if ((0, exports.isBlockStatement)(statement.alternate)) {
            hasBreak = hasBreak || (0, exports.hasBreakStatement)(statement.alternate);
        }
    }
    return hasBreak;
};
exports.hasBreakStatementIf = hasBreakStatementIf;
/**
 * Checks whether a block OR any of its child blocks has a `break` statement.
 * @param body The block to be checked
 * @return `true` if there is a `break` statement, else `false`.
 */
var hasBreakStatement = function (block) {
    var hasBreak = false;
    for (var _i = 0, _a = block.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        if (statement.type === 'BreakStatement') {
            hasBreak = true;
        }
        else if ((0, exports.isIfStatement)(statement)) {
            // Parser enforces that if/else have braces (block statement)
            hasBreak = hasBreak || (0, exports.hasBreakStatementIf)(statement);
        }
        else if ((0, exports.isBlockStatement)(statement)) {
            hasBreak = hasBreak || (0, exports.hasBreakStatement)(statement);
        }
    }
    return hasBreak;
};
exports.hasBreakStatement = hasBreakStatement;
var hasContinueStatementIf = function (statement) {
    var hasContinue = false;
    // Parser enforces that if/else have braces (block statement)
    hasContinue = hasContinue || (0, exports.hasContinueStatement)(statement.consequent);
    if (statement.alternate) {
        if ((0, exports.isIfStatement)(statement.alternate)) {
            hasContinue = hasContinue || (0, exports.hasContinueStatementIf)(statement.alternate);
        }
        else if ((0, exports.isBlockStatement)(statement.alternate)) {
            hasContinue = hasContinue || (0, exports.hasContinueStatement)(statement.alternate);
        }
    }
    return hasContinue;
};
exports.hasContinueStatementIf = hasContinueStatementIf;
/**
 * Checks whether a block OR any of its child blocks has a `continue` statement.
 * @param body The block to be checked
 * @return `true` if there is a `continue` statement, else `false`.
 */
var hasContinueStatement = function (block) {
    var hasContinue = false;
    for (var _i = 0, _a = block.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        if (statement.type === 'ContinueStatement') {
            hasContinue = true;
        }
        else if ((0, exports.isIfStatement)(statement)) {
            // Parser enforces that if/else have braces (block statement)
            hasContinue = hasContinue || (0, exports.hasContinueStatementIf)(statement);
        }
        else if ((0, exports.isBlockStatement)(statement)) {
            hasContinue = hasContinue || (0, exports.hasContinueStatement)(statement);
        }
    }
    return hasContinue;
};
exports.hasContinueStatement = hasContinueStatement;
