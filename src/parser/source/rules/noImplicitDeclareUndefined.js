"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoImplicitDeclareUndefinedError = void 0;
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var NoImplicitDeclareUndefinedError = /** @class */ (function () {
    function NoImplicitDeclareUndefinedError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoImplicitDeclareUndefinedError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoImplicitDeclareUndefinedError.prototype.explain = function () {
        return 'Missing value in variable declaration.';
    };
    NoImplicitDeclareUndefinedError.prototype.elaborate = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      A variable declaration assigns a value to a name.\n      For instance, to assign 20 to ", ", you can write:\n\n        let ", " = 20;\n\n        ", " + ", "; // 40\n    "], ["\n      A variable declaration assigns a value to a name.\n      For instance, to assign 20 to ", ", you can write:\n\n        let ", " = 20;\n\n        ", " + ", "; // 40\n    "])), this.node.name, this.node.name, this.node.name, this.node.name);
    };
    return NoImplicitDeclareUndefinedError;
}());
exports.NoImplicitDeclareUndefinedError = NoImplicitDeclareUndefinedError;
var noImplicitDeclareUndefined = {
    name: 'no-implicit-declare-undefined',
    checkers: {
        VariableDeclaration: function (node, _ancestors) {
            var errors = [];
            for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
                var decl = _a[_i];
                if (!decl.init) {
                    errors.push(new NoImplicitDeclareUndefinedError(decl.id));
                }
            }
            return errors;
        }
    }
};
exports.default = noImplicitDeclareUndefined;
var templateObject_1;
