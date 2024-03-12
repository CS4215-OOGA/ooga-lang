"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.SourceTypedParser = void 0;
var parser_1 = require("@babel/parser");
var constants_1 = require("../../../constants");
var typeErrorChecker_1 = require("../../../typeChecker/typeErrorChecker");
var errors_1 = require("../../errors");
var utils_1 = require("../../utils");
var __1 = require("..");
var typeParser_1 = require("./typeParser");
var utils_2 = require("./utils");
var SourceTypedParser = /** @class */ (function (_super) {
    __extends(SourceTypedParser, _super);
    function SourceTypedParser() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SourceTypedParser.prototype.parse = function (programStr, context, options, throwOnError) {
        // Parse with acorn type parser first to catch errors such as
        // import/export not at top level, trailing commas, missing semicolons
        try {
            typeParser_1.default.parse(programStr, (0, utils_1.createAcornParserOptions)(constants_1.DEFAULT_ECMA_VERSION, context.errors, options));
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                error = new errors_1.FatalSyntaxError((0, utils_1.positionToSourceLocation)(error.loc, options === null || options === void 0 ? void 0 : options.sourceFile), error.toString());
            }
            if (throwOnError)
                throw error;
            context.errors.push(error);
            return null;
        }
        // Parse again with babel parser to capture all type syntax
        // and catch remaining syntax errors not caught by acorn type parser
        var ast = (0, parser_1.parse)(programStr, __assign(__assign({}, utils_1.defaultBabelOptions), { sourceFilename: options === null || options === void 0 ? void 0 : options.sourceFile, errorRecovery: throwOnError !== null && throwOnError !== void 0 ? throwOnError : true }));
        if (ast.errors.length) {
            ast.errors
                .filter(function (error) { return error instanceof SyntaxError; })
                .forEach(function (error) {
                context.errors.push(new errors_1.FatalSyntaxError((0, utils_1.positionToSourceLocation)(error.loc, options === null || options === void 0 ? void 0 : options.sourceFile), error.toString()));
            });
            return null;
        }
        var typedProgram = ast.program;
        var typedCheckedProgram = (0, typeErrorChecker_1.checkForTypeErrors)(typedProgram, context);
        (0, utils_2.transformBabelASTToESTreeCompliantAST)(typedCheckedProgram);
        return typedCheckedProgram;
    };
    SourceTypedParser.prototype.toString = function () {
        return 'SourceTypedParser';
    };
    return SourceTypedParser;
}(__1.SourceParser));
exports.SourceTypedParser = SourceTypedParser;
