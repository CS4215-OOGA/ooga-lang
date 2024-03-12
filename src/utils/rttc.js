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
exports.isIdentifier = exports.checkMemberAccess = exports.checkIfStatement = exports.checkBinaryExpression = exports.checkUnaryExpression = exports.TypeError = void 0;
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var types_1 = require("../types");
var LHS = ' on left hand side of operation';
var RHS = ' on right hand side of operation';
var TypeError = /** @class */ (function (_super) {
    __extends(TypeError, _super);
    function TypeError(node, side, expected, got, chapter) {
        if (chapter === void 0) { chapter = types_1.Chapter.SOURCE_4; }
        var _this = _super.call(this, node) || this;
        _this.side = side;
        _this.expected = expected;
        _this.got = got;
        _this.chapter = chapter;
        _this.type = types_1.ErrorType.RUNTIME;
        _this.severity = types_1.ErrorSeverity.ERROR;
        return _this;
    }
    TypeError.prototype.explain = function () {
        var displayGot = this.got === 'array' ? (this.chapter <= 2 ? 'pair' : 'compound data') : this.got;
        return "Expected ".concat(this.expected).concat(this.side, ", got ").concat(displayGot, ".");
    };
    TypeError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.TypeError = TypeError;
// We need to define our own typeof in order for null/array to display properly in error messages
var typeOf = function (v) {
    if (v === null) {
        return 'null';
    }
    else if (Array.isArray(v)) {
        return 'array';
    }
    else {
        return typeof v;
    }
};
var isNumber = function (v) { return typeOf(v) === 'number'; };
// See section 4 of https://2ality.com/2012/12/arrays.html
// v >>> 0 === v checks that v is a valid unsigned 32-bit int
// tslint:disable-next-line:no-bitwise
var isArrayIndex = function (v) { return isNumber(v) && v >>> 0 === v && v < Math.pow(2, 32) - 1; };
var isString = function (v) { return typeOf(v) === 'string'; };
var isBool = function (v) { return typeOf(v) === 'boolean'; };
var isObject = function (v) { return typeOf(v) === 'object'; };
var isArray = function (v) { return typeOf(v) === 'array'; };
var checkUnaryExpression = function (node, operator, value, chapter) {
    if (chapter === void 0) { chapter = types_1.Chapter.SOURCE_4; }
    if ((operator === '+' || operator === '-') && !isNumber(value)) {
        return new TypeError(node, '', 'number', typeOf(value), chapter);
    }
    else if (operator === '!' && !isBool(value)) {
        return new TypeError(node, '', 'boolean', typeOf(value), chapter);
    }
    else {
        return undefined;
    }
};
exports.checkUnaryExpression = checkUnaryExpression;
var checkBinaryExpression = function (node, operator, chapter, left, right) {
    switch (operator) {
        case '-':
        case '*':
        case '/':
        case '%':
            if (!isNumber(left)) {
                return new TypeError(node, LHS, 'number', typeOf(left), chapter);
            }
            else if (!isNumber(right)) {
                return new TypeError(node, RHS, 'number', typeOf(right), chapter);
            }
            else {
                return;
            }
        case '+':
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '!==':
        case '===':
            if (chapter > 2 && (operator === '===' || operator === '!==')) {
                return;
            }
            if (isNumber(left)) {
                return isNumber(right)
                    ? undefined
                    : new TypeError(node, RHS, 'number', typeOf(right), chapter);
            }
            else if (isString(left)) {
                return isString(right)
                    ? undefined
                    : new TypeError(node, RHS, 'string', typeOf(right), chapter);
            }
            else {
                return new TypeError(node, LHS, 'string or number', typeOf(left), chapter);
            }
        default:
            return;
    }
};
exports.checkBinaryExpression = checkBinaryExpression;
var checkIfStatement = function (node, test, chapter) {
    if (chapter === void 0) { chapter = types_1.Chapter.SOURCE_4; }
    return isBool(test)
        ? undefined
        : new TypeError(node, ' as condition', 'boolean', typeOf(test), chapter);
};
exports.checkIfStatement = checkIfStatement;
var checkMemberAccess = function (node, obj, prop) {
    if (isObject(obj)) {
        return isString(prop) ? undefined : new TypeError(node, ' as prop', 'string', typeOf(prop));
    }
    else if (isArray(obj)) {
        return isArrayIndex(prop)
            ? undefined
            : isNumber(prop)
                ? new TypeError(node, ' as prop', 'array index', 'other number')
                : new TypeError(node, ' as prop', 'array index', typeOf(prop));
    }
    else {
        return new TypeError(node, '', 'object or array', typeOf(obj));
    }
};
exports.checkMemberAccess = checkMemberAccess;
var isIdentifier = function (node) {
    return node.name !== undefined;
};
exports.isIdentifier = isIdentifier;
