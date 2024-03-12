"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForStatmentMustHaveAllParts = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var ForStatmentMustHaveAllParts = /** @class */ (function () {
    function ForStatmentMustHaveAllParts(node, missingParts) {
        this.node = node;
        this.missingParts = missingParts;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(ForStatmentMustHaveAllParts.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    ForStatmentMustHaveAllParts.prototype.explain = function () {
        return "Missing ".concat(this.missingParts.join(', '), " expression").concat(this.missingParts.length === 1 ? '' : 's', " in for statement.");
    };
    ForStatmentMustHaveAllParts.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      This for statement requires all three parts (initialiser, test, update) to be present.\n    "], ["\n      This for statement requires all three parts (initialiser, test, update) to be present.\n    "])));
    };
    return ForStatmentMustHaveAllParts;
}());
exports.ForStatmentMustHaveAllParts = ForStatmentMustHaveAllParts;
var forStatementMustHaveAllParts = {
    name: 'for-statement-must-have-all-parts',
    checkers: {
        ForStatement: function (node) {
            var missingParts = ['init', 'test', 'update'].filter(function (part) { return node[part] === null; });
            if (missingParts.length > 0) {
                return [new ForStatmentMustHaveAllParts(node, missingParts)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = forStatementMustHaveAllParts;
var templateObject_1;
