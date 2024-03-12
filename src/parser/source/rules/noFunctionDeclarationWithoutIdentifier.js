"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoFunctionDeclarationWithoutIdentifierError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoFunctionDeclarationWithoutIdentifierError = /** @class */ (function () {
    function NoFunctionDeclarationWithoutIdentifierError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoFunctionDeclarationWithoutIdentifierError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoFunctionDeclarationWithoutIdentifierError.prototype.explain = function () {
        return "The 'function' keyword needs to be followed by a name.";
    };
    NoFunctionDeclarationWithoutIdentifierError.prototype.elaborate = function () {
        return 'Function declarations without a name are similar to function expressions, which are banned.';
    };
    return NoFunctionDeclarationWithoutIdentifierError;
}());
exports.NoFunctionDeclarationWithoutIdentifierError = NoFunctionDeclarationWithoutIdentifierError;
var noFunctionDeclarationWithoutIdentifier = {
    name: 'no-function-declaration-without-identifier',
    checkers: {
        FunctionDeclaration: function (node, _ancestors) {
            if (node.id === null) {
                return [new NoFunctionDeclarationWithoutIdentifierError(node)];
            }
            return [];
        }
    }
};
exports.default = noFunctionDeclarationWithoutIdentifier;
