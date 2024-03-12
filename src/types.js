"use strict";
/*
    This file contains definitions of some interfaces and classes that are used in Source (such as
    error-related classes).
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.disallowedTypes = exports.Variant = exports.Chapter = exports.ErrorSeverity = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["SYNTAX"] = "Syntax";
    ErrorType["TYPE"] = "Type";
    ErrorType["RUNTIME"] = "Runtime";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["WARNING"] = "Warning";
    ErrorSeverity["ERROR"] = "Error";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
var Chapter;
(function (Chapter) {
    Chapter[Chapter["SOURCE_1"] = 1] = "SOURCE_1";
    Chapter[Chapter["SOURCE_2"] = 2] = "SOURCE_2";
    Chapter[Chapter["SOURCE_3"] = 3] = "SOURCE_3";
    Chapter[Chapter["SOURCE_4"] = 4] = "SOURCE_4";
    Chapter[Chapter["OOGA"] = 5] = "OOGA";
    Chapter[Chapter["FULL_JS"] = -1] = "FULL_JS";
    Chapter[Chapter["HTML"] = -2] = "HTML";
    Chapter[Chapter["FULL_TS"] = -3] = "FULL_TS";
    Chapter[Chapter["PYTHON_1"] = -4] = "PYTHON_1";
    Chapter[Chapter["PYTHON_2"] = -5] = "PYTHON_2";
    Chapter[Chapter["PYTHON_3"] = -6] = "PYTHON_3";
    Chapter[Chapter["PYTHON_4"] = -7] = "PYTHON_4";
    Chapter[Chapter["FULL_PYTHON"] = -8] = "FULL_PYTHON";
    Chapter[Chapter["SCHEME_1"] = -9] = "SCHEME_1";
    Chapter[Chapter["SCHEME_2"] = -10] = "SCHEME_2";
    Chapter[Chapter["SCHEME_3"] = -11] = "SCHEME_3";
    Chapter[Chapter["SCHEME_4"] = -12] = "SCHEME_4";
    Chapter[Chapter["FULL_SCHEME"] = -13] = "FULL_SCHEME";
    Chapter[Chapter["LIBRARY_PARSER"] = 100] = "LIBRARY_PARSER";
})(Chapter || (exports.Chapter = Chapter = {}));
var Variant;
(function (Variant) {
    Variant["DEFAULT"] = "default";
    Variant["TYPED"] = "typed";
    Variant["NATIVE"] = "native";
    Variant["WASM"] = "wasm";
    Variant["LAZY"] = "lazy";
    Variant["NON_DET"] = "non-det";
    Variant["CONCURRENT"] = "concurrent";
    Variant["GPU"] = "gpu";
    Variant["EXPLICIT_CONTROL"] = "explicit-control";
})(Variant || (exports.Variant = Variant = {}));
exports.disallowedTypes = ['bigint', 'never', 'object', 'symbol', 'unknown'];
