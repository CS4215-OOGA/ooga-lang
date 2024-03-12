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
exports.FullJSParser = void 0;
var acorn_1 = require("acorn");
var errors_1 = require("../errors");
var utils_1 = require("../utils");
var FullJSParser = /** @class */ (function () {
    function FullJSParser() {
    }
    FullJSParser.prototype.parse = function (programStr, context, options, throwOnError) {
        try {
            return (0, acorn_1.parse)(programStr, __assign({ sourceType: 'module', ecmaVersion: 'latest', locations: true }, options));
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                error = new errors_1.FatalSyntaxError((0, utils_1.positionToSourceLocation)(error.loc), error.toString());
            }
            if (throwOnError)
                throw error;
            context.errors.push(error);
        }
        return null;
    };
    FullJSParser.prototype.validate = function (_ast, _context, _throwOnError) {
        return true;
    };
    FullJSParser.prototype.toString = function () {
        return 'FullJSParser';
    };
    return FullJSParser;
}());
exports.FullJSParser = FullJSParser;
