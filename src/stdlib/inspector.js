"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areBreakpointsSet = exports.checkEditorBreakpoints = exports.manualToggleDebugger = exports.setBreakpointAtLine = exports.saveState = void 0;
var saveState = function (context, it, scheduler) {
    context.debugger.state.it = it;
    context.debugger.state.scheduler = scheduler;
};
exports.saveState = saveState;
var setBreakpointAtLine = function (lines) {
    breakpoints = lines;
};
exports.setBreakpointAtLine = setBreakpointAtLine;
var manualToggleDebugger = function (context) {
    context.runtime.break = true;
    return {
        status: 'suspended',
        scheduler: context.debugger.state.scheduler,
        it: context.debugger.state.it,
        context: context
    };
};
exports.manualToggleDebugger = manualToggleDebugger;
var breakpoints = [];
var moved = true;
var prevStoppedLine = -1;
var checkEditorBreakpoints = function (context, node) {
    if (node.loc) {
        var currentLine = node.loc.start.line - 1;
        if (!moved && currentLine !== prevStoppedLine) {
            moved = true;
        }
        if (context.runtime.debuggerOn && breakpoints[currentLine] !== undefined && moved) {
            moved = false;
            prevStoppedLine = currentLine;
            context.runtime.break = true;
        }
    }
};
exports.checkEditorBreakpoints = checkEditorBreakpoints;
var areBreakpointsSet = function () { return breakpoints.length > 0; };
exports.areBreakpointsSet = areBreakpointsSet;
