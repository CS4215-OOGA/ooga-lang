"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUnspecifiedOperatorError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoUnspecifiedOperatorError = /** @class */ (function () {
    function NoUnspecifiedOperatorError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.unspecifiedOperator = node.operator;
    }
    Object.defineProperty(NoUnspecifiedOperatorError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoUnspecifiedOperatorError.prototype.explain = function () {
        return "Operator '".concat(this.unspecifiedOperator, "' is not allowed.");
    };
    NoUnspecifiedOperatorError.prototype.elaborate = function () {
        return '';
    };
    return NoUnspecifiedOperatorError;
}());
exports.NoUnspecifiedOperatorError = NoUnspecifiedOperatorError;
var noUnspecifiedOperator = {
    name: 'no-unspecified-operator',
    checkers: {
        BinaryExpression: function (node, _ancestors) {
            var permittedOperators = [
                '+',
                '-',
                '*',
                '/',
                '%',
                '===',
                '!==',
                '<',
                '>',
                '<=',
                '>=',
                '&&',
                '||'
            ];
            if (!permittedOperators.includes(node.operator)) {
                return [new NoUnspecifiedOperatorError(node)];
            }
            else {
                return [];
            }
        },
        UnaryExpression: function (node) {
            var permittedOperators = ['-', '!', 'typeof'];
            if (!permittedOperators.includes(node.operator)) {
                return [new NoUnspecifiedOperatorError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noUnspecifiedOperator;
