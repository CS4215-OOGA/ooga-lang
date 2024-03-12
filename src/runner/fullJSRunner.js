"use strict";
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
exports.fullJSRunner = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
var astring_1 = require("astring");
var constants_1 = require("../constants");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var hoistAndMergeImports_1 = require("../localImports/transformers/hoistAndMergeImports");
var requireProvider_1 = require("../modules/requireProvider");
var parser_1 = require("../parser/parser");
var transpiler_1 = require("../transpiler/transpiler");
var create = require("../utils/astCreator");
var uniqueIds_1 = require("../utils/uniqueIds");
var errors_1 = require("./errors");
var utils_1 = require("./utils");
function fullJSEval(code, requireProvider, nativeStorage) {
    if (nativeStorage.evaller) {
        return nativeStorage.evaller(code);
    }
    else {
        return eval(code);
    }
}
function preparePrelude(context) {
    if (context.prelude === null) {
        return [];
    }
    var prelude = context.prelude;
    context.prelude = null;
    var program = (0, parser_1.parse)(prelude, context);
    if (program === null) {
        return undefined;
    }
    return program.body;
}
function containsPrevEval(context) {
    return context.nativeStorage.evaller != null;
}
function fullJSRunner(program, context, importOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var prelude, preludeAndBuiltins, preEvalProgram, preEvalCode, requireProvider, transpiled, sourceMapJson, error_1, _a, _b, _c;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    prelude = preparePrelude(context);
                    if (prelude === undefined) {
                        return [2 /*return*/, utils_1.resolvedErrorPromise];
                    }
                    preludeAndBuiltins = containsPrevEval(context)
                        ? []
                        : __spreadArray(__spreadArray([], (0, transpiler_1.getBuiltins)(context.nativeStorage), true), prelude, true);
                    // modules
                    (0, hoistAndMergeImports_1.hoistAndMergeImports)(program);
                    preEvalProgram = create.program(__spreadArray(__spreadArray([], preludeAndBuiltins, true), [
                        (0, transpiler_1.evallerReplacer)(create.identifier(constants_1.NATIVE_STORAGE_ID), new Set())
                    ], false));
                    (0, uniqueIds_1.getFunctionDeclarationNamesInProgram)(preEvalProgram).forEach(function (id) {
                        return context.nativeStorage.previousProgramsIdentifiers.add(id);
                    });
                    (0, transpiler_1.getGloballyDeclaredIdentifiers)(preEvalProgram).forEach(function (id) {
                        return context.nativeStorage.previousProgramsIdentifiers.add(id);
                    });
                    preEvalCode = (0, astring_1.generate)(preEvalProgram);
                    requireProvider = (0, requireProvider_1.getRequireProvider)(context);
                    return [4 /*yield*/, fullJSEval(preEvalCode, requireProvider, context.nativeStorage)];
                case 1:
                    _f.sent();
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 5, , 9]);
                    ;
                    return [4 /*yield*/, (0, transpiler_1.transpile)(program, context, importOptions)];
                case 3:
                    (_d = _f.sent(), transpiled = _d.transpiled, sourceMapJson = _d.sourceMapJson);
                    _e = {
                        status: 'finished',
                        context: context
                    };
                    return [4 /*yield*/, fullJSEval(transpiled, requireProvider, context.nativeStorage)];
                case 4: return [2 /*return*/, (_e.value = _f.sent(),
                        _e)];
                case 5:
                    error_1 = _f.sent();
                    _b = (_a = context.errors).push;
                    if (!(error_1 instanceof runtimeSourceError_1.RuntimeSourceError)) return [3 /*break*/, 6];
                    _c = error_1;
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, (0, errors_1.toSourceError)(error_1, sourceMapJson)];
                case 7:
                    _c = _f.sent();
                    _f.label = 8;
                case 8:
                    _b.apply(_a, [_c]);
                    return [2 /*return*/, utils_1.resolvedErrorPromise];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.fullJSRunner = fullJSRunner;
