"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoExportNamedDeclarationWithDefaultError = void 0;
var constants_1 = require("../../../constants");
var localImport_prelude_1 = require("../../../stdlib/localImport.prelude");
var types_1 = require("../../../types");
var syntax_1 = require("../syntax");
var NoExportNamedDeclarationWithDefaultError = /** @class */ (function () {
    function NoExportNamedDeclarationWithDefaultError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoExportNamedDeclarationWithDefaultError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoExportNamedDeclarationWithDefaultError.prototype.explain = function () {
        return 'Export default declarations are not allowed';
    };
    NoExportNamedDeclarationWithDefaultError.prototype.elaborate = function () {
        return 'You are trying to use an export default declaration, which is not allowed (yet).';
    };
    return NoExportNamedDeclarationWithDefaultError;
}());
exports.NoExportNamedDeclarationWithDefaultError = NoExportNamedDeclarationWithDefaultError;
var noExportNamedDeclarationWithDefault = {
    name: 'no-declare-mutable',
    disableFromChapter: syntax_1.default['ExportDefaultDeclaration'],
    checkers: {
        ExportNamedDeclaration: function (node, _ancestors) {
            var errors = [];
            node.specifiers.forEach(function (specifier) {
                if (specifier.exported.name === localImport_prelude_1.defaultExportLookupName) {
                    errors.push(new NoExportNamedDeclarationWithDefaultError(node));
                }
            });
            return errors;
        }
    }
};
exports.default = noExportNamedDeclarationWithDefault;
