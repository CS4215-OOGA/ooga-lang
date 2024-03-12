"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoImplicitReturnUndefinedError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var NoImplicitReturnUndefinedError = /** @class */ (function () {
    function NoImplicitReturnUndefinedError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoImplicitReturnUndefinedError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoImplicitReturnUndefinedError.prototype.explain = function () {
        return 'Missing value in return statement.';
    };
    NoImplicitReturnUndefinedError.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      This return statement is missing a value.\n      For instance, to return the value 42, you can write\n\n        return 42;\n    "], ["\n      This return statement is missing a value.\n      For instance, to return the value 42, you can write\n\n        return 42;\n    "])));
    };
    return NoImplicitReturnUndefinedError;
}());
exports.NoImplicitReturnUndefinedError = NoImplicitReturnUndefinedError;
var noImplicitReturnUndefined = {
    name: 'no-implicit-return-undefined',
    checkers: {
        ReturnStatement: function (node, _ancestors) {
            if (!node.argument) {
                return [new NoImplicitReturnUndefinedError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noImplicitReturnUndefined;
var templateObject_1;
