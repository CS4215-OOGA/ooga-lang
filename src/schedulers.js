"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreemptiveScheduler = exports.NonDetScheduler = exports.AsyncScheduler = void 0;
/* tslint:disable:max-classes-per-file */
var errors_1 = require("./errors/errors");
var inspector_1 = require("./stdlib/inspector");
var AsyncScheduler = /** @class */ (function () {
    function AsyncScheduler() {
    }
    AsyncScheduler.prototype.run = function (it, context) {
        var _this = this;
        return new Promise(function (resolve, _reject) {
            context.runtime.isRunning = true;
            var itValue = it.next();
            try {
                while (!itValue.done) {
                    itValue = it.next();
                    if (context.runtime.break) {
                        (0, inspector_1.saveState)(context, it, _this);
                        itValue.done = true;
                    }
                }
            }
            catch (e) {
                resolve({ status: 'error' });
            }
            finally {
                context.runtime.isRunning = false;
            }
            if (context.runtime.break) {
                resolve({
                    status: 'suspended',
                    it: it,
                    scheduler: _this,
                    context: context
                });
            }
            else {
                resolve({ status: 'finished', context: context, value: itValue.value });
            }
        });
    };
    return AsyncScheduler;
}());
exports.AsyncScheduler = AsyncScheduler;
var NonDetScheduler = /** @class */ (function () {
    function NonDetScheduler() {
    }
    NonDetScheduler.prototype.run = function (it, context) {
        var _this = this;
        return new Promise(function (resolve, _reject) {
            try {
                var itValue = it.next();
                if (itValue.done) {
                    resolve({ status: 'finished', context: context, value: itValue.value });
                }
                else {
                    resolve({
                        status: 'suspended-non-det',
                        it: it,
                        scheduler: _this,
                        context: context,
                        value: itValue.value
                    });
                }
            }
            catch (e) {
                checkForStackOverflow(e, context);
                resolve({ status: 'error' });
            }
            finally {
                context.runtime.isRunning = false;
            }
        });
    };
    return NonDetScheduler;
}());
exports.NonDetScheduler = NonDetScheduler;
var PreemptiveScheduler = /** @class */ (function () {
    function PreemptiveScheduler(steps) {
        this.steps = steps;
    }
    PreemptiveScheduler.prototype.run = function (it, context) {
        var _this = this;
        return new Promise(function (resolve, _reject) {
            context.runtime.isRunning = true;
            // This is used in the evaluation of the REPL during a paused state.
            // The debugger is turned off while the code evaluates just above the debugger statement.
            var actuallyBreak = false;
            var itValue = it.next();
            var interval = setInterval(function () {
                var step = 0;
                try {
                    while (!itValue.done && step < _this.steps) {
                        step++;
                        itValue = it.next();
                        actuallyBreak = context.runtime.break && context.runtime.debuggerOn;
                        if (actuallyBreak) {
                            itValue.done = true;
                        }
                    }
                    (0, inspector_1.saveState)(context, it, _this);
                }
                catch (e) {
                    checkForStackOverflow(e, context);
                    context.runtime.isRunning = false;
                    clearInterval(interval);
                    resolve({ status: 'error' });
                }
                if (itValue.done) {
                    context.runtime.isRunning = false;
                    clearInterval(interval);
                    if (actuallyBreak) {
                        resolve({
                            status: 'suspended',
                            it: it,
                            scheduler: _this,
                            context: context
                        });
                    }
                    else {
                        resolve({ status: 'finished', context: context, value: itValue.value });
                    }
                }
            });
        });
    };
    return PreemptiveScheduler;
}());
exports.PreemptiveScheduler = PreemptiveScheduler;
/* Checks if the error is a stackoverflow error, and captures it in the
   context if this is the case */
function checkForStackOverflow(error, context) {
    if (/Maximum call stack/.test(error.toString())) {
        var environments = context.runtime.environments;
        var stacks = [];
        var counter = 0;
        for (var i = 0; counter < errors_1.MaximumStackLimitExceeded.MAX_CALLS_TO_SHOW && i < environments.length; i++) {
            if (environments[i].callExpression) {
                stacks.unshift(environments[i].callExpression);
                counter++;
            }
        }
        context.errors.push(new errors_1.MaximumStackLimitExceeded(context.runtime.nodes[0], stacks));
    }
}
