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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assemble = exports.setBreakpointAtLine = exports.createContext = exports.compileFiles = exports.compile = exports.interrupt = exports.resume = exports.runFilesInContext = exports.runInContext = exports.getNames = exports.hasDeclaration = exports.getAllOccurrencesInScope = exports.getScope = exports.findDeclaration = exports.parseError = exports.SourceDocumentation = void 0;
var source_map_1 = require("source-map");
var createContext_1 = require("./createContext");
exports.createContext = createContext_1.default;
var errors_1 = require("./errors/errors");
var finder_1 = require("./finder");
var utils_1 = require("./parser/utils");
var scope_refactoring_1 = require("./scope-refactoring");
var inspector_1 = require("./stdlib/inspector");
Object.defineProperty(exports, "setBreakpointAtLine", { enumerable: true, get: function () { return inspector_1.setBreakpointAtLine; } });
var types_1 = require("./types");
var svml_assembler_1 = require("./vm/svml-assembler");
Object.defineProperty(exports, "assemble", { enumerable: true, get: function () { return svml_assembler_1.assemble; } });
var svml_compiler_1 = require("./vm/svml-compiler");
var docTooltip_1 = require("./editors/ace/docTooltip");
Object.defineProperty(exports, "SourceDocumentation", { enumerable: true, get: function () { return docTooltip_1.SourceDocumentation; } });
var interpreter_1 = require("./cse-machine/interpreter");
var localImportErrors_1 = require("./errors/localImportErrors");
var filePaths_1 = require("./localImports/filePaths");
var preprocessor_1 = require("./localImports/preprocessor");
var name_extractor_1 = require("./name-extractor");
var parser_1 = require("./parser/parser");
var scheme_1 = require("./parser/scheme");
var utils_2 = require("./parser/utils");
var runner_1 = require("./runner");
// needed to work on browsers
if (typeof window !== 'undefined') {
    // @ts-ignore
    source_map_1.SourceMapConsumer.initialize({
        'lib/mappings.wasm': 'https://unpkg.com/source-map@0.7.3/lib/mappings.wasm'
    });
}
var verboseErrors = false;
function parseError(errors, verbose) {
    if (verbose === void 0) { verbose = verboseErrors; }
    var errorMessagesArr = errors.map(function (error) {
        var _a;
        // FIXME: Either refactor the parser to output an ESTree-compliant AST, or modify the ESTree types.
        var filePath = ((_a = error.location) === null || _a === void 0 ? void 0 : _a.source) ? "[".concat(error.location.source, "] ") : '';
        var line = error.location ? error.location.start.line : '<unknown>';
        var column = error.location ? error.location.start.column : '<unknown>';
        var explanation = error.explain();
        if (verbose) {
            // TODO currently elaboration is just tagged on to a new line after the error message itself. find a better
            // way to display it.
            var elaboration = error.elaborate();
            return line < 1
                ? "".concat(filePath).concat(explanation, "\n").concat(elaboration, "\n")
                : "".concat(filePath, "Line ").concat(line, ", Column ").concat(column, ": ").concat(explanation, "\n").concat(elaboration, "\n");
        }
        else {
            return line < 1 ? explanation : "".concat(filePath, "Line ").concat(line, ": ").concat(explanation);
        }
    });
    return errorMessagesArr.join('\n');
}
exports.parseError = parseError;
function findDeclaration(code, context, loc) {
    var program = (0, utils_1.looseParse)(code, context);
    if (!program) {
        return null;
    }
    var identifierNode = (0, finder_1.findIdentifierNode)(program, context, loc);
    if (!identifierNode) {
        return null;
    }
    var declarationNode = (0, finder_1.findDeclarationNode)(program, identifierNode);
    if (!declarationNode || identifierNode === declarationNode) {
        return null;
    }
    return declarationNode.loc;
}
exports.findDeclaration = findDeclaration;
function getScope(code, context, loc) {
    var program = (0, utils_1.looseParse)(code, context);
    if (!program) {
        return [];
    }
    var identifierNode = (0, finder_1.findIdentifierNode)(program, context, loc);
    if (!identifierNode) {
        return [];
    }
    var declarationNode = (0, finder_1.findDeclarationNode)(program, identifierNode);
    if (!declarationNode || declarationNode.loc == null || identifierNode !== declarationNode) {
        return [];
    }
    return (0, scope_refactoring_1.getScopeHelper)(declarationNode.loc, program, identifierNode.name);
}
exports.getScope = getScope;
function getAllOccurrencesInScope(code, context, loc) {
    var program = (0, utils_1.looseParse)(code, context);
    if (!program) {
        return [];
    }
    var identifierNode = (0, finder_1.findIdentifierNode)(program, context, loc);
    if (!identifierNode) {
        return [];
    }
    var declarationNode = (0, finder_1.findDeclarationNode)(program, identifierNode);
    if (declarationNode == null || declarationNode.loc == null) {
        return [];
    }
    return (0, scope_refactoring_1.getAllOccurrencesInScopeHelper)(declarationNode.loc, program, identifierNode.name);
}
exports.getAllOccurrencesInScope = getAllOccurrencesInScope;
function hasDeclaration(code, context, loc) {
    var program = (0, utils_1.looseParse)(code, context);
    if (!program) {
        return false;
    }
    var identifierNode = (0, finder_1.findIdentifierNode)(program, context, loc);
    if (!identifierNode) {
        return false;
    }
    var declarationNode = (0, finder_1.findDeclarationNode)(program, identifierNode);
    if (declarationNode == null || declarationNode.loc == null) {
        return false;
    }
    return true;
}
exports.hasDeclaration = hasDeclaration;
/**
 * Gets names present within a string of code
 * @param code Code to parse
 * @param line Line position of the cursor
 * @param col Column position of the cursor
 * @param context Evaluation context
 * @returns `[NameDeclaration[], true]` if suggestions should be displayed, `[[], false]` otherwise
 */
function getNames(code, line, col, context) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, program, comments, cursorLoc, _b, progNames, displaySuggestions, keywords;
        return __generator(this, function (_c) {
            _a = (0, utils_2.parseWithComments)(code), program = _a[0], comments = _a[1];
            if (!program) {
                return [2 /*return*/, [[], false]];
            }
            cursorLoc = { line: line, column: col };
            _b = (0, name_extractor_1.getProgramNames)(program, comments, cursorLoc), progNames = _b[0], displaySuggestions = _b[1];
            keywords = (0, name_extractor_1.getKeywords)(program, cursorLoc, context);
            return [2 /*return*/, [progNames.concat(keywords), displaySuggestions]];
        });
    });
}
exports.getNames = getNames;
function runInContext(code_1, context_1) {
    return __awaiter(this, arguments, void 0, function (code, context, options) {
        var defaultFilePath, files;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            defaultFilePath = '/default.js';
            files = {};
            files[defaultFilePath] = code;
            return [2 /*return*/, runFilesInContext(files, defaultFilePath, context, options)];
        });
    });
}
exports.runInContext = runInContext;
function runFilesInContext(files_1, entrypointFilePath_1, context_1) {
    return __awaiter(this, arguments, void 0, function (files, entrypointFilePath, context, options) {
        var filePath, filePathError, code, program, fullImportOptions, evaluated;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            for (filePath in files) {
                filePathError = (0, filePaths_1.validateFilePath)(filePath);
                if (filePathError !== null) {
                    context.errors.push(filePathError);
                    return [2 /*return*/, runner_1.resolvedErrorPromise];
                }
            }
            code = files[entrypointFilePath];
            if (code === undefined) {
                context.errors.push(new localImportErrors_1.CannotFindModuleError(entrypointFilePath));
                return [2 /*return*/, runner_1.resolvedErrorPromise];
            }
            if (context.chapter === types_1.Chapter.FULL_JS ||
                context.chapter === types_1.Chapter.FULL_TS ||
                context.chapter === types_1.Chapter.PYTHON_1) {
                program = (0, parser_1.parse)(code, context);
                if (program === null) {
                    return [2 /*return*/, runner_1.resolvedErrorPromise];
                }
                fullImportOptions = __assign({ loadTabs: true, checkImports: false, wrapSourceModules: false }, options.importOptions);
                return [2 /*return*/, (0, runner_1.fullJSRunner)(program, context, fullImportOptions)];
            }
            if (context.chapter === types_1.Chapter.HTML) {
                return [2 /*return*/, (0, runner_1.htmlRunner)(code, context, options)];
            }
            if (context.chapter <= +types_1.Chapter.SCHEME_1 && context.chapter >= +types_1.Chapter.FULL_SCHEME) {
                evaluated = (0, runner_1.sourceFilesRunner)(files, entrypointFilePath, context, options).then(function (result) {
                    // Format the returned value
                    if (result.status === 'finished') {
                        return __assign(__assign({}, result), { value: (0, scheme_1.decodeValue)(result.value) });
                    }
                    return result;
                });
                // Format all errors in the context
                context.errors = context.errors.map(function (error) { return (0, scheme_1.decodeError)(error); });
                return [2 /*return*/, evaluated];
            }
            // FIXME: Clean up state management so that the `parseError` function is pure.
            //        This is not a huge priority, but it would be good not to make use of
            //        global state.
            verboseErrors = (0, runner_1.hasVerboseErrors)(code);
            return [2 /*return*/, (0, runner_1.sourceFilesRunner)(files, entrypointFilePath, context, options)];
        });
    });
}
exports.runFilesInContext = runFilesInContext;
function resume(result) {
    if (result.status === 'finished' || result.status === 'error') {
        return result;
    }
    else if (result.status === 'suspended-cse-eval') {
        var value = (0, interpreter_1.resumeEvaluate)(result.context);
        return (0, interpreter_1.CSEResultPromise)(result.context, value);
    }
    else {
        return result.scheduler.run(result.it, result.context);
    }
}
exports.resume = resume;
function interrupt(context) {
    var globalEnvironment = context.runtime.environments[context.runtime.environments.length - 1];
    context.runtime.environments = [globalEnvironment];
    context.runtime.isRunning = false;
    context.errors.push(new errors_1.InterruptedError(context.runtime.nodes[0]));
}
exports.interrupt = interrupt;
function compile(code, context, vmInternalFunctions) {
    var defaultFilePath = '/default.js';
    var files = {};
    files[defaultFilePath] = code;
    return compileFiles(files, defaultFilePath, context, vmInternalFunctions);
}
exports.compile = compile;
function compileFiles(files, entrypointFilePath, context, vmInternalFunctions) {
    for (var filePath in files) {
        var filePathError = (0, filePaths_1.validateFilePath)(filePath);
        if (filePathError !== null) {
            context.errors.push(filePathError);
            return undefined;
        }
    }
    var entrypointCode = files[entrypointFilePath];
    if (entrypointCode === undefined) {
        context.errors.push(new localImportErrors_1.CannotFindModuleError(entrypointFilePath));
        return undefined;
    }
    var preprocessedProgram = (0, preprocessor_1.default)(files, entrypointFilePath, context);
    if (!preprocessedProgram) {
        return undefined;
    }
    try {
        return (0, svml_compiler_1.compileToIns)(preprocessedProgram, undefined, vmInternalFunctions);
    }
    catch (error) {
        context.errors.push(error);
        return undefined;
    }
}
exports.compileFiles = compileFiles;
