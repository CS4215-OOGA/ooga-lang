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
exports.sourceFilesRunner = exports.sourceRunner = void 0;
var _ = require("lodash");
var constants_1 = require("../constants");
var interpreter_1 = require("../cse-machine/interpreter");
var errors_1 = require("../errors/errors");
var localImportErrors_1 = require("../errors/localImportErrors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var timeoutErrors_1 = require("../errors/timeoutErrors");
var gpu_1 = require("../gpu/gpu");
var errors_2 = require("../infiniteLoops/errors");
var runtime_1 = require("../infiniteLoops/runtime");
var interpreter_2 = require("../interpreter/interpreter");
var interpreter_non_det_1 = require("../interpreter/interpreter-non-det");
var lazy_1 = require("../lazy/lazy");
var preprocessor_1 = require("../localImports/preprocessor");
var requireProvider_1 = require("../modules/requireProvider");
var parser_1 = require("../parser/parser");
var schedulers_1 = require("../schedulers");
var stepper_1 = require("../stepper/stepper");
var evalContainer_1 = require("../transpiler/evalContainer");
var transpiler_1 = require("../transpiler/transpiler");
var types_1 = require("../types");
var operators_1 = require("../utils/operators");
var validator_1 = require("../validator/validator");
var svml_compiler_1 = require("../vm/svml-compiler");
var svml_machine_1 = require("../vm/svml-machine");
var _1 = require(".");
var errors_3 = require("./errors");
var fullJSRunner_1 = require("./fullJSRunner");
var utils_1 = require("./utils");
var DEFAULT_SOURCE_OPTIONS = {
    scheduler: 'async',
    steps: 1000,
    stepLimit: -1,
    executionMethod: 'auto',
    variant: types_1.Variant.DEFAULT,
    originalMaxExecTime: 1000,
    useSubst: false,
    isPrelude: false,
    throwInfiniteLoops: true,
    envSteps: -1,
    importOptions: {
        wrapSourceModules: true,
        checkImports: true,
        loadTabs: true
    }
};
var previousCode = null;
var isPreviousCodeTimeoutError = false;
function runConcurrent(program, context, options) {
    if (context.shouldIncreaseEvaluationTimeout) {
        context.nativeStorage.maxExecTime *= constants_1.JSSLANG_PROPERTIES.factorToIncreaseBy;
    }
    else {
        context.nativeStorage.maxExecTime = options.originalMaxExecTime;
    }
    try {
        return Promise.resolve({
            status: 'finished',
            context: context,
            value: (0, svml_machine_1.runWithProgram)((0, svml_compiler_1.compileForConcurrent)(program, context), context)
        });
    }
    catch (error) {
        if (error instanceof runtimeSourceError_1.RuntimeSourceError || error instanceof errors_1.ExceptionError) {
            context.errors.push(error); // use ExceptionErrors for non Source Errors
            return utils_1.resolvedErrorPromise;
        }
        context.errors.push(new errors_1.ExceptionError(error, constants_1.UNKNOWN_LOCATION));
        return utils_1.resolvedErrorPromise;
    }
}
function runSubstitution(program, context, options) {
    return __awaiter(this, void 0, void 0, function () {
        var steps, redexedSteps, _i, steps_1, step, redex, redexed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, stepper_1.getEvaluationSteps)(program, context, options)];
                case 1:
                    steps = _a.sent();
                    if (context.errors.length > 0) {
                        return [2 /*return*/, utils_1.resolvedErrorPromise];
                    }
                    redexedSteps = [];
                    for (_i = 0, steps_1 = steps; _i < steps_1.length; _i++) {
                        step = steps_1[_i];
                        redex = (0, stepper_1.getRedex)(step[0], step[1]);
                        redexed = (0, stepper_1.redexify)(step[0], step[1]);
                        redexedSteps.push({
                            code: redexed[0],
                            redex: redexed[1],
                            explanation: step[2],
                            function: (0, stepper_1.callee)(redex, context)
                        });
                    }
                    return [2 /*return*/, {
                            status: 'finished',
                            context: context,
                            value: redexedSteps
                        }];
            }
        });
    });
}
function runInterpreter(program, context, options) {
    var it = (0, interpreter_2.evaluateProgram)(program, context, true, true);
    var scheduler;
    if (context.variant === types_1.Variant.NON_DET) {
        it = (0, interpreter_non_det_1.nonDetEvaluate)(program, context);
        scheduler = new schedulers_1.NonDetScheduler();
    }
    else if (options.scheduler === 'async') {
        scheduler = new schedulers_1.AsyncScheduler();
    }
    else {
        scheduler = new schedulers_1.PreemptiveScheduler(options.steps);
    }
    return scheduler.run(it, context);
}
function runNative(program, context, options) {
    return __awaiter(this, void 0, void 0, function () {
        var transpiledProgram, transpiled, sourceMapJson, value, error_1, isDefaultVariant, detectedInfiniteLoop, sourceError;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!options.isPrelude) {
                        if (context.shouldIncreaseEvaluationTimeout && isPreviousCodeTimeoutError) {
                            context.nativeStorage.maxExecTime *= constants_1.JSSLANG_PROPERTIES.factorToIncreaseBy;
                        }
                        else {
                            context.nativeStorage.maxExecTime = options.originalMaxExecTime;
                        }
                    }
                    transpiledProgram = _.cloneDeep(program);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 8]);
                    switch (context.variant) {
                        case types_1.Variant.GPU:
                            (0, gpu_1.transpileToGPU)(transpiledProgram);
                            break;
                        case types_1.Variant.LAZY:
                            (0, lazy_1.transpileToLazy)(transpiledProgram);
                            break;
                    }
                    ;
                    return [4 /*yield*/, (0, transpiler_1.transpile)(transpiledProgram, context, options.importOptions)];
                case 2:
                    (_a = _b.sent(), transpiled = _a.transpiled, sourceMapJson = _a.sourceMapJson);
                    return [4 /*yield*/, (0, evalContainer_1.sandboxedEval)(transpiled, (0, requireProvider_1.getRequireProvider)(context), context.nativeStorage)];
                case 3:
                    value = _b.sent();
                    if (context.variant === types_1.Variant.LAZY) {
                        value = (0, operators_1.forceIt)(value);
                    }
                    if (!options.isPrelude) {
                        isPreviousCodeTimeoutError = false;
                    }
                    return [2 /*return*/, {
                            status: 'finished',
                            context: context,
                            value: value
                        }];
                case 4:
                    error_1 = _b.sent();
                    isDefaultVariant = options.variant === undefined || options.variant === types_1.Variant.DEFAULT;
                    if (!(isDefaultVariant && (0, errors_2.isPotentialInfiniteLoop)(error_1))) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, runtime_1.testForInfiniteLoop)(program, context.previousPrograms.slice(1))];
                case 5:
                    detectedInfiniteLoop = _b.sent();
                    if (detectedInfiniteLoop !== undefined) {
                        if (options.throwInfiniteLoops) {
                            context.errors.push(detectedInfiniteLoop);
                            return [2 /*return*/, utils_1.resolvedErrorPromise];
                        }
                        else {
                            error_1.infiniteLoopError = detectedInfiniteLoop;
                            if (error_1 instanceof errors_1.ExceptionError) {
                                ;
                                error_1.error.infiniteLoopError = detectedInfiniteLoop;
                            }
                        }
                    }
                    _b.label = 6;
                case 6:
                    if (error_1 instanceof runtimeSourceError_1.RuntimeSourceError) {
                        context.errors.push(error_1);
                        if (error_1 instanceof timeoutErrors_1.TimeoutError) {
                            isPreviousCodeTimeoutError = true;
                        }
                        return [2 /*return*/, utils_1.resolvedErrorPromise];
                    }
                    if (error_1 instanceof errors_1.ExceptionError) {
                        // if we know the location of the error, just throw it
                        if (error_1.location.start.line !== -1) {
                            context.errors.push(error_1);
                            return [2 /*return*/, utils_1.resolvedErrorPromise];
                        }
                        else {
                            error_1 = error_1.error; // else we try to get the location from source map
                        }
                    }
                    return [4 /*yield*/, (0, errors_3.toSourceError)(error_1, sourceMapJson)];
                case 7:
                    sourceError = _b.sent();
                    context.errors.push(sourceError);
                    return [2 /*return*/, utils_1.resolvedErrorPromise];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function runCSEMachine(program, context, options) {
    var value = (0, interpreter_1.evaluate)(program, context, options);
    return (0, interpreter_1.CSEResultPromise)(context, value);
}
function sourceRunner(program_1, context_1, isVerboseErrorsEnabled_1) {
    return __awaiter(this, arguments, void 0, function (program, context, isVerboseErrorsEnabled, options) {
        var theOptions, prelude;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    theOptions = _.merge(__assign({}, DEFAULT_SOURCE_OPTIONS), options);
                    context.variant = (0, utils_1.determineVariant)(context, options);
                    (0, validator_1.validateAndAnnotate)(program, context);
                    if (context.errors.length > 0) {
                        return [2 /*return*/, utils_1.resolvedErrorPromise];
                    }
                    if (context.variant === types_1.Variant.CONCURRENT) {
                        return [2 /*return*/, runConcurrent(program, context, theOptions)];
                    }
                    if (theOptions.useSubst) {
                        return [2 /*return*/, runSubstitution(program, context, theOptions)];
                    }
                    (0, _1.determineExecutionMethod)(theOptions, context, program, isVerboseErrorsEnabled);
                    if (!(context.executionMethod === 'native' && context.variant === types_1.Variant.NATIVE)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, fullJSRunner_1.fullJSRunner)(program, context, theOptions.importOptions)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    if (!(context.prelude !== null)) return [3 /*break*/, 4];
                    context.unTypecheckedCode.push(context.prelude);
                    prelude = (0, parser_1.parse)(context.prelude, context);
                    if (prelude === null) {
                        return [2 /*return*/, utils_1.resolvedErrorPromise];
                    }
                    context.prelude = null;
                    return [4 /*yield*/, sourceRunner(prelude, context, isVerboseErrorsEnabled, __assign(__assign({}, options), { isPrelude: true }))];
                case 3:
                    _a.sent();
                    return [2 /*return*/, sourceRunner(program, context, isVerboseErrorsEnabled, options)];
                case 4:
                    if (context.variant === types_1.Variant.EXPLICIT_CONTROL) {
                        return [2 /*return*/, runCSEMachine(program, context, theOptions)];
                    }
                    if (context.executionMethod === 'cse-machine') {
                        if (options.isPrelude) {
                            return [2 /*return*/, runCSEMachine(program, __assign(__assign({}, context), { runtime: __assign(__assign({}, context.runtime), { debuggerOn: false }) }), theOptions)];
                        }
                        return [2 /*return*/, runCSEMachine(program, context, theOptions)];
                    }
                    if (context.executionMethod === 'native') {
                        return [2 /*return*/, runNative(program, context, theOptions)];
                    }
                    return [2 /*return*/, runInterpreter(program, context, theOptions)];
            }
        });
    });
}
exports.sourceRunner = sourceRunner;
function sourceFilesRunner(files_1, entrypointFilePath_1, context_1) {
    return __awaiter(this, arguments, void 0, function (files, entrypointFilePath, context, options) {
        var entrypointCode, isVerboseErrorsEnabled, currentCode, preprocessedProgram;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            entrypointCode = files[entrypointFilePath];
            if (entrypointCode === undefined) {
                context.errors.push(new localImportErrors_1.CannotFindModuleError(entrypointFilePath));
                return [2 /*return*/, utils_1.resolvedErrorPromise];
            }
            isVerboseErrorsEnabled = (0, _1.hasVerboseErrors)(entrypointCode);
            context.variant = (0, utils_1.determineVariant)(context, options);
            // FIXME: The type checker does not support the typing of multiple files, so
            //        we only push the code in the entrypoint file. Ideally, all files
            //        involved in the program evaluation should be type-checked. Either way,
            //        the type checker is currently not used at all so this is not very
            //        urgent.
            context.unTypecheckedCode.push(entrypointCode);
            currentCode = {
                files: files,
                entrypointFilePath: entrypointFilePath
            };
            context.shouldIncreaseEvaluationTimeout = _.isEqual(previousCode, currentCode);
            previousCode = currentCode;
            preprocessedProgram = (0, preprocessor_1.default)(files, entrypointFilePath, context);
            if (!preprocessedProgram) {
                return [2 /*return*/, utils_1.resolvedErrorPromise];
            }
            context.previousPrograms.unshift(preprocessedProgram);
            return [2 /*return*/, sourceRunner(preprocessedProgram, context, isVerboseErrorsEnabled, options)];
        });
    });
}
exports.sourceFilesRunner = sourceFilesRunner;
