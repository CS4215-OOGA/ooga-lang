"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInfiniteLoopData = exports.InfiniteLoopError = exports.InfiniteLoopErrorType = exports.isPotentialInfiniteLoop = exports.StackOverflowMessages = void 0;
var errors_1 = require("../errors/errors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var timeoutErrors_1 = require("../errors/timeoutErrors");
var instrument_1 = require("./instrument");
var StackOverflowMessages;
(function (StackOverflowMessages) {
    StackOverflowMessages["firefox"] = "InternalError: too much recursion";
    // webkit: chrome + safari. Also works for node
    StackOverflowMessages["webkit"] = "RangeError: Maximum call stack size exceeded";
    StackOverflowMessages["edge"] = "Error: Out of stack space";
})(StackOverflowMessages || (exports.StackOverflowMessages = StackOverflowMessages = {}));
/**
 * Checks if the error is a TimeoutError or Stack Overflow.
 *
 * @returns {true} if the error is a TimeoutError or Stack Overflow.
 * @returns {false} otherwise.
 */
function isPotentialInfiniteLoop(error) {
    if (error instanceof timeoutErrors_1.TimeoutError) {
        return true;
    }
    else if (error instanceof errors_1.ExceptionError) {
        var message = error.explain();
        for (var _i = 0, _a = Object.values(StackOverflowMessages); _i < _a.length; _i++) {
            var toMatch = _a[_i];
            if (message.includes(toMatch)) {
                return true;
            }
        }
    }
    return false;
}
exports.isPotentialInfiniteLoop = isPotentialInfiniteLoop;
var InfiniteLoopErrorType;
(function (InfiniteLoopErrorType) {
    InfiniteLoopErrorType[InfiniteLoopErrorType["NoBaseCase"] = 0] = "NoBaseCase";
    InfiniteLoopErrorType[InfiniteLoopErrorType["Cycle"] = 1] = "Cycle";
    InfiniteLoopErrorType[InfiniteLoopErrorType["FromSmt"] = 2] = "FromSmt";
})(InfiniteLoopErrorType || (exports.InfiniteLoopErrorType = InfiniteLoopErrorType = {}));
var InfiniteLoopError = /** @class */ (function (_super) {
    __extends(InfiniteLoopError, _super);
    function InfiniteLoopError(functionName, streamMode, message, infiniteLoopType) {
        var _this = _super.call(this) || this;
        _this.message = message;
        _this.infiniteLoopType = infiniteLoopType;
        _this.functionName = functionName;
        _this.streamMode = streamMode;
        return _this;
    }
    InfiniteLoopError.prototype.explain = function () {
        var entityName = this.functionName ? "function ".concat((0, instrument_1.getOriginalName)(this.functionName)) : 'loop';
        return this.streamMode
            ? "The error may have arisen from forcing the infinite stream: ".concat(entityName, ".")
            : "The ".concat(entityName, " has encountered an infinite loop. ") + this.message;
    };
    return InfiniteLoopError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.InfiniteLoopError = InfiniteLoopError;
/**
 * Determines whether the error is an infinite loop, and returns a tuple of
 * [error type, is stream, error message, previous code].
 *  *
 * @param {Context} - The context being used.
 *
 * @returns [error type, is stream, error message, previous programs] if the error was an infinite loop
 * @returns {undefined} otherwise
 */
function getInfiniteLoopData(context) {
    // return error type/string, prevCodeStack
    // cast as any to access infiniteLoopError property later
    var errors = context.errors;
    var latestError = errors[errors.length - 1];
    if (latestError instanceof errors_1.ExceptionError) {
        latestError = latestError.error;
    }
    var infiniteLoopError;
    if (latestError instanceof InfiniteLoopError) {
        infiniteLoopError = latestError;
    }
    else if (latestError.hasOwnProperty('infiniteLoopError')) {
        infiniteLoopError = latestError.infiniteLoopError;
    }
    if (infiniteLoopError) {
        return [
            infiniteLoopError.infiniteLoopType,
            infiniteLoopError.streamMode,
            infiniteLoopError.explain(),
            context.previousPrograms
        ];
    }
    else {
        return undefined;
    }
}
exports.getInfiniteLoopData = getInfiniteLoopData;
