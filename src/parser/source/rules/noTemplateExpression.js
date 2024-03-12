"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoTemplateExpressionError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoTemplateExpressionError = /** @class */ (function () {
    function NoTemplateExpressionError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoTemplateExpressionError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoTemplateExpressionError.prototype.explain = function () {
        return 'Expressions are not allowed in template literals (`multiline strings`)';
    };
    NoTemplateExpressionError.prototype.elaborate = function () {
        return this.explain();
    };
    return NoTemplateExpressionError;
}());
exports.NoTemplateExpressionError = NoTemplateExpressionError;
var noTemplateExpression = {
    name: 'no-template-expression',
    checkers: {
        TemplateLiteral: function (node, _ancestors) {
            if (node.expressions.length > 0) {
                return [new NoTemplateExpressionError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noTemplateExpression;
