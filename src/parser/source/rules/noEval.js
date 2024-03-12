"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoEval = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoEval = /** @class */ (function () {
    function NoEval(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoEval.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoEval.prototype.explain = function () {
        return "eval is not allowed.";
    };
    NoEval.prototype.elaborate = function () {
        return this.explain();
    };
    return NoEval;
}());
exports.NoEval = NoEval;
var noEval = {
    name: 'no-eval',
    checkers: {
        Identifier: function (node, _ancestors) {
            if (node.name === 'eval') {
                return [new NoEval(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noEval;
