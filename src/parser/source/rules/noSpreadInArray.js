"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoSpreadInArray = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoSpreadInArray = /** @class */ (function () {
    function NoSpreadInArray(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoSpreadInArray.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoSpreadInArray.prototype.explain = function () {
        return 'Spread syntax is not allowed in arrays.';
    };
    NoSpreadInArray.prototype.elaborate = function () {
        return '';
    };
    return NoSpreadInArray;
}());
exports.NoSpreadInArray = NoSpreadInArray;
var noSpreadInArray = {
    name: 'no-assignment-expression',
    checkers: {
        SpreadElement: function (node, ancestors) {
            var parent = ancestors[ancestors.length - 2];
            if (parent.type === 'CallExpression') {
                return [];
            }
            else {
                return [new NoSpreadInArray(node)];
            }
        }
    }
};
exports.default = noSpreadInArray;
