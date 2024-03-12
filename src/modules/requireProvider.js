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
exports.getRequireProvider = void 0;
var jsslang = require("..");
var stdlib = require("../stdlib");
var types = require("../types");
var stringify = require("../utils/stringify");
/**
 * Returns a function that simulates the job of Node's `require`. The require
 * provider is then used by Source modules to access the context and js-slang standard
 * library
 */
var getRequireProvider = function (context) { return function (x) {
    var pathSegments = x.split('/');
    var recurser = function (obj, segments) {
        if (segments.length === 0)
            return obj;
        var currObj = obj[segments[0]];
        if (currObj !== undefined)
            return recurser(currObj, segments.splice(1));
        throw new Error("Dynamic require of ".concat(x, " is not supported"));
    };
    var exports = {
        'js-slang': __assign(__assign({}, jsslang), { dist: {
                stdlib: stdlib,
                types: types,
                utils: {
                    stringify: stringify
                }
            }, context: context })
    };
    return recurser(exports, pathSegments);
}; };
exports.getRequireProvider = getRequireProvider;
