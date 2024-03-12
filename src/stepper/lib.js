"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draw_data = exports.list = exports.is_null = exports.tail = exports.head = exports.is_pair = exports.pair = exports.evaluateModuleFunction = exports.evaluateMath = exports.parse_int = exports.is_undefined = exports.is_boolean = exports.is_function = exports.is_string = exports.is_number = exports.prompt = exports.error = exports.stringify = exports.display = exports.get_time = void 0;
var misc = require("../stdlib/misc");
var ast = require("../utils/astCreator");
var converter_1 = require("./converter");
var stepper_1 = require("./stepper");
var util_1 = require("./util");
// define builtins that takes in AST, and return AST
//
// if (context.chapter >= 1) {
//   defineBuiltin(context, 'get_time()', misc.get_time)
function get_time() {
    return ast.literal(misc.get_time());
}
exports.get_time = get_time;
//   defineBuiltin(context, 'display(val)', display)
//   ignore the "display" capability
function display(val) {
    return val;
}
exports.display = display;
//   defineBuiltin(context, 'raw_display(str)', rawDisplay)
//   defineBuiltin(context, 'stringify(val)', stringify)
function stringify(val) {
    return ast.literal((0, stepper_1.codify)(val));
}
exports.stringify = stringify;
//   defineBuiltin(context, 'error(str)', misc.error_message)
function error(val, str) {
    var output = (str === undefined ? '' : str + ' ') + stringify(val);
    throw new Error(output);
}
exports.error = error;
//   defineBuiltin(context, 'prompt(str)', prompt)
function prompt(str) {
    if (str.type !== 'Literal' || typeof str.value !== 'string') {
        throw new Error('Argument to error must be a string.');
    }
    var result = window.prompt(str.value);
    return ast.literal((result ? result : null));
}
exports.prompt = prompt;
//   defineBuiltin(context, 'is_number(val)', misc.is_number)
function is_number(val) {
    return ast.literal((0, util_1.isNumber)(val));
}
exports.is_number = is_number;
//   defineBuiltin(context, 'is_string(val)', misc.is_string)
function is_string(val) {
    return ast.literal(val.type === 'Literal' && misc.is_string(val.value));
}
exports.is_string = is_string;
//   defineBuiltin(context, 'is_function(val)', misc.is_function)
function is_function(val) {
    return ast.literal(val.type.includes('Function') || (0, util_1.isBuiltinFunction)(val));
}
exports.is_function = is_function;
//   defineBuiltin(context, 'is_boolean(val)', misc.is_boolean)
function is_boolean(val) {
    return ast.literal(val.type === 'Literal' && misc.is_boolean(val.value));
}
exports.is_boolean = is_boolean;
//   defineBuiltin(context, 'is_undefined(val)', misc.is_undefined)
function is_undefined(val) {
    return ast.literal(val.type === 'Identifier' && val.name === 'undefined');
}
exports.is_undefined = is_undefined;
//   defineBuiltin(context, 'parse_int(str, radix)', misc.parse_int)
function parse_int(str, radix) {
    if (str.type === 'Literal' &&
        typeof str.value === 'string' &&
        radix.type === 'Literal' &&
        typeof radix.value === 'number' &&
        Number.isInteger(radix.value) &&
        2 <= radix.value &&
        radix.value <= 36) {
        return (0, converter_1.valueToExpression)(parseInt(str.value, radix.value));
    }
    else {
        throw new Error('parse_int expects two arguments a string s, and a positive integer i between 2 and 36, inclusive.');
    }
}
exports.parse_int = parse_int;
//   defineBuiltin(context, 'undefined', undefined)
//   defineBuiltin(context, 'NaN', NaN)
//   defineBuiltin(context, 'Infinity', Infinity)
//   // Define all Math libraries
//   const props = Object.getOwnPropertyNames(Math)
//   for (const prop of props) {
//     defineBuiltin(context, 'math_' + prop, Math[prop])
//   }
// }
// evaluateMath(mathFn: string, ...args: substituterNodes): substituterNodes
function evaluateMath(mathFn) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var fn = Math[mathFn.split('_')[1]];
    if (!fn) {
        throw new Error("Math function ".concat(mathFn, " not found."));
    }
    else if (args.some(function (arg) { return !(0, util_1.isNumber)(arg); })) {
        throw new Error("Math functions must be called with number arguments");
    }
    var jsArgs = args.map(converter_1.nodeToValue);
    return (0, converter_1.valueToExpression)(fn.apply(void 0, jsArgs));
}
exports.evaluateMath = evaluateMath;
// evaluateModuleFunction(mathFn: string, context: Context, ...args: substituterNodes): substituterNodes
function evaluateModuleFunction(moduleFn, context) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var fn = context.runtime.environments[0].head[moduleFn];
    if (!fn) {
        throw new Error("Module function ".concat(moduleFn, " not found."));
    }
    var jsArgs = args.map(function (arg) { return (0, converter_1.nodeToValueWithContext)(arg, context); });
    return (0, converter_1.valueToExpression)(fn.apply(void 0, jsArgs), context);
}
exports.evaluateModuleFunction = evaluateModuleFunction;
// if (context.chapter >= 2) {
//   // List library
//   defineBuiltin(context, 'pair(left, right)', list.pair)
function pair(left, right) {
    return ast.arrayExpression([left, right]);
}
exports.pair = pair;
//   defineBuiltin(context, 'is_pair(val)', list.is_pair)
function is_pair(val) {
    return ast.literal(val.type === 'ArrayExpression' && val.elements.length === 2);
}
exports.is_pair = is_pair;
//   defineBuiltin(context, 'head(xs)', list.head)
function head(xs) {
    if (is_pair(xs).value === false) {
        throw new Error("".concat((0, stepper_1.codify)(xs), " is not a pair"));
    }
    return xs.elements[0];
}
exports.head = head;
//   defineBuiltin(context, 'tail(xs)', list.tail)
function tail(xs) {
    if (is_pair(xs).value === false) {
        throw new Error("".concat((0, stepper_1.codify)(xs), " is not a pair"));
    }
    return xs.elements[1];
}
exports.tail = tail;
//   defineBuiltin(context, 'is_null(val)', list.is_null)
function is_null(val) {
    return ast.literal(val.type === 'Literal' && val.value === null);
}
exports.is_null = is_null;
//   defineBuiltin(context, 'list(...values)', list.list)
function list() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    var ret = ast.primitive(null);
    for (var _a = 0, _b = values.reverse(); _a < _b.length; _a++) {
        var v = _b[_a];
        ret = pair(v, ret);
    }
    return ret;
}
exports.list = list;
//   defineBuiltin(context, 'draw_data(xs)', visualiseList)
function draw_data() {
    var xs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        xs[_i] = arguments[_i];
    }
    if (xs.length === 0) {
        return ast.primitive(undefined);
    }
    else {
        return xs[0];
    }
}
exports.draw_data = draw_data;
