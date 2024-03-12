"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneAndStripImportSpecifier = exports.createInvokedFunctionResultVariableDeclaration = exports.createImportedNameDeclaration = exports.createListCallExpression = exports.createPairCallExpression = void 0;
var localImport_prelude_1 = require("../../stdlib/localImport.prelude");
var baseConstructors_1 = require("./baseConstructors");
/**
 * Constructs a call to the `pair` function.
 *
 * @param head The head of the pair.
 * @param tail The tail of the pair.
 */
var createPairCallExpression = function (head, tail) {
    return (0, baseConstructors_1.createCallExpression)('pair', [head, tail]);
};
exports.createPairCallExpression = createPairCallExpression;
/**
 * Constructs a call to the `list` function.
 *
 * @param listElements The elements of the list.
 */
var createListCallExpression = function (listElements) {
    return (0, baseConstructors_1.createCallExpression)('list', listElements);
};
exports.createListCallExpression = createListCallExpression;
/**
 * Constructs the AST equivalent of:
 * const importedName = __access_export__(functionName, lookupName);
 *
 * @param functionName The name of the transformed function declaration to import from.
 * @param importedName The name of the import.
 * @param lookupName   The name to lookup in the transformed function declaration.
 */
var createImportedNameDeclaration = function (functionName, importedName, lookupName) {
    var callExpression = (0, baseConstructors_1.createCallExpression)(localImport_prelude_1.accessExportFunctionName, [
        (0, baseConstructors_1.createIdentifier)(functionName),
        (0, baseConstructors_1.createLiteral)(lookupName)
    ]);
    var variableDeclarator = (0, baseConstructors_1.createVariableDeclarator)(importedName, callExpression);
    return (0, baseConstructors_1.createVariableDeclaration)([variableDeclarator], 'const');
};
exports.createImportedNameDeclaration = createImportedNameDeclaration;
/**
 * Constructs the AST equivalent of:
 * const variableName = functionName(...functionArgs);
 *
 * @param functionName The name of the transformed function declaration to invoke.
 * @param variableName The name of the variable holding the result of the function invocation.
 * @param functionArgs The arguments to be passed when invoking the function.
 */
var createInvokedFunctionResultVariableDeclaration = function (functionName, variableName, functionArgs) {
    var callExpression = (0, baseConstructors_1.createCallExpression)(functionName, functionArgs);
    var variableDeclarator = (0, baseConstructors_1.createVariableDeclarator)((0, baseConstructors_1.createIdentifier)(variableName), callExpression);
    return (0, baseConstructors_1.createVariableDeclaration)([variableDeclarator], 'const');
};
exports.createInvokedFunctionResultVariableDeclaration = createInvokedFunctionResultVariableDeclaration;
/**
 * Clones the import specifier, but only the properties
 * that are part of its ESTree AST type. This is useful for
 * stripping out extraneous information on the import
 * specifier AST nodes (such as the location information
 * that the Acorn parser adds).
 *
 * @param importSpecifier The import specifier to be cloned.
 */
var cloneAndStripImportSpecifier = function (importSpecifier) {
    switch (importSpecifier.type) {
        case 'ImportSpecifier':
            return {
                type: 'ImportSpecifier',
                local: (0, baseConstructors_1.createIdentifier)(importSpecifier.local.name),
                imported: (0, baseConstructors_1.createIdentifier)(importSpecifier.imported.name)
            };
        case 'ImportDefaultSpecifier':
            return {
                type: 'ImportDefaultSpecifier',
                local: (0, baseConstructors_1.createIdentifier)(importSpecifier.local.name)
            };
        case 'ImportNamespaceSpecifier':
            return {
                type: 'ImportNamespaceSpecifier',
                local: (0, baseConstructors_1.createIdentifier)(importSpecifier.local.name)
            };
    }
};
exports.cloneAndStripImportSpecifier = cloneAndStripImportSpecifier;
