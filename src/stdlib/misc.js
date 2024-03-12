"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_time = exports.arity = exports.char_at = exports.parse_int = exports.array_length = exports.is_array = exports.has_own_property = exports.is_NaN = exports.is_function = exports.is_object = exports.is_boolean = exports.is_string = exports.is_undefined = exports.is_number = exports.timed = exports.error_message = exports.rawDisplay = void 0;
var closure_1 = require("../interpreter/closure");
var stringify_1 = require("../utils/stringify");
/**
 * A function that displays to console.log by default (for a REPL).
 *
 * @param value the value to be represented and displayed.
 * @param externalContext a property of Context that can hold
 *   any information required for external use (optional).
 */
function rawDisplay(value, str, _externalContext) {
    // tslint:disable-next-line:no-console
    console.log((str === undefined ? '' : str + ' ') + value.toString());
    return value;
}
exports.rawDisplay = rawDisplay;
function error_message(value) {
    var strs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        strs[_i - 1] = arguments[_i];
    }
    var output = (strs[0] === undefined ? '' : strs[0] + ' ') + (0, stringify_1.stringify)(value);
    throw new Error(output);
}
exports.error_message = error_message;
function timed(context, 
// tslint:disable-next-line:ban-types
f, externalContext, displayBuiltin) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var start = get_time();
        var result = f.apply(void 0, args);
        var diff = get_time() - start;
        displayBuiltin('Duration: ' + Math.round(diff) + 'ms', '', externalContext);
        return result;
    };
}
exports.timed = timed;
function is_number(v) {
    return typeof v === 'number';
}
exports.is_number = is_number;
function is_undefined(xs) {
    return typeof xs === 'undefined';
}
exports.is_undefined = is_undefined;
function is_string(xs) {
    return typeof xs === 'string';
}
exports.is_string = is_string;
function is_boolean(xs) {
    return typeof xs === 'boolean';
}
exports.is_boolean = is_boolean;
function is_object(xs) {
    return typeof xs === 'object' || is_function(xs);
}
exports.is_object = is_object;
function is_function(xs) {
    return typeof xs === 'function';
}
exports.is_function = is_function;
function is_NaN(x) {
    return is_number(x) && isNaN(x);
}
exports.is_NaN = is_NaN;
function has_own_property(obj, p) {
    return obj.hasOwnProperty(p);
}
exports.has_own_property = has_own_property;
function is_array(a) {
    return a instanceof Array;
}
exports.is_array = is_array;
function array_length(xs) {
    return xs.length;
}
exports.array_length = array_length;
/**
 * Source version of parseInt. Both arguments are required.
 *
 * @param str String representation of the integer to be parsed. Required.
 * @param radix Base to parse the given `str`. Required.
 *
 * An error is thrown if `str` is not of type string, or `radix` is not an
 * integer within the range 2, 36 inclusive.
 */
function parse_int(str, radix) {
    if (typeof str === 'string' &&
        typeof radix === 'number' &&
        Number.isInteger(radix) &&
        2 <= radix &&
        radix <= 36) {
        return parseInt(str, radix);
    }
    else {
        throw new Error('parse_int expects two arguments a string s, and a positive integer i between 2 and 36, inclusive.');
    }
}
exports.parse_int = parse_int;
function char_at(str, index) {
    if (typeof str !== 'string') {
        throw new Error('char_at expects the first argument to be a string.');
    }
    else if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        throw new Error('char_at expects the second argument to be a nonnegative integer.');
    }
    return str[index];
}
exports.char_at = char_at;
/**
 * arity returns the number of parameters a given function `f` expects.
 *
 * @param f Function whose arity is to be found. Required.
 *
 * An error is thrown if `f` is not a function.
 */
function arity(f) {
    var _a;
    if (f instanceof closure_1.default) {
        var params = f.node.params;
        var hasVarArgs = ((_a = params[params.length - 1]) === null || _a === void 0 ? void 0 : _a.type) === 'RestElement';
        return hasVarArgs ? params.length - 1 : params.length;
    }
    else if (typeof f === 'function') {
        return f.length;
    }
    else {
        throw new Error('arity expects a function as argument');
    }
}
exports.arity = arity;
function get_time() {
    return new Date().getTime();
}
exports.get_time = get_time;
