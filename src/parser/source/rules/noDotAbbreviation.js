"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoDotAbbreviationError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoDotAbbreviationError = /** @class */ (function () {
    function NoDotAbbreviationError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoDotAbbreviationError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoDotAbbreviationError.prototype.explain = function () {
        return 'Dot abbreviations are not allowed.';
    };
    NoDotAbbreviationError.prototype.elaborate = function () {
        return "Source doesn't use object-oriented programming, so you don't need any dots in your code (except decimal         points in numbers).";
    };
    return NoDotAbbreviationError;
}());
exports.NoDotAbbreviationError = NoDotAbbreviationError;
var noDotAbbreviation = {
    name: 'no-dot-abbreviation',
    disableFromChapter: types_1.Chapter.LIBRARY_PARSER,
    checkers: {
        MemberExpression: function (node, _ancestors) {
            if (!node.computed) {
                return [new NoDotAbbreviationError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noDotAbbreviation;
