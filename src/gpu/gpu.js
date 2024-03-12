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
exports.transpileToGPU = void 0;
var create = require("../utils/astCreator");
var uniqueIds_1 = require("../utils/uniqueIds");
var transfomer_1 = require("./transfomer");
// top-level gpu functions that call our code
// transpiles if possible and modifies program to a Source program that makes use of the GPU primitives
function transpileToGPU(program) {
    var identifiers = (0, uniqueIds_1.getIdentifiersInProgram)(program);
    if (identifiers.has('__createKernelSource') || identifiers.has('__clearKernelCache')) {
        program.body.unshift(create.expressionStatement(create.callExpression(create.identifier('display'), [
            create.literal('Manual use of GPU library symbols detected, turning off automatic GPU optimizations.')
        ], {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 }
        })));
        return;
    }
    var transformer = new transfomer_1.default(program, create.identifier('__createKernelSource'));
    var res = transformer.transform();
    var gpuDisplayStatements = [];
    // add some display statements to program
    if (res.length > 0) {
        for (var _i = 0, res_1 = res; _i < res_1.length; _i++) {
            var arr = res_1[_i];
            var debug = "Attempting to optimize ".concat(arr[1], " levels of nested loops starting on line ").concat(arr[0]);
            if (arr[1] === 1) {
                debug = "Attempting to optimize the loop on line ".concat(arr[0]);
            }
            gpuDisplayStatements.push(create.expressionStatement(create.callExpression(create.identifier('display'), [create.literal(debug)], {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 }
            })));
        }
    }
    var clearKernelCacheStatement = create.expressionStatement(create.callExpression(create.identifier('__clearKernelCache'), [], {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 }
    }));
    program.body = __spreadArray(__spreadArray(__spreadArray([], gpuDisplayStatements, true), [clearKernelCacheStatement], false), program.body, true);
}
exports.transpileToGPU = transpileToGPU;
