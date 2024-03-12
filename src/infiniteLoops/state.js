"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = void 0;
var astring_1 = require("astring");
var astCreator_1 = require("../utils/astCreator");
var sym = require("./symbolic");
var makeTransition = function (name, value, id) {
    return ({ name: name, value: value, cachedSymbolicValue: id });
};
var makeFunctionStackFrame = function (name, transitions) {
    return ({ name: name, transitions: transitions });
};
var noSmtTransitionId = -1;
var nonDetTransitionId = -2;
var State = /** @class */ (function () {
    function State(timeout, threshold, streamThreshold) {
        if (timeout === void 0) { timeout = 4000; }
        if (threshold === void 0) { threshold = 20; }
        if (streamThreshold === void 0) { streamThreshold = threshold * 2; }
        // arbitrary defaults
        this.variablesModified = new Map();
        this.variablesToReset = new Set();
        this.stringToIdCache = new Map();
        this.idToStringCache = [];
        this.idToExprCache = [];
        this.mixedStack = [{ loc: '(ROOT)', paths: [], transitions: [] }];
        this.stackPointer = 0;
        this.loopStack = [];
        this.functionTrackers = new Map();
        this.functionStack = [];
        this.threshold = threshold;
        this.streamThreshold = streamThreshold;
        this.startTime = Date.now();
        this.timeout = timeout;
        this.streamMode = false;
        this.streamLastFunction = undefined;
        this.streamCounts = new Map();
        this.functionWasPassedAsArgument = false;
    }
    State.isInvalidPath = function (path) {
        return path.length === 1 && path[0] === -1;
    };
    State.isNonDetTransition = function (transition) {
        return transition.some(function (x) { return x.cachedSymbolicValue === nonDetTransitionId; });
    };
    State.isInvalidTransition = function (transition) {
        return (State.isNonDetTransition(transition) ||
            transition.some(function (x) { return x.cachedSymbolicValue === noSmtTransitionId; }));
    };
    /**
     * Takes in an expression and returns its cached representation.
     */
    State.prototype.toCached = function (expr) {
        var asString = (0, astring_1.generate)(expr);
        var item = this.stringToIdCache.get(asString);
        if (item === undefined) {
            var id = this.stringToIdCache.size;
            this.stringToIdCache.set(asString, id);
            this.idToExprCache[id] = expr;
            this.idToStringCache[id] = asString;
            return id;
        }
        else {
            return item;
        }
    };
    State.prototype.popStackToStackPointer = function () {
        if (this.mixedStack.length !== this.stackPointer) {
            this.mixedStack = this.mixedStack.slice(0, this.stackPointer + 1);
        }
    };
    State.prototype.exitLoop = function () {
        var tracker = this.loopStack[0];
        var lastPosn = tracker.pop();
        if (lastPosn !== undefined) {
            this.stackPointer = lastPosn - 1;
        }
        this.loopStack.shift();
        this.popStackToStackPointer();
    };
    State.prototype.savePath = function (expr) {
        var currentPath = this.mixedStack[this.stackPointer].paths;
        if (!State.isInvalidPath(currentPath)) {
            var id = this.toCached(expr);
            currentPath.push(id);
        }
    };
    /**
     * Sets the current path as invalid.
     */
    State.prototype.setInvalidPath = function () {
        this.mixedStack[this.stackPointer].paths = [-1];
    };
    State.prototype.saveTransition = function (name, value) {
        var concrete = value.concrete;
        var id;
        if (value.validity === sym.Validity.Valid) {
            id = this.toCached(value.symbolic);
        }
        else if (value.validity === sym.Validity.NoSmt) {
            id = noSmtTransitionId;
        }
        else {
            id = nonDetTransitionId;
        }
        var transitions = this.mixedStack[this.stackPointer].transitions;
        for (var i = 0; i < transitions.length; i++) {
            var transition = transitions[i];
            if (transition[0] === name) {
                transition[1] = concrete;
                transition[2] = id;
                return;
            }
        }
        // no entry with the same name
        transitions.push(makeTransition(name, concrete, id));
    };
    /**
     * Creates a new stack frame.
     * @returns pointer to the new stack frame.
     */
    State.prototype.newStackFrame = function (loc) {
        this.stackPointer++;
        this.mixedStack.push({ loc: loc, paths: [], transitions: [] });
        return this.stackPointer;
    };
    /**
     * Saves variables that were modified to the current transition.
     * Also adds the variable to this.variablesToReset. These variables
     * will be lazily reset (concretized and re-hybridized) in runtime.hybridize.
     */
    State.prototype.cleanUpVariables = function () {
        for (var _i = 0, _a = this.variablesModified; _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], value = _b[1];
            this.saveTransition(name_1, value);
            this.variablesToReset.add(name_1);
        }
    };
    /**
     * Records entering a function in the state.
     * @param name name of the function.
     * @returns [tracker, firstIteration] where firstIteration is true if this is the functions first iteration.
     */
    State.prototype.enterFunction = function (name) {
        var transitions = this.mixedStack[this.stackPointer].transitions;
        this.functionStack.push(makeFunctionStackFrame(name, transitions));
        var tracker = this.functionTrackers.get(name);
        var firstIteration = false;
        if (tracker === undefined) {
            tracker = [];
            this.functionTrackers.set(name, tracker);
            firstIteration = true;
        }
        firstIteration = tracker.length === 0;
        return [tracker, firstIteration];
    };
    /**
     * Saves args into the last iteration's transition in the tracker.
     */
    State.prototype.saveArgsInTransition = function (args, tracker) {
        var _a;
        var transitions = [];
        for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
            var _b = args_1[_i], name_2 = _b[0], val = _b[1];
            if (sym.isHybrid(val)) {
                if (val.validity === sym.Validity.Valid) {
                    transitions.push(makeTransition(name_2, val.concrete, this.toCached(val.symbolic)));
                }
                else if (val.validity === sym.Validity.NoSmt) {
                    transitions.push(makeTransition(name_2, val.concrete, noSmtTransitionId));
                }
                else {
                    transitions.push(makeTransition(name_2, val.concrete, nonDetTransitionId));
                }
            }
            else {
                transitions.push(makeTransition(name_2, val, this.toCached((0, astCreator_1.identifier)('undefined'))));
            }
            this.variablesToReset.add(name_2);
        }
        var prevPointer = tracker[tracker.length - 1];
        if (prevPointer > -1) {
            (_a = this.mixedStack[prevPointer].transitions).push.apply(_a, transitions);
        }
    };
    /**
     * Records in the state that the last function has returned.
     */
    State.prototype.returnLastFunction = function () {
        var lastFunctionFrame = this.functionStack.pop();
        var tracker = this.functionTrackers.get(lastFunctionFrame.name);
        var lastPosn = tracker.pop();
        if (lastPosn !== undefined) {
            this.stackPointer = lastPosn - 1;
        }
        this.popStackToStackPointer();
        this.mixedStack[this.stackPointer].transitions = lastFunctionFrame.transitions;
        this.setInvalidPath();
    };
    State.prototype.hasTimedOut = function () {
        return Date.now() - this.startTime > this.timeout;
    };
    /**
     * @returns the name of the last function in the stack.
     */
    State.prototype.getLastFunctionName = function () {
        return this.functionStack[this.functionStack.length - 1][0];
    };
    return State;
}());
exports.State = State;
