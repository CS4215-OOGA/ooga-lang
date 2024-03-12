"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoVarError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoVarError = /** @class */ (function () {
    function NoVarError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoVarError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoVarError.prototype.explain = function () {
        return 'Variable declaration using "var" is not allowed.';
    };
    NoVarError.prototype.elaborate = function () {
        var name = this.node.declarations[0].id.name;
        var value = (0, astring_1.generate)(this.node.declarations[0].init);
        return "Use keyword \"let\" instead, to declare a variable:\n\n\tlet ".concat(name, " = ").concat(value, ";");
    };
    return NoVarError;
}());
exports.NoVarError = NoVarError;
var noVar = {
    name: 'no-var',
    checkers: {
        VariableDeclaration: function (node, _ancestors) {
            if (node.kind === 'var') {
                return [new NoVarError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noVar;
