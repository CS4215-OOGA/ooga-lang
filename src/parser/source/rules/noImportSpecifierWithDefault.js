"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoImportSpecifierWithDefaultError = void 0;
var constants_1 = require("../../../constants");
var localImport_prelude_1 = require("../../../stdlib/localImport.prelude");
var types_1 = require("../../../types");
var syntax_1 = require("../syntax");
var NoImportSpecifierWithDefaultError = /** @class */ (function () {
    function NoImportSpecifierWithDefaultError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoImportSpecifierWithDefaultError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoImportSpecifierWithDefaultError.prototype.explain = function () {
        return 'Import default specifiers are not allowed';
    };
    NoImportSpecifierWithDefaultError.prototype.elaborate = function () {
        return 'You are trying to use an import default specifier, which is not allowed (yet).';
    };
    return NoImportSpecifierWithDefaultError;
}());
exports.NoImportSpecifierWithDefaultError = NoImportSpecifierWithDefaultError;
var noImportSpecifierWithDefault = {
    name: 'no-declare-mutable',
    disableFromChapter: syntax_1.default['ImportDefaultSpecifier'],
    checkers: {
        ImportSpecifier: function (node, _ancestors) {
            if (node.imported.name === localImport_prelude_1.defaultExportLookupName) {
                return [new NoImportSpecifierWithDefaultError(node)];
            }
            return [];
        }
    }
};
exports.default = noImportSpecifierWithDefault;
