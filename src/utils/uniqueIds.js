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
exports.getFunctionDeclarationNamesInProgram = exports.getIdentifiersInProgram = exports.getIdentifiersInNativeStorage = exports.getUniqueId = void 0;
var walkers_1 = require("../utils/walkers");
function getUniqueId(usedIdentifiers, uniqueId) {
    if (uniqueId === void 0) { uniqueId = 'unique'; }
    while (usedIdentifiers.has(uniqueId)) {
        var start = uniqueId.slice(0, -1);
        var end = uniqueId[uniqueId.length - 1];
        var endToDigit = Number(end);
        if (Number.isNaN(endToDigit) || endToDigit === 9) {
            uniqueId += '0';
        }
        else {
            uniqueId = start + String(endToDigit + 1);
        }
    }
    usedIdentifiers.add(uniqueId);
    return uniqueId;
}
exports.getUniqueId = getUniqueId;
function getIdentifiersInNativeStorage(nativeStorage) {
    var used = new (Set.bind.apply(Set, __spreadArray([void 0], nativeStorage.builtins.keys(), false)))();
    nativeStorage.previousProgramsIdentifiers.forEach(function (id) { return used.add(id); });
    return used;
}
exports.getIdentifiersInNativeStorage = getIdentifiersInNativeStorage;
function getIdentifiersInProgram(program) {
    var identifiers = new Set();
    (0, walkers_1.simple)(program, {
        Identifier: function (node) {
            identifiers.add(node.name);
        },
        Pattern: function (node) {
            if (node.type === 'Identifier') {
                identifiers.add(node.name);
            }
            else if (node.type === 'MemberExpression') {
                if (node.object.type === 'Identifier') {
                    identifiers.add(node.object.name);
                }
            }
        }
    });
    return identifiers;
}
exports.getIdentifiersInProgram = getIdentifiersInProgram;
function getFunctionDeclarationNamesInProgram(program) {
    var functionNames = new Set();
    (0, walkers_1.simple)(program, {
        FunctionDeclaration: function (node) {
            if (node.id && node.id.type === 'Identifier') {
                functionNames.add(node.id.name);
            }
        }
    });
    return functionNames;
}
exports.getFunctionDeclarationNamesInProgram = getFunctionDeclarationNamesInProgram;
