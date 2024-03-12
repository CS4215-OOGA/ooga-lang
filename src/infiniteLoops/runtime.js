"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.testForInfiniteLoop = void 0;
var constants_1 = require("../constants");
var createContext_1 = require("../createContext");
var requireProvider_1 = require("../modules/requireProvider");
var parser_1 = require("../parser/parser");
var stdList = require("../stdlib/list");
var types_1 = require("../types");
var create = require("../utils/astCreator");
var detect_1 = require("./detect");
var errors_1 = require("./errors");
var instrument_1 = require("./instrument");
var st = require("./state");
var sym = require("./symbolic");
function checkTimeout(state) {
    if (state.hasTimedOut()) {
        throw new Error('timeout');
    }
}
/**
 * This function is run whenever a variable is being accessed.
 * If a variable has been added to state.variablesToReset, it will
 * be 'reset' (concretized and re-hybridized) here.
 */
function hybridize(originalValue, name, state) {
    if (typeof originalValue === 'function') {
        return originalValue;
    }
    var value = originalValue;
    if (state.variablesToReset.has(name)) {
        value = sym.deepConcretizeInplace(value);
    }
    return sym.hybridizeNamed(name, value);
}
/**
 * Function to keep track of assignment expressions.
 */
function saveVarIfHybrid(value, name, state) {
    state.variablesToReset.delete(name);
    if (sym.isHybrid(value)) {
        state.variablesModified.set(name, value);
    }
    return value;
}
/**
 * Saves the boolean value if it is a hybrid, else set the
 * path to invalid.
 * Does not save in the path if the value is a boolean literal.
 */
function saveBoolIfHybrid(value, state) {
    if (sym.isHybrid(value) && value.type === 'value') {
        if (value.validity !== sym.Validity.Valid) {
            state.setInvalidPath();
            return sym.shallowConcretize(value);
        }
        if (value.symbolic.type !== 'Literal') {
            var theExpr = value.symbolic;
            if (!value.concrete) {
                theExpr = value.negation ? value.negation : create.unaryExpression('!', theExpr);
            }
            state.savePath(theExpr);
        }
        return sym.shallowConcretize(value);
    }
    else {
        state.setInvalidPath();
        return value;
    }
}
/**
 * If a function was passed as an argument we do not
 * check it for infinite loops. Wraps those functions
 * with a decorator that activates a flag in the state.
 */
function wrapArgIfFunction(arg, state) {
    if (typeof arg === 'function') {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            state.functionWasPassedAsArgument = true;
            return arg.apply(void 0, args);
        };
    }
    return arg;
}
/**
 * For higher-order functions, we add the names of its parameters
 * that are functions to differentiate different combinations of
 * function invocations + parameters.
 *
 * e.g.
 * const f = x=>x;
 * const g = x=>x+1;
 * const h = f=>f(1);
 *
 * h(f) will have a different oracle name from h(g).
 */
function makeOracleName(name, args) {
    var result = name;
    for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
        var _a = args_1[_i], n = _a[0], v = _a[1];
        if (typeof v === 'function') {
            result = "".concat(result, "_").concat(n, ":").concat(v.name);
        }
    }
    return result;
}
function preFunction(name, args, state) {
    checkTimeout(state);
    // track functions which were passed as arguments in a different tracker
    var newName = state.functionWasPassedAsArgument ? '*' + name : makeOracleName(name, args);
    var _a = state.enterFunction(newName), tracker = _a[0], firstIteration = _a[1];
    if (!firstIteration) {
        state.cleanUpVariables();
        state.saveArgsInTransition(args, tracker);
        if (!state.functionWasPassedAsArgument) {
            var previousIterations = tracker.slice(0, tracker.length - 1);
            checkForInfiniteLoopIfMeetsThreshold(previousIterations, state, name);
        }
    }
    tracker.push(state.newStackFrame(newName));
    // reset the flag
    state.functionWasPassedAsArgument = false;
}
function returnFunction(value, state) {
    state.cleanUpVariables();
    if (!state.streamMode)
        state.returnLastFunction();
    return value;
}
/**
 * Executed before the loop is entered to create a new iteration
 * tracker.
 */
function enterLoop(state) {
    state.loopStack.unshift([state.newStackFrame('loopRoot')]);
}
// ignoreMe: hack to squeeze this inside the 'update' of for statements
function postLoop(state, ignoreMe) {
    checkTimeout(state);
    var previousIterations = state.loopStack[0];
    checkForInfiniteLoopIfMeetsThreshold(previousIterations.slice(0, previousIterations.length - 1), state);
    state.cleanUpVariables();
    previousIterations.push(state.newStackFrame('loop'));
    return ignoreMe;
}
/**
 * Always executed after a loop terminates, or breaks, to clean up
 * variables and pop the last iteration tracker.
 */
function exitLoop(state) {
    state.cleanUpVariables();
    state.exitLoop();
}
/**
 * If the number of iterations (given by the length
 * of stackPositions) is equal to a power of 2 times
 * the threshold, check these iterations for infinite loop.
 */
function checkForInfiniteLoopIfMeetsThreshold(stackPositions, state, functionName) {
    var checkpoint = state.threshold;
    while (checkpoint <= stackPositions.length) {
        if (stackPositions.length === checkpoint) {
            (0, detect_1.checkForInfiniteLoop)(stackPositions, state, functionName);
        }
        checkpoint = checkpoint * 2;
    }
}
/**
 * Test if stream is infinite. May destructively change the program
 * environment. If it is not infinite, throw a timeout error.
 */
function testIfInfiniteStream(stream, state) {
    var next = stream;
    for (var i = 0; i <= state.threshold; i++) {
        if (stdList.is_null(next)) {
            break;
        }
        else {
            var nextTail = stdList.is_pair(next) ? next[1] : undefined;
            if (typeof nextTail === 'function') {
                next = sym.shallowConcretize(nextTail());
            }
            else {
                break;
            }
        }
    }
    throw new Error('timeout');
}
var builtinSpecialCases = {
    is_null: function (maybeHybrid, state) {
        var xs = sym.shallowConcretize(maybeHybrid);
        var conc = stdList.is_null(xs);
        var theTail = stdList.is_pair(xs) ? xs[1] : undefined;
        var isStream = typeof theTail === 'function';
        if (state && isStream) {
            var lastFunction = state.getLastFunctionName();
            if (state.streamMode === true && state.streamLastFunction === lastFunction) {
                // heuristic to make sure we are at the same is_null call
                testIfInfiniteStream(sym.shallowConcretize(theTail()), state);
            }
            else {
                var count = state.streamCounts.get(lastFunction);
                if (count === undefined) {
                    count = 1;
                }
                if (count > state.streamThreshold) {
                    state.streamMode = true;
                    state.streamLastFunction = lastFunction;
                }
                state.streamCounts.set(lastFunction, count + 1);
            }
        }
        else {
            return conc;
        }
        return;
    },
    // mimic behaviour without printing
    display: function () {
        var x = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            x[_i] = arguments[_i];
        }
        return x[0];
    },
    display_list: function () {
        var x = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            x[_i] = arguments[_i];
        }
        return x[0];
    }
};
function returnInvalidIfNumeric(val, validity) {
    if (validity === void 0) { validity = sym.Validity.NoSmt; }
    if (typeof val === 'number') {
        var result = sym.makeDummyHybrid(val);
        result.validity = validity;
        return result;
    }
    else {
        return val;
    }
}
function prepareBuiltins(oldBuiltins) {
    var nonDetFunctions = ['get_time', 'math_random'];
    var newBuiltins = new Map();
    var _loop_1 = function (name_1, fun) {
        var specialCase = builtinSpecialCases[name_1];
        if (specialCase !== undefined) {
            newBuiltins.set(name_1, specialCase);
        }
        else {
            var functionValidity_1 = nonDetFunctions.includes(name_1)
                ? sym.Validity.NoCycle
                : sym.Validity.NoSmt;
            newBuiltins.set(name_1, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var validityOfArgs = args.filter(sym.isHybrid).map(function (x) { return x.validity; });
                var mostInvalid = Math.max.apply(Math, __spreadArray([functionValidity_1], validityOfArgs, false));
                return returnInvalidIfNumeric(fun.apply(void 0, args.map(sym.shallowConcretize)), mostInvalid);
            });
        }
    };
    for (var _i = 0, oldBuiltins_1 = oldBuiltins; _i < oldBuiltins_1.length; _i++) {
        var _a = oldBuiltins_1[_i], name_1 = _a[0], fun = _a[1];
        _loop_1(name_1, fun);
    }
    newBuiltins.set('undefined', undefined);
    return newBuiltins;
}
function nothingFunction() {
    var _args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        _args[_i] = arguments[_i];
    }
    return nothingFunction;
}
function trackLoc(loc, state, ignoreMe) {
    state.lastLocation = loc;
    if (ignoreMe !== undefined) {
        return ignoreMe();
    }
}
var functions = {};
functions[instrument_1.InfiniteLoopRuntimeFunctions.nothingFunction] = nothingFunction;
functions[instrument_1.InfiniteLoopRuntimeFunctions.concretize] = sym.shallowConcretize;
functions[instrument_1.InfiniteLoopRuntimeFunctions.hybridize] = hybridize;
functions[instrument_1.InfiniteLoopRuntimeFunctions.wrapArg] = wrapArgIfFunction;
functions[instrument_1.InfiniteLoopRuntimeFunctions.dummify] = sym.makeDummyHybrid;
functions[instrument_1.InfiniteLoopRuntimeFunctions.saveBool] = saveBoolIfHybrid;
functions[instrument_1.InfiniteLoopRuntimeFunctions.saveVar] = saveVarIfHybrid;
functions[instrument_1.InfiniteLoopRuntimeFunctions.preFunction] = preFunction;
functions[instrument_1.InfiniteLoopRuntimeFunctions.returnFunction] = returnFunction;
functions[instrument_1.InfiniteLoopRuntimeFunctions.postLoop] = postLoop;
functions[instrument_1.InfiniteLoopRuntimeFunctions.enterLoop] = enterLoop;
functions[instrument_1.InfiniteLoopRuntimeFunctions.exitLoop] = exitLoop;
functions[instrument_1.InfiniteLoopRuntimeFunctions.trackLoc] = trackLoc;
functions[instrument_1.InfiniteLoopRuntimeFunctions.evalB] = sym.evaluateHybridBinary;
functions[instrument_1.InfiniteLoopRuntimeFunctions.evalU] = sym.evaluateHybridUnary;
/**
 * Tests the given program for infinite loops.
 * @param program Program to test.
 * @param previousProgramsStack Any code previously entered in the REPL & parsed into AST.
 * @returns SourceError if an infinite loop was detected, undefined otherwise.
 */
function testForInfiniteLoop(program, previousProgramsStack) {
    return __awaiter(this, void 0, void 0, function () {
        var context, prelude, previous, newBuiltins, builtinsId, functionsId, stateId, instrumentedCode, state, sandboxedRun, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context = (0, createContext_1.default)(types_1.Chapter.SOURCE_4, types_1.Variant.DEFAULT, undefined, undefined);
                    prelude = (0, parser_1.parse)(context.prelude, context);
                    context.prelude = null;
                    previous = __spreadArray(__spreadArray([], previousProgramsStack, true), [prelude], false);
                    newBuiltins = prepareBuiltins(context.nativeStorage.builtins);
                    builtinsId = instrument_1.InfiniteLoopRuntimeObjectNames.builtinsId, functionsId = instrument_1.InfiniteLoopRuntimeObjectNames.functionsId, stateId = instrument_1.InfiniteLoopRuntimeObjectNames.stateId;
                    return [4 /*yield*/, (0, instrument_1.instrument)(previous, program, newBuiltins.keys())];
                case 1:
                    instrumentedCode = _a.sent();
                    state = new st.State();
                    sandboxedRun = new Function('code', functionsId, stateId, builtinsId, constants_1.REQUIRE_PROVIDER_ID, 
                    // redeclare window so modules don't do anything funny like play sounds
                    '{let window = {}; return eval(code)}');
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, sandboxedRun(instrumentedCode, functions, state, newBuiltins, (0, requireProvider_1.getRequireProvider)(context))];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    if (error_1 instanceof errors_1.InfiniteLoopError) {
                        if (state.lastLocation !== undefined) {
                            error_1.location = state.lastLocation;
                        }
                        return [2 /*return*/, error_1];
                    }
                    // Programs that exceed the maximum call stack size are okay as long as they terminate.
                    if (error_1 instanceof RangeError && error_1.message === 'Maximum call stack size exceeded') {
                        return [2 /*return*/, undefined];
                    }
                    throw error_1;
                case 5: return [2 /*return*/, undefined];
            }
        });
    });
}
exports.testForInfiniteLoop = testForInfiniteLoop;
