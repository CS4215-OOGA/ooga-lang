"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstructionSize = exports.OPCODE_MAX = exports.OpCodes = void 0;
var OpCodes;
(function (OpCodes) {
    OpCodes[OpCodes["NOP"] = 0] = "NOP";
    OpCodes[OpCodes["LDCI"] = 1] = "LDCI";
    OpCodes[OpCodes["LGCI"] = 2] = "LGCI";
    OpCodes[OpCodes["LDCF32"] = 3] = "LDCF32";
    OpCodes[OpCodes["LGCF32"] = 4] = "LGCF32";
    OpCodes[OpCodes["LDCF64"] = 5] = "LDCF64";
    OpCodes[OpCodes["LGCF64"] = 6] = "LGCF64";
    OpCodes[OpCodes["LDCB0"] = 7] = "LDCB0";
    OpCodes[OpCodes["LDCB1"] = 8] = "LDCB1";
    OpCodes[OpCodes["LGCB0"] = 9] = "LGCB0";
    OpCodes[OpCodes["LGCB1"] = 10] = "LGCB1";
    OpCodes[OpCodes["LGCU"] = 11] = "LGCU";
    OpCodes[OpCodes["LGCN"] = 12] = "LGCN";
    OpCodes[OpCodes["LGCS"] = 13] = "LGCS";
    OpCodes[OpCodes["POPG"] = 14] = "POPG";
    OpCodes[OpCodes["POPB"] = 15] = "POPB";
    OpCodes[OpCodes["POPF"] = 16] = "POPF";
    OpCodes[OpCodes["ADDG"] = 17] = "ADDG";
    OpCodes[OpCodes["ADDF"] = 18] = "ADDF";
    OpCodes[OpCodes["SUBG"] = 19] = "SUBG";
    OpCodes[OpCodes["SUBF"] = 20] = "SUBF";
    OpCodes[OpCodes["MULG"] = 21] = "MULG";
    OpCodes[OpCodes["MULF"] = 22] = "MULF";
    OpCodes[OpCodes["DIVG"] = 23] = "DIVG";
    OpCodes[OpCodes["DIVF"] = 24] = "DIVF";
    OpCodes[OpCodes["MODG"] = 25] = "MODG";
    OpCodes[OpCodes["MODF"] = 26] = "MODF";
    OpCodes[OpCodes["NOTG"] = 27] = "NOTG";
    OpCodes[OpCodes["NOTB"] = 28] = "NOTB";
    OpCodes[OpCodes["LTG"] = 29] = "LTG";
    OpCodes[OpCodes["LTF"] = 30] = "LTF";
    OpCodes[OpCodes["GTG"] = 31] = "GTG";
    OpCodes[OpCodes["GTF"] = 32] = "GTF";
    OpCodes[OpCodes["LEG"] = 33] = "LEG";
    OpCodes[OpCodes["LEF"] = 34] = "LEF";
    OpCodes[OpCodes["GEG"] = 35] = "GEG";
    OpCodes[OpCodes["GEF"] = 36] = "GEF";
    OpCodes[OpCodes["EQG"] = 37] = "EQG";
    OpCodes[OpCodes["EQF"] = 38] = "EQF";
    OpCodes[OpCodes["EQB"] = 39] = "EQB";
    OpCodes[OpCodes["NEWC"] = 40] = "NEWC";
    OpCodes[OpCodes["NEWA"] = 41] = "NEWA";
    OpCodes[OpCodes["LDLG"] = 42] = "LDLG";
    OpCodes[OpCodes["LDLF"] = 43] = "LDLF";
    OpCodes[OpCodes["LDLB"] = 44] = "LDLB";
    OpCodes[OpCodes["STLG"] = 45] = "STLG";
    OpCodes[OpCodes["STLB"] = 46] = "STLB";
    OpCodes[OpCodes["STLF"] = 47] = "STLF";
    OpCodes[OpCodes["LDPG"] = 48] = "LDPG";
    OpCodes[OpCodes["LDPF"] = 49] = "LDPF";
    OpCodes[OpCodes["LDPB"] = 50] = "LDPB";
    OpCodes[OpCodes["STPG"] = 51] = "STPG";
    OpCodes[OpCodes["STPB"] = 52] = "STPB";
    OpCodes[OpCodes["STPF"] = 53] = "STPF";
    OpCodes[OpCodes["LDAG"] = 54] = "LDAG";
    OpCodes[OpCodes["LDAB"] = 55] = "LDAB";
    OpCodes[OpCodes["LDAF"] = 56] = "LDAF";
    OpCodes[OpCodes["STAG"] = 57] = "STAG";
    OpCodes[OpCodes["STAB"] = 58] = "STAB";
    OpCodes[OpCodes["STAF"] = 59] = "STAF";
    OpCodes[OpCodes["BRT"] = 60] = "BRT";
    OpCodes[OpCodes["BRF"] = 61] = "BRF";
    OpCodes[OpCodes["BR"] = 62] = "BR";
    OpCodes[OpCodes["JMP"] = 63] = "JMP";
    OpCodes[OpCodes["CALL"] = 64] = "CALL";
    OpCodes[OpCodes["CALLT"] = 65] = "CALLT";
    OpCodes[OpCodes["CALLP"] = 66] = "CALLP";
    OpCodes[OpCodes["CALLTP"] = 67] = "CALLTP";
    OpCodes[OpCodes["CALLV"] = 68] = "CALLV";
    OpCodes[OpCodes["CALLTV"] = 69] = "CALLTV";
    OpCodes[OpCodes["RETG"] = 70] = "RETG";
    OpCodes[OpCodes["RETF"] = 71] = "RETF";
    OpCodes[OpCodes["RETB"] = 72] = "RETB";
    OpCodes[OpCodes["RETU"] = 73] = "RETU";
    OpCodes[OpCodes["RETN"] = 74] = "RETN";
    OpCodes[OpCodes["DUP"] = 75] = "DUP";
    OpCodes[OpCodes["NEWENV"] = 76] = "NEWENV";
    OpCodes[OpCodes["POPENV"] = 77] = "POPENV";
    OpCodes[OpCodes["NEWCP"] = 78] = "NEWCP";
    OpCodes[OpCodes["NEWCV"] = 79] = "NEWCV";
    OpCodes[OpCodes["NEGG"] = 80] = "NEGG";
    OpCodes[OpCodes["NEGF"] = 81] = "NEGF";
    OpCodes[OpCodes["NEQG"] = 82] = "NEQG";
    OpCodes[OpCodes["NEQF"] = 83] = "NEQF";
    OpCodes[OpCodes["NEQB"] = 84] = "NEQB";
    // custom opcodes
    OpCodes[OpCodes["ARRAY_LEN"] = 1000] = "ARRAY_LEN";
    OpCodes[OpCodes["DISPLAY"] = 1001] = "DISPLAY";
    OpCodes[OpCodes["DRAW_DATA"] = 1002] = "DRAW_DATA";
    OpCodes[OpCodes["ERROR"] = 1003] = "ERROR";
    OpCodes[OpCodes["IS_ARRAY"] = 1004] = "IS_ARRAY";
    OpCodes[OpCodes["IS_BOOL"] = 1005] = "IS_BOOL";
    OpCodes[OpCodes["IS_FUNC"] = 1006] = "IS_FUNC";
    OpCodes[OpCodes["IS_NULL"] = 1007] = "IS_NULL";
    OpCodes[OpCodes["IS_NUMBER"] = 1008] = "IS_NUMBER";
    OpCodes[OpCodes["IS_STRING"] = 1009] = "IS_STRING";
    OpCodes[OpCodes["IS_UNDEFINED"] = 1010] = "IS_UNDEFINED";
    OpCodes[OpCodes["MATH_ABS"] = 1011] = "MATH_ABS";
    OpCodes[OpCodes["MATH_ACOS"] = 1012] = "MATH_ACOS";
    OpCodes[OpCodes["MATH_ACOSH"] = 1013] = "MATH_ACOSH";
    OpCodes[OpCodes["MATH_ASIN"] = 1014] = "MATH_ASIN";
    OpCodes[OpCodes["MATH_ASINH"] = 1015] = "MATH_ASINH";
    OpCodes[OpCodes["MATH_ATAN"] = 1016] = "MATH_ATAN";
    OpCodes[OpCodes["MATH_ATAN2"] = 1017] = "MATH_ATAN2";
    OpCodes[OpCodes["MATH_ATANH"] = 1018] = "MATH_ATANH";
    OpCodes[OpCodes["MATH_CBRT"] = 1019] = "MATH_CBRT";
    OpCodes[OpCodes["MATH_CEIL"] = 1020] = "MATH_CEIL";
    OpCodes[OpCodes["MATH_CLZ32"] = 1021] = "MATH_CLZ32";
    OpCodes[OpCodes["MATH_COS"] = 1022] = "MATH_COS";
    OpCodes[OpCodes["MATH_COSH"] = 1023] = "MATH_COSH";
    OpCodes[OpCodes["MATH_EXP"] = 1024] = "MATH_EXP";
    OpCodes[OpCodes["MATH_EXPM1"] = 1025] = "MATH_EXPM1";
    OpCodes[OpCodes["MATH_FLOOR"] = 1026] = "MATH_FLOOR";
    OpCodes[OpCodes["MATH_FROUND"] = 1027] = "MATH_FROUND";
    OpCodes[OpCodes["MATH_HYPOT"] = 1028] = "MATH_HYPOT";
    OpCodes[OpCodes["MATH_IMUL"] = 1029] = "MATH_IMUL";
    OpCodes[OpCodes["MATH_LOG"] = 1030] = "MATH_LOG";
    OpCodes[OpCodes["MATH_LOG1P"] = 1031] = "MATH_LOG1P";
    OpCodes[OpCodes["MATH_LOG2"] = 1032] = "MATH_LOG2";
    OpCodes[OpCodes["MATH_LOG10"] = 1033] = "MATH_LOG10";
    OpCodes[OpCodes["MATH_MAX"] = 1034] = "MATH_MAX";
    OpCodes[OpCodes["MATH_MIN"] = 1035] = "MATH_MIN";
    OpCodes[OpCodes["MATH_POW"] = 1036] = "MATH_POW";
    OpCodes[OpCodes["MATH_RANDOM"] = 1037] = "MATH_RANDOM";
    OpCodes[OpCodes["MATH_ROUND"] = 1038] = "MATH_ROUND";
    OpCodes[OpCodes["MATH_SIGN"] = 1039] = "MATH_SIGN";
    OpCodes[OpCodes["MATH_SIN"] = 1040] = "MATH_SIN";
    OpCodes[OpCodes["MATH_SINH"] = 1041] = "MATH_SINH";
    OpCodes[OpCodes["MATH_SQRT"] = 1042] = "MATH_SQRT";
    OpCodes[OpCodes["MATH_TAN"] = 1043] = "MATH_TAN";
    OpCodes[OpCodes["MATH_TANH"] = 1044] = "MATH_TANH";
    OpCodes[OpCodes["MATH_TRUNC"] = 1045] = "MATH_TRUNC";
    OpCodes[OpCodes["PARSE_INT"] = 1046] = "PARSE_INT";
    OpCodes[OpCodes["RUNTIME"] = 1047] = "RUNTIME";
    OpCodes[OpCodes["STREAM"] = 1048] = "STREAM";
    OpCodes[OpCodes["STRINGIFY"] = 1049] = "STRINGIFY";
    OpCodes[OpCodes["PROMPT"] = 1050] = "PROMPT";
    OpCodes[OpCodes["DISPLAY_LIST"] = 1051] = "DISPLAY_LIST";
    OpCodes[OpCodes["CHAR_AT"] = 1052] = "CHAR_AT";
    OpCodes[OpCodes["ARITY"] = 1053] = "ARITY";
    // Source 3 Concurrenct Opcodes
    OpCodes[OpCodes["EXECUTE"] = 2000] = "EXECUTE";
    OpCodes[OpCodes["TEST_AND_SET"] = 2001] = "TEST_AND_SET";
    OpCodes[OpCodes["CLEAR"] = 2002] = "CLEAR";
})(OpCodes || (exports.OpCodes = OpCodes = {}));
exports.OPCODE_MAX = 84;
function getInstructionSize(opcode) {
    switch (opcode) {
        case OpCodes.LDLG:
        case OpCodes.LDLF:
        case OpCodes.LDLB:
        case OpCodes.STLG:
        case OpCodes.STLF:
        case OpCodes.STLB:
        case OpCodes.CALL:
        case OpCodes.CALLT:
        case OpCodes.NEWENV:
        case OpCodes.NEWCP:
        case OpCodes.NEWCV:
            return 2;
        case OpCodes.LDPG:
        case OpCodes.LDPF:
        case OpCodes.LDPB:
        case OpCodes.STPG:
        case OpCodes.STPF:
        case OpCodes.STPB:
        case OpCodes.CALLP:
        case OpCodes.CALLTP:
        case OpCodes.CALLV:
        case OpCodes.CALLTV:
            return 3;
        case OpCodes.LDCI:
        case OpCodes.LGCI:
        case OpCodes.LDCF32:
        case OpCodes.LGCF32:
        case OpCodes.LGCS:
        case OpCodes.NEWC:
        case OpCodes.BRF:
        case OpCodes.BRT:
        case OpCodes.BR:
        case OpCodes.JMP:
            return 5;
        case OpCodes.LDCF64:
        case OpCodes.LGCF64:
            return 9;
        default:
            return 1;
    }
}
exports.getInstructionSize = getInstructionSize;
exports.default = OpCodes;
