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
exports.checkForInfiniteLoop = void 0;
var astring_1 = require("astring");
var walkers_1 = require("../utils/walkers");
var errors_1 = require("./errors");
var instrument_1 = require("./instrument");
var st = require("./state");
var symbolic_1 = require("./symbolic");
var runAltErgo = require('@joeychenofficial/alt-ergo-modified');
var options = {
    answers_with_loc: false,
    input_format: 'Native',
    interpretation: 1,
    unsat_core: true,
    verbose: false,
    sat_solver: 'Tableaux',
    file: 'smt-file'
};
/**
 * Checks if the program is stuck in an infinite loop.
 * @throws InfiniteLoopError if so.
 * @returns void otherwise.
 */
function checkForInfiniteLoop(stackPositions, state, functionName) {
    var report = function (message, type) {
        throw new errors_1.InfiniteLoopError(functionName, state.streamMode, message, type);
    };
    if (hasNoBaseCase(stackPositions, state)) {
        report('It has no base case.', errors_1.InfiniteLoopErrorType.NoBaseCase);
    }
    // arbitrarily using same threshold
    var circular;
    try {
        circular = checkForCycle(stackPositions.slice(stackPositions.length - state.threshold), state);
    }
    catch (e) {
        circular = undefined;
    }
    if (circular) {
        var message = void 0;
        if (circular[0] === circular[1] && circular[0] === '') {
            message = 'None of the variables are being updated.';
        }
        else {
            message = 'It has the infinite cycle: ' + circular.join(' -> ') + '.';
        }
        report(message, errors_1.InfiniteLoopErrorType.Cycle);
    }
    else {
        var code = codeToDispatch(stackPositions, state);
        var pass = runUntilValid(code);
        if (pass) {
            var message = 'In particular, ' + pass;
            report(message, errors_1.InfiniteLoopErrorType.FromSmt);
        }
    }
}
exports.checkForInfiniteLoop = checkForInfiniteLoop;
/**
 * If no if statement/conditional was encountered between iterations, there is no base case.
 */
function hasNoBaseCase(stackPositions, state) {
    var thePaths = state.mixedStack.slice(stackPositions[0], stackPositions[1]).map(function (x) { return x.paths; });
    return flatten(thePaths).length === 0;
}
/**
 * @returns if a cycle was detected, string array describing the cycle. Otherwise returns undefined.
 */
function checkForCycle(stackPositions, state) {
    var hasInvalidTransition = stackPositions.some(function (x) {
        return st.State.isNonDetTransition(state.mixedStack[x].transitions);
    });
    if (hasInvalidTransition) {
        return undefined;
    }
    var transitions = stackPositions.map(function (i) { return state.mixedStack[i].transitions; });
    var concStr = [];
    for (var _i = 0, transitions_1 = transitions; _i < transitions_1.length; _i++) {
        var item = transitions_1[_i];
        var innerStr = [];
        for (var _a = 0, item_1 = item; _a < item_1.length; _a++) {
            var transition = item_1[_a];
            if (typeof transition.value === 'function') {
                return;
            }
            innerStr.push("(".concat((0, instrument_1.getOriginalName)(transition.name), ": ").concat(stringifyCircular(transition.value), ")"));
        }
        concStr.push(innerStr.join(', '));
    }
    return getCycle(concStr);
}
function getCycle(temp) {
    var last = temp[temp.length - 1];
    var ix1 = temp.lastIndexOf(last, -2);
    if (ix1 === -1)
        return undefined;
    var period = temp.length - ix1 - 1;
    var s1 = temp.slice(ix1 - period, ix1);
    var s2 = temp.slice(ix1, -1);
    if (s1.length != period)
        return undefined;
    for (var i = 0; i < period; i++) {
        if (s1[i] != s2[i])
            return undefined;
    }
    return s1.concat(s1[0]);
}
function stringifyCircular(x) {
    // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#examples
    var getCircularReplacer = function () {
        var seen = new WeakSet();
        return function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '(CIRCULAR)';
                }
                seen.add(value);
            }
            return (0, symbolic_1.shallowConcretize)(value);
        };
    };
    return JSON.stringify(x, getCircularReplacer());
}
function runUntilValid(items) {
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var _a = items_1[_i], code = _a[0], message = _a[1];
        var out = runSMT(code);
        if (out.includes('Valid'))
            return message();
    }
    return undefined;
}
function runSMT(code) {
    try {
        var input = { content: [code] };
        var out = JSON.parse(runAltErgo(input, options));
        return out.results[0];
    }
    catch (e) {
        return e.toString();
    }
}
function flatten(arr) {
    return [].concat.apply([], arr);
}
function arrEquals(a1, a2, cmp) {
    if (cmp === void 0) { cmp = function (x, y) { return x === y; }; }
    if (a1.length !== a2.length)
        return false;
    for (var i = 0; i < a1.length; i++) {
        if (!cmp(a1[i], a2[i]))
            return false;
    }
    return true;
}
function iterationFrameEquals(t1, t2) {
    return (arrEquals(t1.prevPaths, t2.prevPaths) &&
        arrEquals(t1.nextPaths, t2.nextPaths) &&
        arrEquals(t1.transition, t2.transition, function (x, y) { return x.name === y.name && x.cachedSymbolicValue === y.cachedSymbolicValue; }) &&
        t1.name === t2.name);
}
function codeToDispatch(stackPositions, state) {
    var firstSeen = getFirstSeen(stackPositions, state);
    var closedCycles = getClosed(firstSeen);
    var toCheckNested = closedCycles.map(function (_a) {
        var from = _a[0], to = _a[1];
        return toSmtSyntax(firstSeen.slice(from, to + 1), state);
    });
    return flatten(toCheckNested);
}
/**
 * Get iteration frames from the stackPositions, ignoring duplicates.
 * Preserves order in which the iterations frames are first seen in stackPositions.
 */
function getFirstSeen(stackPositions, state) {
    var firstSeen = [];
    for (var i = 1; i < stackPositions.length - 1; i++) {
        var prev = stackPositions[i - 1];
        var current = stackPositions[i];
        var next = stackPositions[i + 1];
        var prevPaths = state.mixedStack.slice(prev, current).map(function (x) { return x.paths; });
        var nextPaths = state.mixedStack.slice(current, next).map(function (x) { return x.paths; });
        var transitions = state.mixedStack.slice(prev, current).map(function (x) { return x.transitions; });
        var hasInvalidPath = prevPaths.concat(nextPaths).some(st.State.isInvalidPath);
        var hasInvalidTransition = transitions.some(st.State.isInvalidTransition);
        if (hasInvalidPath || hasInvalidTransition) {
            // if any path or transition is invalid
            firstSeen = [];
            continue;
        }
        var frame = {
            name: state.mixedStack[current].loc,
            prevPaths: flatten(prevPaths),
            nextPaths: flatten(nextPaths),
            transition: flatten(transitions)
        };
        var wasSeen = false;
        for (var _i = 0, firstSeen_1 = firstSeen; _i < firstSeen_1.length; _i++) {
            var seen = firstSeen_1[_i];
            if (iterationFrameEquals(frame, seen)) {
                wasSeen = true;
                break;
            }
        }
        if (!wasSeen) {
            firstSeen.push(frame);
        }
    }
    return firstSeen;
}
/**
 * Get closed sets of Iteration Frames where each iteration will
 * transition into another in the set.
 */
function getClosed(firstSeen) {
    var indices = [];
    for (var i = 0; i < firstSeen.length; i++) {
        for (var j = 0; j <= i; j++) {
            if (arrEquals(firstSeen[i].nextPaths, firstSeen[j].prevPaths)) {
                // closed
                indices.push([j, i]);
            }
        }
    }
    return indices;
}
function joiner(content) {
    var inner = function (x) { return "(".concat(x.join(' and '), ")"); };
    return content.map(inner).join(' or ');
}
function getIds(nodes) {
    var result = [];
    for (var _i = 0, _a = flatten(nodes); _i < _a.length; _i++) {
        var node = _a[_i];
        (0, walkers_1.simple)(node, {
            Identifier: function (node) {
                result.push(node);
            }
        });
    }
    return __spreadArray([], new Set(result), true);
}
function formatTransitionForMessage(transition, state) {
    // this will be run after ids are reverted to their original names
    var symbolic = state.idToStringCache[transition.cachedSymbolicValue];
    if (symbolic === 'undefined') {
        // set as a constant
        return "".concat((0, instrument_1.getOriginalName)(transition.name), "' = ").concat(transition.value);
    }
    else {
        var originalExpr = (0, astring_1.generate)(state.idToExprCache[transition.cachedSymbolicValue]);
        return "".concat((0, instrument_1.getOriginalName)(transition.name), "' = ").concat(originalExpr);
    }
}
/**
 * Creates a default error message using the pathExprs and transitions.
 * May destructively modify the transitions.
 */
function errorMessageMaker(ids, pathExprs, transitions, state) {
    return function () {
        var idsOfTransitions = getIds(transitions.map(function (x) { return x.map(function (t) { return state.idToExprCache[t.cachedSymbolicValue]; }); }));
        ids = ids.concat(idsOfTransitions);
        ids.map(function (x) { return (x.name = (0, instrument_1.getOriginalName)(x.name)); });
        var pathPart = pathExprs.map(function (x) { return x.map(astring_1.generate); });
        var transitionPart = transitions.map(function (x) { return x.map(function (t) { return formatTransitionForMessage(t, state); }); });
        var result = '';
        for (var i = 0; i < transitionPart.length; i++) {
            if (i > 0)
                result += ' And in a subsequent iteration, ';
            result += "when (".concat(pathPart[i].join(' and '), "), ");
            result += "the variables are updated (".concat(transitionPart[i].join(', '), ").");
        }
        return result;
    };
}
function smtTemplate(mode, decls, line1, line2, line3) {
    var str = "goal g_1:\n    forall ".concat(decls, ":").concat(mode, ".\n        ").concat(line1, " ->\n        ").concat(line2, " ->\n        ").concat(line3);
    return str.replace(/===/g, '=');
}
function formatTransition(transition, state) {
    var symbolic = state.idToStringCache[transition.cachedSymbolicValue];
    if (symbolic === 'undefined') {
        // set as a constant
        return "".concat(transition.name, "' = ").concat(transition.value);
    }
    else {
        return "".concat(transition.name, "' = ").concat(symbolic);
    }
}
/**
 * Substitutes path and transition expressions into a template to be executed
 * by the SMT solver.
 * @returns list of templated code.
 */
function toSmtSyntax(toInclude, state) {
    var pathStr = toInclude.map(function (x) { return x.prevPaths.map(function (i) { return state.idToStringCache[i]; }); });
    var line1 = joiner(pathStr);
    var pathExprs = toInclude.map(function (x) { return x.prevPaths.map(function (i) { return state.idToExprCache[i]; }); });
    var ids = getIds(pathExprs);
    // primify
    ids.map(function (x) { return (x.name = x.name + "'"); });
    var line3 = joiner(pathExprs.map(function (x) { return x.map(astring_1.generate); }));
    // unprimify
    ids.map(function (x) { return (x.name = x.name.slice(0, -1)); });
    var transitions = toInclude.map(function (x) { return x.transition.filter(function (t) { return typeof t.value === 'number'; }); });
    var line2 = joiner(transitions.map(function (x) { return x.map(function (t) { return formatTransition(t, state); }); }));
    var allNames = flatten(transitions.map(function (x) { return x.map(function (y) { return y.name; }); })).concat(ids.map(function (x) { return x.name; }));
    var decls = __spreadArray([], new Set(allNames), true).map(function (x) { return "".concat(x, ",").concat(x, "'"); }).join(',');
    var _a = addConstantsAndSigns(line1, line3, transitions, state), newLine1 = _a[0], newLine3 = _a[1];
    var message = errorMessageMaker(ids, pathExprs, transitions, state);
    var template1 = [
        smtTemplate('int', decls, line1, line2, line3),
        message
    ];
    var template2 = [
        smtTemplate('int', decls, newLine1, line2, newLine3),
        message
    ];
    return [template1, template2];
}
/**
 * Using information from transitions, add information on constants
 * and signs of variables into a new template for lines 1 and 3.
 * @returns line 1 and line 3
 */
function addConstantsAndSigns(line1, line3, transitions, state) {
    var values = new Map();
    for (var _i = 0, _a = flatten(transitions); _i < _a.length; _i++) {
        var transition = _a[_i];
        var item = values.get(transition.name);
        var symbolicValue = state.idToStringCache[transition.cachedSymbolicValue];
        if (item === undefined) {
            item = [];
            values.set(transition.name, item);
        }
        // if var is constant, then transition will be (name)=(name), e.g. "c=c"
        item.push({ isConstant: transition.name === symbolicValue, value: transition.value });
    }
    var consts = [];
    var signs1 = [];
    var signs3 = [];
    for (var _b = 0, _c = values.entries(); _b < _c.length; _b++) {
        var _d = _c[_b], name_1 = _d[0], item = _d[1];
        if (item.every(function (x) { return x.isConstant; })) {
            consts.push("".concat(name_1, " = ").concat(item[0].value));
        }
        else if (item.every(function (x) { return x.value > 0; })) {
            signs1.push("".concat(name_1, " > 0"));
            signs3.push("".concat(name_1, "' > 0"));
        }
        else if (item.every(function (x) { return x.value < 0; })) {
            signs1.push("".concat(name_1, " < 0"));
            signs3.push("".concat(name_1, "' > 0"));
        }
    }
    var innerJoiner = function (x) { return "(".concat(x.join(' and '), ")"); };
    var newLine1 = line1;
    var newLine3 = line3;
    if (signs1.length > 0) {
        newLine1 = "".concat(line1, " and ").concat(innerJoiner(signs1));
        newLine3 = "".concat(line3, " and ").concat(innerJoiner(signs3));
    }
    if (consts.length > 0)
        newLine1 = "".concat(innerJoiner(consts), " -> ").concat(newLine1);
    return [newLine1, newLine3];
}
