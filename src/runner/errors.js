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
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSourceError = void 0;
var source_map_1 = require("source-map");
var constants_1 = require("../constants");
var errors_1 = require("../errors/errors");
var astCreator_1 = require("../utils/astCreator");
var BrowserType;
(function (BrowserType) {
    BrowserType["Chrome"] = "Chrome";
    BrowserType["FireFox"] = "FireFox";
    BrowserType["Unsupported"] = "Unsupported";
})(BrowserType || (BrowserType = {}));
var ChromeEvalErrorLocator = {
    regex: /eval at.+<anonymous>:(\d+):(\d+)/gm,
    browser: BrowserType.Chrome
};
var FireFoxEvalErrorLocator = {
    regex: /eval:(\d+):(\d+)/gm,
    browser: BrowserType.FireFox
};
var EVAL_LOCATORS = [ChromeEvalErrorLocator, FireFoxEvalErrorLocator];
var UNDEFINED_VARIABLE_MESSAGES = ['is not defined'];
// brute-forced from MDN website for phrasing of errors from different browsers
// FWIW node and chrome uses V8 so they'll have the same error messages
// unable to test on other engines
var ASSIGNMENT_TO_CONST_ERROR_MESSAGES = [
    'invalid assignment to const',
    'Assignment to constant variable',
    'Assignment to const',
    'Redeclaration of const'
];
function getBrowserType() {
    var userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf('chrome') > -1
        ? BrowserType.Chrome
        : userAgent.indexOf('firefox') > -1
            ? BrowserType.FireFox
            : BrowserType.Unsupported;
}
function extractErrorLocation(errorStack, lineOffset, errorLocator) {
    var evalErrors = Array.from(errorStack.matchAll(errorLocator.regex));
    if (evalErrors.length) {
        var baseEvalError = evalErrors[0];
        var _a = baseEvalError.slice(1, 3), lineNumStr = _a[0], colNumStr = _a[1];
        return { line: parseInt(lineNumStr) - lineOffset, column: parseInt(colNumStr) };
    }
    return undefined;
}
function getErrorLocation(error, lineOffset) {
    if (lineOffset === void 0) { lineOffset = 0; }
    var browser = getBrowserType();
    var errorLocator = EVAL_LOCATORS.find(function (locator) { return locator.browser === browser; });
    var errorStack = error.stack;
    if (errorStack && errorLocator) {
        return extractErrorLocation(errorStack, lineOffset, errorLocator);
    }
    else if (errorStack) {
        // if browser is unsupported try all supported locators until the first success
        return EVAL_LOCATORS.map(function (locator) { return extractErrorLocation(errorStack, lineOffset, locator); }).find(function (x) { return x !== undefined; });
    }
    return undefined;
}
/**
 * Converts native errors to SourceError
 *
 * @param error
 * @param sourceMap
 * @returns
 */
function toSourceError(error, sourceMap) {
    return __awaiter(this, void 0, void 0, function () {
        var errorLocation, line, column, identifier, source, originalPosition, errorMessage, errorMessageContains, location_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    errorLocation = getErrorLocation(error);
                    if (!errorLocation) {
                        return [2 /*return*/, new errors_1.ExceptionError(error, constants_1.UNKNOWN_LOCATION)];
                    }
                    line = errorLocation.line, column = errorLocation.column;
                    identifier = 'UNKNOWN';
                    source = null;
                    if (!(sourceMap && !(line === -1 || column === -1))) return [3 /*break*/, 2];
                    return [4 /*yield*/, source_map_1.SourceMapConsumer.with(sourceMap, null, function (consumer) { return consumer.originalPositionFor({ line: line, column: column }); })];
                case 1:
                    originalPosition = _e.sent();
                    line = (_a = originalPosition.line) !== null && _a !== void 0 ? _a : -1; // use -1 in place of null
                    column = (_b = originalPosition.column) !== null && _b !== void 0 ? _b : -1;
                    identifier = (_c = originalPosition.name) !== null && _c !== void 0 ? _c : identifier;
                    source = (_d = originalPosition.source) !== null && _d !== void 0 ? _d : null;
                    _e.label = 2;
                case 2:
                    errorMessage = error.message;
                    errorMessageContains = function (possibleMessages) {
                        return possibleMessages.some(function (possibleMessage) { return errorMessage.includes(possibleMessage); });
                    };
                    if (errorMessageContains(ASSIGNMENT_TO_CONST_ERROR_MESSAGES)) {
                        return [2 /*return*/, new errors_1.ConstAssignment((0, astCreator_1.locationDummyNode)(line, column, source), identifier)];
                    }
                    else if (errorMessageContains(UNDEFINED_VARIABLE_MESSAGES)) {
                        return [2 /*return*/, new errors_1.UndefinedVariable(identifier, (0, astCreator_1.locationDummyNode)(line, column, source))];
                    }
                    else {
                        location_1 = line === -1 || column === -1
                            ? constants_1.UNKNOWN_LOCATION
                            : {
                                start: { line: line, column: column },
                                end: { line: -1, column: -1 }
                            };
                        return [2 /*return*/, new errors_1.ExceptionError(error, location_1)];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.toSourceError = toSourceError;
