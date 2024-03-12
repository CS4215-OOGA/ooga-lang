"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUnspecifiedLiteral = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var specifiedLiterals = ['boolean', 'string', 'number'];
var NoUnspecifiedLiteral = /** @class */ (function () {
    function NoUnspecifiedLiteral(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoUnspecifiedLiteral.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoUnspecifiedLiteral.prototype.explain = function () {
        /**
         * A check is used for RegExp to ensure that only RegExp are caught.
         * Any other unspecified literal value should not be caught.
         */
        var literal = this.node.value instanceof RegExp ? 'RegExp' : '';
        return "'".concat(literal, "' literals are not allowed.");
    };
    NoUnspecifiedLiteral.prototype.elaborate = function () {
        return '';
    };
    return NoUnspecifiedLiteral;
}());
exports.NoUnspecifiedLiteral = NoUnspecifiedLiteral;
var noUnspecifiedLiteral = {
    name: 'no-unspecified-literal',
    checkers: {
        Literal: function (node, _ancestors) {
            if (node.value !== null && !specifiedLiterals.includes(typeof node.value)) {
                return [new NoUnspecifiedLiteral(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noUnspecifiedLiteral;
