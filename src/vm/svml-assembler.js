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
exports.assemble = void 0;
var buffer_1 = require("../utils/buffer");
var opcodes_1 = require("./opcodes");
var SVM_MAGIC = 0x5005acad;
var MAJOR_VER = 0;
var MINOR_VER = 0;
var UTF8_ENCODER;
function writeHeader(b, entrypoint, constantCount) {
    b.cursor = 0;
    b.putU(32, SVM_MAGIC);
    b.putU(16, MAJOR_VER);
    b.putU(16, MINOR_VER);
    b.putU(32, entrypoint);
    b.putU(32, constantCount);
}
function writeStringConstant(b, s) {
    if (UTF8_ENCODER === undefined) {
        UTF8_ENCODER = new TextEncoder();
    }
    var sBytes = UTF8_ENCODER.encode(s);
    b.align(4);
    b.putU(16, 1);
    b.putU(32, sBytes.byteLength + 1);
    b.putA(sBytes);
    b.putU(8, 0);
}
function serialiseFunction(f) {
    var stackSize = f[0], envSize = f[1], numArgs = f[2], code = f[3];
    var holes = [];
    var b = new buffer_1.default();
    b.putU(8, stackSize);
    b.putU(8, envSize);
    b.putU(8, numArgs);
    b.putU(8, 0); // padding
    var instrOffsets = code
        .map(function (i) { return (0, opcodes_1.getInstructionSize)(i[0]); })
        .reduce(function (ss, s) { return (ss.push(ss[ss.length - 1] + s), ss); }, [0]);
    for (var _i = 0, _a = code.map(function (i1, i2) { return [i1, i2]; }); _i < _a.length; _i++) {
        var _b = _a[_i], instr = _b[0], index = _b[1];
        if (instr[0] < 0 || instr[0] > opcodes_1.OPCODE_MAX) {
            throw new Error("Invalid opcode ".concat(instr[0].toString()));
        }
        var opcode = instr[0];
        b.putU(8, opcode);
        switch (opcode) {
            case opcodes_1.default.LDCI:
            case opcodes_1.default.LGCI:
                if (!Number.isInteger(instr[1])) {
                    throw new Error("Non-integral operand to LDCI/LDGI: ".concat(instr[1], " (this is a compiler bug)"));
                }
                b.putI(32, instr[1]);
                break;
            case opcodes_1.default.LDCF32:
            case opcodes_1.default.LGCF32:
                b.putF(32, instr[1]);
                break;
            case opcodes_1.default.LDCF64:
            case opcodes_1.default.LGCF64:
                b.putF(64, instr[1]);
                break;
            case opcodes_1.default.LGCS:
                holes.push({
                    offset: b.cursor,
                    referent: ['string', instr[1]]
                });
                b.putU(32, 0);
                break;
            case opcodes_1.default.NEWC:
                holes.push({
                    offset: b.cursor,
                    referent: ['function', instr[1][0]]
                });
                b.putU(32, 0);
                break;
            case opcodes_1.default.LDLG:
            case opcodes_1.default.LDLF:
            case opcodes_1.default.LDLB:
            case opcodes_1.default.STLG:
            case opcodes_1.default.STLF:
            case opcodes_1.default.STLB:
            case opcodes_1.default.CALL:
            case opcodes_1.default.CALLT:
            case opcodes_1.default.NEWENV:
            case opcodes_1.default.NEWCP:
            case opcodes_1.default.NEWCV:
                b.putU(8, instr[1]);
                break;
            case opcodes_1.default.LDPG:
            case opcodes_1.default.LDPF:
            case opcodes_1.default.LDPB:
            case opcodes_1.default.STPG:
            case opcodes_1.default.STPF:
            case opcodes_1.default.STPB:
            case opcodes_1.default.CALLP:
            case opcodes_1.default.CALLTP:
            case opcodes_1.default.CALLV:
            case opcodes_1.default.CALLTV:
                b.putU(8, instr[1]);
                b.putU(8, instr[2]);
                break;
            case opcodes_1.default.BRF:
            case opcodes_1.default.BRT:
            case opcodes_1.default.BR:
                var offset = instrOffsets[index + instr[1]] - instrOffsets[index + 1];
                b.putI(32, offset);
                break;
            case opcodes_1.default.JMP:
                throw new Error('JMP assembling not implemented');
        }
    }
    var binary = b.asArray();
    if (binary.byteLength - 4 !== instrOffsets[instrOffsets.length - 1]) {
        throw new Error("Assembler bug: calculated function length ".concat(instrOffsets[instrOffsets.length - 1], " is different from actual length ").concat(binary.byteLength - 4));
    }
    return {
        binary: b.asArray(),
        holes: holes,
        finalOffset: null
    };
}
function assemble(p) {
    var _a;
    var entrypointIndex = p[0], jsonFns = p[1];
    // serialise all the functions
    var imFns = jsonFns.map(function (fn) { return serialiseFunction(fn); });
    // collect all string constants
    var uniqueStrings = __spreadArray([], new Set((_a = []).concat.apply(_a, imFns.map(function (fn) {
        return fn.holes
            .filter(function (hole) { return hole.referent[0] === 'string'; })
            .map(function (hole) { return hole.referent[1]; });
    }))), true);
    var bin = new buffer_1.default();
    // skip header for now
    bin.cursor = 0x10;
    // write all the strings, and store their positions
    var stringMap = new Map();
    for (var _i = 0, uniqueStrings_1 = uniqueStrings; _i < uniqueStrings_1.length; _i++) {
        var str = uniqueStrings_1[_i];
        bin.align(4);
        stringMap.set(str, bin.cursor);
        writeStringConstant(bin, str);
    }
    // layout the functions, but don't actually write them yet
    var fnStartOffset = bin.cursor;
    for (var _b = 0, imFns_1 = imFns; _b < imFns_1.length; _b++) {
        var fn = imFns_1[_b];
        bin.align(4);
        fn.finalOffset = bin.cursor;
        bin.cursor += fn.binary.byteLength;
    }
    // now fill in the holes
    for (var _c = 0, imFns_2 = imFns; _c < imFns_2.length; _c++) {
        var fn = imFns_2[_c];
        var view = new DataView(fn.binary.buffer);
        for (var _d = 0, _e = fn.holes; _d < _e.length; _d++) {
            var hole = _e[_d];
            var offset = void 0;
            if (hole.referent[0] === 'string') {
                offset = stringMap.get(hole.referent[1]);
            }
            else {
                offset = imFns[hole.referent[1]].finalOffset;
            }
            if (!offset) {
                throw new Error("Assembler bug: missing string/function: ".concat(JSON.stringify(hole)));
            }
            view.setUint32(hole.offset, offset, true);
        }
    }
    // now we write the functions
    bin.cursor = fnStartOffset;
    for (var _f = 0, imFns_3 = imFns; _f < imFns_3.length; _f++) {
        var fn = imFns_3[_f];
        bin.align(4);
        if (bin.cursor !== fn.finalOffset) {
            throw new Error('Assembler bug: function offset changed');
        }
        bin.putA(fn.binary);
    }
    bin.cursor = 0;
    writeHeader(bin, imFns[entrypointIndex].finalOffset, uniqueStrings.length);
    return bin.asArray();
}
exports.assemble = assemble;
