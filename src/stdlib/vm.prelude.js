"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrimitiveFunctionCode = exports.CONSTANT_PRIMITIVES = exports.EXTERNAL_PRIMITIVES = exports.BINARY_PRIMITIVES = exports.UNARY_PRIMITIVES = exports.NULLARY_PRIMITIVES = exports.INTERNAL_FUNCTIONS = exports.VARARGS_NUM_ARGS = exports.PRIMITIVE_FUNCTION_NAMES = exports.vmPrelude = void 0;
var opcodes_1 = require("../vm/opcodes");
var misc_1 = require("./misc");
// functions should be sorted in alphabetical order. Refer to SVML spec on wiki
// placeholders should be manually replaced with the correct machine code.
// customs require slight modification to the generated code, which is automated
// in the function calls below.
// added _ in front of every function name so that function calls
// use CALLP instead of CALL when compiled.
exports.vmPrelude = "\n// 0\nfunction _accumulate(f, initial, xs) {\n  return is_null(xs) ? initial : f(head(xs), accumulate(f, initial, tail(xs)));\n}\n\n// 1\nfunction _append(xs, ys) {\n  return is_null(xs) ? ys : pair(head(xs), append(tail(xs), ys));\n}\n\n// 2 placeholder\nfunction _array_length(arr) {}\n\n// 3\nfunction _build_list(fun, n) {\n  function build(i, fun, already_built) {\n    return i < 0 ? already_built : build(i - 1, fun, pair(fun(i), already_built));\n  }\n  return build(n - 1, fun, null);\n}\n\n// 4\nfunction _build_stream(n, fun) {\n  function build(i) {\n    return i >= n\n      ? null\n      : pair(fun(i),\n        () => build(i + 1));\n  }\n  return build(0);\n}\n\n// 5 custom\n// replace MODG opcode (25) with display opcode\n// change number of arguments to varargs (-1)\nfunction _display(args) {\n  // display(args[0], args[1]);\n  // compile this instead for easier replacing\n  if (array_length(args) === 0) {\n    error('Expected 1 or more arguments, but got ' + stringify(array_length(args)) + '.');\n  } else {\n    return args[0] % args[1];\n  }\n}\n\n// 6 custom\n// following math_hypot's implementation style\n// using the ... operator on the machine\n// change number of arguments to varargs (-1)\n// replace NOTG opcode with DRAW_DATA opcode\nfunction _draw_data(args) {\n  if (array_length(args) === 0) {\n    error('Expected 1 or more arguments, but got ' + stringify(array_length(args)) + '.');\n  } else {\n    !args;\n    return args[0];\n  }\n}\n\n// 7\nfunction _enum_list(start, end) {\n  return start > end ? null : pair(start, enum_list(start + 1, end));\n}\n\n// 8\nfunction _enum_stream(start, end) {\n  return start > end\n    ? null\n    : pair(start,\n      () => enum_stream(start + 1, end));\n}\n\n// 9\nfunction _equal(x, y) {\n  return is_pair(x) && is_pair(y) ? equal(head(x), head(y)) && equal(tail(x), tail(y)) : x === y;\n}\n\n// 10 custom\n// replace MODG opcode (25) with error opcode\n// change number of arguments to varargs (-1)\nfunction _error(args) {\n  // error(args[0], args[1]);\n  // compile this instead for easier replacing\n  return args[0] % args[1];\n}\n\n// 11\nfunction _eval_stream(s, n) {\n  return n === 0\n    ? null\n    : pair(head(s),\n      eval_stream(stream_tail(s),\n        n - 1));\n}\n\n// 12\nfunction _filter(pred, xs) {\n  return is_null(xs)\n    ? xs\n    : pred(head(xs))\n    ? pair(head(xs), filter(pred, tail(xs)))\n    : filter(pred, tail(xs));\n}\n\n// 13\nfunction _for_each(fun, xs) {\n  if (is_null(xs)) {\n    return true;\n  } else {\n    fun(head(xs));\n    return for_each(fun, tail(xs));\n  }\n}\n\n// 14\nfunction _head(xs) {\n  if (!is_pair(xs)) {\n    error('head(xs) expects a pair as argument xs, but encountered ' + stringify(xs));\n  } else {\n    return xs[0];\n  }\n}\n\n// 15\nfunction _integers_from(n) {\n  return pair(n,\n    () => integers_from(n + 1));\n}\n\n// 16 placeholder\nfunction _is_array(x) {}\n\n// 17 placeholder\nfunction _is_boolean(x) {}\n\n// 18 placeholder\nfunction _is_function(x) {}\n\n// 19\nfunction _is_list(xs) {\n  return is_null(xs) || (is_pair(xs) && is_list(tail(xs)));\n}\n\n// 20 placeholder\nfunction _is_null(x) {}\n\n// 21 placeholder\nfunction _is_number(x) {}\n\n// 22\nfunction _is_pair(x) {\n  return is_array(x) && array_length(x) === 2;\n}\n\n// 23\nfunction _is_stream(xs) {\n  return is_null(xs) ||\n    (is_pair(xs) &&\n    is_function(tail(xs)) &&\n    arity(tail(xs)) === 0 &&\n    is_stream(stream_tail(xs)));\n}\n\n// 24 placeholder\nfunction _is_string(x) {}\n\n// 25 placeholder\nfunction _is_undefined(x) {}\n\n// 26\nfunction _length(xs) {\n  return is_null(xs) ? 0 : 1 + length(tail(xs));\n}\n\n// 27 custom\n// change number of arguments to varargs (-1)\nfunction _list(args) {\n  let i = array_length(args) - 1;\n  let p = null;\n  while (i >= 0) {\n    p = pair(args[i], p);\n    i = i - 1;\n  }\n  return p;\n}\n\n// 28\nfunction _list_ref(xs, n) {\n  return n === 0 ? head(xs) : list_ref(tail(xs), n - 1);\n}\n\n// 29\nfunction _list_to_stream(xs) {\n  return is_null(xs)\n    ? null\n    : pair(head(xs),\n      () => list_to_stream(tail(xs)));\n}\n\n// 30\nfunction _list_to_string(xs) {\n    return is_null(xs)\n        ? \"null\"\n        : is_pair(xs)\n            ? \"[\" + list_to_string(head(xs)) + \",\" +\n                list_to_string(tail(xs)) + \"]\"\n            : stringify(xs);\n}\n\n// 31\nfunction _map(f, xs) {\n  return is_null(xs) ? null : pair(f(head(xs)), map(f, tail(xs)));\n}\n\n// 32 placeholder\nfunction _math_abs(xs) {}\n\n// 33 placeholder\nfunction _math_acos(xs) {}\n\n// 34 placeholder\nfunction _math_acosh(xs) {}\n\n// 35 placeholder\nfunction _math_asin(xs) {}\n\n// 36 placeholder\nfunction _math_asinh(xs) {}\n\n// 37 placeholder\nfunction _math_atan(xs) {}\n\n// 38 placeholder\nfunction _math_atan2(xs) {}\n\n// 39 placeholder\nfunction _math_atanh(xs) {}\n\n// 40 placeholder\nfunction _math_cbrt(xs) {}\n\n// 41 placeholder\nfunction _math_ceil(xs) {}\n\n// 42 placeholder\nfunction _math_clz32(xs) {}\n\n// 43 placeholder\nfunction _math_cos(xs) {}\n\n// 44 placeholder\nfunction _math_cosh(xs) {}\n\n// 45 placeholder\nfunction _math_exp(xs) {}\n\n// 46 placeholder\nfunction _math_expm1(xs) {}\n\n// 47 placeholder\nfunction _math_floor(xs) {}\n\n// 48 placeholder\nfunction _math_fround(xs) {}\n\n// 49 custom\n// can't think of a way to deal with math_hypot\n// without incurring a lot of redundant function calls\n// so just using the ... operator instead on the machine\n// change number of arguments to varargs (-1)\n// replace NOTG opcode with MATH_HYPOT opcode\nfunction _math_hypot(args) {\n  // compile this instead for easier replacing\n  return !args;\n}\n\n// 50 placeholder\nfunction _math_imul(xs) {}\n\n// 51 placeholder\nfunction _math_log(xs) {}\n\n// 52 placeholder\nfunction _math_log1p(xs) {}\n\n// 53 placeholder\nfunction _math_log2(xs) {}\n\n// 54 placeholder\nfunction _math_log10(xs) {}\n\n// 55 custom\n// replace MODG opcode (25) with math_max opcode\n// change number of arguments to varargs (-1)\nfunction _math_max(args) {\n  let i = array_length(args) - 1;\n  let x = -Infinity;\n  while (i >= 0) {\n    // x = math_max(args[i],x)\n    // compile this instead for easier replacing\n    x = args[i] % x;\n    i = i - 1;\n  }\n  return x;\n}\n\n// 56 custom\n// replace MODG opcode (25) with math_max opcode\n// change number of arguments to varargs (-1)\nfunction _math_min(args) {\n  let i = array_length(args) - 1;\n  let x = Infinity;\n  while (i >= 0) {\n    // x = math_min(args[i],x)\n    // compile this instead for easier replacing\n    x = args[i] % x;\n    i = i - 1;\n  }\n  return x;\n}\n\n// 57 placeholder\nfunction _math_pow(xs) {}\n\n// 58 placeholder\nfunction _math_random(xs) {}\n\n// 59 placeholder\nfunction _math_round(xs) {}\n\n// 60 placeholder\nfunction _math_sign(xs) {}\n\n// 61 placeholder\nfunction _math_sin(xs) {}\n\n// 62 placeholder\nfunction _math_sinh(xs) {}\n\n// 63 placeholder\nfunction _math_sqrt(xs) {}\n\n// 64 placeholder\nfunction _math_tan(xs) {}\n\n// 65 placeholder\nfunction _math_tanh(xs) {}\n\n// 66 placeholder\nfunction _math_trunc(xs) {}\n\n// 67\nfunction _member(v, xs) {\n  return is_null(xs) ? null : v === head(xs) ? xs : member(v, tail(xs));\n}\n\n// 68\nfunction _pair(x, y) {\n  return [x, y];\n}\n\n// 69 placeholder\nfunction _parse_int(x,y) {}\n\n// 70\nfunction _remove(v, xs) {\n  return is_null(xs) ? null : v === head(xs) ? tail(xs) : pair(head(xs), remove(v, tail(xs)));\n}\n\n// 71\nfunction _remove_all(v, xs) {\n  return is_null(xs)\n    ? null\n    : v === head(xs)\n    ? remove_all(v, tail(xs))\n    : pair(head(xs), remove_all(v, tail(xs)));\n}\n\n// 72\nfunction _reverse(xs) {\n  function rev(original, reversed) {\n    return is_null(original) ? reversed : rev(tail(original), pair(head(original), reversed));\n  }\n  return rev(xs, null);\n}\n\n// 73 placeholder\nfunction _get_time(x) {}\n\n// 74\nfunction _set_head(xs,x) {\n  if (!is_pair(xs)) {\n    error('set_head(xs) expects a pair as argument xs, but encountered ' + stringify(xs));\n  } else {\n    xs[0] = x;\n  }\n}\n\n// 75\nfunction _set_tail(xs, x) {\n  if (!is_pair(xs)) {\n    error('set_tail(xs) expects a pair as argument xs, but encountered ' + stringify(xs));\n  } else {\n    xs[1] = x;\n  }\n}\n\n// 76 custom\n// change number of arguments to varargs (-1)\nfunction _stream(args) {\n  let i = array_length(args) - 1;\n  let p = null;\n  while (i >= 0) {\n    p = pair(args[i], p);\n    i = i - 1;\n  }\n  return list_to_stream(p);\n}\n\n// 77\nfunction _stream_append(xs, ys) {\n  return is_null(xs)\n    ? ys\n    : pair(head(xs),\n      () => stream_append(stream_tail(xs), ys));\n}\n\n// 78\nfunction _stream_filter(p, s) {\n  return is_null(s)\n    ? null\n    : p(head(s))\n      ? pair(head(s),\n        () => stream_filter(p, stream_tail(s)))\n      : stream_filter(p, stream_tail(s));\n}\n\n// 79\nfunction _stream_for_each(fun, xs) {\n    if (is_null(xs)) {\n      return true;\n    } else {\n      fun(head(xs));\n      return stream_for_each(fun, stream_tail(xs));\n    }\n}\n\n// 80\nfunction _stream_length(xs) {\n  return is_null(xs)\n    ? 0\n    : 1 + stream_length(stream_tail(xs));\n}\n\n// 81\nfunction _stream_map(f, s) {\n  return is_null(s)\n    ? null\n    : pair(f(head(s)),\n      () => stream_map(f, stream_tail(s)));\n}\n\n// 82\nfunction _stream_member(x, s) {\n  return is_null(s)\n    ? null\n    : head(s) === x\n      ? s\n      : stream_member(x, stream_tail(s));\n}\n\n// 83\nfunction _stream_ref(s, n) {\n  return n === 0\n    ? head(s)\n    : stream_ref(stream_tail(s), n - 1);\n}\n\n// 84\nfunction _stream_remove(v, xs) {\n  return is_null(xs)\n    ? null\n    : v === head(xs)\n      ? stream_tail(xs)\n      : pair(head(xs),\n        () => stream_remove(v, stream_tail(xs)));\n}\n\n// 85\nfunction _stream_remove_all(v, xs) {\n  return is_null(xs)\n    ? null\n    : v === head(xs)\n      ? stream_remove_all(v, stream_tail(xs))\n      : pair(head(xs), () => stream_remove_all(v, stream_tail(xs)));\n}\n\n// 86\nfunction _stream_reverse(xs) {\n  function rev(original, reversed) {\n    return is_null(original)\n      ? reversed\n      : rev(stream_tail(original),\n        pair(head(original), () => reversed));\n  }\n  return rev(xs, null);\n}\n\n// 87\nfunction _stream_tail(xs) {\n  if (!is_pair(xs)) {\n    error('stream_tail(xs) expects a pair as argument xs, but encountered ' + stringify(xs));\n  } else if (!is_function(xs[1])) {\n    error('stream_tail(xs) expects a function as the tail of the argument pair xs, ' +\n      'but encountered ' + stringify(xs[1]));\n  } else {\n    return xs[1]();\n  }\n}\n\n// 88\nfunction _stream_to_list(xs) {\n  return is_null(xs)\n    ? null\n    : pair(head(xs), stream_to_list(stream_tail(xs)));\n}\n\n// 89\nfunction _tail(xs) {\n  if (!is_pair(xs)) {\n    error('tail(xs) expects a pair as argument xs, but encountered ' + stringify(xs));\n  } else {\n    return xs[1];\n  }\n}\n\n// 90 placeholder\nfunction _stringify(x) {}\n\n// 91 custom\n// change number of args to varargs\n// replace NOTG opcode with PROMPT opcode\nfunction _prompt(args) {\n  if (array_length(args) === 0) {\n    const p = '';\n    return !p;\n  } else {\n    return !args[0];\n  }\n}\n\n// 92 custom\n// replace MODG opcode (25) with display_list opcode\n// change number of arguments to varargs (-1)\nfunction _display_list(args) {\n  // display_list(args[0], args[1]);\n  // compile this instead for easier replacing\n  return args[0] % args[1];\n}\n\n// 93 placeholder\nfunction _char_at(str,index) {}\n\n// 94 placeholder\nfunction _arity(f) {}\n\n// hack to make the call to Program easier, just replace the index 95 (number of primitive functions + 2)\n(() => 0)();\n";
// list of all primitive functions in alphabetical order. This determines the index
// of the function in the program array.
// If adding support for primitive functions, need to modify this array and the prelude
// above.
exports.PRIMITIVE_FUNCTION_NAMES = [
    'accumulate',
    'append',
    'array_length',
    'build_list',
    'build_stream',
    'display',
    'draw_data',
    'enum_list',
    'enum_stream',
    'equal',
    'error',
    'eval_stream',
    'filter',
    'for_each',
    'head',
    'integers_from',
    'is_array',
    'is_boolean',
    'is_function',
    'is_list',
    'is_null',
    'is_number',
    'is_pair',
    'is_stream',
    'is_string',
    'is_undefined',
    'length',
    'list',
    'list_ref',
    'list_to_stream',
    'list_to_string',
    'map',
    'math_abs',
    'math_acos',
    'math_acosh',
    'math_asin',
    'math_asinh',
    'math_atan',
    'math_atan2',
    'math_atanh',
    'math_cbrt',
    'math_ceil',
    'math_clz32',
    'math_cos',
    'math_cosh',
    'math_exp',
    'math_expm1',
    'math_floor',
    'math_fround',
    'math_hypot',
    'math_imul',
    'math_log',
    'math_log1p',
    'math_log2',
    'math_log10',
    'math_max',
    'math_min',
    'math_pow',
    'math_random',
    'math_round',
    'math_sign',
    'math_sin',
    'math_sinh',
    'math_sqrt',
    'math_tan',
    'math_tanh',
    'math_trunc',
    'member',
    'pair',
    'parse_int',
    'remove',
    'remove_all',
    'reverse',
    'get_time',
    'set_head',
    'set_tail',
    'stream',
    'stream_append',
    'stream_filter',
    'stream_for_each',
    'stream_length',
    'stream_map',
    'stream_member',
    'stream_ref',
    'stream_remove',
    'stream_remove_all',
    'stream_reverse',
    'stream_tail',
    'stream_to_list',
    'tail',
    'stringify',
    'prompt',
    'display_list',
    'char_at',
    'arity'
];
exports.VARARGS_NUM_ARGS = -1;
// name, opcode, number of arguments, has return value
exports.INTERNAL_FUNCTIONS = [
    ['test_and_set', opcodes_1.default.TEST_AND_SET, 1, true],
    ['clear', opcodes_1.default.CLEAR, 1, false],
    ['concurrent_execute', opcodes_1.default.EXECUTE, exports.VARARGS_NUM_ARGS, false]
];
// for each function, replace a specified opcode with another opcode
var VARARG_PRIMITIVES = [
    ['display', opcodes_1.default.MODG, opcodes_1.default.DISPLAY],
    ['error', opcodes_1.default.MODG, opcodes_1.default.ERROR],
    ['math_max', opcodes_1.default.MODG, opcodes_1.default.MATH_MAX],
    ['math_min', opcodes_1.default.MODG, opcodes_1.default.MATH_MIN],
    ['math_hypot', opcodes_1.default.NOTG, opcodes_1.default.MATH_HYPOT],
    ['list'],
    ['draw_data', opcodes_1.default.NOTG, opcodes_1.default.DRAW_DATA],
    ['stream'],
    ['prompt', opcodes_1.default.NOTG, opcodes_1.default.PROMPT],
    ['display_list', opcodes_1.default.MODG, opcodes_1.default.DISPLAY_LIST]
];
// primitives without a function should be manually implemented
exports.NULLARY_PRIMITIVES = [
    ['math_random', opcodes_1.default.MATH_RANDOM, Math.random],
    ['get_time', opcodes_1.default.RUNTIME, misc_1.get_time]
];
exports.UNARY_PRIMITIVES = [
    ['array_length', opcodes_1.default.ARRAY_LEN],
    ['is_array', opcodes_1.default.IS_ARRAY],
    ['is_boolean', opcodes_1.default.IS_BOOL],
    ['is_function', opcodes_1.default.IS_FUNC],
    ['is_null', opcodes_1.default.IS_NULL],
    ['is_number', opcodes_1.default.IS_NUMBER],
    ['is_string', opcodes_1.default.IS_STRING],
    ['is_undefined', opcodes_1.default.IS_UNDEFINED],
    ['math_abs', opcodes_1.default.MATH_ABS, Math.abs],
    ['math_acos', opcodes_1.default.MATH_ACOS, Math.acos],
    ['math_acosh', opcodes_1.default.MATH_ACOSH, Math.acosh],
    ['math_asin', opcodes_1.default.MATH_ASIN, Math.asin],
    ['math_asinh', opcodes_1.default.MATH_ASINH, Math.asinh],
    ['math_atan', opcodes_1.default.MATH_ATAN, Math.atan],
    ['math_atanh', opcodes_1.default.MATH_ATANH, Math.atanh],
    ['math_cbrt', opcodes_1.default.MATH_CBRT, Math.cbrt],
    ['math_ceil', opcodes_1.default.MATH_CEIL, Math.ceil],
    ['math_clz32', opcodes_1.default.MATH_CLZ32, Math.clz32],
    ['math_cos', opcodes_1.default.MATH_COS, Math.cos],
    ['math_cosh', opcodes_1.default.MATH_COSH, Math.cosh],
    ['math_exp', opcodes_1.default.MATH_EXP, Math.exp],
    ['math_expm1', opcodes_1.default.MATH_EXPM1, Math.expm1],
    ['math_floor', opcodes_1.default.MATH_FLOOR, Math.floor],
    ['math_fround', opcodes_1.default.MATH_FROUND, Math.fround],
    ['math_log', opcodes_1.default.MATH_LOG, Math.log],
    ['math_log1p', opcodes_1.default.MATH_LOG1P, Math.log1p],
    ['math_log2', opcodes_1.default.MATH_LOG2, Math.log2],
    ['math_log10', opcodes_1.default.MATH_LOG10, Math.log10],
    ['math_round', opcodes_1.default.MATH_ROUND, Math.round],
    ['math_sign', opcodes_1.default.MATH_SIGN, Math.sign],
    ['math_sin', opcodes_1.default.MATH_SIN, Math.sin],
    ['math_sinh', opcodes_1.default.MATH_SINH, Math.sinh],
    ['math_sqrt', opcodes_1.default.MATH_SQRT, Math.sqrt],
    ['math_tan', opcodes_1.default.MATH_TAN, Math.tan],
    ['math_tanh', opcodes_1.default.MATH_TANH, Math.tanh],
    ['math_trunc', opcodes_1.default.MATH_TRUNC, Math.trunc],
    ['stringify', opcodes_1.default.STRINGIFY],
    ['arity', opcodes_1.default.ARITY]
];
exports.BINARY_PRIMITIVES = [
    ['math_atan2', opcodes_1.default.MATH_ATAN2, Math.atan2],
    ['math_imul', opcodes_1.default.MATH_IMUL, Math.imul],
    ['math_pow', opcodes_1.default.MATH_POW, Math.pow],
    ['parse_int', opcodes_1.default.PARSE_INT, misc_1.parse_int],
    ['char_at', opcodes_1.default.CHAR_AT, misc_1.char_at]
];
exports.EXTERNAL_PRIMITIVES = [
    ['display', opcodes_1.default.DISPLAY],
    ['draw_data', opcodes_1.default.DRAW_DATA],
    ['error', opcodes_1.default.ERROR],
    ['prompt', opcodes_1.default.PROMPT],
    ['display_list', opcodes_1.default.DISPLAY_LIST]
];
exports.CONSTANT_PRIMITIVES = [
    ['undefined', undefined],
    ['Infinity', Infinity],
    ['NaN', NaN],
    ['math_E', Math.E],
    ['math_LN2', Math.LN2],
    ['math_LN10', Math.LN10],
    ['math_LOG2E', Math.LOG2E],
    ['math_LOG10E', Math.LOG10E],
    ['math_PI', Math.PI],
    ['math_SQRT1_2', Math.SQRT1_2],
    ['math_SQRT2', Math.SQRT2]
];
// helper functions to generate machine code
function generateNullaryPrimitive(index, opcode) {
    return [index, [1, 0, 0, [[opcode], [opcodes_1.default.RETG]]]];
}
function generateUnaryPrimitive(index, opcode) {
    return [index, [1, 1, 1, [[opcodes_1.default.LDLG, 0], [opcode], [opcodes_1.default.RETG]]]];
}
function generateBinaryPrimitive(index, opcode) {
    return [index, [2, 2, 2, [[opcodes_1.default.LDLG, 0], [opcodes_1.default.LDLG, 1], [opcode], [opcodes_1.default.RETG]]]];
}
// replaces prelude SVMFunction array with generated instructions
function generatePrimitiveFunctionCode(prelude) {
    var preludeFunctions = prelude[1];
    var functions = [];
    var nameToIndexMap = new Map();
    function convertPrimitiveVarArgs() {
        VARARG_PRIMITIVES.forEach(function (f) {
            var index = nameToIndexMap.get(f[0]);
            var opcodeToReplace = f[1];
            var opcodeToUse = f[2];
            // replace function's numargs to VARARGS_NUM_ARGS as indicator
            preludeFunctions[index + 1][2] = exports.VARARGS_NUM_ARGS;
            // replace opcode with corresponding opcode
            if (opcodeToReplace !== undefined && opcodeToUse !== undefined) {
                var instructions = preludeFunctions[index + 1][3];
                instructions.forEach(function (ins) {
                    if (ins[0] === opcodeToReplace)
                        ins[0] = opcodeToUse;
                });
            }
        });
    }
    exports.PRIMITIVE_FUNCTION_NAMES.forEach(function (name, index) {
        nameToIndexMap.set(name, index);
    });
    exports.NULLARY_PRIMITIVES.forEach(function (f) {
        return functions.push(generateNullaryPrimitive(nameToIndexMap.get(f[0]), f[1]));
    });
    exports.UNARY_PRIMITIVES.forEach(function (f) {
        return functions.push(generateUnaryPrimitive(nameToIndexMap.get(f[0]), f[1]));
    });
    exports.BINARY_PRIMITIVES.forEach(function (f) {
        return functions.push(generateBinaryPrimitive(nameToIndexMap.get(f[0]), f[1]));
    });
    functions.forEach(function (func) {
        var newFunc = func[1];
        var indexToReplace = func[0] + 1; // + 1 due to global env
        preludeFunctions[indexToReplace] = newFunc;
    });
    convertPrimitiveVarArgs();
}
exports.generatePrimitiveFunctionCode = generatePrimitiveFunctionCode;
