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
exports.apply = exports.evaluateProgram = exports.evaluators = exports.pushEnvironment = exports.createBlockEnvironment = exports.actualValue = void 0;
var lodash_1 = require("lodash");
var constants_1 = require("../constants");
var createContext_1 = require("../createContext");
var errors = require("../errors/errors");
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var errors_1 = require("../modules/errors");
var moduleLoader_1 = require("../modules/moduleLoader");
var inspector_1 = require("../stdlib/inspector");
var types_1 = require("../types");
var assert_1 = require("../utils/assert");
var create = require("../utils/astCreator");
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
var TailCallReturnValue = /** @class */ (function () {
    function TailCallReturnValue(callee, args, node) {
        this.callee = callee;
        this.args = args;
        this.node = node;
    }
    return TailCallReturnValue;
}());
var Thunk = /** @class */ (function () {
    function Thunk(exp, env) {
        this.exp = exp;
        this.env = env;
        this.isMemoized = false;
        this.value = null;
    }
    return Thunk;
}());
var delayIt = function (exp, env) { return new Thunk(exp, env); };
function forceIt(val, context) {
    var evalRes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(val instanceof Thunk)) return [3 /*break*/, 2];
                if (val.isMemoized)
                    return [2 /*return*/, val.value];
                (0, exports.pushEnvironment)(context, val.env);
                return [5 /*yield**/, __values(actualValue(val.exp, context))];
            case 1:
                evalRes = _a.sent();
                popEnvironment(context);
                val.value = evalRes;
                val.isMemoized = true;
                return [2 /*return*/, evalRes];
            case 2: return [2 /*return*/, val];
        }
    });
}
function actualValue(exp, context) {
    var evalResult, forced;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [5 /*yield**/, __values(evaluate(exp, context))];
            case 1:
                evalResult = _a.sent();
                return [5 /*yield**/, __values(forceIt(evalResult, context))];
            case 2:
                forced = _a.sent();
                return [2 /*return*/, forced];
        }
    });
}
exports.actualValue = actualValue;
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
        if (param.type === 'RestElement') {
            environment.head[param.argument.name] = args.slice(index);
        }
        else {
            environment.head[param.name] = args[index];
        }
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
        id: (0, lodash_1.uniqueId)()
    };
};
exports.createBlockEnvironment = createBlockEnvironment;
var handleRuntimeError = function (context, error) {
    context.errors.push(error);
    context.runtime.environments = context.runtime.environments.slice(-context.numberOfOuterEnvironments);
    throw error;
};
var DECLARED_BUT_NOT_YET_ASSIGNED = Symbol('Used to implement block scope');
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
function declareFunctionsAndVariables(context, node) {
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
    var environment = currentEnvironment(context);
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
function visit(context, node) {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, inspector_1.checkEditorBreakpoints)(context, node);
                context.runtime.nodes.unshift(node);
                return [4 /*yield*/, context];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
function leave(context) {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                context.runtime.break = false;
                context.runtime.nodes.shift();
                return [4 /*yield*/, context];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
var currentEnvironment = function (context) { return context.runtime.environments[0]; };
var replaceEnvironment = function (context, environment) {
    context.runtime.environments[0] = environment;
    context.runtime.environmentTree.insert(environment);
};
var popEnvironment = function (context) { return context.runtime.environments.shift(); };
var pushEnvironment = function (context, environment) {
    context.runtime.environments.unshift(environment);
    context.runtime.environmentTree.insert(environment);
};
exports.pushEnvironment = pushEnvironment;
var getVariable = function (context, name) {
    var environment = currentEnvironment(context);
    while (environment) {
        if (environment.head.hasOwnProperty(name)) {
            if (environment.head[name] === DECLARED_BUT_NOT_YET_ASSIGNED) {
                return handleRuntimeError(context, new errors.UnassignedVariable(name, context.runtime.nodes[0]));
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
    var environment = currentEnvironment(context);
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
    var _a;
    if (callee instanceof closure_1.default) {
        var params = callee.node.params;
        var hasVarArgs = ((_a = params[params.length - 1]) === null || _a === void 0 ? void 0 : _a.type) === 'RestElement';
        if (hasVarArgs ? params.length - 1 > args.length : params.length !== args.length) {
            return handleRuntimeError(context, new errors.InvalidNumberOfArguments(exp, hasVarArgs ? params.length - 1 : params.length, args.length, hasVarArgs));
        }
    }
    else {
        var hasVarArgs = callee.minArgsNeeded != undefined;
        if (hasVarArgs ? callee.minArgsNeeded > args.length : callee.length !== args.length) {
            return handleRuntimeError(context, new errors.InvalidNumberOfArguments(exp, hasVarArgs ? callee.minArgsNeeded : callee.length, args.length, hasVarArgs));
        }
    }
    return undefined;
};
function getArgs(context, call) {
    var args, _i, _a, arg, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                args = [];
                _i = 0, _a = call.arguments;
                _g.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 7];
                arg = _a[_i];
                if (!(context.variant === types_1.Variant.LAZY)) return [3 /*break*/, 2];
                args.push(delayIt(arg, currentEnvironment(context)));
                return [3 /*break*/, 6];
            case 2:
                if (!(arg.type === 'SpreadElement')) return [3 /*break*/, 4];
                _c = (_b = args.push).apply;
                _d = [args];
                return [5 /*yield**/, __values(actualValue(arg.argument, context))];
            case 3:
                _c.apply(_b, _d.concat([(_g.sent())]));
                return [3 /*break*/, 6];
            case 4:
                _f = (_e = args).push;
                return [5 /*yield**/, __values(actualValue(arg, context))];
            case 5:
                _f.apply(_e, [_g.sent()]);
                _g.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 1];
            case 7: return [2 /*return*/, args];
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
    var test, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [5 /*yield**/, __values(actualValue(node.test, context))];
            case 1:
                test = _a.sent();
                error = rttc.checkIfStatement(node, test, context.chapter);
                if (error) {
                    return [2 /*return*/, handleRuntimeError(context, error)];
                }
                return [2 /*return*/, test ? node.consequent : node.alternate];
        }
    });
}
function evaluateBlockStatement(context, node) {
    var result, _i, _a, statement;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                declareFunctionsAndVariables(context, node);
                _i = 0, _a = node.body;
                _b.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 4];
                statement = _a[_i];
                return [5 /*yield**/, __values(evaluate(statement, context))];
            case 2:
                result = _b.sent();
                if (result instanceof ReturnValue ||
                    result instanceof TailCallReturnValue ||
                    result instanceof BreakValue ||
                    result instanceof ContinueValue) {
                    return [3 /*break*/, 4];
                }
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/, result];
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
            return [2 /*return*/, node.value];
        });
    },
    TemplateLiteral: function (node) {
        return __generator(this, function (_a) {
            // Expressions like `${1}` are not allowed, so no processing needed
            return [2 /*return*/, node.quasis[0].value.cooked];
        });
    },
    ThisExpression: function (node, context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, currentEnvironment(context).thisContext];
        });
    },
    ArrayExpression: function (node, context) {
        var res, _i, _a, n, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    res = [];
                    _i = 0, _a = node.elements;
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    n = _a[_i];
                    _c = (_b = res).push;
                    return [5 /*yield**/, __values(evaluate(n, context))];
                case 2:
                    _c.apply(_b, [_d.sent()]);
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, res];
            }
        });
    },
    DebuggerStatement: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context.runtime.break = true;
                    return [4 /*yield*/];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    },
    FunctionExpression: function (node, context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, new closure_1.default(node, currentEnvironment(context), context)];
        });
    },
    ArrowFunctionExpression: function (node, context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, closure_1.default.makeFromArrowFunction(node, currentEnvironment(context), context)];
        });
    },
    Identifier: function (node, context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, getVariable(context, node.name)];
        });
    },
    CallExpression: function (node, context) {
        var callee, args, thisContext, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(actualValue(node.callee, context))];
                case 1:
                    callee = _a.sent();
                    return [5 /*yield**/, __values(getArgs(context, node))];
                case 2:
                    args = _a.sent();
                    if (!(node.callee.type === 'MemberExpression')) return [3 /*break*/, 4];
                    return [5 /*yield**/, __values(actualValue(node.callee.object, context))];
                case 3:
                    thisContext = _a.sent();
                    _a.label = 4;
                case 4: return [5 /*yield**/, __values(apply(context, callee, args, node, thisContext))];
                case 5:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    },
    NewExpression: function (node, context) {
        var callee, args, _i, _a, arg, _b, _c, obj;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [5 /*yield**/, __values(evaluate(node.callee, context))];
                case 1:
                    callee = _d.sent();
                    args = [];
                    _i = 0, _a = node.arguments;
                    _d.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    arg = _a[_i];
                    _c = (_b = args).push;
                    return [5 /*yield**/, __values(evaluate(arg, context))];
                case 3:
                    _c.apply(_b, [_d.sent()]);
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    obj = {};
                    if (callee instanceof closure_1.default) {
                        obj.__proto__ = callee.fun.prototype;
                        callee.fun.apply(obj, args);
                    }
                    else {
                        obj.__proto__ = callee.prototype;
                        callee.apply(obj, args);
                    }
                    return [2 /*return*/, obj];
            }
        });
    },
    UnaryExpression: function (node, context) {
        var value, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(actualValue(node.argument, context))];
                case 1:
                    value = _a.sent();
                    error = rttc.checkUnaryExpression(node, node.operator, value, context.chapter);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    return [2 /*return*/, (0, operators_1.evaluateUnaryExpression)(node.operator, value)];
            }
        });
    },
    BinaryExpression: function (node, context) {
        var left, right, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(actualValue(node.left, context))];
                case 1:
                    left = _a.sent();
                    return [5 /*yield**/, __values(actualValue(node.right, context))];
                case 2:
                    right = _a.sent();
                    error = rttc.checkBinaryExpression(node, node.operator, context.chapter, left, right);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    return [2 /*return*/, (0, operators_1.evaluateBinaryExpression)(node.operator, left, right)];
            }
        });
    },
    ConditionalExpression: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(this.IfStatement(node, context))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    },
    LogicalExpression: function (node, context) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(this.ConditionalExpression(transformLogicalExpression(node), context))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    },
    VariableDeclaration: function (node, context) {
        var declaration, constant, id, value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    declaration = node.declarations[0];
                    constant = node.kind === 'const';
                    id = declaration.id;
                    return [5 /*yield**/, __values(evaluate(declaration.init, context))];
                case 1:
                    value = _a.sent();
                    defineVariable(context, id.name, value, constant);
                    return [2 /*return*/, undefined];
            }
        });
    },
    ContinueStatement: function (_node, _context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, new ContinueValue()];
        });
    },
    BreakStatement: function (_node, _context) {
        return __generator(this, function (_a) {
            return [2 /*return*/, new BreakValue()];
        });
    },
    ForStatement: function (node, context) {
        var loopEnvironment, initNode, testNode, updateNode, value, environment, name_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    loopEnvironment = (0, exports.createBlockEnvironment)(context, 'forLoopEnvironment');
                    (0, exports.pushEnvironment)(context, loopEnvironment);
                    initNode = node.init;
                    testNode = node.test;
                    updateNode = node.update;
                    if (initNode.type === 'VariableDeclaration') {
                        declareVariables(context, initNode);
                    }
                    return [5 /*yield**/, __values(actualValue(initNode, context))];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [5 /*yield**/, __values(actualValue(testNode, context))];
                case 3:
                    if (!_a.sent()) return [3 /*break*/, 6];
                    environment = (0, exports.createBlockEnvironment)(context, 'forBlockEnvironment');
                    (0, exports.pushEnvironment)(context, environment);
                    for (name_1 in loopEnvironment.head) {
                        if (loopEnvironment.head.hasOwnProperty(name_1)) {
                            declareIdentifier(context, name_1, node);
                            defineVariable(context, name_1, loopEnvironment.head[name_1], true);
                        }
                    }
                    return [5 /*yield**/, __values(actualValue(node.body, context))
                        // Remove block context
                    ];
                case 4:
                    value = _a.sent();
                    // Remove block context
                    popEnvironment(context);
                    if (value instanceof ContinueValue) {
                        value = undefined;
                    }
                    if (value instanceof BreakValue) {
                        value = undefined;
                        return [3 /*break*/, 6];
                    }
                    if (value instanceof ReturnValue || value instanceof TailCallReturnValue) {
                        return [3 /*break*/, 6];
                    }
                    return [5 /*yield**/, __values(actualValue(updateNode, context))];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 2];
                case 6:
                    popEnvironment(context);
                    return [2 /*return*/, value];
            }
        });
    },
    MemberExpression: function (node, context) {
        var obj, prop, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(actualValue(node.object, context))];
                case 1:
                    obj = _a.sent();
                    if (obj instanceof closure_1.default) {
                        obj = obj.fun;
                    }
                    if (!node.computed) return [3 /*break*/, 3];
                    return [5 /*yield**/, __values(actualValue(node.property, context))];
                case 2:
                    prop = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    prop = node.property.name;
                    _a.label = 4;
                case 4:
                    error = rttc.checkMemberAccess(node, obj, prop);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    if (obj !== null &&
                        obj !== undefined &&
                        typeof obj[prop] !== 'undefined' &&
                        !obj.hasOwnProperty(prop)) {
                        return [2 /*return*/, handleRuntimeError(context, new errors.GetInheritedPropertyError(node, obj, prop))];
                    }
                    try {
                        return [2 /*return*/, obj[prop]];
                    }
                    catch (_b) {
                        return [2 /*return*/, handleRuntimeError(context, new errors.GetPropertyError(node, obj, prop))];
                    }
                    return [2 /*return*/];
            }
        });
    },
    AssignmentExpression: function (node, context) {
        var left, obj, prop, error, val, id, value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(node.left.type === 'MemberExpression')) return [3 /*break*/, 6];
                    left = node.left;
                    return [5 /*yield**/, __values(actualValue(left.object, context))];
                case 1:
                    obj = _a.sent();
                    prop = void 0;
                    if (!left.computed) return [3 /*break*/, 3];
                    return [5 /*yield**/, __values(actualValue(left.property, context))];
                case 2:
                    prop = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    prop = left.property.name;
                    _a.label = 4;
                case 4:
                    error = rttc.checkMemberAccess(node, obj, prop);
                    if (error) {
                        return [2 /*return*/, handleRuntimeError(context, error)];
                    }
                    return [5 /*yield**/, __values(evaluate(node.right, context))];
                case 5:
                    val = _a.sent();
                    try {
                        obj[prop] = val;
                    }
                    catch (_b) {
                        return [2 /*return*/, handleRuntimeError(context, new errors.SetPropertyError(node, obj, prop))];
                    }
                    return [2 /*return*/, val];
                case 6:
                    id = node.left;
                    return [5 /*yield**/, __values(evaluate(node.right, context))];
                case 7:
                    value = _a.sent();
                    setVariable(context, id.name, value);
                    return [2 /*return*/, value];
            }
        });
    },
    FunctionDeclaration: function (node, context) {
        var id, closure;
        return __generator(this, function (_a) {
            id = node.id;
            if (id === null) {
                throw new Error("Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.");
            }
            closure = new closure_1.default(node, currentEnvironment(context), context);
            defineVariable(context, id.name, closure, true);
            return [2 /*return*/, undefined];
        });
    },
    IfStatement: function (node, context) {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(reduceIf(node, context))];
                case 1:
                    result = _a.sent();
                    if (result === null) {
                        return [2 /*return*/, undefined];
                    }
                    return [5 /*yield**/, __values(evaluate(result, context))];
                case 2: return [2 /*return*/, _a.sent()];
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
    ReturnStatement: function (node, context) {
        var returnExpression, callee, args, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    returnExpression = node.argument;
                    _b.label = 1;
                case 1:
                    if (!(returnExpression.type === 'LogicalExpression' ||
                        returnExpression.type === 'ConditionalExpression')) return [3 /*break*/, 3];
                    if (returnExpression.type === 'LogicalExpression') {
                        returnExpression = transformLogicalExpression(returnExpression);
                    }
                    return [5 /*yield**/, __values(reduceIf(returnExpression, context))];
                case 2:
                    returnExpression = _b.sent();
                    return [3 /*break*/, 1];
                case 3:
                    if (!(returnExpression.type === 'CallExpression' && context.variant !== types_1.Variant.LAZY)) return [3 /*break*/, 6];
                    return [5 /*yield**/, __values(actualValue(returnExpression.callee, context))];
                case 4:
                    callee = _b.sent();
                    return [5 /*yield**/, __values(getArgs(context, returnExpression))];
                case 5:
                    args = _b.sent();
                    return [2 /*return*/, new TailCallReturnValue(callee, args, returnExpression)];
                case 6:
                    _a = ReturnValue.bind;
                    return [5 /*yield**/, __values(evaluate(returnExpression, context))];
                case 7: return [2 /*return*/, new (_a.apply(ReturnValue, [void 0, _b.sent()]))()];
            }
        });
    },
    WhileStatement: function (node, context) {
        var value // tslint:disable-line
        ;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(actualValue(node.test, context))];
                case 1:
                    if (!
                    // tslint:disable-next-line
                    ((_a.sent()) &&
                        !(value instanceof ReturnValue) &&
                        !(value instanceof BreakValue) &&
                        !(value instanceof TailCallReturnValue))) return [3 /*break*/, 3];
                    return [5 /*yield**/, __values(actualValue(node.body, context))];
                case 2:
                    value = _a.sent();
                    return [3 /*break*/, 0];
                case 3:
                    if (value instanceof BreakValue) {
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/, value];
            }
        });
    },
    ObjectExpression: function (node, context) {
        var obj, _i, _a, propUntyped, prop, key, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    obj = {};
                    _i = 0, _a = node.properties;
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    propUntyped = _a[_i];
                    prop = propUntyped;
                    key = void 0;
                    if (!(prop.key.type === 'Identifier')) return [3 /*break*/, 2];
                    key = prop.key.name;
                    return [3 /*break*/, 4];
                case 2: return [5 /*yield**/, __values(evaluate(prop.key, context))];
                case 3:
                    key = _d.sent();
                    _d.label = 4;
                case 4:
                    _b = obj;
                    _c = key;
                    return [5 /*yield**/, __values(evaluate(prop.value, context))];
                case 5:
                    _b[_c] = _d.sent();
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/, obj];
            }
        });
    },
    BlockStatement: function (node, context) {
        var environment, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    environment = (0, exports.createBlockEnvironment)(context, 'blockEnvironment');
                    (0, exports.pushEnvironment)(context, environment);
                    return [5 /*yield**/, __values(evaluateBlockStatement(context, node))];
                case 1:
                    result = _a.sent();
                    popEnvironment(context);
                    return [2 /*return*/, result];
            }
        });
    },
    ImportDeclaration: function (node, context) {
        return __generator(this, function (_a) {
            throw new Error('ImportDeclarations should already have been removed');
        });
    },
    ExportNamedDeclaration: function (_node, _context) {
        return __generator(this, function (_a) {
            // Exports are handled as a separate pre-processing step in 'transformImportedFile'.
            // Subsequently, they are removed from the AST by 'removeExports' before the AST is evaluated.
            // As such, there should be no ExportNamedDeclaration nodes in the AST.
            throw new Error('Encountered an ExportNamedDeclaration node in the AST while evaluating. This suggests that an invariant has been broken.');
        });
    },
    ExportDefaultDeclaration: function (_node, _context) {
        return __generator(this, function (_a) {
            // Exports are handled as a separate pre-processing step in 'transformImportedFile'.
            // Subsequently, they are removed from the AST by 'removeExports' before the AST is evaluated.
            // As such, there should be no ExportDefaultDeclaration nodes in the AST.
            throw new Error('Encountered an ExportDefaultDeclaration node in the AST while evaluating. This suggests that an invariant has been broken.');
        });
    },
    ExportAllDeclaration: function (_node, _context) {
        return __generator(this, function (_a) {
            // Exports are handled as a separate pre-processing step in 'transformImportedFile'.
            // Subsequently, they are removed from the AST by 'removeExports' before the AST is evaluated.
            // As such, there should be no ExportAllDeclaration nodes in the AST.
            throw new Error('Encountered an ExportAllDeclaration node in the AST while evaluating. This suggests that an invariant has been broken.');
        });
    },
    Program: function (node, context) {
        return __generator(this, function (_a) {
            throw new Error('A program should not contain another program within itself');
        });
    }
};
// tslint:enable:object-literal-shorthand
// TODO: move to util
/**
 * Checks if `env` is empty (that is, head of env is an empty object)
 */
function isEmptyEnvironment(env) {
    return (0, lodash_1.isEmpty)(env.head);
}
/**
 * Extracts the non-empty tail environment from the given environment and
 * returns current environment if tail environment is a null.
 */
function getNonEmptyEnv(environment) {
    if (isEmptyEnvironment(environment)) {
        var tailEnvironment = environment.tail;
        if (tailEnvironment === null) {
            return environment;
        }
        return getNonEmptyEnv(tailEnvironment);
    }
    else {
        return environment;
    }
}
function evaluateProgram(program, context, checkImports, loadTabs) {
    var environment, otherNodes, moduleFunctions, _i, _a, node, moduleName, functions, _b, _c, spec, error_1, newProgram, result, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [5 /*yield**/, __values(visit(context, program))];
            case 1:
                _e.sent();
                context.numberOfOuterEnvironments += 1;
                environment = (0, exports.createBlockEnvironment)(context, 'programEnvironment');
                (0, exports.pushEnvironment)(context, environment);
                otherNodes = [];
                moduleFunctions = {};
                _e.label = 2;
            case 2:
                _e.trys.push([2, 8, , 9]);
                _i = 0, _a = program.body;
                _e.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 7];
                node = _a[_i];
                if (node.type !== 'ImportDeclaration') {
                    otherNodes.push(node);
                    return [3 /*break*/, 6];
                }
                return [5 /*yield**/, __values(visit(context, node))];
            case 4:
                _e.sent();
                moduleName = node.source.value;
                (0, assert_1.default)(typeof moduleName === 'string', "ImportDeclarations should have string sources, got ".concat(moduleName));
                if (!(moduleName in moduleFunctions)) {
                    (0, moduleLoader_1.initModuleContext)(moduleName, context, loadTabs);
                    moduleFunctions[moduleName] = (0, moduleLoader_1.loadModuleBundle)(moduleName, context, node);
                }
                functions = moduleFunctions[moduleName];
                for (_b = 0, _c = node.specifiers; _b < _c.length; _b++) {
                    spec = _c[_b];
                    (0, assert_1.default)(spec.type === 'ImportSpecifier', "Only Import Specifiers are supported, got ".concat(spec.type));
                    if (checkImports && !(spec.imported.name in functions)) {
                        throw new errors_1.UndefinedImportError(spec.imported.name, moduleName, spec);
                    }
                    declareIdentifier(context, spec.local.name, node);
                    defineVariable(context, spec.local.name, functions[spec.imported.name], true);
                }
                return [5 /*yield**/, __values(leave(context))];
            case 5:
                _e.sent();
                _e.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 3];
            case 7: return [3 /*break*/, 9];
            case 8:
                error_1 = _e.sent();
                handleRuntimeError(context, error_1);
                return [3 /*break*/, 9];
            case 9:
                newProgram = create.blockStatement(otherNodes);
                _d = forceIt;
                return [5 /*yield**/, __values(evaluateBlockStatement(context, newProgram))];
            case 10: return [5 /*yield**/, __values(_d.apply(void 0, [_e.sent(), context]))];
            case 11:
                result = _e.sent();
                return [5 /*yield**/, __values(leave(context))]; // Done visiting program
            case 12:
                _e.sent(); // Done visiting program
                if (result instanceof closure_1.default) {
                    Object.defineProperty(getNonEmptyEnv(currentEnvironment(context)).head, (0, lodash_1.uniqueId)(), {
                        value: result,
                        writable: false,
                        enumerable: true
                    });
                }
                return [2 /*return*/, result];
        }
    });
}
exports.evaluateProgram = evaluateProgram;
function evaluate(node, context) {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [5 /*yield**/, __values(visit(context, node))];
            case 1:
                _a.sent();
                return [5 /*yield**/, __values(exports.evaluators[node.type](node, context))];
            case 2:
                result = _a.sent();
                return [5 /*yield**/, __values(leave(context))];
            case 3:
                _a.sent();
                if (result instanceof closure_1.default) {
                    Object.defineProperty(getNonEmptyEnv(currentEnvironment(context)).head, (0, lodash_1.uniqueId)(), {
                        value: result,
                        writable: false,
                        enumerable: true
                    });
                }
                return [2 /*return*/, result];
        }
    });
}
function apply(context, fun, args, node, thisContext) {
    var result, total, environment, bodyEnvironment, finalArgs, _i, args_1, arg, _a, _b, e_1, loc, forcedArgs, _c, args_2, arg, _d, _e, e_2, loc, i;
    var _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                total = 0;
                _h.label = 1;
            case 1:
                if (!!(result instanceof ReturnValue)) return [3 /*break*/, 21];
                if (!(fun instanceof closure_1.default)) return [3 /*break*/, 3];
                checkNumberOfArguments(context, fun, args, node);
                environment = createEnvironment(fun, args, node);
                if (result instanceof TailCallReturnValue) {
                    replaceEnvironment(context, environment);
                }
                else {
                    (0, exports.pushEnvironment)(context, environment);
                    total++;
                }
                bodyEnvironment = (0, exports.createBlockEnvironment)(context, 'functionBodyEnvironment');
                bodyEnvironment.thisContext = thisContext;
                (0, exports.pushEnvironment)(context, bodyEnvironment);
                return [5 /*yield**/, __values(evaluateBlockStatement(context, fun.node.body))];
            case 2:
                result = _h.sent();
                popEnvironment(context);
                if (result instanceof TailCallReturnValue) {
                    fun = result.callee;
                    node = result.node;
                    args = result.args;
                }
                else if (!(result instanceof ReturnValue)) {
                    // No Return Value, set it as undefined
                    result = new ReturnValue(undefined);
                }
                return [3 /*break*/, 20];
            case 3:
                if (!(fun instanceof createContext_1.LazyBuiltIn)) return [3 /*break*/, 11];
                _h.label = 4;
            case 4:
                _h.trys.push([4, 9, , 10]);
                finalArgs = args;
                if (!fun.evaluateArgs) return [3 /*break*/, 8];
                finalArgs = [];
                _i = 0, args_1 = args;
                _h.label = 5;
            case 5:
                if (!(_i < args_1.length)) return [3 /*break*/, 8];
                arg = args_1[_i];
                _b = (_a = finalArgs).push;
                return [5 /*yield**/, __values(forceIt(arg, context))];
            case 6:
                _b.apply(_a, [_h.sent()]);
                _h.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 5];
            case 8:
                result = fun.func.apply(thisContext, finalArgs);
                return [3 /*break*/, 21];
            case 9:
                e_1 = _h.sent();
                // Recover from exception
                context.runtime.environments = context.runtime.environments.slice(-context.numberOfOuterEnvironments);
                loc = (_f = node.loc) !== null && _f !== void 0 ? _f : constants_1.UNKNOWN_LOCATION;
                if (!(e_1 instanceof runtimeSourceError_1.RuntimeSourceError || e_1 instanceof errors.ExceptionError)) {
                    // The error could've arisen when the builtin called a source function which errored.
                    // If the cause was a source error, we don't want to include the error.
                    // However if the error came from the builtin itself, we need to handle it.
                    return [2 /*return*/, handleRuntimeError(context, new errors.ExceptionError(e_1, loc))];
                }
                result = undefined;
                throw e_1;
            case 10: return [3 /*break*/, 20];
            case 11:
                if (!(typeof fun === 'function')) return [3 /*break*/, 19];
                checkNumberOfArguments(context, fun, args, node);
                _h.label = 12;
            case 12:
                _h.trys.push([12, 17, , 18]);
                forcedArgs = [];
                _c = 0, args_2 = args;
                _h.label = 13;
            case 13:
                if (!(_c < args_2.length)) return [3 /*break*/, 16];
                arg = args_2[_c];
                _e = (_d = forcedArgs).push;
                return [5 /*yield**/, __values(forceIt(arg, context))];
            case 14:
                _e.apply(_d, [_h.sent()]);
                _h.label = 15;
            case 15:
                _c++;
                return [3 /*break*/, 13];
            case 16:
                result = fun.apply(thisContext, forcedArgs);
                return [3 /*break*/, 21];
            case 17:
                e_2 = _h.sent();
                // Recover from exception
                context.runtime.environments = context.runtime.environments.slice(-context.numberOfOuterEnvironments);
                loc = (_g = node.loc) !== null && _g !== void 0 ? _g : constants_1.UNKNOWN_LOCATION;
                if (!(e_2 instanceof runtimeSourceError_1.RuntimeSourceError || e_2 instanceof errors.ExceptionError)) {
                    // The error could've arisen when the builtin called a source function which errored.
                    // If the cause was a source error, we don't want to include the error.
                    // However if the error came from the builtin itself, we need to handle it.
                    return [2 /*return*/, handleRuntimeError(context, new errors.ExceptionError(e_2, loc))];
                }
                result = undefined;
                throw e_2;
            case 18: return [3 /*break*/, 20];
            case 19: return [2 /*return*/, handleRuntimeError(context, new errors.CallingNonFunctionValue(fun, node))];
            case 20: return [3 /*break*/, 1];
            case 21:
                // Unwraps return value and release stack environment
                if (result instanceof ReturnValue) {
                    result = result.value;
                }
                for (i = 1; i <= total; i++) {
                    popEnvironment(context);
                }
                return [2 /*return*/, result];
        }
    });
}
exports.apply = apply;
