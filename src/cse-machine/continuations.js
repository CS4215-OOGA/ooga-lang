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
exports.makeDummyContCallExpression = exports.isContinuation = exports.makeContinuation = exports.getContinuationEnv = exports.getContinuationStash = exports.getContinuationControl = exports.isCallWithCurrentContinuation = exports.call_with_current_continuation = void 0;
/**
 * A dummy function used to detect for the call/cc function object.
 * If the interpreter sees this specific function, a continuation at the current
 * point of evaluation is executed instead of a regular function call.
 */
function call_with_current_continuation(f) {
    return f();
}
exports.call_with_current_continuation = call_with_current_continuation;
/**
 * Checks if the function refers to the designated function object call/cc.
 */
function isCallWithCurrentContinuation(f) {
    return f === call_with_current_continuation;
}
exports.isCallWithCurrentContinuation = isCallWithCurrentContinuation;
// As the continuation needs to be immutable (we can call it several times)
// we need to copy its elements whenever we access them
function getContinuationControl(cn) {
    return cn.control.copy();
}
exports.getContinuationControl = getContinuationControl;
function getContinuationStash(cn) {
    return cn.stash.copy();
}
exports.getContinuationStash = getContinuationStash;
function getContinuationEnv(cn) {
    return __spreadArray([], cn.env, true);
}
exports.getContinuationEnv = getContinuationEnv;
function makeContinuation(control, stash, env) {
    // Cast a function into a continuation
    var fn = function (x) { return x; };
    var cn = fn;
    // Set the control, stash and environment
    // as shallow copies of the given program equivalents
    cn.control = control.copy();
    cn.stash = stash.copy();
    cn.env = __spreadArray([], env, true);
    // Return the continuation as a function so that
    // the type checker allows it to be called
    return cn;
}
exports.makeContinuation = makeContinuation;
/**
 * Checks whether a given function is actually a continuation.
 */
function isContinuation(f) {
    return 'control' in f && 'stash' in f && 'env' in f;
}
exports.isContinuation = isContinuation;
/**
 * Provides an adequate representation of what calling
 * call/cc or continuations looks like, to give to the
 * GENERATE_CONT and RESUME_CONT instructions.
 */
function makeDummyContCallExpression(callee, argument) {
    return {
        type: 'CallExpression',
        optional: false,
        callee: {
            type: 'Identifier',
            name: callee
        },
        arguments: [
            {
                type: 'Identifier',
                name: argument
            }
        ]
    };
}
exports.makeDummyContCallExpression = makeDummyContCallExpression;
