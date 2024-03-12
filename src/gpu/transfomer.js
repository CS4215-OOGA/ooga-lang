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
exports.gpuRuntimeTranspile = void 0;
var create = require("../utils/astCreator");
var walkers_1 = require("../utils/walkers");
var bodyVerifier_1 = require("./verification/bodyVerifier");
var loopVerifier_1 = require("./verification/loopVerifier");
var currentKernelId = 0;
/*
 * GPU Transformer runs through the program and transpiles for loops to GPU code
 * Upon termination, the AST would be mutated accordingly
 * e.g.
 * let res = [];
 * for (let i = 0; i < 5; i = i + 1) {
 *    res[i] = 5;
 * }
 * would become:
 * let res = 0;
 * __createKernelSource(....)
 */
var GPUTransformer = /** @class */ (function () {
    function GPUTransformer(program, createKernelSource) {
        var _this = this;
        // transforms away top-level for loops if possible
        this.transform = function () {
            var gpuTranspile = _this.gpuTranspile;
            var res = [];
            // tslint:disable
            (0, walkers_1.simple)(_this.program, {
                ForStatement: function (node) {
                    var state = gpuTranspile(node);
                    if (state > 0 && node.loc) {
                        res.push([node.loc.start.line, state]);
                    }
                }
            }, (0, walkers_1.make)({ ForStatement: function () { } }));
            // tslint:enable
            return res;
        };
        /*
         * Here we transpile away a for loop:
         * 1. Check if it meets our specifications
         * 2. Get external variables + target body (body to be run across gpu threads)
         * 3. Build a AST Node for (2) - this will be given to (8)
         * 4. Change assignment in body to a return statement
         * 5. Call __createKernelSource and assign it to our external variable
         */
        this.gpuTranspile = function (node) {
            // initialize our class variables
            _this.state = 0;
            _this.counters = [];
            _this.end = [];
            // 1. verification of outer loops + body
            _this.checkOuterLoops(node);
            // no gpu loops found
            if (_this.counters.length === 0 || new Set(_this.counters).size !== _this.counters.length) {
                return 0;
            }
            var verifier = new bodyVerifier_1.default(_this.program, _this.innerBody, _this.counters);
            if (verifier.state === 0) {
                return 0;
            }
            _this.state = verifier.state;
            _this.outputArray = verifier.outputArray;
            _this.localVar = verifier.localVar;
            // 2. get external variables + the main body
            _this.getOuterVariables();
            _this.getTargetBody(node);
            // 3. Build a AST Node of all outer variables
            var externEntries = [];
            for (var key in _this.outerVariables) {
                if (_this.outerVariables.hasOwnProperty(key)) {
                    var val = _this.outerVariables[key];
                    // push in a deep copy of the identifier
                    // this is needed cos we modify it later
                    externEntries.push([create.literal(key), JSON.parse(JSON.stringify(val))]);
                }
            }
            // 4. Change assignment in body to a return statement
            var checker = verifier.getArrayName;
            var locals = _this.localVar;
            (0, walkers_1.ancestor)(_this.targetBody, {
                AssignmentExpression: function (nx, ancstor) {
                    // assigning to local val, it's okay
                    if (nx.left.type === 'Identifier') {
                        return;
                    }
                    if (nx.left.type !== 'MemberExpression') {
                        return;
                    }
                    var id = checker(nx.left);
                    if (locals.has(id.name)) {
                        return;
                    }
                    var sz = ancstor.length;
                    create.mutateToReturnStatement(ancstor[sz - 2], nx.right);
                }
            });
            // deep copy here (for runtime checks)
            var params = [];
            for (var i = 0; i < _this.state; i++) {
                params.push(create.identifier(_this.counters[i]));
            }
            // 5. we transpile the loop to a function call, __createKernelSource
            var kernelFunction = create.blockArrowFunction(_this.counters.map(function (name) { return create.identifier(name); }), _this.targetBody);
            var createKernelSourceCall = create.callExpression(_this.globalIds.__createKernelSource, [
                create.arrayExpression(_this.end),
                create.arrayExpression(externEntries.map(create.arrayExpression)),
                create.arrayExpression(Array.from(locals.values()).map(function (v) { return create.literal(v); })),
                _this.outputArray,
                kernelFunction,
                create.literal(currentKernelId++)
            ], node.loc);
            create.mutateToExpressionStatement(node, createKernelSourceCall);
            return _this.state;
        };
        // verification of outer loops using our verifier
        this.checkOuterLoops = function (node) {
            var currForLoop = node;
            while (currForLoop.type === 'ForStatement') {
                var detector = new loopVerifier_1.default(currForLoop);
                if (!detector.ok) {
                    break;
                }
                _this.innerBody = currForLoop.body;
                _this.counters.push(detector.counter);
                _this.end.push(detector.end);
                if (_this.innerBody.type !== 'BlockStatement') {
                    break;
                }
                if (_this.innerBody.body.length > 1 || _this.innerBody.body.length === 0) {
                    break;
                }
                currForLoop = _this.innerBody.body[0];
            }
        };
        this.program = program;
        this.globalIds = {
            __createKernelSource: createKernelSource
        };
    }
    /*
     * Based on state, gets the correct body to be run across threads
     * e.g. state = 2 (2 top level loops skipped)
     * for (...) {
     *    for (...) {
     *      let x = 1;
     *      res[i] = x + 1
     *    }
     * }
     *
     * returns:
     *
     * {
     *  let x = 1;
     *  res[i] = x + 1
     * }
     */
    GPUTransformer.prototype.getTargetBody = function (node) {
        var mv = this.state;
        this.targetBody = node;
        while (mv > 1) {
            this.targetBody = this.targetBody.body.body[0];
            mv--;
        }
        this.targetBody = this.targetBody.body;
    };
    // get all variables defined outside the block (on right hand side)
    // TODO: method can be more optimized
    GPUTransformer.prototype.getOuterVariables = function () {
        // set some local variables for walking
        var curr = this.innerBody;
        var localVar = this.localVar;
        var counters = this.counters;
        var output = this.outputArray.name;
        var varDefinitions = {};
        (0, walkers_1.simple)(curr, {
            Identifier: function (node) {
                if (localVar.has(node.name) ||
                    counters.includes(node.name) ||
                    node.name === output ||
                    node.name.startsWith('math_')) {
                    return;
                }
                varDefinitions[node.name] = node;
            }
        });
        this.outerVariables = varDefinitions;
    };
    return GPUTransformer;
}());
/*
 * Here we transpile a source-syntax kernel function to a gpu.js kernel function
 * 0. No need for validity checks, as that is done at compile time in gpuTranspile
 * 1. In body, update all math_* calls to become Math.* calls
 * 2. In body, update all external variable references
 * 3. In body, update reference to counters
 */
function gpuRuntimeTranspile(node, localNames) {
    // Contains counters
    var params = node.params.map(function (v) { return v.name; });
    // body here is the loop body transformed into a function of the indices.
    // We need to finish the transformation to a gpu.js kernel function by renaming stuff.
    var body = node.body;
    // 1. Update all math_* calls to become Math.*
    (0, walkers_1.simple)(body, {
        CallExpression: function (nx) {
            if (nx.callee.type !== 'Identifier') {
                return;
            }
            var functionName = nx.callee.name;
            var term = functionName.split('_')[1];
            var args = nx.arguments;
            create.mutateToCallExpression(nx, create.memberExpression(create.identifier('Math'), term), args);
        }
    });
    // 2. Update all external variable references in body
    // e.g. let res = 1 + y; where y is an external variable
    // becomes let res = 1 + this.constants.y;
    var ignoredNames = new Set(__spreadArray(__spreadArray([], params, true), ['Math'], false));
    (0, walkers_1.simple)(body, {
        Identifier: function (nx) {
            // ignore these names
            if (ignoredNames.has(nx.name) || localNames.has(nx.name)) {
                return;
            }
            create.mutateToMemberExpression(nx, create.memberExpression(create.identifier('this'), 'constants'), create.identifier(nx.name));
        }
    });
    // 3. Update reference to counters
    // e.g. let res = 1 + i; where i is a counter
    // becomes let res = 1 + this.thread.x;
    // depending on state the mappings will change
    var threads = ['x'];
    if (params.length === 2)
        threads = ['y', 'x'];
    if (params.length === 3)
        threads = ['z', 'y', 'x'];
    var counters = params.slice();
    (0, walkers_1.simple)(body, {
        Identifier: function (nx) {
            var x = -1;
            for (var i = 0; i < counters.length; i = i + 1) {
                if (nx.name === counters[i]) {
                    x = i;
                    break;
                }
            }
            if (x === -1) {
                return;
            }
            var id = threads[x];
            create.mutateToMemberExpression(nx, create.memberExpression(create.identifier('this'), 'thread'), create.identifier(id));
        }
    });
    return body;
}
exports.gpuRuntimeTranspile = gpuRuntimeTranspile;
exports.default = GPUTransformer;
