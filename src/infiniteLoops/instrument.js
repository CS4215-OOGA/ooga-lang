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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
exports.InfiniteLoopRuntimeObjectNames = exports.InfiniteLoopRuntimeFunctions = exports.instrument = exports.getOriginalName = void 0;
var astring_1 = require("astring");
var transpiler_1 = require("../transpiler/transpiler");
var create = require("../utils/astCreator");
var walkers_1 = require("../utils/walkers");
// transforms AST of program
var globalIds = {
    builtinsId: 'builtins',
    functionsId: '__InfLoopFns',
    stateId: '__InfLoopState'
};
exports.InfiniteLoopRuntimeObjectNames = globalIds;
var FunctionNames;
(function (FunctionNames) {
    FunctionNames[FunctionNames["nothingFunction"] = 0] = "nothingFunction";
    FunctionNames[FunctionNames["concretize"] = 1] = "concretize";
    FunctionNames[FunctionNames["hybridize"] = 2] = "hybridize";
    FunctionNames[FunctionNames["wrapArg"] = 3] = "wrapArg";
    FunctionNames[FunctionNames["dummify"] = 4] = "dummify";
    FunctionNames[FunctionNames["saveBool"] = 5] = "saveBool";
    FunctionNames[FunctionNames["saveVar"] = 6] = "saveVar";
    FunctionNames[FunctionNames["preFunction"] = 7] = "preFunction";
    FunctionNames[FunctionNames["returnFunction"] = 8] = "returnFunction";
    FunctionNames[FunctionNames["postLoop"] = 9] = "postLoop";
    FunctionNames[FunctionNames["enterLoop"] = 10] = "enterLoop";
    FunctionNames[FunctionNames["exitLoop"] = 11] = "exitLoop";
    FunctionNames[FunctionNames["trackLoc"] = 12] = "trackLoc";
    FunctionNames[FunctionNames["evalB"] = 13] = "evalB";
    FunctionNames[FunctionNames["evalU"] = 14] = "evalU";
})(FunctionNames || (exports.InfiniteLoopRuntimeFunctions = FunctionNames = {}));
/**
 * Renames all variables in the program to differentiate shadowed variables and
 * variables declared with the same name but in different scopes.
 *
 * E.g. "function f(f)..." -> "function f_0(f_1)..."
 * @param predefined A table of [key: string, value:string], where variables named 'key' will be renamed to 'value'
 */
function unshadowVariables(program, predefined) {
    if (predefined === void 0) { predefined = {}; }
    for (var _i = 0, _a = Object.values(globalIds); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        predefined[name_1] = name_1;
    }
    var seenIds = new Set();
    var env = [predefined];
    var genId = function (name) {
        var count = 0;
        while (seenIds.has("".concat(name, "_").concat(count)))
            count++;
        var newName = "".concat(name, "_").concat(count);
        seenIds.add(newName);
        env[0][name] = newName;
        return newName;
    };
    var unshadowFunctionInner = function (node, s, callback) {
        env.unshift(__assign({}, env[0]));
        for (var _i = 0, _a = node.params; _i < _a.length; _i++) {
            var id = _a[_i];
            id.name = genId(id.name);
        }
        callback(node.body, undefined);
        env.shift();
    };
    var doStatements = function (stmts, callback) {
        for (var _i = 0, stmts_1 = stmts; _i < stmts_1.length; _i++) {
            var stmt = stmts_1[_i];
            if (stmt.type === 'FunctionDeclaration') {
                // do hoisting first
                if (stmt.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                stmt.id.name = genId(stmt.id.name);
            }
            else if (stmt.type === 'VariableDeclaration') {
                for (var _a = 0, _b = stmt.declarations; _a < _b.length; _a++) {
                    var decl = _b[_a];
                    decl.id = decl.id;
                    var newName = genId(decl.id.name);
                    decl.id.name = newName;
                }
            }
        }
        for (var _c = 0, stmts_2 = stmts; _c < stmts_2.length; _c++) {
            var stmt = stmts_2[_c];
            callback(stmt, undefined);
        }
    };
    (0, walkers_1.recursive)(program, [{}], {
        BlockStatement: function (node, s, callback) {
            env.unshift(__assign({}, env[0]));
            doStatements(node.body, callback);
            env.shift();
        },
        VariableDeclarator: function (node, s, callback) {
            node.id = node.id;
            if (node.init) {
                callback(node.init, s);
            }
        },
        FunctionDeclaration: function (node, s, callback) {
            // note: params can shadow function name
            env.unshift(__assign({}, env[0]));
            for (var _i = 0, _a = node.params; _i < _a.length; _i++) {
                var id = _a[_i];
                id.name = genId(id.name);
            }
            callback(node.body, undefined);
            env.shift();
        },
        ForStatement: function (node, s, callback) {
            var _a;
            env.unshift(__assign({}, env[0]));
            if (((_a = node.init) === null || _a === void 0 ? void 0 : _a.type) === 'VariableDeclaration')
                doStatements([node.init], callback);
            if (node.test)
                callback(node.test, s);
            if (node.update)
                callback(node.update, s);
            callback(node.body, s);
            env.shift();
        },
        ArrowFunctionExpression: unshadowFunctionInner,
        FunctionExpression: unshadowFunctionInner,
        Identifier: function (node, _s, _callback) {
            if (env[0][node.name]) {
                node.name = env[0][node.name];
            }
            else {
                create.mutateToMemberExpression(node, create.identifier(globalIds.functionsId), create.literal(FunctionNames.nothingFunction));
                node.computed = true;
            }
        },
        AssignmentExpression: function (node, s, callback) {
            callback(node.left, s);
            callback(node.right, s);
        },
        TryStatement: function (node, s, callback) {
            if (!node.finalizer)
                return; // should not happen
            env.unshift(__assign({}, env[0]));
            doStatements(node.block.body, callback);
            doStatements(node.finalizer.body, callback);
            env.shift();
        }
    });
}
/**
 * Returns the original name of the variable before
 * it was changed during the code instrumentation process.
 */
function getOriginalName(name) {
    if (/^anon[0-9]+$/.exec(name)) {
        return '(anonymous)';
    }
    var cutAt = name.length - 1;
    while (name.charAt(cutAt) !== '_') {
        cutAt--;
        if (cutAt < 0)
            return '(error)';
    }
    return name.slice(0, cutAt);
}
exports.getOriginalName = getOriginalName;
function callFunction(fun) {
    return create.memberExpression(create.identifier(globalIds.functionsId), fun);
}
/**
 * Wrap each argument in every call expression.
 *
 * E.g. "f(x,y)" -> "f(wrap(x), wrap(y))".
 * Ensures we do not test functions passed as arguments
 * for infinite loops.
 */
function wrapCallArguments(program) {
    (0, walkers_1.simple)(program, {
        CallExpression: function (node) {
            if (node.callee.type === 'MemberExpression')
                return;
            for (var _i = 0, _a = node.arguments; _i < _a.length; _i++) {
                var arg = _a[_i];
                create.mutateToCallExpression(arg, callFunction(FunctionNames.wrapArg), [
                    __assign({}, arg),
                    create.identifier(globalIds.stateId)
                ]);
            }
        }
    });
}
/**
 * Turn all "is_null(x)" calls to "is_null(x, stateId)" to
 * facilitate checking of infinite streams in stream mode.
 */
function addStateToIsNull(program) {
    (0, walkers_1.simple)(program, {
        CallExpression: function (node) {
            if (node.callee.type === 'Identifier' && node.callee.name === 'is_null_0') {
                node.arguments.push(create.identifier(globalIds.stateId));
            }
        }
    });
}
/**
 * Changes logical expressions to the corresponding conditional.
 * Reduces the number of types of expressions we have to consider
 * for the rest of the code transformations.
 *
 * E.g. "x && y" -> "x ? y : false"
 */
function transformLogicalExpressions(program) {
    (0, walkers_1.simple)(program, {
        LogicalExpression: function (node) {
            if (node.operator === '&&') {
                create.mutateToConditionalExpression(node, node.left, node.right, create.literal(false));
            }
            else {
                create.mutateToConditionalExpression(node, node.left, create.literal(true), node.right);
            }
        }
    });
}
/**
 * Changes -ary operations to functions that accept hybrid values as arguments.
 * E.g. "1+1" -> "functions.evalB('+',1,1)"
 */
function hybridizeBinaryUnaryOperations(program) {
    (0, walkers_1.simple)(program, {
        BinaryExpression: function (node) {
            var operator = node.operator, left = node.left, right = node.right;
            create.mutateToCallExpression(node, callFunction(FunctionNames.evalB), [
                create.literal(operator),
                left,
                right
            ]);
        },
        UnaryExpression: function (node) {
            var _a = node, operator = _a.operator, argument = _a.argument;
            create.mutateToCallExpression(node, callFunction(FunctionNames.evalU), [
                create.literal(operator),
                argument
            ]);
        }
    });
}
function hybridizeVariablesAndLiterals(program) {
    (0, walkers_1.recursive)(program, true, {
        Identifier: function (node, state, _callback) {
            if (state) {
                create.mutateToCallExpression(node, callFunction(FunctionNames.hybridize), [
                    create.identifier(node.name),
                    create.literal(node.name),
                    create.identifier(globalIds.stateId)
                ]);
            }
        },
        Literal: function (node, state, _callback) {
            if (state && (typeof node.value === 'boolean' || typeof node.value === 'number')) {
                create.mutateToCallExpression(node, callFunction(FunctionNames.dummify), [
                    create.literal(node.value)
                ]);
            }
        },
        CallExpression: function (node, state, callback) {
            // ignore callee
            for (var _i = 0, _a = node.arguments; _i < _a.length; _i++) {
                var arg = _a[_i];
                callback(arg, state);
            }
        },
        MemberExpression: function (node, state, callback) {
            if (!node.computed)
                return;
            callback(node.object, false);
            callback(node.property, false);
            create.mutateToCallExpression(node.object, callFunction(FunctionNames.concretize), [
                __assign({}, node.object)
            ]);
            create.mutateToCallExpression(node.property, callFunction(FunctionNames.concretize), [
                __assign({}, node.property)
            ]);
        }
    });
}
/**
 * Wraps the RHS of variable assignment with a function to track it.
 * E.g. "x = x + 1;" -> "x = saveVar(x + 1, 'x', state)".
 * saveVar should return the result of "x + 1".
 *
 * For assignments to elements of arrays we concretize the RHS.
 * E.g. "a[1] = y;" -> "a[1] = concretize(y);"
 */
function trackVariableAssignment(program) {
    (0, walkers_1.simple)(program, {
        AssignmentExpression: function (node) {
            if (node.left.type === 'Identifier') {
                node.right = create.callExpression(callFunction(FunctionNames.saveVar), [
                    node.right,
                    create.literal(node.left.name),
                    create.identifier(globalIds.stateId)
                ]);
            }
            else if (node.left.type === 'MemberExpression') {
                node.right = create.callExpression(callFunction(FunctionNames.concretize), [
                    __assign({}, node.right)
                ]);
            }
        }
    });
}
/**
 * Replaces the test of the node with a function to track the result in the state.
 *
 * E.g. "x===0 ? 1 : 0;" -> "saveBool(x === 0, state) ? 1 : 0;".
 * saveBool should return the result of "x === 0"
 */
function saveTheTest(node) {
    if (node.test === null || node.test === undefined) {
        return;
    }
    var newTest = create.callExpression(callFunction(FunctionNames.saveBool), [
        node.test,
        create.identifier(globalIds.stateId)
    ]);
    node.test = newTest;
}
/**
 * Mutates a node in-place, turning it into a block statement.
 * @param node Node to mutate.
 * @param prepend Optional statement to prepend in the result.
 * @param append Optional statement to append in the result.
 */
function inPlaceEnclose(node, prepend, append) {
    var shallowCopy = __assign({}, node);
    node.type = 'BlockStatement';
    node = node;
    node.body = [shallowCopy];
    if (prepend !== undefined) {
        node.body.unshift(prepend);
    }
    if (append !== undefined) {
        node.body.push(append);
    }
}
/**
 * Add tracking to if statements and conditional expressions in the state using saveTheTest.
 */
function trackIfStatements(program) {
    var theFunction = function (node) { return saveTheTest(node); };
    (0, walkers_1.simple)(program, { IfStatement: theFunction, ConditionalExpression: theFunction });
}
/**
 * Tracks loop iterations by adding saveTheTest, postLoop functions.
 * postLoop will be executed after the body (and the update if it is a for loop).
 * Also adds enter/exitLoop before/after the loop.
 *
 * E.g. "for(let i=0;i<10;i=i+1) {display(i);}"
 *      -> "enterLoop(state);
 *          for(let i=0;i<10; postLoop(state, i=i+1)) {display(i);};
 *          exitLoop(state);"
 * Where postLoop should return the value of its (optional) second argument.
 */
function trackLoops(program) {
    var makeCallStatement = function (name, args) {
        return create.expressionStatement(create.callExpression(callFunction(name), args));
    };
    var stateExpr = create.identifier(globalIds.stateId);
    (0, walkers_1.simple)(program, {
        WhileStatement: function (node) {
            saveTheTest(node);
            inPlaceEnclose(node.body, undefined, makeCallStatement(FunctionNames.postLoop, [stateExpr]));
            inPlaceEnclose(node, makeCallStatement(FunctionNames.enterLoop, [stateExpr]), makeCallStatement(FunctionNames.exitLoop, [stateExpr]));
        },
        ForStatement: function (node) {
            saveTheTest(node);
            var theUpdate = node.update ? node.update : create.identifier('undefined');
            node.update = create.callExpression(callFunction(FunctionNames.postLoop), [
                stateExpr,
                theUpdate
            ]);
            inPlaceEnclose(node, makeCallStatement(FunctionNames.enterLoop, [stateExpr]), makeCallStatement(FunctionNames.exitLoop, [stateExpr]));
        }
    });
}
/**
 * Tracks function iterations by adding preFunction and returnFunction functions.
 * preFunction is prepended to every function body, and returnFunction is used to
 * wrap the argument of return statements.
 *
 * E.g. "function f(x) {return x;}"
 *      -> "function f(x) {
 *            preFunction('f',[x], state);
 *            return returnFunction(x, state);
 *         }"
 * where returnFunction should return its first argument 'x'.
 */
function trackFunctions(program) {
    var preFunction = function (name, params) {
        var args = params
            .filter(function (x) { return x.type === 'Identifier'; })
            .map(function (x) { return x.name; })
            .map(function (x) { return create.arrayExpression([create.literal(x), create.identifier(x)]); });
        return create.expressionStatement(create.callExpression(callFunction(FunctionNames.preFunction), [
            create.literal(name),
            create.arrayExpression(args),
            create.identifier(globalIds.stateId)
        ]));
    };
    var counter = 0;
    var anonFunction = function (node) {
        if (node.body.type !== 'BlockStatement') {
            create.mutateToReturnStatement(node.body, __assign({}, node.body));
        }
        inPlaceEnclose(node.body, preFunction("anon".concat(counter++), node.params));
    };
    (0, walkers_1.simple)(program, {
        ArrowFunctionExpression: anonFunction,
        FunctionExpression: anonFunction,
        FunctionDeclaration: function (node) {
            if (node.id === null) {
                throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
            }
            var name = node.id.name;
            inPlaceEnclose(node.body, preFunction(name, node.params));
        }
    });
    (0, walkers_1.simple)(program, {
        ReturnStatement: function (node) {
            var hasNoArgs = node.argument === null || node.argument === undefined;
            var arg = hasNoArgs ? create.identifier('undefined') : node.argument;
            var argsForCall = [arg, create.identifier(globalIds.stateId)];
            node.argument = create.callExpression(callFunction(FunctionNames.returnFunction), argsForCall);
        }
    });
}
function builtinsToStmts(builtins) {
    var makeDecl = function (name) {
        return create.declaration(name, 'const', create.callExpression(create.memberExpression(create.identifier(globalIds.builtinsId), 'get'), [create.literal(name)]));
    };
    return __spreadArray([], builtins, true).map(makeDecl);
}
/**
 * Make all variables in the 'try' block function-scoped so they
 * can be accessed in the 'finally' block
 */
function toVarDeclaration(stmt) {
    (0, walkers_1.simple)(stmt, {
        VariableDeclaration: function (node) {
            node.kind = 'var';
        }
    });
}
/**
 * There may have been other programs run in the REPL. This hack
 * 'combines' the other programs and the current program into a single
 * large program by enclosing the past programs in 'try' blocks, and the
 * current program in a 'finally' block. Any errors (including detected
 * infinite loops) in the past code will be ignored in the empty 'catch'
 * block.
 */
function wrapOldCode(current, toWrap) {
    for (var _i = 0, toWrap_1 = toWrap; _i < toWrap_1.length; _i++) {
        var stmt = toWrap_1[_i];
        toVarDeclaration(stmt);
    }
    var tryStmt = {
        type: 'TryStatement',
        block: create.blockStatement(__spreadArray([], toWrap, true)),
        handler: {
            type: 'CatchClause',
            param: create.identifier('e'),
            body: create.blockStatement([])
        },
        finalizer: create.blockStatement(__spreadArray([], current.body, true))
    };
    current.body = [tryStmt];
}
function makePositions(position) {
    return create.objectExpression([
        create.property('line', create.literal(position.line)),
        create.property('column', create.literal(position.column))
    ]);
}
function savePositionAsExpression(loc) {
    if (loc !== undefined && loc !== null) {
        return create.objectExpression([
            create.property('start', makePositions(loc.start)),
            create.property('end', makePositions(loc.end))
        ]);
    }
    else {
        return create.identifier('undefined');
    }
}
/**
 * Wraps every callExpression and prepends every loop body
 * with a function that saves the callExpression/loop's SourceLocation
 * (line number etc) in the state. This location will be used in the
 * error given to the user.
 *
 * E.g. "f(x);" -> "trackLoc({position object}, state, ()=>f(x))".
 * where trackLoc should return the result of "(()=>f(x))();".
 */
function trackLocations(program) {
    // Note: only add locations for most recently entered code
    var trackerFn = callFunction(FunctionNames.trackLoc);
    var stateExpr = create.identifier(globalIds.stateId);
    var doLoops = function (node, _state, _callback) {
        inPlaceEnclose(node.body, create.expressionStatement(create.callExpression(trackerFn, [savePositionAsExpression(node.loc), stateExpr])));
    };
    (0, walkers_1.recursive)(program, undefined, {
        CallExpression: function (node, _state, _callback) {
            if (node.callee.type === 'MemberExpression')
                return;
            var copy = __assign({}, node);
            var lazyCall = create.arrowFunctionExpression([], copy);
            create.mutateToCallExpression(node, trackerFn, [
                savePositionAsExpression(node.loc),
                stateExpr,
                lazyCall
            ]);
        },
        ForStatement: doLoops,
        WhileStatement: doLoops
    });
}
function handleImports(programs) {
    return __awaiter(this, void 0, void 0, function () {
        var transformed, _a, prefixes, imports;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all(programs.map(function (program) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, prefixToAdd, importsToAdd, otherNodes, importedNames;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, (0, transpiler_1.transformImportDeclarations)(program, new Set(), {
                                        wrapSourceModules: false,
                                        checkImports: false,
                                        loadTabs: false
                                    })];
                                case 1:
                                    _a = _b.sent(), prefixToAdd = _a[0], importsToAdd = _a[1], otherNodes = _a[2];
                                    program.body = importsToAdd.concat(otherNodes);
                                    importedNames = importsToAdd.flatMap(function (node) {
                                        return node.declarations.map(function (decl) { return decl.init.object.name; });
                                    });
                                    return [2 /*return*/, [prefixToAdd, importedNames]];
                            }
                        });
                    }); }))];
                case 1:
                    transformed = _b.sent();
                    _a = transformed.reduce(function (_a, _b) {
                        var prefixes = _a[0], moduleNames = _a[1];
                        var prefix = _b[0], importedNames = _b[1];
                        return [
                            __spreadArray(__spreadArray([], prefixes, true), [prefix], false),
                            __spreadArray(__spreadArray([], moduleNames, true), importedNames, true)
                        ];
                    }, [[], []]), prefixes = _a[0], imports = _a[1];
                    return [2 /*return*/, [prefixes.join('\n'), __spreadArray([], new Set(imports), true)]];
            }
        });
    });
}
/**
 * Instruments the given code with functions that track the state of the program.
 *
 * @param previous programs that were previously executed in the REPL, most recent first (at ix 0).
 * @param program most recent program executed.
 * @param builtins Names of builtin functions.
 * @returns code with instrumentations.
 */
function instrument(previous, program, builtins) {
    return __awaiter(this, void 0, void 0, function () {
        var builtinsId, functionsId, stateId, predefined, innerProgram, _a, prefix, moduleNames, _i, moduleNames_1, name_2, _b, previous_1, toWrap, code;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    builtinsId = globalIds.builtinsId, functionsId = globalIds.functionsId, stateId = globalIds.stateId;
                    predefined = {};
                    predefined[builtinsId] = builtinsId;
                    predefined[functionsId] = functionsId;
                    predefined[stateId] = stateId;
                    innerProgram = __assign({}, program);
                    return [4 /*yield*/, handleImports([program].concat(previous))];
                case 1:
                    _a = _c.sent(), prefix = _a[0], moduleNames = _a[1];
                    for (_i = 0, moduleNames_1 = moduleNames; _i < moduleNames_1.length; _i++) {
                        name_2 = moduleNames_1[_i];
                        predefined[name_2] = name_2;
                    }
                    for (_b = 0, previous_1 = previous; _b < previous_1.length; _b++) {
                        toWrap = previous_1[_b];
                        wrapOldCode(program, toWrap.body);
                    }
                    wrapOldCode(program, builtinsToStmts(builtins));
                    unshadowVariables(program, predefined);
                    transformLogicalExpressions(program);
                    hybridizeBinaryUnaryOperations(program);
                    hybridizeVariablesAndLiterals(program);
                    // tracking functions: add functions to record runtime data.
                    trackVariableAssignment(program);
                    trackIfStatements(program);
                    trackLoops(program);
                    trackFunctions(program);
                    trackLocations(innerProgram);
                    addStateToIsNull(program);
                    wrapCallArguments(program);
                    code = (0, astring_1.generate)(program);
                    return [2 /*return*/, prefix + code];
            }
        });
    });
}
exports.instrument = instrument;
