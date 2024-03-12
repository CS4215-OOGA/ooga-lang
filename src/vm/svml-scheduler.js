"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundRobinScheduler = void 0;
var RoundRobinScheduler = /** @class */ (function () {
    function RoundRobinScheduler() {
        this._currentThreads = new Set();
        this._idleThreads = [];
        this._maxThreadId = -1;
        this._maxTimeQuanta = 15;
    }
    // Get number of currently executing threads
    RoundRobinScheduler.prototype.numCurrent = function () {
        return this._currentThreads.size;
    };
    // Get currently executing threads
    // list might be empty (none executing) or have more than 1 thread (parallelism?)
    RoundRobinScheduler.prototype.currentThreads = function () {
        return this._currentThreads.values();
    };
    // Get number of idle threads
    RoundRobinScheduler.prototype.numIdle = function () {
        return this._idleThreads.length;
    };
    // Get idle thread list
    RoundRobinScheduler.prototype.idleThreads = function () {
        return this._idleThreads.values();
    };
    // Register a new thread into the scheduler (thread has never run before)
    // Returns the thread id this new thread should be associated with
    RoundRobinScheduler.prototype.newThread = function () {
        this._maxThreadId++;
        this._idleThreads.push(this._maxThreadId);
        return this._maxThreadId;
    };
    // Unregister a thread from the scheduler (end of life/killed)
    // Thread should be currently executing
    RoundRobinScheduler.prototype.deleteCurrentThread = function (id) {
        this._currentThreads.delete(id);
    };
    // Get which thread should be executed next, and for how long
    // null means there are no idle threads to run
    RoundRobinScheduler.prototype.runThread = function () {
        if (this._idleThreads.length === 0) {
            return null;
        }
        else {
            var nextThread = this._idleThreads.shift();
            var timeQuanta = Math.ceil((0.5 + Math.random() * 0.5) * this._maxTimeQuanta);
            this._currentThreads.add(nextThread);
            return [nextThread, timeQuanta];
        }
    };
    // Tell scheduler which thread should be paused and placed back into the idle threads.
    RoundRobinScheduler.prototype.pauseThread = function (id) {
        this._currentThreads.delete(id);
        this._idleThreads.push(id);
    };
    return RoundRobinScheduler;
}());
exports.RoundRobinScheduler = RoundRobinScheduler;
