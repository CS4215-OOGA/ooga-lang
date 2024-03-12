"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoIfWithoutElseError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var NoIfWithoutElseError = /** @class */ (function () {
    function NoIfWithoutElseError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoIfWithoutElseError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoIfWithoutElseError.prototype.explain = function () {
        return 'Missing "else" in "if-else" statement.';
    };
    NoIfWithoutElseError.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      This \"if\" block requires corresponding \"else\" block which will be\n      evaluated when ", " expression evaluates to false.\n\n      Later in the course we will lift this restriction and allow \"if\" without\n      else.\n    "], ["\n      This \"if\" block requires corresponding \"else\" block which will be\n      evaluated when ", " expression evaluates to false.\n\n      Later in the course we will lift this restriction and allow \"if\" without\n      else.\n    "])), (0, astring_1.generate)(this.node.test));
    };
    return NoIfWithoutElseError;
}());
exports.NoIfWithoutElseError = NoIfWithoutElseError;
var noIfWithoutElse = {
    name: 'no-if-without-else',
    disableFromChapter: types_1.Chapter.SOURCE_3,
    checkers: {
        IfStatement: function (node, _ancestors) {
            if (!node.alternate) {
                return [new NoIfWithoutElseError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noIfWithoutElse;
var templateObject_1;
