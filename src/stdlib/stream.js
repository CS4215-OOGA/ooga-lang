"use strict";
// stream_tail returns the second component of the given pair
// throws an exception if the argument is not a pair
Object.defineProperty(exports, "__esModule", { value: true });
exports.list_to_stream = exports.stream = exports.stream_tail = void 0;
var list_1 = require("./list");
function stream_tail(xs) {
    var theTail;
    if ((0, list_1.is_pair)(xs)) {
        theTail = xs[1];
    }
    else {
        throw new Error('stream_tail(xs) expects a pair as ' + 'argument xs, but encountered ' + xs);
    }
    if (typeof theTail === 'function') {
        return theTail();
    }
    else {
        throw new Error('stream_tail(xs) expects a function as ' +
            'the tail of the argument pair xs, ' +
            'but encountered ' +
            theTail);
    }
}
exports.stream_tail = stream_tail;
// stream makes a stream out of its arguments
// LOW-LEVEL FUNCTION, NOT SOURCE
// Lazy? No: In this implementation, we generate first a
//           complete list, and then a stream using list_to_stream
function stream() {
    var elements = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        elements[_i] = arguments[_i];
    }
    return list_to_stream(list_1.list.apply(void 0, elements));
}
exports.stream = stream;
function list_to_stream(xs) {
    return (0, list_1.is_null)(xs) ? null : (0, list_1.pair)((0, list_1.head)(xs), function () { return list_to_stream((0, list_1.tail)(xs)); });
}
exports.list_to_stream = list_to_stream;
