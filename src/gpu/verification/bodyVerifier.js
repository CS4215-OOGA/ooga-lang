"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var walkers_1 = require("../../utils/walkers");
/*
 * GPU Body verifier helps to ensure the body is parallelizable
 * It does a series of checks to make sure the loop can be parallelized easily
 * Upon termination will update:
 *   @state: number that indicates the dimensions you can parallize till (max 3)
 *   @localVar: local variables in the body
 *   @outputArray: array that is being written to
 */
var GPUBodyVerifier = /** @class */ (function () {
    /**
     *
     * @param node body to be verified
     * @param counters list of for loop counters (to check array assignment)
     */
    function GPUBodyVerifier(program, node, counters) {
        var _this = this;
        /*
         * Checks if the GPU body is valid
         * 1. No return/function declarations/break/continue
         * 2. No functions except math_*
         * 3. Only ONE assignment to a global result variable
         * 4. Assigning to an array at specific indices (i, j, k from for loop counters)
         */
        this.checkBody = function (node) {
            var ok = true;
            // 1. check illegal statements
            (0, walkers_1.simple)(node, {
                FunctionDeclaration: function () {
                    ok = false;
                },
                ArrowFunctionExpression: function () {
                    ok = false;
                },
                ReturnStatement: function () {
                    ok = false;
                },
                BreakStatement: function () {
                    ok = false;
                },
                ContinueStatement: function () {
                    ok = false;
                }
            });
            if (!ok) {
                return;
            }
            // 2. check function calls are only to math_*
            var mathFuncCheck = new RegExp(/^math_[a-z]+$/);
            (0, walkers_1.simple)(node, {
                CallExpression: function (nx) {
                    if (nx.callee.type !== 'Identifier') {
                        ok = false;
                        return;
                    }
                    var functionName = nx.callee.name;
                    if (!mathFuncCheck.test(functionName)) {
                        ok = false;
                        return;
                    }
                }
            });
            if (!ok) {
                return;
            }
            // 3. check there is only ONE assignment to a global result variable
            // get all local variables
            var localVar = new Set();
            (0, walkers_1.simple)(node, {
                VariableDeclaration: function (nx) {
                    if (nx.declarations[0].id.type === 'Identifier') {
                        localVar.add(nx.declarations[0].id.name);
                    }
                }
            });
            _this.localVar = localVar;
            // make sure only one assignment
            var resultExpr = [];
            var checker = _this.getArrayName;
            (0, walkers_1.simple)(node, {
                AssignmentExpression: function (nx) {
                    // assigning to local val, it's okay
                    if (nx.left.type === 'Identifier' && localVar.has(nx.left.name)) {
                        return;
                    }
                    if (nx.left.type === 'MemberExpression') {
                        var chk = checker(nx.left);
                        if (localVar.has(chk.name)) {
                            return;
                        }
                    }
                    resultExpr.push(nx);
                }
            });
            // too many assignments!
            if (resultExpr.length !== 1) {
                return;
            }
            // 4. check assigning to array at specific indices
            // not assigning to array
            if (resultExpr[0].left.type !== 'MemberExpression') {
                return;
            }
            // check res assignment and its counters
            var res = _this.getPropertyAccess(resultExpr[0].left);
            if (res.length === 0 || res.length > _this.counters.length) {
                return;
            }
            // check result variable is not used anywhere with wrong indices
            var getProp = _this.getPropertyAccess;
            var resArr = _this.outputArray;
            (0, walkers_1.simple)(node, {
                MemberExpression: function (nx) {
                    var chk = checker(nx);
                    if (chk.name !== resArr.name) {
                        return;
                    }
                    // get indices
                    var indices = getProp(nx);
                    if (JSON.stringify(indices) === JSON.stringify(res)) {
                        return;
                    }
                    ok = false;
                }
            }, 
            // tslint:disable-next-line
            (0, walkers_1.make)({ MemberExpression: function () { } }));
            if (!ok) {
                return;
            }
            for (var i = 0; i < _this.counters.length; i++) {
                if (res[i] !== _this.counters[i])
                    break;
                _this.state++;
            }
            // we only can have upto 3 states
            if (_this.state > 3)
                _this.state = 3;
        };
        this.getArrayName = function (node) {
            var curr = node;
            while (curr.type === 'MemberExpression') {
                curr = curr.object;
            }
            return curr;
        };
        // helper function that helps to get indices accessed from array
        // e.g. returns i, j for res[i][j]
        this.getPropertyAccess = function (node) {
            var res = [];
            var ok = true;
            var curr = node;
            while (curr.type === 'MemberExpression') {
                if (curr.property.type !== 'Identifier') {
                    ok = false;
                    break;
                }
                res.push(curr.property.name);
                curr = curr.object;
            }
            if (!ok) {
                return [];
            }
            _this.outputArray = curr;
            return res.reverse();
        };
        this.program = program;
        this.node = node;
        this.counters = counters;
        this.state = 0;
        this.checkBody(node);
    }
    return GPUBodyVerifier;
}());
exports.default = GPUBodyVerifier;
