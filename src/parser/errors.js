"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisallowedConstructError = exports.FatalSyntaxError = exports.TrailingCommaError = exports.MissingSemicolonError = void 0;
var constants_1 = require("../constants");
var types_1 = require("../types");
var formatters_1 = require("../utils/formatters");
var MissingSemicolonError = /** @class */ (function () {
    function MissingSemicolonError(location) {
        this.location = location;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    MissingSemicolonError.prototype.explain = function () {
        return 'Missing semicolon at the end of statement';
    };
    MissingSemicolonError.prototype.elaborate = function () {
        return 'Every statement must be terminated by a semicolon.';
    };
    return MissingSemicolonError;
}());
exports.MissingSemicolonError = MissingSemicolonError;
var TrailingCommaError = /** @class */ (function () {
    function TrailingCommaError(location) {
        this.location = location;
    }
    TrailingCommaError.prototype.explain = function () {
        return 'Trailing comma';
    };
    TrailingCommaError.prototype.elaborate = function () {
        return 'Please remove the trailing comma';
    };
    return TrailingCommaError;
}());
exports.TrailingCommaError = TrailingCommaError;
var FatalSyntaxError = /** @class */ (function () {
    function FatalSyntaxError(location, message) {
        this.location = location;
        this.message = message;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    FatalSyntaxError.prototype.explain = function () {
        return this.message;
    };
    FatalSyntaxError.prototype.elaborate = function () {
        return 'There is a syntax error in your program';
    };
    return FatalSyntaxError;
}());
exports.FatalSyntaxError = FatalSyntaxError;
var DisallowedConstructError = /** @class */ (function () {
    function DisallowedConstructError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.nodeType = this.formatNodeType(this.node.type);
    }
    Object.defineProperty(DisallowedConstructError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    DisallowedConstructError.prototype.explain = function () {
        return "".concat(this.nodeType, " are not allowed");
    };
    DisallowedConstructError.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        You are trying to use ", ", which is not allowed (yet).\n      "], ["\n        You are trying to use ", ", which is not allowed (yet).\n      "])), this.nodeType);
    };
    /**
     * Converts estree node.type into english
     * e.g. ThisExpression -> 'this' expressions
     *      Property -> Properties
     *      EmptyStatement -> Empty Statements
     */
    DisallowedConstructError.prototype.formatNodeType = function (nodeType) {
        switch (nodeType) {
            case 'ThisExpression':
                return "'this' expressions";
            case 'Property':
                return 'Properties';
            case 'ImportNamespaceSpecifier':
                return 'Namespace imports';
            default: {
                var words = nodeType.split(/(?=[A-Z])/);
                return words.map(function (word, i) { return (i === 0 ? word : word.toLowerCase()); }).join(' ') + 's';
            }
        }
    };
    return DisallowedConstructError;
}());
exports.DisallowedConstructError = DisallowedConstructError;
var templateObject_1;
