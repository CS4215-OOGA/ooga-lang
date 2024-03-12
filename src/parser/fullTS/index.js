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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullTSParser = void 0;
var parser_1 = require("@babel/parser");
var bootstrap_1 = require("@ts-morph/bootstrap");
var typeErrorChecker_1 = require("../../typeChecker/typeErrorChecker");
var errors_1 = require("../errors");
var utils_1 = require("../source/typed/utils");
var utils_2 = require("../utils");
var IMPORT_TOP_LEVEL_ERROR = 'An import declaration can only be used at the top level of a namespace or module.';
var START_OF_MODULE_ERROR = 'Cannot find module ';
var FullTSParser = /** @class */ (function () {
    function FullTSParser() {
    }
    FullTSParser.prototype.parse = function (programStr, context, options, throwOnError) {
        var code = '';
        // Add builtins to code
        // Each declaration is replaced with a single constant declaration with type `any`
        // to reduce evaluation time
        for (var _i = 0, _a = context.nativeStorage.builtins; _i < _a.length; _i++) {
            var builtin = _a[_i];
            code += "const ".concat(builtin[0], ": any = 1\n");
        }
        // Add prelude functions to code
        // Each declaration is replaced with a single constant declaration with type `any`
        // to reduce evaluation time
        if (context.prelude) {
            var preludeFns = context.prelude.split('\nfunction ').slice(1);
            preludeFns.forEach(function (fnString) {
                var fnName = fnString.split('(')[0];
                // Functions in prelude that start with $ are not added
                if (fnName.startsWith('$')) {
                    return;
                }
                code += "const ".concat(fnName, ": any = 1\n");
            });
        }
        // Get line offset
        var lineOffset = code.split('\n').length - 1;
        // Add program string to code string,
        // wrapping it in a block to allow redeclaration of variables
        code = code + '{' + programStr + '}';
        // Initialize file to analyze
        var project = (0, bootstrap_1.createProjectSync)({ useInMemoryFileSystem: true });
        var filename = 'program.ts';
        project.createSourceFile(filename, code);
        // Get TS diagnostics from file, formatted as TS error string
        var diagnostics = bootstrap_1.ts.getPreEmitDiagnostics(project.createProgram());
        var formattedString = project.formatDiagnosticsWithColorAndContext(diagnostics);
        // Reformat TS error string to Source error by getting line number using regex
        // This is because logic to retrieve line number is only present in
        // formatDiagnosticsWithColorAndContext and cannot be called directly
        var lineNumRegex = /(?<=\[7m)\d+/;
        diagnostics.forEach(function (diagnostic) {
            var message = diagnostic.messageText.toString();
            // Ignore errors regarding imports
            // as TS does not have information about Source modules
            if (message === IMPORT_TOP_LEVEL_ERROR || message.startsWith(START_OF_MODULE_ERROR)) {
                return;
            }
            var lineNumRegExpArr = lineNumRegex.exec(formattedString.split(message)[1]);
            var lineNum = (lineNumRegExpArr === null ? 0 : parseInt(lineNumRegExpArr[0])) - lineOffset;
            // Ignore any errors that occur in builtins/prelude (line number <= 0)
            if (lineNum <= 0) {
                return;
            }
            var position = { line: lineNum, column: 0, offset: 0 };
            context.errors.push(new errors_1.FatalSyntaxError((0, utils_2.positionToSourceLocation)(position), message));
        });
        if (context.errors.length > 0) {
            return null;
        }
        // Parse code into Babel AST, which supports type syntax
        var ast = (0, parser_1.parse)(programStr, __assign(__assign({}, utils_2.defaultBabelOptions), { sourceFilename: options === null || options === void 0 ? void 0 : options.sourceFile, errorRecovery: throwOnError !== null && throwOnError !== void 0 ? throwOnError : true }));
        if (ast.errors.length) {
            ast.errors
                .filter(function (error) { return error instanceof SyntaxError; })
                .forEach(function (error) {
                context.errors.push(new errors_1.FatalSyntaxError((0, utils_2.positionToSourceLocation)(error.loc, options === null || options === void 0 ? void 0 : options.sourceFile), error.toString()));
            });
            return null;
        }
        // Transform Babel AST into ESTree AST
        var typedProgram = ast.program;
        var transpiledProgram = (0, typeErrorChecker_1.removeTSNodes)(typedProgram);
        (0, utils_1.transformBabelASTToESTreeCompliantAST)(transpiledProgram);
        return transpiledProgram;
    };
    FullTSParser.prototype.validate = function (_ast, _context, _throwOnError) {
        return true;
    };
    FullTSParser.prototype.toString = function () {
        return 'FullTSParser';
    };
    return FullTSParser;
}());
exports.FullTSParser = FullTSParser;
