"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.PotentialInfiniteRecursionError = exports.PotentialInfiniteLoopError = exports.TimeoutError = void 0;
var constants_1 = require("../constants");
var types_1 = require("../types");
var formatters_1 = require("../utils/formatters");
var stringify_1 = require("../utils/stringify");
var runtimeSourceError_1 = require("./runtimeSourceError");
function getWarningMessage(maxExecTime) {
    var from = maxExecTime / 1000;
    var to = from * constants_1.JSSLANG_PROPERTIES.factorToIncreaseBy;
    return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["If you are certain your program is correct, press run again without editing your program.\n      The time limit will be increased from ", " to ", " seconds.\n      This page may be unresponsive for up to ", " seconds if you do so."], ["If you are certain your program is correct, press run again without editing your program.\n      The time limit will be increased from ", " to ", " seconds.\n      This page may be unresponsive for up to ", " seconds if you do so."])), from, to, to);
}
var TimeoutError = /** @class */ (function (_super) {
    __extends(TimeoutError, _super);
    function TimeoutError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TimeoutError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.TimeoutError = TimeoutError;
var PotentialInfiniteLoopError = /** @class */ (function (_super) {
    __extends(PotentialInfiniteLoopError, _super);
    function PotentialInfiniteLoopError(node, maxExecTime) {
        var _this = _super.call(this, node) || this;
        _this.maxExecTime = maxExecTime;
        _this.type = types_1.ErrorType.RUNTIME;
        _this.severity = types_1.ErrorSeverity.ERROR;
        return _this;
    }
    PotentialInfiniteLoopError.prototype.explain = function () {
        return (0, formatters_1.stripIndent)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", ".\n    ", ""], ["", ".\n    ", ""])), 'Potential infinite loop detected', getWarningMessage(this.maxExecTime));
    };
    PotentialInfiniteLoopError.prototype.elaborate = function () {
        return this.explain();
    };
    return PotentialInfiniteLoopError;
}(TimeoutError));
exports.PotentialInfiniteLoopError = PotentialInfiniteLoopError;
var PotentialInfiniteRecursionError = /** @class */ (function (_super) {
    __extends(PotentialInfiniteRecursionError, _super);
    function PotentialInfiniteRecursionError(node, calls, maxExecTime) {
        var _this = _super.call(this, node) || this;
        _this.calls = calls;
        _this.maxExecTime = maxExecTime;
        _this.type = types_1.ErrorType.RUNTIME;
        _this.severity = types_1.ErrorSeverity.ERROR;
        _this.calls = _this.calls.slice(-3);
        return _this;
    }
    PotentialInfiniteRecursionError.prototype.explain = function () {
        var formattedCalls = this.calls.map(function (_a) {
            var executedName = _a[0], executedArguments = _a[1];
            return "".concat(executedName, "(").concat(executedArguments.map(function (arg) { return (0, stringify_1.stringify)(arg); }).join(', '), ")");
        });
        return (0, formatters_1.stripIndent)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", ": ", ".\n      ", ""], ["", ": ", ".\n      ", ""])), 'Potential infinite recursion detected', formattedCalls.join(' ... '), getWarningMessage(this.maxExecTime));
    };
    PotentialInfiniteRecursionError.prototype.elaborate = function () {
        return this.explain();
    };
    return PotentialInfiniteRecursionError;
}(TimeoutError));
exports.PotentialInfiniteRecursionError = PotentialInfiniteRecursionError;
var templateObject_1, templateObject_2, templateObject_3;
