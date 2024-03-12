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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetPropertyError = exports.GetInheritedPropertyError = exports.GetPropertyError = exports.ConstAssignment = exports.VariableRedeclaration = exports.InvalidNumberOfArguments = exports.UnassignedVariable = exports.UndefinedVariable = exports.CallingNonFunctionValue = exports.MaximumStackLimitExceeded = exports.ExceptionError = exports.InterruptedError = void 0;
/* tslint:disable: max-classes-per-file */
/* tslint:disable:max-line-length */
var astring_1 = require("astring");
var constants_1 = require("../constants");
var types_1 = require("../types");
var stringify_1 = require("../utils/stringify");
var runtimeSourceError_1 = require("./runtimeSourceError");
var InterruptedError = /** @class */ (function (_super) {
    __extends(InterruptedError, _super);
    function InterruptedError(node) {
        return _super.call(this, node) || this;
    }
    InterruptedError.prototype.explain = function () {
        return 'Execution aborted by user.';
    };
    InterruptedError.prototype.elaborate = function () {
        return 'TODO';
    };
    return InterruptedError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.InterruptedError = InterruptedError;
var ExceptionError = /** @class */ (function () {
    function ExceptionError(error, location) {
        this.error = error;
        this.type = types_1.ErrorType.RUNTIME;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.location = location !== null && location !== void 0 ? location : constants_1.UNKNOWN_LOCATION;
    }
    ExceptionError.prototype.explain = function () {
        return this.error.toString();
    };
    ExceptionError.prototype.elaborate = function () {
        return 'TODO';
    };
    return ExceptionError;
}());
exports.ExceptionError = ExceptionError;
var MaximumStackLimitExceeded = /** @class */ (function (_super) {
    __extends(MaximumStackLimitExceeded, _super);
    function MaximumStackLimitExceeded(node, calls) {
        var _this = _super.call(this, node) || this;
        _this.calls = calls;
        _this.customGenerator = __assign(__assign({}, astring_1.baseGenerator), { CallExpression: function (node, state) {
                state.write((0, astring_1.generate)(node.callee));
                state.write('(');
                var argsRepr = node.arguments.map(function (arg) { return (0, stringify_1.stringify)(arg.value); });
                state.write(argsRepr.join(', '));
                state.write(')');
            } });
        return _this;
    }
    MaximumStackLimitExceeded.prototype.explain = function () {
        var _this = this;
        var repr = function (call) { return (0, astring_1.generate)(call, { generator: _this.customGenerator }); };
        return ('Maximum call stack size exceeded\n  ' + this.calls.map(function (call) { return repr(call) + '..'; }).join('  '));
    };
    MaximumStackLimitExceeded.prototype.elaborate = function () {
        return 'TODO';
    };
    MaximumStackLimitExceeded.MAX_CALLS_TO_SHOW = 3;
    return MaximumStackLimitExceeded;
}(runtimeSourceError_1.RuntimeSourceError));
exports.MaximumStackLimitExceeded = MaximumStackLimitExceeded;
var CallingNonFunctionValue = /** @class */ (function (_super) {
    __extends(CallingNonFunctionValue, _super);
    function CallingNonFunctionValue(callee, node) {
        var _this = _super.call(this, node) || this;
        _this.callee = callee;
        _this.node = node;
        return _this;
    }
    CallingNonFunctionValue.prototype.explain = function () {
        return "Calling non-function value ".concat((0, stringify_1.stringify)(this.callee), ".");
    };
    CallingNonFunctionValue.prototype.elaborate = function () {
        var calleeVal = this.callee;
        var calleeStr = (0, stringify_1.stringify)(calleeVal);
        var argStr = '';
        var callArgs = this.node.arguments;
        argStr = callArgs.map(astring_1.generate).join(', ');
        var elabStr = "Because ".concat(calleeStr, " is not a function, you cannot run ").concat(calleeStr, "(").concat(argStr, ").");
        var multStr = "If you were planning to perform multiplication by ".concat(calleeStr, ", you need to use the * operator.");
        if (Number.isFinite(calleeVal)) {
            return "".concat(elabStr, " ").concat(multStr);
        }
        else {
            return elabStr;
        }
    };
    return CallingNonFunctionValue;
}(runtimeSourceError_1.RuntimeSourceError));
exports.CallingNonFunctionValue = CallingNonFunctionValue;
var UndefinedVariable = /** @class */ (function (_super) {
    __extends(UndefinedVariable, _super);
    function UndefinedVariable(name, node) {
        var _this = _super.call(this, node) || this;
        _this.name = name;
        return _this;
    }
    UndefinedVariable.prototype.explain = function () {
        return "Name ".concat(this.name, " not declared.");
    };
    UndefinedVariable.prototype.elaborate = function () {
        return "Before you can read the value of ".concat(this.name, ", you need to declare it as a variable or a constant. You can do this using the let or const keywords.");
    };
    return UndefinedVariable;
}(runtimeSourceError_1.RuntimeSourceError));
exports.UndefinedVariable = UndefinedVariable;
var UnassignedVariable = /** @class */ (function (_super) {
    __extends(UnassignedVariable, _super);
    function UnassignedVariable(name, node) {
        var _this = _super.call(this, node) || this;
        _this.name = name;
        return _this;
    }
    UnassignedVariable.prototype.explain = function () {
        return "Name ".concat(this.name, " declared later in current scope but not yet assigned");
    };
    UnassignedVariable.prototype.elaborate = function () {
        return "If you're trying to access the value of ".concat(this.name, " from an outer scope, please rename the inner ").concat(this.name, ". An easy way to avoid this issue in future would be to avoid declaring any variables or constants with the name ").concat(this.name, " in the same scope.");
    };
    return UnassignedVariable;
}(runtimeSourceError_1.RuntimeSourceError));
exports.UnassignedVariable = UnassignedVariable;
var InvalidNumberOfArguments = /** @class */ (function (_super) {
    __extends(InvalidNumberOfArguments, _super);
    function InvalidNumberOfArguments(node, expected, got, hasVarArgs) {
        if (hasVarArgs === void 0) { hasVarArgs = false; }
        var _this = _super.call(this, node) || this;
        _this.expected = expected;
        _this.got = got;
        _this.hasVarArgs = hasVarArgs;
        _this.calleeStr = (0, astring_1.generate)(node.callee);
        return _this;
    }
    InvalidNumberOfArguments.prototype.explain = function () {
        return "Expected ".concat(this.expected, " ").concat(this.hasVarArgs ? 'or more ' : '', "arguments, but got ").concat(this.got, ".");
    };
    InvalidNumberOfArguments.prototype.elaborate = function () {
        var calleeStr = this.calleeStr;
        var pluralS = this.expected === 1 ? '' : 's';
        return "Try calling function ".concat(calleeStr, " again, but with ").concat(this.expected, " argument").concat(pluralS, " instead. Remember that arguments are separated by a ',' (comma).");
    };
    return InvalidNumberOfArguments;
}(runtimeSourceError_1.RuntimeSourceError));
exports.InvalidNumberOfArguments = InvalidNumberOfArguments;
var VariableRedeclaration = /** @class */ (function (_super) {
    __extends(VariableRedeclaration, _super);
    function VariableRedeclaration(node, name, writable) {
        var _this = _super.call(this, node) || this;
        _this.node = node;
        _this.name = name;
        _this.writable = writable;
        return _this;
    }
    VariableRedeclaration.prototype.explain = function () {
        return "Redeclaring name ".concat(this.name, ".");
    };
    VariableRedeclaration.prototype.elaborate = function () {
        if (this.writable === true) {
            var elabStr = "Since ".concat(this.name, " has already been declared, you can assign a value to it without re-declaring.");
            var initStr = '';
            if (this.node.type === 'FunctionDeclaration') {
                initStr =
                    '(' + this.node.params.map(astring_1.generate).join(',') + ') => {...';
            }
            else if (this.node.type === 'VariableDeclaration') {
                initStr = (0, astring_1.generate)(this.node.declarations[0].init);
            }
            return "".concat(elabStr, " As such, you can just do\n\n\t").concat(this.name, " = ").concat(initStr, ";\n");
        }
        else if (this.writable === false) {
            return "You will need to declare another variable, as ".concat(this.name, " is read-only.");
        }
        else {
            return '';
        }
    };
    return VariableRedeclaration;
}(runtimeSourceError_1.RuntimeSourceError));
exports.VariableRedeclaration = VariableRedeclaration;
var ConstAssignment = /** @class */ (function (_super) {
    __extends(ConstAssignment, _super);
    function ConstAssignment(node, name) {
        var _this = _super.call(this, node) || this;
        _this.name = name;
        return _this;
    }
    ConstAssignment.prototype.explain = function () {
        return "Cannot assign new value to constant ".concat(this.name, ".");
    };
    ConstAssignment.prototype.elaborate = function () {
        return "As ".concat(this.name, " was declared as a constant, its value cannot be changed. You will have to declare a new variable.");
    };
    return ConstAssignment;
}(runtimeSourceError_1.RuntimeSourceError));
exports.ConstAssignment = ConstAssignment;
var GetPropertyError = /** @class */ (function (_super) {
    __extends(GetPropertyError, _super);
    function GetPropertyError(node, obj, prop) {
        var _this = _super.call(this, node) || this;
        _this.obj = obj;
        _this.prop = prop;
        return _this;
    }
    GetPropertyError.prototype.explain = function () {
        return "Cannot read property ".concat(this.prop, " of ").concat((0, stringify_1.stringify)(this.obj), ".");
    };
    GetPropertyError.prototype.elaborate = function () {
        return 'TODO';
    };
    return GetPropertyError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.GetPropertyError = GetPropertyError;
var GetInheritedPropertyError = /** @class */ (function (_super) {
    __extends(GetInheritedPropertyError, _super);
    function GetInheritedPropertyError(node, obj, prop) {
        var _a;
        var _this = _super.call(this, node) || this;
        _this.obj = obj;
        _this.prop = prop;
        _this.type = types_1.ErrorType.RUNTIME;
        _this.severity = types_1.ErrorSeverity.ERROR;
        _this.location = (_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        return _this;
    }
    GetInheritedPropertyError.prototype.explain = function () {
        return "Cannot read inherited property ".concat(this.prop, " of ").concat((0, stringify_1.stringify)(this.obj), ".");
    };
    GetInheritedPropertyError.prototype.elaborate = function () {
        return 'TODO';
    };
    return GetInheritedPropertyError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.GetInheritedPropertyError = GetInheritedPropertyError;
var SetPropertyError = /** @class */ (function (_super) {
    __extends(SetPropertyError, _super);
    function SetPropertyError(node, obj, prop) {
        var _this = _super.call(this, node) || this;
        _this.obj = obj;
        _this.prop = prop;
        return _this;
    }
    SetPropertyError.prototype.explain = function () {
        return "Cannot assign property ".concat(this.prop, " of ").concat((0, stringify_1.stringify)(this.obj), ".");
    };
    SetPropertyError.prototype.elaborate = function () {
        return 'TODO';
    };
    return SetPropertyError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.SetPropertyError = SetPropertyError;
