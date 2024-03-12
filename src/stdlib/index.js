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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.misc = exports.list = exports.chapter_library_parser = exports.chapter_4 = exports.chapter_3 = exports.chapter_2 = exports.chapter_1 = void 0;
var createContext_1 = require("../createContext");
var types_1 = require("../types");
var list = require("./list");
var misc = require("./misc");
var parser = require("./parser");
var stream = require("./stream");
exports.chapter_1 = {
    get_time: misc.error_message,
    error_message: misc.error_message,
    is_number: misc.is_number,
    is_string: misc.is_string,
    is_function: misc.is_function,
    is_boolean: misc.is_boolean,
    is_undefined: misc.is_undefined,
    parse_int: misc.parse_int,
    char_at: misc.char_at,
    arity: misc.arity,
    undefined: undefined,
    NaN: NaN,
    Infinity: Infinity
};
exports.chapter_2 = __assign(__assign({}, exports.chapter_1), { pair: list.pair, is_pair: list.is_pair, head: list.head, tail: list.tail, is_null: list.is_null, list: list.list, 
    // defineBuiltin(context, 'draw_data(...xs)', visualiseList, 1)
    // defineBuiltin(context, 'display_list(val, prepend = undefined)', displayList, 0)
    is_list: list.is_list });
exports.chapter_3 = __assign(__assign({}, exports.chapter_2), { set_head: list.set_head, set_tail: list.set_tail, array_length: misc.array_length, is_array: misc.is_array, 
    // Stream library
    stream_tail: stream.stream_tail, stream: stream.stream });
exports.chapter_4 = __assign(__assign({}, exports.chapter_3), { parse: function (str, chapter) { return parser.parse(str, (0, createContext_1.default)(chapter)); }, tokenize: function (str, chapter) { return parser.tokenize(str, (0, createContext_1.default)(chapter)); }, 
    // tslint:disable-next-line:ban-types
    apply_in_underlying_javascript: function (fun, args) {
        return fun.apply(fun, list.list_to_vector(args));
    } });
exports.chapter_library_parser = __assign(__assign({}, exports.chapter_4), { is_object: misc.is_object, is_NaN: misc.is_NaN, has_own_property: misc.has_own_property });
exports.default = (_a = {},
    _a[types_1.Chapter.SOURCE_1] = exports.chapter_1,
    _a[types_1.Chapter.SOURCE_2] = exports.chapter_2,
    _a[types_1.Chapter.SOURCE_3] = exports.chapter_3,
    _a[types_1.Chapter.SOURCE_4] = exports.chapter_4,
    _a[types_1.Chapter.LIBRARY_PARSER] = exports.chapter_library_parser,
    _a);
exports.list = require("./list");
exports.misc = require("./misc");
exports.stream = require("./stream");
