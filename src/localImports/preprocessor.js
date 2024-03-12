"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getImportedLocalModulePaths = void 0;
var path_1 = require("path");
var localImportErrors_1 = require("../errors/localImportErrors");
var parser_1 = require("../parser/parser");
var assert_1 = require("../utils/assert");
var typeGuards_1 = require("../utils/ast/typeGuards");
var rttc_1 = require("../utils/rttc");
var contextSpecificConstructors_1 = require("./constructors/contextSpecificConstructors");
var directedGraph_1 = require("./directedGraph");
var filePaths_1 = require("./filePaths");
var hoistAndMergeImports_1 = require("./transformers/hoistAndMergeImports");
var removeExports_1 = require("./transformers/removeExports");
var removeNonSourceModuleImports_1 = require("./transformers/removeNonSourceModuleImports");
var transformProgramToFunctionDeclaration_1 = require("./transformers/transformProgramToFunctionDeclaration");
/**
 * Returns all absolute local module paths which should be imported.
 * This function makes use of the file path of the current file to
 * determine the absolute local module paths.
 *
 * Note that the current file path must be absolute.
 *
 * @param program         The program to be operated on.
 * @param currentFilePath The file path of the current file.
 */
var getImportedLocalModulePaths = function (program, currentFilePath) {
    if (!path_1.posix.isAbsolute(currentFilePath)) {
        throw new Error("Current file path '".concat(currentFilePath, "' is not absolute."));
    }
    var baseFilePath = path_1.posix.resolve(currentFilePath, '..');
    var importedLocalModuleNames = new Set();
    var importDeclarations = program.body.filter(typeGuards_1.isImportDeclaration);
    importDeclarations.forEach(function (importDeclaration) {
        var modulePath = importDeclaration.source.value;
        if (typeof modulePath !== 'string') {
            throw new Error('Module names must be strings.');
        }
        if (!(0, removeNonSourceModuleImports_1.isSourceModule)(modulePath)) {
            var absoluteModulePath = path_1.posix.resolve(baseFilePath, modulePath);
            importedLocalModuleNames.add(absoluteModulePath);
        }
    });
    return importedLocalModuleNames;
};
exports.getImportedLocalModulePaths = getImportedLocalModulePaths;
var parseProgramsAndConstructImportGraph = function (files, entrypointFilePath, context) {
    var programs = {};
    var importGraph = new directedGraph_1.DirectedGraph();
    // If there is more than one file, tag AST nodes with the source file path.
    var numOfFiles = Object.keys(files).length;
    var shouldAddSourceFileToAST = numOfFiles > 1;
    var parseFile = function (currentFilePath) {
        var code = files[currentFilePath];
        if (code === undefined) {
            context.errors.push(new localImportErrors_1.CannotFindModuleError(currentFilePath));
            return;
        }
        // Tag AST nodes with the source file path for use in error messages.
        var parserOptions = shouldAddSourceFileToAST
            ? {
                sourceFile: currentFilePath
            }
            : {};
        var program = (0, parser_1.parse)(code, context, parserOptions);
        if (program === null) {
            return;
        }
        programs[currentFilePath] = program;
        var importedLocalModulePaths = (0, exports.getImportedLocalModulePaths)(program, currentFilePath);
        for (var _i = 0, importedLocalModulePaths_1 = importedLocalModulePaths; _i < importedLocalModulePaths_1.length; _i++) {
            var importedLocalModulePath = importedLocalModulePaths_1[_i];
            // If the source & destination nodes in the import graph are the
            // same, then the file is trying to import from itself. This is a
            // special case of circular imports.
            if (importedLocalModulePath === currentFilePath) {
                context.errors.push(new localImportErrors_1.CircularImportError([importedLocalModulePath, currentFilePath]));
                return;
            }
            // If we traverse the same edge in the import graph twice, it means
            // that there is a cycle in the graph. We terminate early so as not
            // to get into an infinite loop (and also because there is no point
            // in traversing cycles when our goal is to build up the import
            // graph).
            if (importGraph.hasEdge(importedLocalModulePath, currentFilePath)) {
                continue;
            }
            // Since the file at 'currentFilePath' contains the import statement
            // from the file at 'importedLocalModulePath', we treat the former
            // as the destination node and the latter as the source node in our
            // import graph. This is because when we insert the transformed
            // function declarations into the resulting program, we need to start
            // with the function declarations that do not depend on other
            // function declarations.
            importGraph.addEdge(importedLocalModulePath, currentFilePath);
            // Recursively parse imported files.
            parseFile(importedLocalModulePath);
        }
    };
    parseFile(entrypointFilePath);
    return {
        programs: programs,
        importGraph: importGraph
    };
};
var getSourceModuleImports = function (programs) {
    var sourceModuleImports = [];
    Object.values(programs).forEach(function (program) {
        var importDeclarations = program.body.filter(typeGuards_1.isImportDeclaration);
        importDeclarations.forEach(function (importDeclaration) {
            var importSource = importDeclaration.source.value;
            if (typeof importSource !== 'string') {
                throw new Error('Module names must be strings.');
            }
            if ((0, removeNonSourceModuleImports_1.isSourceModule)(importSource)) {
                sourceModuleImports.push(importDeclaration);
            }
        });
    });
    return sourceModuleImports;
};
/**
 * Preprocesses file imports and returns a transformed Abstract Syntax Tree (AST).
 * If an error is encountered at any point, returns `undefined` to signify that an
 * error occurred. Details of the error can be found inside `context.errors`.
 *
 * The preprocessing works by transforming each imported file into a function whose
 * parameters are other files (results of transformed functions) and return value
 * is a pair where the head is the default export or null, and the tail is a list
 * of pairs that map from exported names to identifiers.
 *
 * See https://github.com/source-academy/js-slang/wiki/Local-Module-Import-&-Export
 * for more information.
 *
 * @param files              An object mapping absolute file paths to file content.
 * @param entrypointFilePath The absolute path of the entrypoint file.
 * @param context            The information associated with the program evaluation.
 */
var preprocessFileImports = function (files, entrypointFilePath, context) {
    var _a;
    // Parse all files into ASTs and build the import graph.
    var _b = parseProgramsAndConstructImportGraph(files, entrypointFilePath, context), programs = _b.programs, importGraph = _b.importGraph;
    // Return 'undefined' if there are errors while parsing.
    if (context.errors.length !== 0) {
        return undefined;
    }
    // Check for circular imports.
    var topologicalOrderResult = importGraph.getTopologicalOrder();
    if (!topologicalOrderResult.isValidTopologicalOrderFound) {
        context.errors.push(new localImportErrors_1.CircularImportError(topologicalOrderResult.firstCycleFound));
        return undefined;
    }
    // We want to operate on the entrypoint program to get the eventual
    // preprocessed program.
    var entrypointProgram = programs[entrypointFilePath];
    var entrypointDirPath = path_1.posix.resolve(entrypointFilePath, '..');
    // Create variables to hold the imported statements.
    var entrypointProgramModuleDeclarations = entrypointProgram.body.filter(typeGuards_1.isModuleDeclaration);
    var entrypointProgramInvokedFunctionResultVariableNameToImportSpecifiersMap = (0, transformProgramToFunctionDeclaration_1.getInvokedFunctionResultVariableNameToImportSpecifiersMap)(entrypointProgramModuleDeclarations, entrypointDirPath);
    var entrypointProgramAccessImportStatements = (0, transformProgramToFunctionDeclaration_1.createAccessImportStatements)(entrypointProgramInvokedFunctionResultVariableNameToImportSpecifiersMap);
    // Transform all programs into their equivalent function declaration
    // except for the entrypoint program.
    var functionDeclarations = {};
    for (var _i = 0, _c = Object.entries(programs); _i < _c.length; _i++) {
        var _d = _c[_i], filePath = _d[0], program = _d[1];
        // The entrypoint program does not need to be transformed into its
        // function declaration equivalent as its enclosing environment is
        // simply the overall program's (constructed program's) environment.
        if (filePath === entrypointFilePath) {
            continue;
        }
        var functionDeclaration = (0, transformProgramToFunctionDeclaration_1.transformProgramToFunctionDeclaration)(program, filePath);
        var functionName = (_a = functionDeclaration.id) === null || _a === void 0 ? void 0 : _a.name;
        (0, assert_1.default)(functionName !== undefined, 'A transformed function declaration is missing its name. This should never happen.');
        functionDeclarations[functionName] = functionDeclaration;
    }
    // Invoke each of the transformed functions and store the result in a variable.
    var invokedFunctionResultVariableDeclarations = [];
    topologicalOrderResult.topologicalOrder.forEach(function (filePath) {
        // As mentioned above, the entrypoint program does not have a function
        // declaration equivalent, so there is no need to process it.
        if (filePath === entrypointFilePath) {
            return;
        }
        var functionName = (0, filePaths_1.transformFilePathToValidFunctionName)(filePath);
        var invokedFunctionResultVariableName = (0, filePaths_1.transformFunctionNameToInvokedFunctionResultVariableName)(functionName);
        var functionDeclaration = functionDeclarations[functionName];
        var functionParams = functionDeclaration.params.filter(rttc_1.isIdentifier);
        (0, assert_1.default)(functionParams.length === functionDeclaration.params.length, 'Function declaration contains non-Identifier AST nodes as params. This should never happen.');
        var invokedFunctionResultVariableDeclaration = (0, contextSpecificConstructors_1.createInvokedFunctionResultVariableDeclaration)(functionName, invokedFunctionResultVariableName, functionParams);
        invokedFunctionResultVariableDeclarations.push(invokedFunctionResultVariableDeclaration);
    });
    // Get all Source module imports across the entrypoint program & all imported programs.
    var sourceModuleImports = getSourceModuleImports(programs);
    // Re-assemble the program.
    var preprocessedProgram = __assign(__assign({}, entrypointProgram), { body: __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], sourceModuleImports, true), Object.values(functionDeclarations), true), invokedFunctionResultVariableDeclarations, true), entrypointProgramAccessImportStatements, true), entrypointProgram.body, true) });
    // After this pre-processing step, all export-related nodes in the AST
    // are no longer needed and are thus removed.
    (0, removeExports_1.removeExports)(preprocessedProgram);
    // Likewise, all import-related nodes in the AST which are not Source
    // module imports are no longer needed and are also removed.
    (0, removeNonSourceModuleImports_1.removeNonSourceModuleImports)(preprocessedProgram);
    // Finally, we need to hoist all remaining imports to the top of the
    // program. These imports should be source module imports since
    // non-Source module imports would have already been removed. As part
    // of this step, we also merge imports from the same module so as to
    // import each unique name per module only once.
    (0, hoistAndMergeImports_1.hoistAndMergeImports)(preprocessedProgram);
    return preprocessedProgram;
};
exports.default = preprocessFileImports;
