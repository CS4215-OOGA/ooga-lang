"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hoistAndMergeImports = void 0;
var _ = require("lodash");
var typeGuards_1 = require("../../utils/ast/typeGuards");
var baseConstructors_1 = require("../constructors/baseConstructors");
var contextSpecificConstructors_1 = require("../constructors/contextSpecificConstructors");
/**
 * Hoists import declarations to the top of the program & merges duplicate
 * imports for the same module.
 *
 * Note that two modules are the same if and only if their import source
 * is the same. This function does not resolve paths against a base
 * directory. If such a functionality is required, this function will
 * need to be modified.
 *
 * @param program The AST which should have its ImportDeclaration nodes
 *                hoisted & duplicate imports merged.
 */
var hoistAndMergeImports = function (program) {
    var _a;
    // Separate import declarations from non-import declarations.
    var importDeclarations = program.body.filter(typeGuards_1.isImportDeclaration);
    var nonImportDeclarations = program.body.filter(function (node) {
        return !(0, typeGuards_1.isImportDeclaration)(node);
    });
    // Merge import sources & specifiers.
    var importSourceToSpecifiersMap = new Map();
    for (var _i = 0, importDeclarations_1 = importDeclarations; _i < importDeclarations_1.length; _i++) {
        var importDeclaration = importDeclarations_1[_i];
        var importSource = importDeclaration.source.value;
        if (typeof importSource !== 'string') {
            throw new Error('Module names must be strings.');
        }
        var specifiers = (_a = importSourceToSpecifiersMap.get(importSource)) !== null && _a !== void 0 ? _a : [];
        var _loop_1 = function (specifier) {
            // The Acorn parser adds extra information to AST nodes that are not
            // part of the ESTree types. As such, we need to clone and strip
            // the import specifier AST nodes to get a canonical representation
            // that we can use to keep track of whether the import specifier
            // is a duplicate or not.
            var strippedSpecifier = (0, contextSpecificConstructors_1.cloneAndStripImportSpecifier)(specifier);
            // Note that we cannot make use of JavaScript's built-in Set class
            // as it compares references for objects.
            var isSpecifierDuplicate = specifiers.filter(function (specifier) {
                return _.isEqual(strippedSpecifier, specifier);
            }).length !== 0;
            if (isSpecifierDuplicate) {
                return "continue";
            }
            specifiers.push(strippedSpecifier);
        };
        for (var _b = 0, _c = importDeclaration.specifiers; _b < _c.length; _b++) {
            var specifier = _c[_b];
            _loop_1(specifier);
        }
        importSourceToSpecifiersMap.set(importSource, specifiers);
    }
    // Convert the merged import sources & specifiers back into import declarations.
    var mergedImportDeclarations = [];
    importSourceToSpecifiersMap.forEach(function (specifiers, importSource) {
        mergedImportDeclarations.push((0, baseConstructors_1.createImportDeclaration)(specifiers, (0, baseConstructors_1.createLiteral)(importSource)));
    });
    // Hoist the merged import declarations to the top of the program body.
    program.body = __spreadArray(__spreadArray([], mergedImportDeclarations, true), nonImportDeclarations, true);
};
exports.hoistAndMergeImports = hoistAndMergeImports;
