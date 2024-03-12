"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoHolesInArrays = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var NoHolesInArrays = /** @class */ (function () {
    function NoHolesInArrays(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoHolesInArrays.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoHolesInArrays.prototype.explain = function () {
        return "No holes are allowed in array literals.";
    };
    NoHolesInArrays.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      No holes (empty slots with no content inside) are allowed in array literals.\n      You probably have an extra comma, which creates a hole.\n    "], ["\n      No holes (empty slots with no content inside) are allowed in array literals.\n      You probably have an extra comma, which creates a hole.\n    "])));
    };
    return NoHolesInArrays;
}());
exports.NoHolesInArrays = NoHolesInArrays;
var noHolesInArrays = {
    name: 'no-holes-in-arrays',
    checkers: {
        ArrayExpression: function (node) {
            return node.elements.some(function (x) { return x === null; }) ? [new NoHolesInArrays(node)] : [];
        }
    }
};
exports.default = noHolesInArrays;
var templateObject_1;
