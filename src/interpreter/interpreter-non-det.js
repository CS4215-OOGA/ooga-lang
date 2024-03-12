"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonDetEvaluate = exports.apply = exports.evaluate = exports.evaluators = void 0;
var lodash_1 = require("lodash");
var constants_1 = require("../constants");
var errors = require("../errors/errors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var astCreator_1 = require("../utils/astCreator");
var operators_1 = require("../utils/operators");
var rttc = require("../utils/rttc");
var closure_1 = require("./closure");
var BreakValue = /** @class */ (function () {
    function BreakValue() {
    }
    return BreakValue;
}());
var ContinueValue = /** @class */ (function () {
    function ContinueValue() {
    }
    return ContinueValue;
}());
var ReturnValue = /** @class */ (function () {
    function ReturnValue(value) {
        this.value = value;
    }
    return ReturnValue;
}());
var createEnvironment = function (closure, args, callExpression) {
    var environment = {
        name: closure.functionName, // TODO: Change this
        tail: closure.environment,
        head: {},
        id: (0, lodash_1.uniqueId)()
    };
    if (callExpression) {
        environment.callExpression = __assign(__assign({}, callExpression), { arguments: args.map(astCreator_1.primitive) });
    }
    closure.node.params.forEach(function (param, index) {
        var ident = param;
        environment.head[ident.name] = args[index];
    });
    return environment;
};
var createBlockEnvironment = function (context, name, head) {
    if (name === void 0) { name = 'blockEnvironment'; }
    if (head === void 0) { head = {}; }
    return {
        name: name,
        tail: currentEnvironment(context),
        head: head,
        thisContext: context,
        id: (0, lodash_1.uniqueId)()
    };
};
var handleRuntimeError = function (context, error) {
    context.errors.push(error);
    context.runtime.environments = context.runtime.environments.slice(-context.numberOfOuterEnvironments);
    throw error;
};
var DECLARED_BUT_NOT_YET_ASSIGNED = Symbol('Used to implement declaration');
function declareIdentifier(context, name, node) {
    var environment = currentEnvironment(context);
    if (environment.head.hasOwnProperty(name)) {
        var descriptors = Object.getOwnPropertyDescriptors(environment.head);
        return handleRuntimeError(context, new errors.VariableRedeclaration(node, name, descriptors[name].writable));
    }
    environment.head[name] = DECLARED_BUT_NOT_YET_ASSIGNED;
    return environment;
}
function declareVariables(context, node) {
    for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
        var declaration = _a[_i];
        declareIdentifier(context, declaration.id.name, node);
    }
}
function declareFunctionAndVariableIdentifiers(context, node) {
    for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
        var statement = _a[_i];
        switch (statement.type) {
            case 'VariableDeclaration':
                declareVariables(context, statement);
                break;
            case 'FunctionDeclaration':
                if (statement.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                declareIdentifier(context, statement.id.name, statement);
                break;
        }
    }
}
function defineVariable(context, name, value, constant) {
    if (constant === void 0) { constant = false; }
    var environment = context.runtime.environments[0];
    if (environment.head[name] !== DECLARED_BUT_NOT_YET_ASSIGNED) {
        return handleRuntimeError(context, new errors.VariableRedeclaration(context.runtime.nodes[0], name, !constant));
    }
    Object.defineProperty(environment.head, name, {
        value: value,
        writable: !constant,
        enumerable: true
    });
    return environment;
}
function undefineVariable(context, name) {
    var environment = context.runtime.environments[0];
    Object.defineProperty(environment.head, name, {
        value: DECLARED_BUT_NOT_YET_ASSIGNED,
        writable: true,
        enumerable: true
    });
}
var currentEnvironment = function (context) { return context.runtime.environments[0]; };
var popEnvironment = function (context) { return context.runtime.environments.shift(); };
var pushEnvironment = function (context, environment) {
    return context.runtime.environments.unshift(environment);
};
var getVariable = function (context, name, ensureVariableAssigned) {
    var environment = context.runtime.environments[0];
    while (environment) {
        if (environment.head.hasOwnProperty(name)) {
            if (environment.head[name] === DECLARED_BUT_NOT_YET_ASSIGNED) {
                if (ensureVariableAssigned) {
                    return handleRuntimeError(context, new errors.UnassignedVariable(name, context.runtime.nodes[0]));
                }
                else {
                    return DECLARED_BUT_NOT_YET_ASSIGNED;
                }
            }
            else {
                return environment.head[name];
            }
        }
        else {
            environment = environment.tail;
        }
    }
    return handleRuntimeError(context, new errors.UndefinedVariable(name, context.runtime.nodes[0]));
};
var setVariable = function (context, name, value) {
    var environment = context.runtime.environments[0];
    while (environment) {
        if (environment.head.hasOwnProperty(name)) {
            if (environment.head[name] === DECLARED_BUT_NOT_YET_ASSIGNED) {
                break;
            }
            var descriptors = Object.getOwnPropertyDescriptors(environment.head);
            if (descriptors[name].writable) {
                environment.head[name] = value;
                return undefined;
            }
            return handleRuntimeError(context, new errors.ConstAssignment(context.runtime.nodes[0], name));
        }
        else {
            environment = environment.tail;
        }
    }
    return handleRuntimeError(context, new errors.UndefinedVariable(name, context.runtime.nodes[0]));
};
var checkNumberOfArguments = function (context, callee, args, exp) {
    if (callee.node.params.length !== args.length) {
        return handleRuntimeError(context, new errors.InvalidNumberOfArguments(exp, callee.node.params.length, args.length));
    }
    return undefined;
};
/**
 * Returns a random integer for a given interval (inclusive).
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function getAmbRArgs(context, call) {
    var args, r, arg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                args = (0, lodash_1.cloneDeep)(call.arguments);
                _a.label = 1;
            case 1:
                if (!(args.length > 0)) return [3 /*break*/, 3];
                r = randomInt(0, args.length - 1);
                arg = args.splice(r, 1)[0];
                return [5 /*yield**/, __values(evaluate(arg, context))];
            case 2:
                _a.sent();
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}
function getArgs(context, call) {
    var args;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                args = (0, lodash_1.cloneDeep)(call.arguments);
                return [5 /*yield**/, __values(cartesianProduct(context, args, []))];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}
/* Given a list of non deterministic nodes, this generator returns every
 * combination of values of these nodes */
function cartesianProduct(context, nodes, nodeValues) {
    var currentNode, nodeValueGenerator, _i, nodeValueGenerator_1, nodeValue;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(nodes.length === 0)) return [3 /*break*/, 2];
                return [4 /*yield*/, nodeValues];
            case 1:
                _a.sent();
                return [3 /*break*/, 7];
            case 2:
                currentNode = nodes.shift() // we need the postfix ! to tell compiler that nodes array is nonempty
                ;
                nodeValueGenerator = evaluate(currentNode, context);
                _i = 0, nodeValueGenerator_1 = nodeValueGenerator;
                _a.label = 3;
            case 3:
                if (!(_i < nodeValueGenerator_1.length)) return [3 /*break*/, 6];
                nodeValue = nodeValueGenerator_1[_i];
                nodeValues.push(nodeValue);
                return [5 /*yield**/, __values(cartesianProduct(context, nodes, nodeValues))];
            case 4:
                _a.sent();
                nodeValues.pop();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                nodes.unshift(currentNode);
                _a.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}
function getAmbArgs(context, call) {
    var _i, _a, arg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _i = 0, _a = call.arguments;
                _b.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 4];
                arg = _a[_i];
                return [5 /*yield**/, __values(evaluate(arg, context))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
function transformLogicalExpression(node) {
    if (node.operator === '&&') {
        return (0, astCreator_1.conditionalExpression)(node.left, node.right, (0, astCreator_1.literal)(false), node.loc);
    }
    else {
        return (0, astCreator_1.conditionalExpression)(node.left, (0, astCreator_1.literal)(true), node.right, node.loc);
    }
}
function reduceIf(node, context) {
    var testGenerator, _i, testGenerator_1, test_1, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                testGenerator = evaluate(node.test, context);
                _i = 0, testGenerator_1 = testGenerator;
                _a.label = 1;
            case 1:
                if (!(_i < testGenerator_1.length)) return [3 /*break*/, 4];
                test_1 = testGenerator_1[_i];
                error = rttc.checkIfStatement(node, test_1, context.chapter);
                if (error) {
                    return [2 /*return*/, handleRuntimeError(context, error)];
                }
                return [4 /*yield*/, test_1 ? node.consequent : node.alternate];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
function evaluateBlockSatement(context, node) {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                declareFunctionAndVariableIdentifiers(context, node);
                return [5 /*yield**/, __values(evaluateSequence(context, node.body))];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
function evaluateSequence(context, sequence) {
    var firstStatement, sequenceValGenerator, shouldUnshift, _i, sequenceValGenerator_1, sequenceValue, res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(sequence.length === 0)) return [3 /*break*/, 2];
                return [4 /*yield*/, undefined];
            case 1: return [2 /*return*/, _a.sent()];
            case 2:
                firstStatement = sequence[0];
                sequenceValGenerator = evaluate(firstStatement, context);
                if (!(sequence.length === 1)) return [3 /*break*/, 4];
                return [5 /*yield**/, __values(sequenceValGenerator)];
            case 3:
                _a.sent();
                return [3 /*break*/, 11];
            case 4:
                sequence.shift();
                shouldUnshift = true;
                _i = 0, sequenceValGenerator_1 = sequenceValGenerator;
                _a.label = 5;
            case 5:
                if (!(_i < sequenceValGenerator_1.length)) return [3 /*break*/, 10];
                sequenceValue = sequenceValGenerator_1[_i];
                // prevent unshifting of cut operator
                shouldUnshift = sequenceValue !== constants_1.CUT;
                if (!(sequenceValue instanceof ReturnValue ||
                    sequenceValue instanceof BreakValue ||
                    sequenceValue instanceof ContinueValue)) return [3 /*break*/, 7];
                return [4 /*yield*/, sequenceValue];
            case 6:
                _a.sent();
                return [3 /*break*/, 9];
            case 7: return [5 /*yield**/, __values(evaluateSequence(context, sequence))];
            case 8:
                res = _a.sent();
                if (res === constants_1.CUT) {
                    // prevent unshifting of statements before cut
                    shouldUnshift = false;
                    return [3 /*break*/, 10];
                }
                _a.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 5];
            case 10:
                if (shouldUnshift)
                    sequence.unshift(firstStatement);
                else
                    return [2 /*return*/, constants_1.CUT];
                _a.label = 11;
            case 11: return [2 /*return*/];
        }
    });
}
function evaluateConditional(node, context) {
    var branchGenerator, _i, branchGenerator_1, branch;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                branchGenerator = reduceIf(node, context);
                _i = 0, branchGenerator_1 = branchGenerator;
                _a.label = 1;
            case 1:
                if (!(_i < branchGenerator_1.length)) return [3 /*break*/, 4];
                branch = branchGenerator_1[_i];
                return [5 /*yield**/, __values(evaluate(branch, context))];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
/**
 * WARNING: Do not use object literal shorthands, e.g.
 *   {
 *     *Literal(node: es.Literal, ...) {...},
 *     *ThisExpression(node: es.ThisExpression, ..._ {...},
 *     ...
 *   }
 * They do not minify well, raising uncaught syntax errors in production.
 * See: https://github.com/webpack/webpack/issues/7566
 */
// tslint:disable:object-literal-shorthand
// prettier-ignore
exports.evaluators = {
    /** Simple Values */
    Literal: function (node, _context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, node.value];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    ArrowFunctionExpression: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, closure_1.default.makeFromArrowFunction(node, currentEnvironment(context), context)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    ArrayExpression: function (node, context) {
        var arrayGenerator, _i, arrayGenerator_1, array;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    arrayGenerator = cartesianProduct(context, node.elements, []);
                    _i = 0, arrayGenerator_1 = arrayGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < arrayGenerator_1.length)) return [3 /*break*/, 4];
                    array = arrayGenerator_1[_i];
                    return [4 /*yield*/, array.slice()]; // yield a new array to avoid modifying previous ones
                case 2:
                    _a.sent(); // yield a new array to avoid modifying previous ones
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    },
    Identifier: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getVariable(context, node.name, true)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    },
    CallExpression: function (node, context) {
        var callee, _a, calleeGenerator, _i, calleeGenerator_1, calleeValue, argsGenerator, _b, argsGenerator_1, args;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    callee = node.callee;
                    if (!rttc.isIdentifier(callee)) return [3 /*break*/, 7];
                    _a = callee.name;
                    switch (_a) {
                        case 'amb': return [3 /*break*/, 1];
                        case 'ambR': return [3 /*break*/, 3];
                        case 'cut': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [5 /*yield**/, __values(getAmbArgs(context, node))];
                case 2: return [2 /*return*/, _c.sent()];
                case 3: return [5 /*yield**/, __values(getAmbRArgs(context, node))];
                case 4: return [2 /*return*/, _c.sent()];
                case 5: return [4 /*yield*/, constants_1.CUT];
                case 6: return [2 /*return*/, _c.sent()];
                case 7:
                    calleeGenerator = evaluate(node.callee, context);
                    _i = 0, calleeGenerator_1 = calleeGenerator;
                    _c.label = 8;
                case 8:
                    if (!(_i < calleeGenerator_1.length)) return [3 /*break*/, 13];
                    calleeValue = calleeGenerator_1[_i];
                    argsGenerator = getArgs(context, node);
                    _b = 0, argsGenerator_1 = argsGenerator;
                    _c.label = 9;
                case 9:
                    if (!(_b < argsGenerator_1.length)) return [3 /*break*/, 12];
                    args = argsGenerator_1[_b];
                    return [5 /*yield**/, __values(apply(context, calleeValue, args, node, undefined))];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    _i++;
                    return [3 /*break*/, 8];
                case 13: return [2 /*return*/];
            }
        });
    },
    UnaryExpression: function (node, context) {
        var argGenerator, _i, argGenerator_1, argValue, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    argGenerator = evaluate(node.argument, context);
                    _i = 0, argGenerator_1 = argGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < argGenerator_1.length)) return [3 /*break*/, 4];
                    argValue = argGenerator_1[_i];
                    error = rttc.checkUnaryExpression(node, node.operator, argValue, context.chapter);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    return [4 /*yield*/, (0, operators_1.evaluateUnaryExpression)(node.operator, argValue)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    },
    BinaryExpression: function (node, context) {
        var pairGenerator, _i, pairGenerator_1, pair, leftValue, rightValue, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pairGenerator = cartesianProduct(context, [node.left, node.right], []);
                    _i = 0, pairGenerator_1 = pairGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < pairGenerator_1.length)) return [3 /*break*/, 4];
                    pair = pairGenerator_1[_i];
                    leftValue = pair[0];
                    rightValue = pair[1];
                    error = rttc.checkBinaryExpression(node, node.operator, context.chapter, leftValue, rightValue);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    return [4 /*yield*/, (0, operators_1.evaluateBinaryExpression)(node.operator, leftValue, rightValue)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    },
    ConditionalExpression: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(evaluateConditional(node, context))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    LogicalExpression: function (node, context) {
        var conditional;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    conditional = transformLogicalExpression(node);
                    return [5 /*yield**/, __values(evaluateConditional(conditional, context))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    VariableDeclaration: function (node, context) {
        var declaration, constant, id, valueGenerator, _i, valueGenerator_1, value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    declaration = node.declarations[0];
                    constant = node.kind === 'const';
                    id = declaration.id;
                    valueGenerator = evaluate(declaration.init, context);
                    _i = 0, valueGenerator_1 = valueGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < valueGenerator_1.length)) return [3 /*break*/, 4];
                    value = valueGenerator_1[_i];
                    defineVariable(context, id.name, value, constant);
                    return [4 /*yield*/, value];
                case 2:
                    _a.sent();
                    undefineVariable(context, id.name);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, undefined];
            }
        });
    },
    MemberExpression: function (node, context) {
        var pairGenerator, _i, pairGenerator_2, pair, prop, obj, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pairGenerator = cartesianProduct(context, [node.property, node.object], []);
                    _i = 0, pairGenerator_2 = pairGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < pairGenerator_2.length)) return [3 /*break*/, 6];
                    pair = pairGenerator_2[_i];
                    prop = pair[0];
                    obj = pair[1];
                    error = rttc.checkMemberAccess(node, obj, prop);
                    if (!error) return [3 /*break*/, 3];
                    return [4 /*yield*/, handleRuntimeError(context, error)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3: return [4 /*yield*/, obj[prop]];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    },
    AssignmentExpression: function (node, context) {
        var tripleGenerator, _i, tripleGenerator_1, triple, val, prop, obj, error, originalElementValue, id, originalValue, valueGenerator, _a, valueGenerator_2, value;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(node.left.type === 'MemberExpression')) return [3 /*break*/, 7];
                    tripleGenerator = cartesianProduct(context, [node.right, node.left.property, node.left.object], []);
                    _i = 0, tripleGenerator_1 = tripleGenerator;
                    _b.label = 1;
                case 1:
                    if (!(_i < tripleGenerator_1.length)) return [3 /*break*/, 6];
                    triple = tripleGenerator_1[_i];
                    val = triple[0];
                    prop = triple[1];
                    obj = triple[2];
                    error = rttc.checkMemberAccess(node, obj, prop);
                    if (!error) return [3 /*break*/, 3];
                    return [4 /*yield*/, handleRuntimeError(context, error)];
                case 2: return [2 /*return*/, _b.sent()];
                case 3:
                    originalElementValue = obj[prop];
                    obj[prop] = val;
                    return [4 /*yield*/, val];
                case 4:
                    _b.sent();
                    obj[prop] = originalElementValue;
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
                case 7:
                    id = node.left;
                    originalValue = getVariable(context, id.name, false);
                    valueGenerator = evaluate(node.right, context);
                    _a = 0, valueGenerator_2 = valueGenerator;
                    _b.label = 8;
                case 8:
                    if (!(_a < valueGenerator_2.length)) return [3 /*break*/, 11];
                    value = valueGenerator_2[_a];
                    setVariable(context, id.name, value);
                    return [4 /*yield*/, value];
                case 9:
                    _b.sent();
                    setVariable(context, id.name, originalValue);
                    _b.label = 10;
                case 10:
                    _a++;
                    return [3 /*break*/, 8];
                case 11: return [2 /*return*/];
            }
        });
    },
    FunctionDeclaration: function (node, context) {
        var id, closure;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = node.id;
                    if (id === null) {
                        throw new Error("Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.");
                    }
                    closure = new closure_1.default(node, currentEnvironment(context), context);
                    defineVariable(context, id.name, closure, true);
                    return [4 /*yield*/, undefined];
                case 1:
                    _a.sent();
                    undefineVariable(context, id.name);
                    return [2 /*return*/];
            }
        });
    },
    IfStatement: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(evaluateConditional(node, context))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    ExpressionStatement: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(evaluate(node.expression, context))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    },
    ContinueStatement: function (_node, _context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new ContinueValue()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    BreakStatement: function (_node, _context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new BreakValue()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    WhileStatement: function (node, context) {
        function loop() {
            var testGenerator, _i, testGenerator_2, test_2, error, iterationValueGenerator, _a, iterationValueGenerator_1, iterationValue;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        testGenerator = evaluate(node.test, context);
                        _i = 0, testGenerator_2 = testGenerator;
                        _b.label = 1;
                    case 1:
                        if (!(_i < testGenerator_2.length)) return [3 /*break*/, 11];
                        test_2 = testGenerator_2[_i];
                        error = rttc.checkIfStatement(node.test, test_2, context.chapter);
                        if (error)
                            return [2 /*return*/, handleRuntimeError(context, error)];
                        if (!(test_2 &&
                            !(value instanceof ReturnValue) &&
                            !(value instanceof BreakValue))) return [3 /*break*/, 6];
                        iterationValueGenerator = evaluate((0, lodash_1.cloneDeep)(node.body), context);
                        _a = 0, iterationValueGenerator_1 = iterationValueGenerator;
                        _b.label = 2;
                    case 2:
                        if (!(_a < iterationValueGenerator_1.length)) return [3 /*break*/, 5];
                        iterationValue = iterationValueGenerator_1[_a];
                        value = iterationValue;
                        return [5 /*yield**/, __values(loop())];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 10];
                    case 6:
                        if (!(value instanceof BreakValue || value instanceof ContinueValue)) return [3 /*break*/, 8];
                        return [4 /*yield*/, undefined];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, value];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        _i++;
                        return [3 /*break*/, 1];
                    case 11: return [2 /*return*/];
                }
            });
        }
        var value // tslint:disable-line
        ;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(loop())];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    ForStatement: function (node, context) {
        function loop() {
            var testGenerator, _i, testGenerator_3, test_3, error, iterationEnvironment, name_1, iterationValueGenerator, _a, iterationValueGenerator_2, iterationValue, updateNode, _b, updateNode_1, _update;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        testGenerator = evaluate(node.test, context);
                        _i = 0, testGenerator_3 = testGenerator;
                        _c.label = 1;
                    case 1:
                        if (!(_i < testGenerator_3.length)) return [3 /*break*/, 14];
                        test_3 = testGenerator_3[_i];
                        error = rttc.checkIfStatement(node.test, test_3, context.chapter);
                        if (error)
                            return [2 /*return*/, handleRuntimeError(context, error)];
                        if (!(test_3 &&
                            !(value instanceof ReturnValue) &&
                            !(value instanceof BreakValue))) return [3 /*break*/, 9];
                        iterationEnvironment = createBlockEnvironment(context, 'forBlockEnvironment');
                        pushEnvironment(context, iterationEnvironment);
                        for (name_1 in loopEnvironment.head) {
                            if (loopEnvironment.head.hasOwnProperty(name_1)) {
                                declareIdentifier(context, name_1, node);
                                defineVariable(context, name_1, loopEnvironment.head[name_1], true);
                            }
                        }
                        iterationValueGenerator = evaluate((0, lodash_1.cloneDeep)(node.body), context);
                        _a = 0, iterationValueGenerator_2 = iterationValueGenerator;
                        _c.label = 2;
                    case 2:
                        if (!(_a < iterationValueGenerator_2.length)) return [3 /*break*/, 8];
                        iterationValue = iterationValueGenerator_2[_a];
                        value = iterationValue;
                        popEnvironment(context);
                        updateNode = evaluate(node.update, context);
                        _b = 0, updateNode_1 = updateNode;
                        _c.label = 3;
                    case 3:
                        if (!(_b < updateNode_1.length)) return [3 /*break*/, 6];
                        _update = updateNode_1[_b];
                        return [5 /*yield**/, __values(loop())];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        _b++;
                        return [3 /*break*/, 3];
                    case 6:
                        pushEnvironment(context, iterationEnvironment);
                        _c.label = 7;
                    case 7:
                        _a++;
                        return [3 /*break*/, 2];
                    case 8:
                        popEnvironment(context);
                        return [3 /*break*/, 13];
                    case 9:
                        if (!(value instanceof BreakValue || value instanceof ContinueValue)) return [3 /*break*/, 11];
                        return [4 /*yield*/, undefined];
                    case 10:
                        _c.sent();
                        return [3 /*break*/, 13];
                    case 11: return [4 /*yield*/, value];
                    case 12:
                        _c.sent();
                        _c.label = 13;
                    case 13:
                        _i++;
                        return [3 /*break*/, 1];
                    case 14: return [2 /*return*/];
                }
            });
        }
        var value, loopEnvironment, initNode, initNodeGenerator, _i, initNodeGenerator_1, _init, loopGenerator, _a, loopGenerator_1, loopValue;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    loopEnvironment = createBlockEnvironment(context, 'forLoopEnvironment');
                    pushEnvironment(context, loopEnvironment);
                    initNode = node.init;
                    if (initNode.type === 'VariableDeclaration') {
                        declareVariables(context, initNode);
                    }
                    initNodeGenerator = evaluate(node.init, context);
                    _i = 0, initNodeGenerator_1 = initNodeGenerator;
                    _b.label = 1;
                case 1:
                    if (!(_i < initNodeGenerator_1.length)) return [3 /*break*/, 6];
                    _init = initNodeGenerator_1[_i];
                    loopGenerator = loop();
                    _a = 0, loopGenerator_1 = loopGenerator;
                    _b.label = 2;
                case 2:
                    if (!(_a < loopGenerator_1.length)) return [3 /*break*/, 5];
                    loopValue = loopGenerator_1[_a];
                    popEnvironment(context);
                    return [4 /*yield*/, loopValue];
                case 3:
                    _b.sent();
                    pushEnvironment(context, loopEnvironment);
                    _b.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    popEnvironment(context);
                    return [2 /*return*/];
            }
        });
    },
    ReturnStatement: function (node, context) {
        var returnExpression, returnValueGenerator, _i, returnValueGenerator_1, returnValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    returnExpression = node.argument;
                    returnValueGenerator = evaluate(returnExpression, context);
                    _i = 0, returnValueGenerator_1 = returnValueGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < returnValueGenerator_1.length)) return [3 /*break*/, 4];
                    returnValue = returnValueGenerator_1[_i];
                    return [4 /*yield*/, new ReturnValue(returnValue)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    },
    BlockStatement: function (node, context) {
        var environment, resultGenerator, _i, resultGenerator_1, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    environment = createBlockEnvironment(context, 'blockEnvironment');
                    pushEnvironment(context, environment);
                    resultGenerator = evaluateBlockSatement(context, node);
                    _i = 0, resultGenerator_1 = resultGenerator;
                    _a.label = 1;
                case 1:
                    if (!(_i < resultGenerator_1.length)) return [3 /*break*/, 4];
                    result = resultGenerator_1[_i];
                    popEnvironment(context);
                    return [4 /*yield*/, result];
                case 2:
                    _a.sent();
                    pushEnvironment(context, environment);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    popEnvironment(context);
                    return [2 /*return*/];
            }
        });
    },
    Program: function (node, context) {
        var environment;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context.numberOfOuterEnvironments += 1;
                    environment = createBlockEnvironment(context, 'programEnvironment');
                    pushEnvironment(context, environment);
                    return [5 /*yield**/, __values(evaluateBlockSatement(context, node))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }
};
// tslint:enable:object-literal-shorthand
function evaluate(node, context) {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [5 /*yield**/, __values(exports.evaluators[node.type](node, context))];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result];
        }
    });
}
exports.evaluate = evaluate;
exports.nonDetEvaluate = evaluate;
function apply(context, fun, args, node, thisContext) {
    // This function takes a value that may be a ReturnValue.
    // If so, it returns the value wrapped in the ReturnValue.
    // If not, it returns the default value.
    function unwrapReturnValue(result, defaultValue) {
        if (result instanceof ReturnValue) {
            return result.value;
        }
        else {
            return defaultValue;
        }
    }
    var environment, applicationValueGenerator, _i, applicationValueGenerator_1, applicationValue, e_1, loc;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!(fun instanceof closure_1.default)) return [3 /*break*/, 5];
                checkNumberOfArguments(context, fun, args, node);
                environment = createEnvironment(fun, args, node);
                environment.thisContext = thisContext;
                pushEnvironment(context, environment);
                applicationValueGenerator = evaluateBlockSatement(context, (0, lodash_1.cloneDeep)(fun.node.body));
                _i = 0, applicationValueGenerator_1 = applicationValueGenerator;
                _b.label = 1;
            case 1:
                if (!(_i < applicationValueGenerator_1.length)) return [3 /*break*/, 4];
                applicationValue = applicationValueGenerator_1[_i];
                popEnvironment(context);
                return [4 /*yield*/, unwrapReturnValue(applicationValue, undefined)];
            case 2:
                _b.sent();
                pushEnvironment(context, environment);
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                popEnvironment(context);
                return [3 /*break*/, 11];
            case 5:
                if (!(typeof fun === 'function')) return [3 /*break*/, 10];
                _b.label = 6;
            case 6:
                _b.trys.push([6, 8, , 9]);
                return [4 /*yield*/, fun.apply(thisContext, args)];
            case 7:
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                e_1 = _b.sent();
                // Recover from exception
                context.runtime.environments = context.runtime.environments.slice(-context.numberOfOuterEnvironments);
                loc = (_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
                if (!(e_1 instanceof runtimeSourceError_1.RuntimeSourceError || e_1 instanceof errors.ExceptionError)) {
                    // The error could've arisen when the builtin called a source function which errored.
                    // If the cause was a source error, we don't want to include the error.
                    // However if the error came from the builtin itself, we need to handle it.
                    return [2 /*return*/, handleRuntimeError(context, new errors.ExceptionError(e_1, loc))];
                }
                throw e_1;
            case 9: return [3 /*break*/, 11];
            case 10: return [2 /*return*/, handleRuntimeError(context, new errors.CallingNonFunctionValue(fun, node))];
            case 11: return [2 /*return*/];
        }
    });
}
exports.apply = apply;
