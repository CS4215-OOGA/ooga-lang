"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoNullError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoNullError = /** @class */ (function () {
    function NoNullError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoNullError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoNullError.prototype.explain = function () {
        return "null literals are not allowed.";
    };
    NoNullError.prototype.elaborate = function () {
        return "They're not part of the Source §1 specs.";
    };
    return NoNullError;
}());
exports.NoNullError = NoNullError;
var noNull = {
    name: 'no-null',
    disableFromChapter: types_1.Chapter.SOURCE_2,
    checkers: {
        Literal: function (node, _ancestors) {
            if (node.value === null) {
                return [new NoNullError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noNull;
