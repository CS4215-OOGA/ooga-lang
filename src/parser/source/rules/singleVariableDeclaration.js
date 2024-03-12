"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleDeclarationsError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var MultipleDeclarationsError = /** @class */ (function () {
    function MultipleDeclarationsError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.fixs = node.declarations.map(function (declaration) { return ({
            type: 'VariableDeclaration',
            kind: 'let',
            loc: declaration.loc,
            declarations: [declaration]
        }); });
    }
    Object.defineProperty(MultipleDeclarationsError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    MultipleDeclarationsError.prototype.explain = function () {
        return 'Multiple declaration in a single statement.';
    };
    MultipleDeclarationsError.prototype.elaborate = function () {
        var fixs = this.fixs.map(function (n) { return '\t' + (0, astring_1.generate)(n); }).join('\n');
        return 'Split the variable declaration into multiple lines as follows\n\n' + fixs + '\n';
    };
    return MultipleDeclarationsError;
}());
exports.MultipleDeclarationsError = MultipleDeclarationsError;
var singleVariableDeclaration = {
    name: 'single-variable-declaration',
    checkers: {
        VariableDeclaration: function (node, _ancestors) {
            if (node.declarations.length > 1) {
                return [new MultipleDeclarationsError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = singleVariableDeclaration;
