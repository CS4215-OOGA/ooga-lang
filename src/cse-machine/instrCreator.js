"use strict";
/**
 * Utility functions for creating the various control instructions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeContInstr = exports.genContInstr = exports.breakMarkerInstr = exports.breakInstr = exports.contMarkerInstr = exports.contInstr = exports.markerInstr = exports.arrAssmtInstr = exports.arrAccInstr = exports.arrLitInstr = exports.envInstr = exports.branchInstr = exports.appInstr = exports.popInstr = exports.binOpInstr = exports.unOpInstr = exports.assmtInstr = exports.forInstr = exports.whileInstr = exports.resetInstr = void 0;
var types_1 = require("./types");
var resetInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.RESET,
    srcNode: srcNode
}); };
exports.resetInstr = resetInstr;
var whileInstr = function (test, body, srcNode) { return ({
    instrType: types_1.InstrType.WHILE,
    test: test,
    body: body,
    srcNode: srcNode
}); };
exports.whileInstr = whileInstr;
var forInstr = function (init, test, update, body, srcNode) { return ({
    instrType: types_1.InstrType.FOR,
    init: init,
    test: test,
    update: update,
    body: body,
    srcNode: srcNode
}); };
exports.forInstr = forInstr;
var assmtInstr = function (symbol, constant, declaration, srcNode) { return ({
    instrType: types_1.InstrType.ASSIGNMENT,
    symbol: symbol,
    constant: constant,
    declaration: declaration,
    srcNode: srcNode
}); };
exports.assmtInstr = assmtInstr;
var unOpInstr = function (symbol, srcNode) { return ({
    instrType: types_1.InstrType.UNARY_OP,
    symbol: symbol,
    srcNode: srcNode
}); };
exports.unOpInstr = unOpInstr;
var binOpInstr = function (symbol, srcNode) { return ({
    instrType: types_1.InstrType.BINARY_OP,
    symbol: symbol,
    srcNode: srcNode
}); };
exports.binOpInstr = binOpInstr;
var popInstr = function (srcNode) { return ({ instrType: types_1.InstrType.POP, srcNode: srcNode }); };
exports.popInstr = popInstr;
var appInstr = function (numOfArgs, srcNode) { return ({
    instrType: types_1.InstrType.APPLICATION,
    numOfArgs: numOfArgs,
    srcNode: srcNode
}); };
exports.appInstr = appInstr;
var branchInstr = function (consequent, alternate, srcNode) { return ({
    instrType: types_1.InstrType.BRANCH,
    consequent: consequent,
    alternate: alternate,
    srcNode: srcNode
}); };
exports.branchInstr = branchInstr;
var envInstr = function (env, srcNode) { return ({
    instrType: types_1.InstrType.ENVIRONMENT,
    env: env,
    srcNode: srcNode
}); };
exports.envInstr = envInstr;
var arrLitInstr = function (arity, srcNode) { return ({
    instrType: types_1.InstrType.ARRAY_LITERAL,
    arity: arity,
    srcNode: srcNode
}); };
exports.arrLitInstr = arrLitInstr;
var arrAccInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.ARRAY_ACCESS,
    srcNode: srcNode
}); };
exports.arrAccInstr = arrAccInstr;
var arrAssmtInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.ARRAY_ASSIGNMENT,
    srcNode: srcNode
}); };
exports.arrAssmtInstr = arrAssmtInstr;
var markerInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.MARKER,
    srcNode: srcNode
}); };
exports.markerInstr = markerInstr;
var contInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.CONTINUE,
    srcNode: srcNode
}); };
exports.contInstr = contInstr;
var contMarkerInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.CONTINUE_MARKER,
    srcNode: srcNode
}); };
exports.contMarkerInstr = contMarkerInstr;
var breakInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.BREAK,
    srcNode: srcNode
}); };
exports.breakInstr = breakInstr;
var breakMarkerInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.BREAK_MARKER,
    srcNode: srcNode
}); };
exports.breakMarkerInstr = breakMarkerInstr;
var genContInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.GENERATE_CONT,
    srcNode: srcNode
}); };
exports.genContInstr = genContInstr;
var resumeContInstr = function (srcNode) { return ({
    instrType: types_1.InstrType.RESUME_CONT,
    srcNode: srcNode
}); };
exports.resumeContInstr = resumeContInstr;
