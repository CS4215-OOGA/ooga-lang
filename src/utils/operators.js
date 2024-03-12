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
exports.getProp = exports.setProp = exports.wrapSourceModule = exports.wrap = exports.callIteratively = exports.evaluateBinaryExpression = exports.binaryOp = exports.evaluateUnaryExpression = exports.unaryOp = exports.boolOrErr = exports.callIfFuncAndRightArgs = exports.makeLazyFunction = exports.wrapLazyCallee = exports.delayIt = exports.forceIt = exports.throwIfTimeout = void 0;
var createContext_1 = require("../createContext");
var errors_1 = require("../errors/errors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var timeoutErrors_1 = require("../errors/timeoutErrors");
var astCreator_1 = require("./astCreator");
var create = require("./astCreator");
var makeWrapper_1 = require("./makeWrapper");
var rttc = require("./rttc");
function throwIfTimeout(nativeStorage, start, current, line, column, source) {
    if (current - start > nativeStorage.maxExecTime) {
        throw new timeoutErrors_1.PotentialInfiniteLoopError(create.locationDummyNode(line, column, source), nativeStorage.maxExecTime);
    }
}
exports.throwIfTimeout = throwIfTimeout;
function forceIt(val) {
    if (val !== undefined && val !== null && val.isMemoized !== undefined) {
        if (val.isMemoized) {
            return val.memoizedValue;
        }
        var evaluatedValue = forceIt(val.f());
        val.isMemoized = true;
        val.memoizedValue = evaluatedValue;
        return evaluatedValue;
    }
    else {
        return val;
    }
}
exports.forceIt = forceIt;
function delayIt(f) {
    return {
        isMemoized: false,
        value: undefined,
        f: f
    };
}
exports.delayIt = delayIt;
function wrapLazyCallee(candidate) {
    candidate = forceIt(candidate);
    if (typeof candidate === 'function') {
        var wrapped = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return candidate.apply(void 0, args.map(forceIt));
        };
        (0, makeWrapper_1.makeWrapper)(candidate, wrapped);
        wrapped[Symbol.toStringTag] = function () { return candidate.toString(); };
        wrapped.toString = function () { return candidate.toString(); };
        return wrapped;
    }
    else if (candidate instanceof createContext_1.LazyBuiltIn) {
        if (candidate.evaluateArgs) {
            var wrapped = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return candidate.func.apply(candidate, args.map(forceIt));
            };
            (0, makeWrapper_1.makeWrapper)(candidate.func, wrapped);
            wrapped[Symbol.toStringTag] = function () { return candidate.toString(); };
            wrapped.toString = function () { return candidate.toString(); };
            return wrapped;
        }
        else {
            return candidate;
        }
    }
    // doesn't look like a function, not our business to error now
    return candidate;
}
exports.wrapLazyCallee = wrapLazyCallee;
function makeLazyFunction(candidate) {
    return new createContext_1.LazyBuiltIn(candidate, false);
}
exports.makeLazyFunction = makeLazyFunction;
function callIfFuncAndRightArgs(candidate, line, column, source) {
    var args = [];
    for (var _i = 4; _i < arguments.length; _i++) {
        args[_i - 4] = arguments[_i];
    }
    var dummy = create.callExpression(create.locationDummyNode(line, column, source), args, {
        start: { line: line, column: column },
        end: { line: line, column: column }
    });
    if (typeof candidate === 'function') {
        var originalCandidate = candidate;
        if (candidate.transformedFunction !== undefined) {
            candidate = candidate.transformedFunction;
        }
        var expectedLength = candidate.length;
        var receivedLength = args.length;
        var hasVarArgs = candidate.minArgsNeeded !== undefined;
        if (hasVarArgs ? candidate.minArgsNeeded > receivedLength : expectedLength !== receivedLength) {
            throw new errors_1.InvalidNumberOfArguments(dummy, hasVarArgs ? candidate.minArgsNeeded : expectedLength, receivedLength, hasVarArgs);
        }
        try {
            var forcedArgs = args.map(forceIt);
            return originalCandidate.apply(void 0, forcedArgs);
        }
        catch (error) {
            // if we already handled the error, simply pass it on
            if (!(error instanceof runtimeSourceError_1.RuntimeSourceError || error instanceof errors_1.ExceptionError)) {
                throw new errors_1.ExceptionError(error, dummy.loc);
            }
            else {
                throw error;
            }
        }
    }
    else if (candidate instanceof createContext_1.LazyBuiltIn) {
        try {
            if (candidate.evaluateArgs) {
                args = args.map(forceIt);
            }
            return candidate.func.apply(candidate, args);
        }
        catch (error) {
            // if we already handled the error, simply pass it on
            if (!(error instanceof runtimeSourceError_1.RuntimeSourceError || error instanceof errors_1.ExceptionError)) {
                throw new errors_1.ExceptionError(error, dummy.loc);
            }
            else {
                throw error;
            }
        }
    }
    else {
        throw new errors_1.CallingNonFunctionValue(candidate, dummy);
    }
}
exports.callIfFuncAndRightArgs = callIfFuncAndRightArgs;
function boolOrErr(candidate, line, column, source) {
    candidate = forceIt(candidate);
    var error = rttc.checkIfStatement(create.locationDummyNode(line, column, source), candidate);
    if (error === undefined) {
        return candidate;
    }
    else {
        throw error;
    }
}
exports.boolOrErr = boolOrErr;
function unaryOp(operator, argument, line, column, source) {
    argument = forceIt(argument);
    var error = rttc.checkUnaryExpression(create.locationDummyNode(line, column, source), operator, argument);
    if (error === undefined) {
        return evaluateUnaryExpression(operator, argument);
    }
    else {
        throw error;
    }
}
exports.unaryOp = unaryOp;
function evaluateUnaryExpression(operator, value) {
    if (operator === '!') {
        return !value;
    }
    else if (operator === '-') {
        return -value;
    }
    else if (operator === 'typeof') {
        return typeof value;
    }
    else {
        return +value;
    }
}
exports.evaluateUnaryExpression = evaluateUnaryExpression;
function binaryOp(operator, chapter, left, right, line, column, source) {
    left = forceIt(left);
    right = forceIt(right);
    var error = rttc.checkBinaryExpression(create.locationDummyNode(line, column, source), operator, chapter, left, right);
    if (error === undefined) {
        return evaluateBinaryExpression(operator, left, right);
    }
    else {
        throw error;
    }
}
exports.binaryOp = binaryOp;
function evaluateBinaryExpression(operator, left, right) {
    switch (operator) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            return left / right;
        case '%':
            return left % right;
        case '===':
            return left === right;
        case '!==':
            return left !== right;
        case '<=':
            return left <= right;
        case '<':
            return left < right;
        case '>':
            return left > right;
        case '>=':
            return left >= right;
        default:
            return undefined;
    }
}
exports.evaluateBinaryExpression = evaluateBinaryExpression;
/**
 * Limitations for current properTailCalls implementation:
 * Obviously, if objects ({}) are reintroduced,
 * we have to change this for a more stringent check,
 * as isTail and transformedFunctions are properties
 * and may be added by Source code.
 */
var callIteratively = function (f, nativeStorage) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var line = -1;
    var column = -1;
    var source = null;
    var startTime = Date.now();
    var pastCalls = [];
    while (true) {
        var dummy = (0, astCreator_1.locationDummyNode)(line, column, source);
        f = forceIt(f);
        if (typeof f === 'function') {
            if (f.transformedFunction !== undefined) {
                f = f.transformedFunction;
            }
            var expectedLength = f.length;
            var receivedLength = args.length;
            var hasVarArgs = f.minArgsNeeded !== undefined;
            if (hasVarArgs ? f.minArgsNeeded > receivedLength : expectedLength !== receivedLength) {
                throw new errors_1.InvalidNumberOfArguments((0, astCreator_1.callExpression)(dummy, args, {
                    start: { line: line, column: column },
                    end: { line: line, column: column },
                    source: source
                }), hasVarArgs ? f.minArgsNeeded : expectedLength, receivedLength, hasVarArgs);
            }
        }
        else if (f instanceof createContext_1.LazyBuiltIn) {
            if (f.evaluateArgs) {
                args = args.map(forceIt);
            }
            f = f.func;
        }
        else {
            throw new errors_1.CallingNonFunctionValue(f, dummy);
        }
        var res = void 0;
        try {
            res = f.apply(void 0, args);
            if (Date.now() - startTime > nativeStorage.maxExecTime) {
                throw new timeoutErrors_1.PotentialInfiniteRecursionError(dummy, pastCalls, nativeStorage.maxExecTime);
            }
        }
        catch (error) {
            // if we already handled the error, simply pass it on
            if (!(error instanceof runtimeSourceError_1.RuntimeSourceError || error instanceof errors_1.ExceptionError)) {
                throw new errors_1.ExceptionError(error, dummy.loc);
            }
            else {
                throw error;
            }
        }
        if (res === null || res === undefined) {
            return res;
        }
        else if (res.isTail === true) {
            f = res.function;
            args = res.arguments;
            line = res.line;
            column = res.column;
            source = res.source;
            pastCalls.push([res.functionName, args]);
        }
        else if (res.isTail === false) {
            return res.value;
        }
        else {
            return res;
        }
    }
};
exports.callIteratively = callIteratively;
var wrap = function (f, stringified, hasVarArgs, nativeStorage) {
    if (hasVarArgs) {
        // @ts-ignore
        f.minArgsNeeded = f.length;
    }
    var wrapped = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return exports.callIteratively.apply(void 0, __spreadArray([f, nativeStorage], args, false));
    };
    (0, makeWrapper_1.makeWrapper)(f, wrapped);
    wrapped.transformedFunction = f;
    wrapped[Symbol.toStringTag] = function () { return stringified; };
    wrapped.toString = function () { return stringified; };
    return wrapped;
};
exports.wrap = wrap;
var wrapSourceModule = function (moduleName, moduleFunc, requireProvider) {
    return Object.entries(moduleFunc(requireProvider)).reduce(function (res, _a) {
        var _b;
        var name = _a[0], value = _a[1];
        if (typeof value === 'function') {
            var repr_1 = "function ".concat(name, " {\n\t[Function from ").concat(moduleName, "\n\tImplementation hidden]\n}");
            value[Symbol.toStringTag] = function () { return repr_1; };
            value.toString = function () { return repr_1; };
        }
        return __assign(__assign({}, res), (_b = {}, _b[name] = value, _b));
    }, {});
};
exports.wrapSourceModule = wrapSourceModule;
var setProp = function (obj, prop, value, line, column, source) {
    var dummy = (0, astCreator_1.locationDummyNode)(line, column, source);
    var error = rttc.checkMemberAccess(dummy, obj, prop);
    if (error === undefined) {
        return (obj[prop] = value);
    }
    else {
        throw error;
    }
};
exports.setProp = setProp;
var getProp = function (obj, prop, line, column, source) {
    var dummy = (0, astCreator_1.locationDummyNode)(line, column, source);
    var error = rttc.checkMemberAccess(dummy, obj, prop);
    if (error === undefined) {
        if (obj[prop] !== undefined && !obj.hasOwnProperty(prop)) {
            throw new errors_1.GetInheritedPropertyError(dummy, obj, prop);
        }
        else {
            return obj[prop];
        }
    }
    else {
        throw error;
    }
};
exports.getProp = getProp;
