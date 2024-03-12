"use strict";
// Variable determining chapter of Source is contained in this file.
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
exports.importBuiltins = exports.importExternalSymbols = exports.defineBuiltin = exports.defineSymbol = exports.ensureGlobalEnvironmentExist = exports.createEmptyContext = exports.createGlobalEnvironment = exports.EnvTreeNode = exports.EnvTree = exports.LazyBuiltIn = void 0;
var constants_1 = require("./constants");
var continuations_1 = require("./cse-machine/continuations");
var gpu_lib = require("./gpu/lib");
var schedulers_1 = require("./schedulers");
var scheme_libs = require("./scm-slang/src/stdlib/source-scheme-library");
var lazyList_prelude_1 = require("./stdlib/lazyList.prelude");
var list = require("./stdlib/list");
var list_1 = require("./stdlib/list");
var list_prelude_1 = require("./stdlib/list.prelude");
var localImport_prelude_1 = require("./stdlib/localImport.prelude");
var misc = require("./stdlib/misc");
var non_det_prelude_1 = require("./stdlib/non-det.prelude");
var parser = require("./stdlib/parser");
var stream = require("./stdlib/stream");
var stream_prelude_1 = require("./stdlib/stream.prelude");
var utils_1 = require("./typeChecker/utils");
var types_1 = require("./types");
var makeWrapper_1 = require("./utils/makeWrapper");
var operators = require("./utils/operators");
var stringify_1 = require("./utils/stringify");
var LazyBuiltIn = /** @class */ (function () {
    function LazyBuiltIn(func, evaluateArgs) {
        this.func = func;
        this.evaluateArgs = evaluateArgs;
    }
    return LazyBuiltIn;
}());
exports.LazyBuiltIn = LazyBuiltIn;
var EnvTree = /** @class */ (function () {
    function EnvTree() {
        this._root = null;
        this.map = new Map();
    }
    Object.defineProperty(EnvTree.prototype, "root", {
        get: function () {
            return this._root;
        },
        enumerable: false,
        configurable: true
    });
    EnvTree.prototype.insert = function (environment) {
        var tailEnvironment = environment.tail;
        if (tailEnvironment === null) {
            if (this._root === null) {
                this._root = new EnvTreeNode(environment, null);
                this.map.set(environment, this._root);
            }
        }
        else {
            var parentNode = this.map.get(tailEnvironment);
            if (parentNode) {
                var childNode = new EnvTreeNode(environment, parentNode);
                parentNode.addChild(childNode);
                this.map.set(environment, childNode);
            }
        }
    };
    EnvTree.prototype.getTreeNode = function (environment) {
        return this.map.get(environment);
    };
    return EnvTree;
}());
exports.EnvTree = EnvTree;
var EnvTreeNode = /** @class */ (function () {
    function EnvTreeNode(environment, parent) {
        this.environment = environment;
        this.parent = parent;
        this._children = [];
    }
    Object.defineProperty(EnvTreeNode.prototype, "children", {
        get: function () {
            return this._children;
        },
        enumerable: false,
        configurable: true
    });
    EnvTreeNode.prototype.resetChildren = function (newChildren) {
        var _this = this;
        this.clearChildren();
        this.addChildren(newChildren);
        newChildren.forEach(function (c) { return (c.parent = _this); });
    };
    EnvTreeNode.prototype.clearChildren = function () {
        this._children = [];
    };
    EnvTreeNode.prototype.addChildren = function (newChildren) {
        var _a;
        (_a = this._children).push.apply(_a, newChildren);
    };
    EnvTreeNode.prototype.addChild = function (newChild) {
        this._children.push(newChild);
        return newChild;
    };
    return EnvTreeNode;
}());
exports.EnvTreeNode = EnvTreeNode;
var createEmptyRuntime = function () { return ({
    break: false,
    debuggerOn: true,
    isRunning: false,
    environmentTree: new EnvTree(),
    environments: [],
    value: undefined,
    nodes: [],
    control: null,
    stash: null,
    envSteps: -1,
    envStepsTotal: 0,
    breakpointSteps: []
}); };
var createEmptyDebugger = function () { return ({
    observers: { callbacks: Array() },
    status: false,
    state: {
        it: (function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        })(),
        scheduler: new schedulers_1.AsyncScheduler()
    }
}); };
var createGlobalEnvironment = function () { return ({
    tail: null,
    name: 'global',
    head: {},
    id: '-1'
}); };
exports.createGlobalEnvironment = createGlobalEnvironment;
var createNativeStorage = function () { return ({
    builtins: new Map(),
    previousProgramsIdentifiers: new Set(),
    operators: new Map(Object.entries(operators)),
    gpu: new Map(Object.entries(gpu_lib)),
    maxExecTime: constants_1.JSSLANG_PROPERTIES.maxExecTime,
    evaller: null
}); };
var createEmptyContext = function (chapter, variant, externalSymbols, externalContext) {
    if (variant === void 0) { variant = types_1.Variant.DEFAULT; }
    return {
        chapter: chapter,
        externalSymbols: externalSymbols,
        errors: [],
        externalContext: externalContext,
        runtime: createEmptyRuntime(),
        numberOfOuterEnvironments: 1,
        prelude: null,
        debugger: createEmptyDebugger(),
        nativeStorage: createNativeStorage(),
        executionMethod: 'auto',
        variant: variant,
        moduleContexts: {},
        unTypecheckedCode: [],
        typeEnvironment: (0, utils_1.createTypeEnvironment)(chapter),
        previousPrograms: [],
        shouldIncreaseEvaluationTimeout: false
    };
};
exports.createEmptyContext = createEmptyContext;
var ensureGlobalEnvironmentExist = function (context) {
    if (!context.runtime) {
        context.runtime = createEmptyRuntime();
    }
    if (!context.runtime.environments) {
        context.runtime.environments = [];
    }
    if (!context.runtime.environmentTree) {
        context.runtime.environmentTree = new EnvTree();
    }
    if (context.runtime.environments.length === 0) {
        var globalEnvironment = (0, exports.createGlobalEnvironment)();
        context.runtime.environments.push(globalEnvironment);
        context.runtime.environmentTree.insert(globalEnvironment);
    }
};
exports.ensureGlobalEnvironmentExist = ensureGlobalEnvironmentExist;
var defineSymbol = function (context, name, value) {
    var globalEnvironment = context.runtime.environments[0];
    Object.defineProperty(globalEnvironment.head, name, {
        value: value,
        writable: false,
        enumerable: true
    });
    context.nativeStorage.builtins.set(name, value);
    var typeEnv = context.typeEnvironment[0];
    // if the global type env doesn't already have the imported symbol,
    // we set it to a type var T that can typecheck with anything.
    if (!typeEnv.declKindMap.has(name)) {
        typeEnv.typeMap.set(name, (0, utils_1.tForAll)((0, utils_1.tVar)('T1')));
        typeEnv.declKindMap.set(name, 'const');
    }
};
exports.defineSymbol = defineSymbol;
// Defines a builtin in the given context
// If the builtin is a function, wrap it such that its toString hides the implementation
function defineBuiltin(context, name, value, minArgsNeeded) {
    if (minArgsNeeded === void 0) { minArgsNeeded = undefined; }
    if (typeof value === 'function') {
        var funName = name.split('(')[0].trim();
        var repr_1 = "function ".concat(name, " {\n\t[implementation hidden]\n}");
        value.toString = function () { return repr_1; };
        value.minArgsNeeded = minArgsNeeded;
        (0, exports.defineSymbol)(context, funName, value);
    }
    else if (value instanceof LazyBuiltIn) {
        var wrapped = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return value.func.apply(value, args);
        };
        var funName = name.split('(')[0].trim();
        var repr_2 = "function ".concat(name, " {\n\t[implementation hidden]\n}");
        wrapped.toString = function () { return repr_2; };
        (0, makeWrapper_1.makeWrapper)(value.func, wrapped);
        (0, exports.defineSymbol)(context, funName, new LazyBuiltIn(wrapped, value.evaluateArgs));
    }
    else {
        (0, exports.defineSymbol)(context, name, value);
    }
}
exports.defineBuiltin = defineBuiltin;
var importExternalSymbols = function (context, externalSymbols) {
    (0, exports.ensureGlobalEnvironmentExist)(context);
    externalSymbols.forEach(function (symbol) {
        (0, exports.defineSymbol)(context, symbol, constants_1.GLOBAL[symbol]);
    });
};
exports.importExternalSymbols = importExternalSymbols;
/**
 * Imports builtins from standard and external libraries.
 */
var importBuiltins = function (context, externalBuiltIns) {
    (0, exports.ensureGlobalEnvironmentExist)(context);
    var rawDisplay = function (v) {
        var s = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            s[_i - 1] = arguments[_i];
        }
        return externalBuiltIns.rawDisplay(v, s[0], context.externalContext);
    };
    var display = function (v) {
        var s = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            s[_i - 1] = arguments[_i];
        }
        if (s.length === 1 && s[0] !== undefined && typeof s[0] !== 'string') {
            throw new TypeError('display expects the second argument to be a string');
        }
        return rawDisplay((0, stringify_1.stringify)(v), s[0]), v;
    };
    var displayList = function (v) {
        var s = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            s[_i - 1] = arguments[_i];
        }
        if (s.length === 1 && s[0] !== undefined && typeof s[0] !== 'string') {
            throw new TypeError('display_list expects the second argument to be a string');
        }
        return list.rawDisplayList(display, v, s[0]);
    };
    var prompt = function (v) {
        var start = Date.now();
        var promptResult = externalBuiltIns.prompt(v, '', context.externalContext);
        context.nativeStorage.maxExecTime += Date.now() - start;
        return promptResult;
    };
    var alert = function (v) {
        var start = Date.now();
        externalBuiltIns.alert(v, '', context.externalContext);
        context.nativeStorage.maxExecTime += Date.now() - start;
    };
    var visualiseList = function () {
        var v = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            v[_i] = arguments[_i];
        }
        externalBuiltIns.visualiseList(v, context.externalContext);
        return v[0];
    };
    if (context.chapter >= 1) {
        defineBuiltin(context, 'get_time()', misc.get_time);
        defineBuiltin(context, 'display(val, prepend = undefined)', display, 1);
        defineBuiltin(context, 'raw_display(str, prepend = undefined)', rawDisplay, 1);
        defineBuiltin(context, 'stringify(val, indent = 2, maxLineLength = 80)', stringify_1.stringify, 1);
        defineBuiltin(context, 'error(str, prepend = undefined)', misc.error_message, 1);
        defineBuiltin(context, 'prompt(str)', prompt);
        defineBuiltin(context, 'is_number(val)', misc.is_number);
        defineBuiltin(context, 'is_string(val)', misc.is_string);
        defineBuiltin(context, 'is_function(val)', misc.is_function);
        defineBuiltin(context, 'is_boolean(val)', misc.is_boolean);
        defineBuiltin(context, 'is_undefined(val)', misc.is_undefined);
        defineBuiltin(context, 'parse_int(str, radix)', misc.parse_int);
        defineBuiltin(context, 'char_at(str, index)', misc.char_at);
        defineBuiltin(context, 'arity(f)', misc.arity);
        defineBuiltin(context, 'undefined', undefined);
        defineBuiltin(context, 'NaN', NaN);
        defineBuiltin(context, 'Infinity', Infinity);
        // Define all Math libraries
        var mathLibraryNames = Object.getOwnPropertyNames(Math);
        // Short param names for stringified version of math functions
        var parameterNames = __spreadArray([], 'abcdefghijklmnopqrstuvwxyz', true);
        for (var _i = 0, mathLibraryNames_1 = mathLibraryNames; _i < mathLibraryNames_1.length; _i++) {
            var name_1 = mathLibraryNames_1[_i];
            var value = Math[name_1];
            if (typeof value === 'function') {
                var paramString = void 0;
                var minArgsNeeded = undefined;
                if (name_1 === 'max' || name_1 === 'min') {
                    paramString = '...values';
                    minArgsNeeded = 0;
                }
                else {
                    paramString = parameterNames.slice(0, value.length).join(', ');
                }
                defineBuiltin(context, "math_".concat(name_1, "(").concat(paramString, ")"), value, minArgsNeeded);
            }
            else {
                defineBuiltin(context, "math_".concat(name_1), value);
            }
        }
    }
    if (context.chapter >= 2) {
        // List library
        if (context.variant === types_1.Variant.LAZY) {
            defineBuiltin(context, 'pair(left, right)', new LazyBuiltIn(list.pair, false));
            defineBuiltin(context, 'list(...values)', new LazyBuiltIn(list.list, false), 0);
            defineBuiltin(context, 'is_pair(val)', new LazyBuiltIn(list.is_pair, true));
            defineBuiltin(context, 'head(xs)', new LazyBuiltIn(list.head, true));
            defineBuiltin(context, 'tail(xs)', new LazyBuiltIn(list.tail, true));
            defineBuiltin(context, 'is_null(val)', new LazyBuiltIn(list.is_null, true));
            defineBuiltin(context, 'draw_data(...xs)', new LazyBuiltIn(visualiseList, true), 1);
            defineBuiltin(context, 'is_list(val)', new LazyBuiltIn(list.is_list, true));
        }
        else {
            defineBuiltin(context, 'pair(left, right)', list.pair);
            defineBuiltin(context, 'is_pair(val)', list.is_pair);
            defineBuiltin(context, 'head(xs)', list.head);
            defineBuiltin(context, 'tail(xs)', list.tail);
            defineBuiltin(context, 'is_null(val)', list.is_null);
            defineBuiltin(context, 'list(...values)', list.list, 0);
            defineBuiltin(context, 'draw_data(...xs)', visualiseList, 1);
            defineBuiltin(context, 'display_list(val, prepend = undefined)', displayList, 0);
            defineBuiltin(context, 'is_list(val)', list.is_list);
        }
    }
    if (context.chapter >= 3) {
        defineBuiltin(context, 'set_head(xs, val)', list.set_head);
        defineBuiltin(context, 'set_tail(xs, val)', list.set_tail);
        defineBuiltin(context, 'array_length(arr)', misc.array_length);
        defineBuiltin(context, 'is_array(val)', misc.is_array);
        // Stream library
        defineBuiltin(context, 'stream_tail(stream)', stream.stream_tail);
        defineBuiltin(context, 'stream(...values)', stream.stream, 0);
    }
    if (context.chapter >= 4) {
        defineBuiltin(context, 'parse(program_string)', function (str) {
            return parser.parse(str, createContext(context.chapter));
        });
        defineBuiltin(context, 'tokenize(program_string)', function (str) {
            return parser.tokenize(str, createContext(context.chapter));
        });
        defineBuiltin(context, 'apply_in_underlying_javascript(fun, args)', 
        // tslint:disable-next-line:ban-types
        function (fun, args) { return fun.apply(fun, (0, list_1.list_to_vector)(args)); });
        if (context.variant === types_1.Variant.GPU) {
            defineBuiltin(context, '__clearKernelCache()', gpu_lib.__clearKernelCache);
            defineBuiltin(context, '__createKernelSource(shape, extern, localNames, output, fun, kernelId)', gpu_lib.__createKernelSource);
        }
    }
    if (context.chapter === types_1.Chapter.LIBRARY_PARSER) {
        defineBuiltin(context, 'is_object(val)', misc.is_object);
        defineBuiltin(context, 'is_NaN(val)', misc.is_NaN);
        defineBuiltin(context, 'has_own_property(obj, prop)', misc.has_own_property);
        defineBuiltin(context, 'alert(val)', alert);
        // tslint:disable-next-line:ban-types
        defineBuiltin(context, 'timed(fun)', function (f) {
            return misc.timed(context, f, context.externalContext, externalBuiltIns.rawDisplay);
        });
    }
    if (context.variant === types_1.Variant.LAZY) {
        defineBuiltin(context, 'wrapLazyCallee(f)', new LazyBuiltIn(operators.wrapLazyCallee, true));
        defineBuiltin(context, 'makeLazyFunction(f)', new LazyBuiltIn(operators.makeLazyFunction, true));
        defineBuiltin(context, 'forceIt(val)', new LazyBuiltIn(operators.forceIt, true));
        defineBuiltin(context, 'delayIt(xs)', new LazyBuiltIn(operators.delayIt, true));
    }
    if (context.chapter <= +types_1.Chapter.SCHEME_1 && context.chapter >= +types_1.Chapter.FULL_SCHEME) {
        switch (context.chapter) {
            case types_1.Chapter.FULL_SCHEME:
                // Introduction to call/cc
                defineBuiltin(context, 'call$47$cc(f)', continuations_1.call_with_current_continuation);
            case types_1.Chapter.SCHEME_4:
                // Introduction to eval
                // Scheme apply
                defineBuiltin(context, 'apply(f, ...args)', scheme_libs.apply, 2);
            case types_1.Chapter.SCHEME_3:
                // Introduction to mutable values, streams
                // Scheme pair mutation
                defineBuiltin(context, 'set$45$car$33$(pair, val)', scheme_libs.set_carB);
                defineBuiltin(context, 'set$45$cdr$33$(pair, val)', scheme_libs.set_cdrB);
                // Scheme list mutation
                defineBuiltin(context, 'list$45$set$33$(xs, n, val)', scheme_libs.list_setB);
                //defineBuiltin(context, 'filter$33$(pred, xs)', scheme_libs.filterB);
                // Scheme promises
                defineBuiltin(context, 'promise$63$()', scheme_libs.promiseQ);
                defineBuiltin(context, 'force(p)', scheme_libs.force);
            case types_1.Chapter.SCHEME_2:
                // Scheme pairs
                defineBuiltin(context, 'cons(left, right)', scheme_libs.cons);
                defineBuiltin(context, 'pair$63$(val)', scheme_libs.pairQ);
                defineBuiltin(context, 'car(xs)', scheme_libs.car);
                defineBuiltin(context, 'cdr(xs)', scheme_libs.cdr);
                // Scheme lists
                defineBuiltin(context, 'make$45$list(n, val)', scheme_libs.make_list, 1);
                defineBuiltin(context, 'list(...values)', scheme_libs.list, 0);
                defineBuiltin(context, 'list$63$(val)', scheme_libs.listQ);
                defineBuiltin(context, 'null$63$(val)', scheme_libs.nullQ);
                defineBuiltin(context, 'length(xs)', scheme_libs.length);
                defineBuiltin(context, 'append(...xs)', scheme_libs.append, 0);
                defineBuiltin(context, 'reverse(xs)', scheme_libs.reverse);
                defineBuiltin(context, 'list$45$tail(xs, n)', scheme_libs.list_tail);
                defineBuiltin(context, 'list$45$ref(xs, n)', scheme_libs.list_ref);
                defineBuiltin(context, 'memq(item, xs)', scheme_libs.memq);
                defineBuiltin(context, 'memv(item, xs)', scheme_libs.memv);
                defineBuiltin(context, 'member(item, xs)', scheme_libs.member);
                defineBuiltin(context, 'assq(item, xs)', scheme_libs.assq);
                defineBuiltin(context, 'assv(item, xs)', scheme_libs.assv);
                defineBuiltin(context, 'assoc(item, xs)', scheme_libs.assoc);
                defineBuiltin(context, 'list$45$copy(xs)', scheme_libs.list_copy);
                defineBuiltin(context, 'map(f, ...xs)', scheme_libs.map, 1);
                defineBuiltin(context, 'filter(pred, xs)', scheme_libs.filter);
                defineBuiltin(context, 'fold(f, init, ...xs)', scheme_libs.fold, 2);
                defineBuiltin(context, 'fold$45$right(f, init, ...xs)', scheme_libs.fold_right, 2);
                defineBuiltin(context, 'reduce(f, rIdentity, xs)', scheme_libs.reduce);
                // Scheme cxrs
                // Probably can do this better.
                defineBuiltin(context, 'caar(xs)', scheme_libs.caar);
                defineBuiltin(context, 'cadr(xs)', scheme_libs.cadr);
                defineBuiltin(context, 'cdar(xs)', scheme_libs.cdar);
                defineBuiltin(context, 'cddr(xs)', scheme_libs.cddr);
                defineBuiltin(context, 'caaar(xs)', scheme_libs.caaar);
                defineBuiltin(context, 'caadr(xs)', scheme_libs.caadr);
                defineBuiltin(context, 'cadar(xs)', scheme_libs.cadar);
                defineBuiltin(context, 'caddr(xs)', scheme_libs.caddr);
                defineBuiltin(context, 'cdaar(xs)', scheme_libs.cdaar);
                defineBuiltin(context, 'cdadr(xs)', scheme_libs.cdadr);
                defineBuiltin(context, 'cddar(xs)', scheme_libs.cddar);
                defineBuiltin(context, 'cdddr(xs)', scheme_libs.cdddr);
                defineBuiltin(context, 'caaaar(xs)', scheme_libs.caaaar);
                defineBuiltin(context, 'caaadr(xs)', scheme_libs.caaadr);
                defineBuiltin(context, 'caadar(xs)', scheme_libs.caadar);
                defineBuiltin(context, 'caaddr(xs)', scheme_libs.caaddr);
                defineBuiltin(context, 'cadaar(xs)', scheme_libs.cadaar);
                defineBuiltin(context, 'cadadr(xs)', scheme_libs.cadadr);
                defineBuiltin(context, 'caddar(xs)', scheme_libs.caddar);
                defineBuiltin(context, 'cadddr(xs)', scheme_libs.cadddr);
                defineBuiltin(context, 'cdaaar(xs)', scheme_libs.cdaaar);
                defineBuiltin(context, 'cdaadr(xs)', scheme_libs.cdaadr);
                defineBuiltin(context, 'cdadar(xs)', scheme_libs.cdadar);
                defineBuiltin(context, 'cdaddr(xs)', scheme_libs.cdaddr);
                defineBuiltin(context, 'cddaar(xs)', scheme_libs.cddaar);
                defineBuiltin(context, 'cddadr(xs)', scheme_libs.cddadr);
                defineBuiltin(context, 'cdddar(xs)', scheme_libs.cdddar);
                defineBuiltin(context, 'cddddr(xs)', scheme_libs.cddddr);
                // Scheme symbols
                defineBuiltin(context, 'symbol$63$(val)', scheme_libs.symbolQ);
                defineBuiltin(context, 'symbol$61$63$(sym1, sym2)', scheme_libs.symbolEQ);
                defineBuiltin(context, 'symbol$45$$62$string(str)', scheme_libs.symbol_Gstring);
                defineBuiltin(context, 'string$45$$62$symbol(sym)', scheme_libs.string_Gsymbol);
                // Scheme strings
                defineBuiltin(context, 'string$45$$62$list(str)', scheme_libs.string_Glist);
                defineBuiltin(context, 'list$45$$62$string(xs)', scheme_libs.list_Gstring);
            case types_1.Chapter.SCHEME_1:
                // Display
                defineBuiltin(context, 'display(val)', display);
                defineBuiltin(context, 'newline()', scheme_libs.newline);
                // I/O
                defineBuiltin(context, 'read(str)', function () { return prompt(''); });
                // Error
                defineBuiltin(context, 'error(str, prepend = undefined)', misc.error_message, 1);
                // Scheme truthy and falsy value evaluator
                defineBuiltin(context, '$36$true(val)', scheme_libs.$true);
                // Scheme equality predicates
                defineBuiltin(context, 'eq$63$(...vals)', scheme_libs.eqQ);
                defineBuiltin(context, 'eqv$63$(...vals)', scheme_libs.eqvQ);
                defineBuiltin(context, 'equal$63$(...vals)', scheme_libs.equalQ);
                // Scheme basic arithmetic
                defineBuiltin(context, '$43$(...vals)', scheme_libs.plus, 0);
                defineBuiltin(context, '$42$(...vals)', scheme_libs.multiply, 0);
                defineBuiltin(context, '$45$(...vals)', scheme_libs.minus, 1);
                defineBuiltin(context, '$47$(...vals)', scheme_libs.divide, 1);
                // Scheme comparison
                defineBuiltin(context, '$61$(...vals)', scheme_libs.E, 1);
                defineBuiltin(context, '$60$(...vals)', scheme_libs.L, 1);
                defineBuiltin(context, '$62$(...vals)', scheme_libs.G, 1);
                defineBuiltin(context, '$60$$61$(...vals)', scheme_libs.LE, 1);
                defineBuiltin(context, '$62$$61$(...vals)', scheme_libs.GE, 1);
                // Scheme math functions
                defineBuiltin(context, 'number$63$(val)', scheme_libs.numberQ);
                defineBuiltin(context, 'complex$63$(val)', scheme_libs.complexQ);
                defineBuiltin(context, 'real$63$(val)', scheme_libs.realQ);
                defineBuiltin(context, 'rational$63$(val)', scheme_libs.rationalQ);
                defineBuiltin(context, 'integer$63$(val)', scheme_libs.integerQ);
                defineBuiltin(context, 'exact$63$(val)', scheme_libs.exactQ);
                defineBuiltin(context, 'exact$45$integer$63$(val)', scheme_libs.exact_integerQ);
                defineBuiltin(context, 'zero$63$(val)', scheme_libs.zeroQ);
                defineBuiltin(context, 'positive$63$(val)', scheme_libs.positiveQ);
                defineBuiltin(context, 'negative$63$(val)', scheme_libs.negativeQ);
                defineBuiltin(context, 'odd$63$(val)', scheme_libs.oddQ);
                defineBuiltin(context, 'even$63$(val)', scheme_libs.evenQ);
                defineBuiltin(context, 'max(...vals)', scheme_libs.max, 0);
                defineBuiltin(context, 'min(...vals)', scheme_libs.min, 0);
                defineBuiltin(context, 'abs(val)', scheme_libs.abs);
                defineBuiltin(context, 'quotient(n, d)', scheme_libs.quotient);
                defineBuiltin(context, 'modulo(n, d)', scheme_libs.modulo);
                defineBuiltin(context, 'remainder(n, d)', scheme_libs.remainder);
                defineBuiltin(context, 'gcd(...vals)', scheme_libs.gcd, 0);
                defineBuiltin(context, 'lcm(...vals)', scheme_libs.lcm, 0);
                defineBuiltin(context, 'floor(val)', scheme_libs.floor);
                defineBuiltin(context, 'ceiling(val)', scheme_libs.ceiling);
                defineBuiltin(context, 'truncate(val)', scheme_libs.truncate);
                defineBuiltin(context, 'round(val)', scheme_libs.round);
                defineBuiltin(context, 'square(val)', scheme_libs.square);
                defineBuiltin(context, 'exact$45$integer$45$sqrt(val)', scheme_libs.exact_integer_sqrt);
                defineBuiltin(context, 'expt(base, exp)', scheme_libs.expt);
                defineBuiltin(context, 'number$45$$62$string(val)', scheme_libs.number_Gstring);
                // Scheme booleans
                defineBuiltin(context, 'boolean$63$(val)', scheme_libs.booleanQ);
                defineBuiltin(context, 'boolean$61$$63$(x, y)', scheme_libs.booleanEQ);
                defineBuiltin(context, 'and(...vals)', scheme_libs.and, 0);
                defineBuiltin(context, 'or(...vals)', scheme_libs.or, 0);
                defineBuiltin(context, 'not(val)', scheme_libs.not);
                // Scheme strings
                defineBuiltin(context, 'string$63$(val)', scheme_libs.stringQ);
                defineBuiltin(context, 'make$45$string(n, char)', scheme_libs.make_string, 1);
                defineBuiltin(context, 'string(...vals)', scheme_libs.string, 0);
                defineBuiltin(context, 'string$45$length(str)', scheme_libs.string_length);
                defineBuiltin(context, 'string$45$ref(str, k)', scheme_libs.string_ref);
                defineBuiltin(context, 'string$61$$63$(str1, str2)', scheme_libs.stringEQ);
                defineBuiltin(context, 'string$60$$63$(str1, str2)', scheme_libs.stringLQ);
                defineBuiltin(context, 'string$62$$63$(str1, str2)', scheme_libs.stringGQ);
                defineBuiltin(context, 'string$60$$61$$63$(str1, str2)', scheme_libs.stringLEQ);
                defineBuiltin(context, 'string$62$$61$$63$(str1, str2)', scheme_libs.stringGEQ);
                defineBuiltin(context, 'substring(str, start, end)', scheme_libs.substring, 2);
                defineBuiltin(context, 'string$45$append(...vals)', scheme_libs.string_append, 0);
                defineBuiltin(context, 'string$45$copy(str)', scheme_libs.string_copy);
                defineBuiltin(context, 'string$45$map(f, str)', scheme_libs.string_map);
                defineBuiltin(context, 'string$45$for$45$each(f, str)', scheme_libs.string_for_each);
                defineBuiltin(context, 'string$45$$62$number(str)', scheme_libs.string_Gnumber);
                // Scheme procedures
                defineBuiltin(context, 'procedure$63$(val)', scheme_libs.procedureQ);
                // Special values
                defineBuiltin(context, 'undefined', undefined);
                defineBuiltin(context, 'NaN', NaN);
                defineBuiltin(context, 'Infinity', Infinity);
                break;
            default:
            //should be unreachable
        }
    }
    if (context.chapter <= types_1.Chapter.PYTHON_1 && context.chapter >= types_1.Chapter.PYTHON_1) {
        if (context.chapter == types_1.Chapter.PYTHON_1) {
            // Display
            defineBuiltin(context, 'get_time()', misc.get_time);
            defineBuiltin(context, 'print(val)', display, 1);
            defineBuiltin(context, 'raw_print(str)', rawDisplay, 1);
            defineBuiltin(context, 'str(val)', function (val) { return (0, stringify_1.stringify)(val, 2, 80); }, 1);
            defineBuiltin(context, 'error(str)', misc.error_message, 1);
            defineBuiltin(context, 'prompt(str)', prompt);
            defineBuiltin(context, 'is_number(val)', misc.is_number);
            defineBuiltin(context, 'is_string(val)', misc.is_string);
            defineBuiltin(context, 'is_function(val)', misc.is_function);
            defineBuiltin(context, 'is_boolean(val)', misc.is_boolean);
            defineBuiltin(context, 'is_None(val)', misc.is_undefined);
            defineBuiltin(context, 'parse_int(str, radix)', misc.parse_int);
            defineBuiltin(context, 'char_at(str, index)', misc.char_at);
            defineBuiltin(context, 'arity(f)', misc.arity);
            defineBuiltin(context, 'None', undefined);
            defineBuiltin(context, 'NaN', NaN);
            defineBuiltin(context, 'Infinity', Infinity);
            // Define all Math libraries
            var mathLibraryNames = Object.getOwnPropertyNames(Math);
            // Short param names for stringified version of math functions
            var parameterNames = __spreadArray([], 'abcdefghijklmnopqrstuvwxyz', true);
            for (var _a = 0, mathLibraryNames_2 = mathLibraryNames; _a < mathLibraryNames_2.length; _a++) {
                var name_2 = mathLibraryNames_2[_a];
                var value = Math[name_2];
                if (typeof value === 'function') {
                    var paramString = void 0;
                    var minArgsNeeded = undefined;
                    if (name_2 === 'max' || name_2 === 'min') {
                        paramString = '...values';
                        minArgsNeeded = 0;
                    }
                    else {
                        paramString = parameterNames.slice(0, value.length).join(', ');
                    }
                    defineBuiltin(context, "math_".concat(name_2, "(").concat(paramString, ")"), value, minArgsNeeded);
                }
                else {
                    defineBuiltin(context, "math_".concat(name_2), value);
                }
            }
        }
    }
};
exports.importBuiltins = importBuiltins;
function importPrelude(context) {
    var prelude = '';
    if (context.chapter >= 2) {
        prelude += context.variant === types_1.Variant.LAZY ? lazyList_prelude_1.lazyListPrelude : list_prelude_1.listPrelude;
        prelude += localImport_prelude_1.localImportPrelude;
    }
    if (context.chapter >= 3) {
        prelude += stream_prelude_1.streamPrelude;
    }
    if (context.variant === types_1.Variant.NON_DET) {
        prelude += non_det_prelude_1.nonDetPrelude;
    }
    if (prelude !== '') {
        context.prelude = prelude;
    }
}
var defaultBuiltIns = {
    rawDisplay: misc.rawDisplay,
    // See issue #5
    prompt: misc.rawDisplay,
    // See issue #11
    alert: misc.rawDisplay,
    visualiseList: function (_v) {
        throw new Error('List visualizer is not enabled');
    }
};
var createContext = function (chapter, variant, externalSymbols, externalContext, externalBuiltIns) {
    if (chapter === void 0) { chapter = types_1.Chapter.SOURCE_1; }
    if (variant === void 0) { variant = types_1.Variant.DEFAULT; }
    if (externalSymbols === void 0) { externalSymbols = []; }
    if (externalBuiltIns === void 0) { externalBuiltIns = defaultBuiltIns; }
    if (chapter === types_1.Chapter.FULL_JS || chapter === types_1.Chapter.FULL_TS) {
        // fullJS will include all builtins and preludes of source 4
        return __assign(__assign({}, createContext(types_1.Chapter.SOURCE_4, variant, externalSymbols, externalContext, externalBuiltIns)), { chapter: chapter });
    }
    var context = (0, exports.createEmptyContext)(chapter, variant, externalSymbols, externalContext);
    (0, exports.importBuiltins)(context, externalBuiltIns);
    importPrelude(context);
    (0, exports.importExternalSymbols)(context, externalSymbols);
    return context;
};
exports.default = createContext;
