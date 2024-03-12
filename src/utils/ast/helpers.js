"use strict";
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
exports.filterImportDeclarations = void 0;
var assert_1 = require("../assert");
var typeGuards_1 = require("./typeGuards");
/**
 * Filters out all import declarations from a program, and sorts them by
 * the module they import from
 */
function filterImportDeclarations(_a) {
    var body = _a.body;
    return body.reduce(function (_a, node) {
        var importNodes = _a[0], otherNodes = _a[1];
        if (!(0, typeGuards_1.isImportDeclaration)(node))
            return [importNodes, __spreadArray(__spreadArray([], otherNodes, true), [node], false)];
        var moduleName = node.source.value;
        (0, assert_1.default)(typeof moduleName === 'string', "Expected import declaration to have source of type string, got ".concat(moduleName));
        if (!(moduleName in importNodes)) {
            importNodes[moduleName] = [];
        }
        importNodes[moduleName].push(node);
        return [importNodes, otherNodes];
    }, [{}, []]);
}
exports.filterImportDeclarations = filterImportDeclarations;
