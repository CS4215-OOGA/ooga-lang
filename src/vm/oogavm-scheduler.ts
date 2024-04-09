import { RuntimeError } from './oogavm-errors.js';

export type ThreadId = number;

export interface Scheduler {
    // ******* Supporting multiple executing threads

    // Get number of currently executing threads
    numCurrent(): number;
    // Get currently executing threads
    // list might be empty (none executing) or have more than 1 thread (parallelism?)
    currentThreads(): Iterator<ThreadId>;
    // Get number of idle threads
    numIdle(): number;
    // Get idle thread list
    idleThreads(): Iterator<ThreadId>;
    // Register a new thread into the scheduler (thread has never run before)
    // Returns the thread id this new thread should be associated with
    newThread(): ThreadId;
    // Unregister a thread from the scheduler (end of life/killed)
    // Thread should be currently executing
    deleteCurrentThread(id: ThreadId): void;
    // Get which thread should be executed next, and for how long
    // null means there are no idle threads to run
    runThread(): [ThreadId, number] | null;
    // Tell scheduler which thread should be paused and placed back into the idle threads.
    pauseThread(id: ThreadId): void;
    // get the max time quanta, useful when a single thread only
    getMaxTimeQuanta(): number;
}

export class RoundRobinScheduler implements Scheduler {
    private _currentThreads: Set<ThreadId> = new Set();
    private _idleThreads: ThreadId[] = [];
    private _maxThreadId = -1;
    private _maxTimeQuanta: number = 15;

    currentThreads(): Iterator<ThreadId> {
        return this._currentThreads.values();
    }

    deleteCurrentThread(id: ThreadId): void {
        this._currentThreads.delete(id);
    }

    idleThreads(): Iterator<ThreadId> {
        return this._idleThreads.values();
    }

    newThread(): ThreadId {
        this._maxThreadId++;
        this._idleThreads.push(this._maxThreadId);
        return this._maxThreadId;
    }

    numCurrent(): number {
        return this._currentThreads.size;
    }

    numIdle(): number {
        return this._idleThreads.length;
    }

    pauseThread(id: ThreadId): void {
        this._currentThreads.delete(id);
        this._idleThreads.push(id);
    }

    runThread(): [ThreadId, number] | null {
        if (this._idleThreads.length === 0) {
            throw new RuntimeError("Expected a thread but nothing.");
        } else {
            // The ! is a non-null assertion operator
            const nextThread = this._idleThreads.shift()!;
            // const timeQuanta = Math.ceil(0.5 + Math.random() * 0.5) * this._maxTimeQuanta;
            const timeQuanta = this._maxTimeQuanta + 5;
            this._currentThreads.add(nextThread);
            return [nextThread, timeQuanta];
        }
    }

    getMaxTimeQuanta(): number {
        return this._maxTimeQuanta;
    }
}
