"use strict";
/**
 * This interpreter implements an explicit-control evaluator.
 *
 * Heavily adapted from https://github.com/source-academy/JSpike/
 * and the legacy interpreter at '../interpreter/interpreter'
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSEResultPromise = exports.resumeEvaluate = exports.evaluate = exports.Stash = exports.Control = void 0;
var lodash_1 = require("lodash");
var constants_1 = require("../constants");
var errors = require("../errors/errors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var closure_1 = require("../interpreter/closure");
var errors_1 = require("../modules/errors");
var moduleLoader_1 = require("../modules/moduleLoader");
var inspector_1 = require("../stdlib/inspector");
var transpiler_1 = require("../transpiler/transpiler");
var assert_1 = require("../utils/assert");
var helpers_1 = require("../utils/ast/helpers");
var ast = require("../utils/astCreator");
var operators_1 = require("../utils/operators");
var rttc = require("../utils/rttc");
var continuations_1 = require("./continuations");
var instr = require("./instrCreator");
var types_1 = require("./types");
var utils_1 = require("./utils");
/**
 * The control is a list of commands that still needs to be executed by the machine.
 * It contains syntax tree nodes or instructions.
 */
var Control = /** @class */ (function (_super) {
    __extends(Control, _super);
    function Control(program) {
        var _this = _super.call(this) || this;
        // Load program into control stack
        program ? _this.push(program) : null;
        return _this;
    }
    Control.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var itemsNew = Control.simplifyBlocksWithoutDeclarations.apply(Control, items);
        _super.prototype.push.apply(this, itemsNew);
    };
    /**
     * Before pushing block statements on the control stack, we check if the block statement has any declarations.
     * If not (and its not a raw block statement), instead of pushing the entire block, just the body is pushed since the block is not adding any value.
     * @param items The items being pushed on the control.
     * @returns The same set of control items, but with block statements without declarations simplified.
     */
    Control.simplifyBlocksWithoutDeclarations = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var itemsNew = [];
        items.forEach(function (item) {
            if ((0, utils_1.isNode)(item) &&
                (0, utils_1.isBlockStatement)(item) &&
                !(0, utils_1.hasDeclarations)(item) &&
                !(0, utils_1.isRawBlockStatement)(item)) {
                itemsNew.push.apply(itemsNew, Control.simplifyBlocksWithoutDeclarations.apply(Control, (0, utils_1.handleSequence)(item.body)));
            }
            else {
                itemsNew.push(item);
            }
        });
        return itemsNew;
    };
    Control.prototype.copy = function () {
        var newControl = new Control();
        var stackCopy = _super.prototype.getStack.call(this);
        newControl.push.apply(newControl, stackCopy);
        return newControl;
    };
    return Control;
}(utils_1.Stack));
exports.Control = Control;
/**
 * The stash is a list of values that stores intermediate results.
 */
var Stash = /** @class */ (function (_super) {
    __extends(Stash, _super);
    function Stash() {
        return _super.call(this) || this;
    }
    Stash.prototype.copy = function () {
        var newStash = new Stash();
        var stackCopy = _super.prototype.getStack.call(this);
        newStash.push.apply(newStash, stackCopy);
        return newStash;
    };
    return Stash;
}(utils_1.Stack));
exports.Stash = Stash;
/**
 * Function to be called when a program is to be interpreted using
 * the explicit control evaluator.
 *
 * @param program The program to evaluate.
 * @param context The context to evaluate the program in.
 * @returns The result of running the CSE machine.
 */
function evaluate(program, context, options) {
    try {
        (0, transpiler_1.checkProgramForUndefinedVariables)(program, context);
    }
    catch (error) {
        context.errors.push(error);
        return new types_1.CseError(error);
    }
    try {
        context.runtime.isRunning = true;
        context.runtime.control = new Control(program);
        context.runtime.stash = new Stash();
        return runCSEMachine(context, context.runtime.control, context.runtime.stash, options.envSteps, options.stepLimit, options.isPrelude);
    }
    catch (error) {
        return new types_1.CseError(error);
    }
    finally {
        context.runtime.isRunning = false;
    }
}
exports.evaluate = evaluate;
/**
 * Function that is called when a user wishes to resume evaluation after
 * hitting a breakpoint.
 * This should only be called after the first 'evaluate' function has been called so that
 * context.runtime.control and context.runtime.stash are defined.
 * @param context The context to continue evaluating the program in.
 * @returns The result of running the CSE machine.
 */
function resumeEvaluate(context) {
    try {
        context.runtime.isRunning = true;
        return runCSEMachine(context, context.runtime.control, context.runtime.stash, -1, -1);
    }
    catch (error) {
        return new types_1.CseError(error);
    }
    finally {
        context.runtime.isRunning = false;
    }
}
exports.resumeEvaluate = resumeEvaluate;
function evaluateImports(program, context, _a) {
    var loadTabs = _a.loadTabs, checkImports = _a.checkImports;
    try {
        var importNodeMap = (0, helpers_1.filterImportDeclarations)(program)[0];
        var environment_1 = (0, utils_1.currentEnvironment)(context);
        Object.entries(importNodeMap).forEach(function (_a) {
            var moduleName = _a[0], nodes = _a[1];
            (0, moduleLoader_1.initModuleContext)(moduleName, context, loadTabs);
            var functions = (0, moduleLoader_1.loadModuleBundle)(moduleName, context, nodes[0]);
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                for (var _b = 0, _c = node.specifiers; _b < _c.length; _b++) {
                    var spec = _c[_b];
                    (0, assert_1.default)(spec.type === 'ImportSpecifier', "Only ImportSpecifiers are supported, got: ".concat(spec.type));
                    if (checkImports && !(spec.imported.name in functions)) {
                        throw new errors_1.UndefinedImportError(spec.imported.name, moduleName, spec);
                    }
                    (0, utils_1.declareIdentifier)(context, spec.local.name, node, environment_1);
                    (0, utils_1.defineVariable)(context, spec.local.name, functions[spec.imported.name], true, node);
                }
            }
        });
    }
    catch (error) {
        (0, utils_1.handleRuntimeError)(context, error);
    }
}
/**
 * Function that returns the appropriate Promise<Result> given the output of CSE machine evaluating, depending
 * on whether the program is finished evaluating, ran into a breakpoint or ran into an error.
 * @param context The context of the program.
 * @param value The value of CSE machine evaluating the program.
 * @returns The corresponding promise.
 */
function CSEResultPromise(context, value) {
    return new Promise(function (resolve, reject) {
        if (value instanceof types_1.CSEBreak) {
            resolve({ status: 'suspended-cse-eval', context: context });
        }
        else if (value instanceof types_1.CseError) {
            resolve({ status: 'error' });
        }
        else {
            resolve({ status: 'finished', context: context, value: value });
        }
    });
}
exports.CSEResultPromise = CSEResultPromise;
/**
 * The primary runner/loop of the explicit control evaluator.
 *
 * @param context The context to evaluate the program in.
 * @param control Points to the current context.runtime.control
 * @param stash Points to the current context.runtime.stash
 * @param isPrelude Whether the program we are running is the prelude
 * @returns A special break object if the program is interrupted by a breakpoint;
 * else the top value of the stash. It is usually the return value of the program.
 */
function runCSEMachine(context, control, stash, envSteps, stepLimit, isPrelude) {
    if (isPrelude === void 0) { isPrelude = false; }
    context.runtime.break = false;
    context.runtime.nodes = [];
    var steps = 1;
    var command = control.peek();
    // First node will be a Program
    context.runtime.nodes.unshift(command);
    while (command) {
        // Return to capture a snapshot of the control and stash after the target step count is reached
        if (!isPrelude && steps === envSteps) {
            return stash.peek();
        }
        // Step limit reached, stop further evaluation
        if (!isPrelude && steps === stepLimit) {
            break;
        }
        if ((0, utils_1.isNode)(command) && command.type === 'DebuggerStatement') {
            // steps += 1
            // Record debugger step if running for the first time
            if (envSteps === -1) {
                context.runtime.breakpointSteps.push(steps);
            }
        }
        control.pop();
        if ((0, utils_1.isNode)(command)) {
            context.runtime.nodes.shift();
            context.runtime.nodes.unshift(command);
            (0, inspector_1.checkEditorBreakpoints)(context, command);
            cmdEvaluators[command.type](command, context, control, stash, isPrelude);
            if (context.runtime.break && context.runtime.debuggerOn) {
                // We can put this under isNode since context.runtime.break
                // will only be updated after a debugger statement and so we will
                // run into a node immediately after.
                // With the new evaluator, we don't return a break
                // return new CSEBreak()
            }
        }
        else {
            // Command is an instruction
            cmdEvaluators[command.instrType](command, context, control, stash, isPrelude);
        }
        // Push undefined into the stack if both control and stash is empty
        if (control.isEmpty() && stash.isEmpty()) {
            stash.push(undefined);
        }
        command = control.peek();
        steps += 1;
    }
    if (!isPrelude) {
        context.runtime.envStepsTotal = steps;
    }
    return stash.peek();
}
/**
 * Dictionary of functions which handle the logic for the response of the three registers of
 * the ASE machine to each ControlItem.
 */
var cmdEvaluators = (_a = {
        /**
         * Statements
         */
        Program: function (command, context, control, stash, isPrelude) {
            // Create and push the environment only if it is non empty.
            if ((0, utils_1.hasDeclarations)(command) || (0, utils_1.hasImportDeclarations)(command)) {
                var environment = (0, utils_1.createBlockEnvironment)(context, 'programEnvironment');
                (0, utils_1.pushEnvironment)(context, environment);
                evaluateImports(command, context, {
                    wrapSourceModules: true,
                    checkImports: true,
                    loadTabs: true
                });
                (0, utils_1.declareFunctionsAndVariables)(context, command, environment);
            }
            if (command.body.length == 1) {
                // If program only consists of one statement, evaluate it immediately
                var next = command.body[0];
                cmdEvaluators[next.type](next, context, control, stash, isPrelude);
            }
            else {
                // Push raw block statement
                var rawCopy = {
                    type: 'BlockStatement',
                    range: command.range,
                    loc: command.loc,
                    body: command.body,
                    isRawBlock: 'true'
                };
                control.push(rawCopy);
            }
        },
        BlockStatement: function (command, context, control) {
            if ((0, utils_1.isRawBlockStatement)(command)) {
                // Raw block statement: unpack and push body
                // Push block body only
                control.push.apply(control, (0, utils_1.handleSequence)(command.body));
                return;
            }
            // Normal block statement: do environment setup
            // To restore environment after block ends
            // If there is an env instruction on top of the stack, or if there are no declarations, or there is no next control item
            // we do not need to push another one
            // The no declarations case is handled by Control :: simplifyBlocksWithoutDeclarations, so no blockStatement node
            // without declarations should end up here.
            var next = control.peek();
            // Push ENVIRONMENT instruction if needed
            if (next && !((0, utils_1.isInstr)(next) && next.instrType === types_1.InstrType.ENVIRONMENT)) {
                control.push(instr.envInstr((0, utils_1.currentEnvironment)(context), command));
            }
            var environment = (0, utils_1.createBlockEnvironment)(context, 'blockEnvironment');
            (0, utils_1.declareFunctionsAndVariables)(context, command, environment);
            (0, utils_1.pushEnvironment)(context, environment);
            // Push raw block statement
            var rawCopy = {
                type: 'BlockStatement',
                range: command.range,
                loc: command.loc,
                body: command.body,
                isRawBlock: 'true'
            };
            control.push(rawCopy);
        },
        WhileStatement: function (command, context, control, stash) {
            if ((0, utils_1.hasBreakStatement)(command.body)) {
                control.push(instr.breakMarkerInstr(command));
            }
            control.push(instr.whileInstr(command.test, command.body, command));
            control.push(command.test);
            control.push(ast.identifier('undefined', command.loc)); // Return undefined if there is no loop execution
        },
        ForStatement: function (command, context, control) {
            // All 3 parts will be defined due to parser rules
            var init = command.init;
            var test = command.test;
            var update = command.update;
            // Loop control variable present
            // Refer to Source §3 specifications https://docs.sourceacademy.org/source_3.pdf
            if (init.type === 'VariableDeclaration' && init.kind === 'let') {
                var id = init.declarations[0].id;
                var valueExpression = init.declarations[0].init;
                control.push(ast.blockStatement([
                    init,
                    ast.forStatement(ast.assignmentExpression(id, valueExpression, command.loc), test, update, ast.blockStatement([
                        ast.variableDeclaration([
                            ast.variableDeclarator(ast.identifier("_copy_of_".concat(id.name), command.loc), ast.identifier(id.name, command.loc), command.loc)
                        ], command.loc),
                        ast.blockStatement([
                            ast.variableDeclaration([
                                ast.variableDeclarator(ast.identifier(id.name, command.loc), ast.identifier("_copy_of_".concat(id.name), command.loc), command.loc)
                            ], command.loc),
                            command.body
                        ], command.loc)
                    ], command.loc), command.loc)
                ], command.loc));
            }
            else {
                if ((0, utils_1.hasBreakStatement)(command.body)) {
                    control.push(instr.breakMarkerInstr(command));
                }
                control.push(instr.forInstr(init, test, update, command.body, command));
                control.push(test);
                control.push(instr.popInstr(command)); // Pop value from init assignment
                control.push(init);
                control.push(ast.identifier('undefined', command.loc)); // Return undefined if there is no loop execution
            }
        },
        IfStatement: function (command, context, control, stash) {
            control.push.apply(control, (0, utils_1.reduceConditional)(command));
        },
        ExpressionStatement: function (command, context, control, stash, isPrelude) {
            // Fast forward to the expression
            // If not the next step will look like it's only removing ';'
            cmdEvaluators[command.expression.type](command.expression, context, control, stash, isPrelude);
        },
        DebuggerStatement: function (command, context) {
            context.runtime.break = true;
        },
        VariableDeclaration: function (command, context, control) {
            var declaration = command.declarations[0];
            var id = declaration.id;
            // Parser enforces initialisation during variable declaration
            var init = declaration.init;
            control.push(instr.popInstr(command));
            control.push(instr.assmtInstr(id.name, command.kind === 'const', true, command));
            control.push(init);
        },
        FunctionDeclaration: function (command, context, control) {
            // Function declaration desugared into constant declaration.
            var lambdaExpression = ast.blockArrowFunction(command.params, command.body, command.loc);
            var lambdaDeclaration = ast.constantDeclaration(command.id.name, lambdaExpression, command.loc);
            control.push(lambdaDeclaration);
        },
        ReturnStatement: function (command, context, control) {
            // Push return argument onto control as well as Reset Instruction to clear to ignore all statements after the return.
            var next = control.peek();
            if (next && (0, utils_1.isInstr)(next) && next.instrType === types_1.InstrType.MARKER) {
                control.pop();
            }
            else {
                control.push(instr.resetInstr(command));
            }
            if (command.argument) {
                control.push(command.argument);
            }
        },
        ContinueStatement: function (command, context, control, stash) {
            control.push(instr.contInstr(command));
        },
        BreakStatement: function (command, context, control, stash) {
            control.push(instr.breakInstr(command));
        },
        ImportDeclaration: function () { },
        /**
         * Expressions
         */
        Literal: function (command, context, control, stash) {
            stash.push(command.value);
        },
        AssignmentExpression: function (command, context, control) {
            if (command.left.type === 'MemberExpression') {
                control.push(instr.arrAssmtInstr(command));
                control.push(command.right);
                control.push(command.left.property);
                control.push(command.left.object);
            }
            else if (command.left.type === 'Identifier') {
                var id = command.left;
                control.push(instr.assmtInstr(id.name, false, false, command));
                control.push(command.right);
            }
        },
        ArrayExpression: function (command, context, control) {
            var elems = command.elements;
            (0, lodash_1.reverse)(elems);
            var len = elems.length;
            control.push(instr.arrLitInstr(len, command));
            for (var _i = 0, elems_1 = elems; _i < elems_1.length; _i++) {
                var elem = elems_1[_i];
                control.push(elem);
            }
        },
        MemberExpression: function (command, context, control, stash) {
            control.push(instr.arrAccInstr(command));
            control.push(command.property);
            control.push(command.object);
        },
        ConditionalExpression: function (command, context, control, stash) {
            control.push.apply(control, (0, utils_1.reduceConditional)(command));
        },
        Identifier: function (command, context, control, stash) {
            stash.push((0, utils_1.getVariable)(context, command.name, command));
        },
        UnaryExpression: function (command, context, control) {
            control.push(instr.unOpInstr(command.operator, command));
            control.push(command.argument);
        },
        BinaryExpression: function (command, context, control) {
            control.push(instr.binOpInstr(command.operator, command));
            control.push(command.right);
            control.push(command.left);
        },
        LogicalExpression: function (command, context, control) {
            if (command.operator === '&&') {
                control.push(ast.conditionalExpression(command.left, command.right, ast.literal(false), command.loc));
            }
            else {
                control.push(ast.conditionalExpression(command.left, ast.literal(true), command.right, command.loc));
            }
        },
        ArrowFunctionExpression: function (command, context, control, stash, isPrelude) {
            // Reuses the Closure data structure from legacy interpreter
            var closure = closure_1.default.makeFromArrowFunction(command, (0, utils_1.currentEnvironment)(context), context, true, isPrelude);
            var next = control.peek();
            if (!(next && (0, utils_1.isInstr)(next) && (0, utils_1.isAssmtInstr)(next))) {
                Object.defineProperty((0, utils_1.currentEnvironment)(context).head, (0, lodash_1.uniqueId)(), {
                    value: closure,
                    writable: false,
                    enumerable: true
                });
            }
            stash.push(closure);
        },
        CallExpression: function (command, context, control) {
            // Push application instruction, function arguments and function onto control.
            control.push(instr.appInstr(command.arguments.length, command));
            for (var index = command.arguments.length - 1; index >= 0; index--) {
                control.push(command.arguments[index]);
            }
            control.push(command.callee);
        }
    },
    /**
     * Instructions
     */
    _a[types_1.InstrType.RESET] = function (command, context, control, stash) {
        // Keep pushing reset instructions until marker is found.
        var cmdNext = control.pop();
        if (cmdNext && ((0, utils_1.isNode)(cmdNext) || cmdNext.instrType !== types_1.InstrType.MARKER)) {
            control.push(instr.resetInstr(command.srcNode));
        }
    },
    _a[types_1.InstrType.WHILE] = function (command, context, control, stash) {
        var test = stash.pop();
        // Check if test condition is a boolean
        var error = rttc.checkIfStatement(command.srcNode, test, context.chapter);
        if (error) {
            (0, utils_1.handleRuntimeError)(context, error);
        }
        if (test) {
            control.push(command);
            control.push(command.test);
            if ((0, utils_1.hasContinueStatement)(command.body)) {
                control.push(instr.contMarkerInstr(command.srcNode));
            }
            if (!(0, utils_1.valueProducing)(command.body)) {
                // if loop body is not value-producing, insert undefined expression statement
                control.push(ast.identifier('undefined', command.body.loc));
            }
            control.push(command.body);
            control.push(instr.popInstr(command.srcNode)); // Pop previous body value
        }
    },
    _a[types_1.InstrType.FOR] = function (command, context, control, stash) {
        var test = stash.pop();
        // Check if test condition is a boolean
        var error = rttc.checkIfStatement(command.srcNode, test, context.chapter);
        if (error) {
            (0, utils_1.handleRuntimeError)(context, error);
        }
        if (test) {
            control.push(command);
            control.push(command.test);
            control.push(instr.popInstr(command.srcNode)); // Pop value from update
            control.push(command.update);
            if ((0, utils_1.hasContinueStatement)(command.body)) {
                control.push(instr.contMarkerInstr(command.srcNode));
            }
            if (!(0, utils_1.valueProducing)(command.body)) {
                // if loop body is not value-producing, insert undefined expression statement
                control.push(ast.identifier('undefined', command.body.loc));
            }
            control.push(command.body);
            control.push(instr.popInstr(command.srcNode)); // Pop previous body value
        }
    },
    _a[types_1.InstrType.ASSIGNMENT] = function (command, context, control, stash) {
        command.declaration
            ? (0, utils_1.defineVariable)(context, command.symbol, stash.peek(), command.constant, command.srcNode)
            : (0, utils_1.setVariable)(context, command.symbol, stash.peek(), command.srcNode);
    },
    _a[types_1.InstrType.UNARY_OP] = function (command, context, control, stash) {
        var argument = stash.pop();
        var error = rttc.checkUnaryExpression(command.srcNode, command.symbol, argument, context.chapter);
        if (error) {
            (0, utils_1.handleRuntimeError)(context, error);
        }
        stash.push((0, operators_1.evaluateUnaryExpression)(command.symbol, argument));
    },
    _a[types_1.InstrType.BINARY_OP] = function (command, context, control, stash) {
        var right = stash.pop();
        var left = stash.pop();
        var error = rttc.checkBinaryExpression(command.srcNode, command.symbol, context.chapter, left, right);
        if (error) {
            (0, utils_1.handleRuntimeError)(context, error);
        }
        stash.push((0, operators_1.evaluateBinaryExpression)(command.symbol, left, right));
    },
    _a[types_1.InstrType.POP] = function (command, context, control, stash) {
        stash.pop();
    },
    _a[types_1.InstrType.APPLICATION] = function (command, context, control, stash) {
        var _a, _b;
        (0, utils_1.checkStackOverFlow)(context, control);
        // Get function arguments from the stash
        var args = [];
        for (var index = 0; index < command.numOfArgs; index++) {
            args.unshift(stash.pop());
        }
        // Get function from the stash
        var func = stash.pop();
        if (!(func instanceof closure_1.default || func instanceof Function)) {
            (0, utils_1.handleRuntimeError)(context, new errors.CallingNonFunctionValue(func, command.srcNode));
        }
        if ((0, continuations_1.isCallWithCurrentContinuation)(func)) {
            // Check for number of arguments mismatch error
            (0, utils_1.checkNumberOfArguments)(context, func, args, command.srcNode);
            // Get the callee
            var cont_callee = args[0];
            var dummyFCallExpression = (0, continuations_1.makeDummyContCallExpression)('f', 'cont');
            // Prepare a function call for the continuation-consuming function
            // along with a newly generated continuation
            control.push(instr.appInstr(command.numOfArgs, dummyFCallExpression));
            control.push(instr.genContInstr(dummyFCallExpression.arguments[0]));
            stash.push(cont_callee);
            return;
        }
        if ((0, continuations_1.isContinuation)(func)) {
            // Check for number of arguments mismatch error
            (0, utils_1.checkNumberOfArguments)(context, func, args, command.srcNode);
            // A continuation is always given a single argument
            var expression = args[0];
            var dummyContCallExpression = (0, continuations_1.makeDummyContCallExpression)('f', 'cont');
            // Restore the state of the stash,
            // but replace the function application instruction with
            // a resume continuation instruction
            stash.push(func);
            stash.push(expression);
            control.push(instr.resumeContInstr(dummyContCallExpression));
            return;
        }
        if (func instanceof closure_1.default) {
            // Check for number of arguments mismatch error
            (0, utils_1.checkNumberOfArguments)(context, func, args, command.srcNode);
            // Display the pre-defined functions on the global environment if needed.
            if (func.preDefined) {
                Object.defineProperty(context.runtime.environments[1].head, (0, lodash_1.uniqueId)(), {
                    value: func,
                    writable: false,
                    enumerable: true
                });
            }
            var next = control.peek();
            // Push ENVIRONMENT instruction if needed
            if (next &&
                !((0, utils_1.isInstr)(next) && next.instrType === types_1.InstrType.ENVIRONMENT) &&
                !control.isEmpty()) {
                control.push(instr.envInstr((0, utils_1.currentEnvironment)(context), command.srcNode));
            }
            // Create environment for function parameters if the function isn't nullary.
            // Name the environment if the function call expression is not anonymous
            if (args.length > 0) {
                var environment = (0, utils_1.createEnvironment)(func, args, command.srcNode);
                (0, utils_1.pushEnvironment)(context, environment);
            }
            else {
                context.runtime.environments.unshift(func.environment);
            }
            // Handle special case if function is simple
            if ((0, utils_1.isSimpleFunction)(func.node)) {
                // Closures convert ArrowExpressionStatements to BlockStatements
                var block = func.node.body;
                var returnStatement = block.body[0];
                control.push((_a = returnStatement.argument) !== null && _a !== void 0 ? _a : ast.identifier('undefined', returnStatement.loc));
            }
            else {
                if (control.peek()) {
                    // push marker if control not empty
                    control.push(instr.markerInstr(command.srcNode));
                }
                control.push(func.node.body);
            }
            return;
        }
        // Value is a function
        // Check for number of arguments mismatch error
        (0, utils_1.checkNumberOfArguments)(context, func, args, command.srcNode);
        // Directly stash result of applying pre-built functions without the ASE machine.
        try {
            var result = func.apply(void 0, args);
            stash.push(result);
        }
        catch (error) {
            if (!(error instanceof runtimeSourceError_1.RuntimeSourceError || error instanceof errors.ExceptionError)) {
                // The error could've arisen when the builtin called a source function which errored.
                // If the cause was a source error, we don't want to include the error.
                // However if the error came from the builtin itself, we need to handle it.
                var loc = (_b = command.srcNode.loc) !== null && _b !== void 0 ? _b : constants_1.UNKNOWN_LOCATION;
                (0, utils_1.handleRuntimeError)(context, new errors.ExceptionError(error, loc));
            }
        }
    },
    _a[types_1.InstrType.BRANCH] = function (command, context, control, stash) {
        var test = stash.pop();
        // Check if test condition is a boolean
        var error = rttc.checkIfStatement(command.srcNode, test, context.chapter);
        if (error) {
            (0, utils_1.handleRuntimeError)(context, error);
        }
        if (test) {
            if (!(0, utils_1.valueProducing)(command.consequent)) {
                control.push(ast.identifier('undefined', command.consequent.loc));
            }
            control.push(command.consequent);
        }
        else if (command.alternate) {
            if (!(0, utils_1.valueProducing)(command.alternate)) {
                control.push(ast.identifier('undefined', command.consequent.loc));
            }
            control.push(command.alternate);
        }
        else {
            control.push(ast.identifier('undefined', command.srcNode.loc));
        }
    },
    _a[types_1.InstrType.ENVIRONMENT] = function (command, context) {
        // Restore environment
        while ((0, utils_1.currentEnvironment)(context).id !== command.env.id) {
            (0, utils_1.popEnvironment)(context);
        }
    },
    _a[types_1.InstrType.ARRAY_LITERAL] = function (command, context, control, stash) {
        var arity = command.arity;
        var array = [];
        for (var i = 0; i < arity; ++i) {
            array.push(stash.pop());
        }
        (0, lodash_1.reverse)(array);
        stash.push(array);
    },
    _a[types_1.InstrType.ARRAY_ACCESS] = function (command, context, control, stash) {
        var index = stash.pop();
        var array = stash.pop();
        stash.push(array[index]);
    },
    _a[types_1.InstrType.ARRAY_ASSIGNMENT] = function (command, context, control, stash) {
        var value = stash.pop();
        var index = stash.pop();
        var array = stash.pop();
        array[index] = value;
        stash.push(value);
    },
    _a[types_1.InstrType.CONTINUE] = function (command, context, control, stash) {
        var next = control.pop();
        if ((0, utils_1.isInstr)(next) && next.instrType == types_1.InstrType.CONTINUE_MARKER) {
            // Encountered continue mark, stop popping
        }
        else if ((0, utils_1.isInstr)(next) && next.instrType == types_1.InstrType.ENVIRONMENT) {
            control.push(command);
            control.push(next); // Let instruction evaluate to restore env
        }
        else {
            // Continue popping from control by pushing same instruction on control
            control.push(command);
        }
    },
    _a[types_1.InstrType.CONTINUE_MARKER] = function () { },
    _a[types_1.InstrType.BREAK] = function (command, context, control, stash) {
        var next = control.pop();
        if ((0, utils_1.isInstr)(next) && next.instrType == types_1.InstrType.BREAK_MARKER) {
            // Encountered break mark, stop popping
        }
        else if ((0, utils_1.isInstr)(next) && next.instrType == types_1.InstrType.ENVIRONMENT) {
            control.push(command);
            control.push(next); // Let instruction evaluate to restore env
        }
        else {
            // Continue popping from control by pushing same instruction on control
            control.push(command);
        }
    },
    _a[types_1.InstrType.BREAK_MARKER] = function () { },
    _a[types_1.InstrType.GENERATE_CONT] = function (_command, context, control, stash) {
        var contControl = control.copy();
        var contStash = stash.copy();
        var contEnv = context.runtime.environments;
        // Remove all data related to the continuation-consuming function
        contControl.pop();
        contStash.pop();
        // Now this will accurately represent the slice of the
        // program execution at the time of the call/cc call
        var continuation = (0, continuations_1.makeContinuation)(contControl, contStash, contEnv);
        stash.push(continuation);
    },
    _a[types_1.InstrType.RESUME_CONT] = function (_command, context, control, stash) {
        var expression = stash.pop();
        var cn = stash.pop();
        var contControl = (0, continuations_1.getContinuationControl)(cn);
        var contStash = (0, continuations_1.getContinuationStash)(cn);
        var contEnv = (0, continuations_1.getContinuationEnv)(cn);
        // Set the control and stash to the continuation's control and stash
        control.setTo(contControl);
        stash.setTo(contStash);
        // Push the expression given to the continuation onto the stash
        stash.push(expression);
        // Restore the environment pointer to that of the continuation
        context.runtime.environments = contEnv;
    },
    _a);
