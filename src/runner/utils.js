"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvedErrorPromise = exports.hasVerboseErrors = exports.determineExecutionMethod = exports.determineVariant = void 0;
var utils_1 = require("../parser/utils");
var inspector_1 = require("../stdlib/inspector");
var walkers_1 = require("../utils/walkers");
// Context Utils
/**
 * Small function to determine the variant to be used
 * by a program, as both context and options can have
 * a variant. The variant provided in options will
 * have precedence over the variant provided in context.
 *
 * @param context The context of the program.
 * @param options Options to be used when
 *                running the program.
 *
 * @returns The variant that the program is to be run in
 */
function determineVariant(context, options) {
    if (options.variant) {
        return options.variant;
    }
    else {
        return context.variant;
    }
}
exports.determineVariant = determineVariant;
function determineExecutionMethod(theOptions, context, program, verboseErrors) {
    if (theOptions.executionMethod !== 'auto') {
        context.executionMethod = theOptions.executionMethod;
        return;
    }
    if (context.executionMethod !== 'auto') {
        return;
    }
    var isNativeRunnable;
    if (verboseErrors) {
        isNativeRunnable = false;
    }
    else if ((0, inspector_1.areBreakpointsSet)()) {
        isNativeRunnable = false;
    }
    else if (theOptions.executionMethod === 'auto') {
        if (context.executionMethod === 'auto') {
            if (verboseErrors) {
                isNativeRunnable = false;
            }
            else if ((0, inspector_1.areBreakpointsSet)()) {
                isNativeRunnable = false;
            }
            else {
                var hasDebuggerStatement_1 = false;
                (0, walkers_1.simple)(program, {
                    DebuggerStatement: function (node) {
                        hasDebuggerStatement_1 = true;
                    }
                });
                isNativeRunnable = !hasDebuggerStatement_1;
            }
            context.executionMethod = isNativeRunnable ? 'native' : 'cse-machine';
        }
        else {
            isNativeRunnable = context.executionMethod === 'native';
        }
    }
    else {
        var hasDebuggerStatement_2 = false;
        (0, walkers_1.simple)(program, {
            DebuggerStatement: function (_node) {
                hasDebuggerStatement_2 = true;
            }
        });
        isNativeRunnable = !hasDebuggerStatement_2;
    }
    context.executionMethod = isNativeRunnable ? 'native' : 'cse-machine';
}
exports.determineExecutionMethod = determineExecutionMethod;
// AST Utils
function hasVerboseErrors(theCode) {
    var theProgramFirstExpression = (0, utils_1.parseAt)(theCode, 0);
    if (theProgramFirstExpression && theProgramFirstExpression.type === 'Literal') {
        return theProgramFirstExpression.value === 'enable verbose';
    }
    return false;
}
exports.hasVerboseErrors = hasVerboseErrors;
exports.resolvedErrorPromise = Promise.resolve({ status: 'error' });
