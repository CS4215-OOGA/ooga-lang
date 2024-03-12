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
exports.transpile = exports.checkProgramForUndefinedVariables = exports.checkForUndefinedVariables = exports.evallerReplacer = exports.getBuiltins = exports.getGloballyDeclaredIdentifiers = exports.transformImportDeclarations = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
var astring_1 = require("astring");
var lodash_1 = require("lodash");
var source_map_1 = require("source-map");
var constants_1 = require("../constants");
var errors_1 = require("../errors/errors");
var moduleErrors_1 = require("../errors/moduleErrors");
var errors_2 = require("../modules/errors");
var moduleLoaderAsync_1 = require("../modules/moduleLoaderAsync");
var parser_1 = require("../parser/parser");
var types_1 = require("../types");
var assert_1 = require("../utils/assert");
var typeGuards_1 = require("../utils/ast/typeGuards");
var create = require("../utils/astCreator");
var uniqueIds_1 = require("../utils/uniqueIds");
var walkers_1 = require("../utils/walkers");
/**
 * This whole transpiler includes many many many many hacks to get stuff working.
 * Order in which certain functions are called matter as well.
 * There should be an explanation on it coming up soon.
 */
var globalIdNames = [
    'native',
    'callIfFuncAndRightArgs',
    'boolOrErr',
    'wrap',
    'wrapSourceModule',
    'unaryOp',
    'binaryOp',
    'throwIfTimeout',
    'setProp',
    'getProp',
    'builtins'
];
function transformImportDeclarations(program_1, usedIdentifiers_1, _a, context_1, nativeId_1) {
    return __awaiter(this, arguments, void 0, function (program, usedIdentifiers, _b, context, nativeId, useThis) {
        var _c, importNodes, otherNodes, importNodeMap, manifest, loadedModules, _d, prefixes, declNodes;
        var _this = this;
        var wrapSourceModules = _b.wrapSourceModules, checkImports = _b.checkImports, loadTabs = _b.loadTabs;
        if (useThis === void 0) { useThis = false; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _c = (0, lodash_1.partition)(program.body, typeGuards_1.isImportDeclaration), importNodes = _c[0], otherNodes = _c[1];
                    if (importNodes.length === 0)
                        return [2 /*return*/, ['', [], otherNodes]];
                    importNodeMap = importNodes.reduce(function (res, node) {
                        var moduleName = node.source.value;
                        (0, assert_1.default)(typeof moduleName === 'string', "Expected ImportDeclaration to have a source of type string, got ".concat(moduleName));
                        if (!(moduleName in res)) {
                            res[moduleName] = [];
                        }
                        res[moduleName].push(node);
                        node.specifiers.forEach(function (_a) {
                            var name = _a.local.name;
                            return usedIdentifiers.add(name);
                        });
                        return res;
                    }, {});
                    return [4 /*yield*/, (0, moduleLoaderAsync_1.memoizedGetModuleManifestAsync)()];
                case 1:
                    manifest = _e.sent();
                    return [4 /*yield*/, Promise.all(Object.entries(importNodeMap).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var _c, text, docs, namespaced, declNodes;
                            var moduleName = _b[0], nodes = _b[1];
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (!(moduleName in manifest)) {
                                            throw new moduleErrors_1.ModuleNotFoundError(moduleName, nodes[0]);
                                        }
                                        return [4 /*yield*/, Promise.all([
                                                (0, moduleLoaderAsync_1.memoizedGetModuleBundleAsync)(moduleName),
                                                (0, moduleLoaderAsync_1.memoizedGetModuleDocsAsync)(moduleName),
                                                context ? (0, moduleLoaderAsync_1.initModuleContextAsync)(moduleName, context, loadTabs) : Promise.resolve()
                                            ])];
                                    case 1:
                                        _c = _d.sent(), text = _c[0], docs = _c[1];
                                        namespaced = (0, uniqueIds_1.getUniqueId)(usedIdentifiers, '__MODULE__');
                                        if (checkImports && !docs) {
                                            throw new errors_2.ModuleInternalError(moduleName, new Error('checkImports was true, but failed to load docs'), nodes[0]);
                                        }
                                        declNodes = nodes.flatMap(function (_a) {
                                            var specifiers = _a.specifiers;
                                            return specifiers.map(function (spec) {
                                                (0, assert_1.default)(spec.type === 'ImportSpecifier', "Expected ImportSpecifier, got ".concat(spec.type));
                                                if (checkImports && !(spec.imported.name in docs)) {
                                                    throw new errors_2.UndefinedImportError(spec.imported.name, moduleName, spec);
                                                }
                                                // Convert each import specifier to its corresponding local variable declaration
                                                return create.constantDeclaration(spec.local.name, create.memberExpression(create.identifier("".concat(useThis ? 'this.' : '').concat(namespaced)), spec.imported.name));
                                            });
                                        });
                                        return [2 /*return*/, [moduleName, { text: text, nodes: declNodes, namespaced: namespaced }]];
                                }
                            });
                        }); }))];
                case 2:
                    loadedModules = _e.sent();
                    _d = loadedModules.reduce(function (_a, _b) {
                        var prefix = _a[0], decls = _a[1];
                        var moduleName = _b[0], _c = _b[1], text = _c.text, nodes = _c.nodes, namespaced = _c.namespaced;
                        var modifiedText = wrapSourceModules
                            ? "".concat(constants_1.NATIVE_STORAGE_ID, ".operators.get(\"wrapSourceModule\")(\"").concat(moduleName, "\", ").concat(text, ", ").concat(constants_1.REQUIRE_PROVIDER_ID, ")")
                            : "(".concat(text, ")(").concat(constants_1.REQUIRE_PROVIDER_ID, ")");
                        return [
                            __spreadArray(__spreadArray([], prefix, true), ["const ".concat(namespaced, " = ").concat(modifiedText, "\n")], false),
                            __spreadArray(__spreadArray([], decls, true), nodes, true)
                        ];
                    }, [[], []]), prefixes = _d[0], declNodes = _d[1];
                    return [2 /*return*/, [prefixes.join('\n'), declNodes, otherNodes]];
            }
        });
    });
}
exports.transformImportDeclarations = transformImportDeclarations;
function getGloballyDeclaredIdentifiers(program) {
    return program.body
        .filter(function (statement) { return statement.type === 'VariableDeclaration'; })
        .map(function (_a) {
        var id = _a.declarations[0].id, kind = _a.kind;
        return id.name;
    });
}
exports.getGloballyDeclaredIdentifiers = getGloballyDeclaredIdentifiers;
function getBuiltins(nativeStorage) {
    var builtinsStatements = [];
    nativeStorage.builtins.forEach(function (_unused, name) {
        builtinsStatements.push(create.declaration(name, 'const', create.callExpression(create.memberExpression(create.memberExpression(create.identifier(constants_1.NATIVE_STORAGE_ID), 'builtins'), 'get'), [create.literal(name)])));
    });
    return builtinsStatements;
}
exports.getBuiltins = getBuiltins;
function evallerReplacer(nativeStorageId, usedIdentifiers) {
    var arg = create.identifier((0, uniqueIds_1.getUniqueId)(usedIdentifiers, 'program'));
    return create.expressionStatement(create.assignmentExpression(create.memberExpression(nativeStorageId, 'evaller'), create.arrowFunctionExpression([arg], create.callExpression(create.identifier('eval'), [arg]))));
}
exports.evallerReplacer = evallerReplacer;
function generateFunctionsToStringMap(program) {
    var map = new Map();
    (0, walkers_1.simple)(program, {
        ArrowFunctionExpression: function (node) {
            map.set(node, (0, astring_1.generate)(node));
        },
        FunctionDeclaration: function (node) {
            map.set(node, (0, astring_1.generate)(node));
        }
    });
    return map;
}
function transformFunctionDeclarationsToArrowFunctions(program, functionsToStringMap) {
    (0, walkers_1.simple)(program, {
        FunctionDeclaration: function (node) {
            var _a = node, id = _a.id, params = _a.params, body = _a.body;
            node.type = 'VariableDeclaration';
            node = node;
            var asArrowFunction = create.blockArrowFunction(params, body);
            functionsToStringMap.set(asArrowFunction, functionsToStringMap.get(node));
            node.declarations = [
                {
                    type: 'VariableDeclarator',
                    id: id,
                    init: asArrowFunction
                }
            ];
            node.kind = 'const';
        }
    });
}
/**
 * Transforms all arrow functions
 * (arg1, arg2, ...) => { statement1; statement2; return statement3; }
 *
 * to
 *
 * <NATIVE STORAGE>.operators.wrap((arg1, arg2, ...) => {
 *   statement1;statement2;return statement3;
 * })
 *
 * to allow for iterative processes to take place
 */
function wrapArrowFunctionsToAllowNormalCallsAndNiceToString(program, functionsToStringMap, globalIds) {
    (0, walkers_1.simple)(program, {
        ArrowFunctionExpression: function (node) {
            var _a;
            // If it's undefined then we're dealing with a thunk
            if (functionsToStringMap.get(node) !== undefined) {
                create.mutateToCallExpression(node, globalIds.wrap, [
                    __assign({}, node),
                    create.literal(functionsToStringMap.get(node)),
                    create.literal(((_a = node.params[node.params.length - 1]) === null || _a === void 0 ? void 0 : _a.type) === 'RestElement'),
                    globalIds.native
                ]);
            }
        }
    });
}
/**
 * Transforms all return statements (including expression arrow functions) to return an intermediate value
 * return nonFnCall + 1;
 *  =>
 * return {isTail: false, value: nonFnCall + 1};
 *
 * return fnCall(arg1, arg2);
 * => return {isTail: true, function: fnCall, arguments: [arg1, arg2]}
 *
 * conditional and logical expressions will be recursively looped through as well
 */
function transformReturnStatementsToAllowProperTailCalls(program) {
    function transformLogicalExpression(expression) {
        var _a, _b, _c;
        switch (expression.type) {
            case 'LogicalExpression':
                return create.logicalExpression(expression.operator, expression.left, transformLogicalExpression(expression.right), expression.loc);
            case 'ConditionalExpression':
                return create.conditionalExpression(expression.test, transformLogicalExpression(expression.consequent), transformLogicalExpression(expression.alternate), expression.loc);
            case 'CallExpression':
                expression = expression;
                var _d = ((_a = expression.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _d.line, column = _d.column;
                var source = (_c = (_b = expression.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
                var functionName = expression.callee.type === 'Identifier' ? expression.callee.name : '<anonymous>';
                var args = expression.arguments;
                return create.objectExpression([
                    create.property('isTail', create.literal(true)),
                    create.property('function', expression.callee),
                    create.property('functionName', create.literal(functionName)),
                    create.property('arguments', create.arrayExpression(args)),
                    create.property('line', create.literal(line)),
                    create.property('column', create.literal(column)),
                    create.property('source', create.literal(source))
                ]);
            default:
                return create.objectExpression([
                    create.property('isTail', create.literal(false)),
                    create.property('value', expression)
                ]);
        }
    }
    (0, walkers_1.simple)(program, {
        ReturnStatement: function (node) {
            node.argument = transformLogicalExpression(node.argument);
        },
        ArrowFunctionExpression: function (node) {
            if (node.expression) {
                node.body = transformLogicalExpression(node.body);
            }
        }
    });
}
function transformCallExpressionsToCheckIfFunction(program, globalIds) {
    (0, walkers_1.simple)(program, {
        CallExpression: function (node) {
            var _a, _b, _c;
            var _d = ((_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _d.line, column = _d.column;
            var source = (_c = (_b = node.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
            var args = node.arguments;
            node.arguments = __spreadArray([
                node.callee,
                create.literal(line),
                create.literal(column),
                create.literal(source)
            ], args, true);
            node.callee = globalIds.callIfFuncAndRightArgs;
        }
    });
}
function checkForUndefinedVariables(program, nativeStorage, globalIds, skipUndefined) {
    var builtins = nativeStorage.builtins;
    var identifiersIntroducedByNode = new Map();
    function processBlock(node) {
        var identifiers = new Set();
        for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
            var statement = _a[_i];
            if (statement.type === 'VariableDeclaration') {
                identifiers.add(statement.declarations[0].id.name);
            }
            else if (statement.type === 'FunctionDeclaration') {
                if (statement.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                identifiers.add(statement.id.name);
            }
            else if (statement.type === 'ImportDeclaration') {
                for (var _b = 0, _c = statement.specifiers; _b < _c.length; _b++) {
                    var specifier = _c[_b];
                    identifiers.add(specifier.local.name);
                }
            }
        }
        identifiersIntroducedByNode.set(node, identifiers);
    }
    function processFunction(node, _ancestors) {
        identifiersIntroducedByNode.set(node, new Set(node.params.map(function (id) {
            return id.type === 'Identifier'
                ? id.name
                : id.argument.name;
        })));
    }
    var identifiersToAncestors = new Map();
    (0, walkers_1.ancestor)(program, {
        Program: processBlock,
        BlockStatement: processBlock,
        FunctionDeclaration: processFunction,
        ArrowFunctionExpression: processFunction,
        ForStatement: function (forStatement, ancestors) {
            var init = forStatement.init;
            if (init.type === 'VariableDeclaration') {
                identifiersIntroducedByNode.set(forStatement, new Set([init.declarations[0].id.name]));
            }
        },
        Identifier: function (identifier, ancestors) {
            identifiersToAncestors.set(identifier, __spreadArray([], ancestors, true));
        },
        Pattern: function (node, ancestors) {
            if (node.type === 'Identifier') {
                identifiersToAncestors.set(node, __spreadArray([], ancestors, true));
            }
            else if (node.type === 'MemberExpression') {
                if (node.object.type === 'Identifier') {
                    identifiersToAncestors.set(node.object, __spreadArray([], ancestors, true));
                }
            }
        }
    });
    var nativeInternalNames = new Set(Object.values(globalIds).map(function (_a) {
        var name = _a.name;
        return name;
    }));
    var _loop_1 = function (identifier, ancestors) {
        var name_1 = identifier.name;
        var isCurrentlyDeclared = ancestors.some(function (a) { var _a; return (_a = identifiersIntroducedByNode.get(a)) === null || _a === void 0 ? void 0 : _a.has(name_1); });
        if (isCurrentlyDeclared) {
            return "continue";
        }
        var isPreviouslyDeclared = nativeStorage.previousProgramsIdentifiers.has(name_1);
        if (isPreviouslyDeclared) {
            return "continue";
        }
        var isBuiltin = builtins.has(name_1);
        if (isBuiltin) {
            return "continue";
        }
        var isNativeId = nativeInternalNames.has(name_1);
        if (!isNativeId && !skipUndefined) {
            throw new errors_1.UndefinedVariable(name_1, identifier);
        }
    };
    for (var _i = 0, identifiersToAncestors_1 = identifiersToAncestors; _i < identifiersToAncestors_1.length; _i++) {
        var _a = identifiersToAncestors_1[_i], identifier = _a[0], ancestors = _a[1];
        _loop_1(identifier, ancestors);
    }
}
exports.checkForUndefinedVariables = checkForUndefinedVariables;
function checkProgramForUndefinedVariables(program, context) {
    var usedIdentifiers = new Set(__spreadArray(__spreadArray([], (0, uniqueIds_1.getIdentifiersInProgram)(program), true), (0, uniqueIds_1.getIdentifiersInNativeStorage)(context.nativeStorage), true));
    var globalIds = getNativeIds(program, usedIdentifiers);
    var preludes = context.prelude
        ? (0, uniqueIds_1.getFunctionDeclarationNamesInProgram)((0, parser_1.parse)(context.prelude, context))
        : new Set();
    var builtins = context.nativeStorage.builtins;
    var env = context.runtime.environments[0].head;
    var identifiersIntroducedByNode = new Map();
    function processBlock(node) {
        var identifiers = new Set();
        for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
            var statement = _a[_i];
            if (statement.type === 'VariableDeclaration') {
                identifiers.add(statement.declarations[0].id.name);
            }
            else if (statement.type === 'FunctionDeclaration') {
                if (statement.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                identifiers.add(statement.id.name);
            }
            else if (statement.type === 'ImportDeclaration') {
                for (var _b = 0, _c = statement.specifiers; _b < _c.length; _b++) {
                    var specifier = _c[_b];
                    identifiers.add(specifier.local.name);
                }
            }
        }
        identifiersIntroducedByNode.set(node, identifiers);
    }
    function processFunction(node, _ancestors) {
        identifiersIntroducedByNode.set(node, new Set(node.params.map(function (id) {
            return id.type === 'Identifier'
                ? id.name
                : id.argument.name;
        })));
    }
    var identifiersToAncestors = new Map();
    (0, walkers_1.ancestor)(program, {
        Program: processBlock,
        BlockStatement: processBlock,
        FunctionDeclaration: processFunction,
        ArrowFunctionExpression: processFunction,
        ForStatement: function (forStatement, ancestors) {
            var init = forStatement.init;
            if (init.type === 'VariableDeclaration') {
                identifiersIntroducedByNode.set(forStatement, new Set([init.declarations[0].id.name]));
            }
        },
        Identifier: function (identifier, ancestors) {
            identifiersToAncestors.set(identifier, __spreadArray([], ancestors, true));
        },
        Pattern: function (node, ancestors) {
            if (node.type === 'Identifier') {
                identifiersToAncestors.set(node, __spreadArray([], ancestors, true));
            }
            else if (node.type === 'MemberExpression') {
                if (node.object.type === 'Identifier') {
                    identifiersToAncestors.set(node.object, __spreadArray([], ancestors, true));
                }
            }
        }
    });
    var nativeInternalNames = new Set(Object.values(globalIds).map(function (_a) {
        var name = _a.name;
        return name;
    }));
    var _loop_2 = function (identifier, ancestors) {
        var name_2 = identifier.name;
        var isCurrentlyDeclared = ancestors.some(function (a) { var _a; return (_a = identifiersIntroducedByNode.get(a)) === null || _a === void 0 ? void 0 : _a.has(name_2); });
        if (isCurrentlyDeclared) {
            return "continue";
        }
        var isPreviouslyDeclared = context.nativeStorage.previousProgramsIdentifiers.has(name_2);
        if (isPreviouslyDeclared) {
            return "continue";
        }
        var isBuiltin = builtins.has(name_2);
        if (isBuiltin) {
            return "continue";
        }
        var isPrelude = preludes.has(name_2);
        if (isPrelude) {
            return "continue";
        }
        var isInEnv = name_2 in env;
        if (isInEnv) {
            return "continue";
        }
        var isNativeId = nativeInternalNames.has(name_2);
        if (!isNativeId) {
            throw new errors_1.UndefinedVariable(name_2, identifier);
        }
    };
    for (var _i = 0, identifiersToAncestors_2 = identifiersToAncestors; _i < identifiersToAncestors_2.length; _i++) {
        var _a = identifiersToAncestors_2[_i], identifier = _a[0], ancestors = _a[1];
        _loop_2(identifier, ancestors);
    }
}
exports.checkProgramForUndefinedVariables = checkProgramForUndefinedVariables;
function transformSomeExpressionsToCheckIfBoolean(program, globalIds) {
    function transform(node) {
        var _a, _b, _c;
        var _d = ((_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _d.line, column = _d.column;
        var source = (_c = (_b = node.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
        var test = node.type === 'LogicalExpression' ? 'left' : 'test';
        node[test] = create.callExpression(globalIds.boolOrErr, [
            node[test],
            create.literal(line),
            create.literal(column),
            create.literal(source)
        ]);
    }
    (0, walkers_1.simple)(program, {
        IfStatement: transform,
        ConditionalExpression: transform,
        LogicalExpression: transform,
        ForStatement: transform,
        WhileStatement: transform
    });
}
function getNativeIds(program, usedIdentifiers) {
    var globalIds = {};
    for (var _i = 0, globalIdNames_1 = globalIdNames; _i < globalIdNames_1.length; _i++) {
        var identifier = globalIdNames_1[_i];
        globalIds[identifier] = create.identifier((0, uniqueIds_1.getUniqueId)(usedIdentifiers, identifier));
    }
    return globalIds;
}
function transformUnaryAndBinaryOperationsToFunctionCalls(program, globalIds, chapter) {
    (0, walkers_1.simple)(program, {
        BinaryExpression: function (node) {
            var _a, _b, _c;
            var _d = ((_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _d.line, column = _d.column;
            var source = (_c = (_b = node.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
            var operator = node.operator, left = node.left, right = node.right;
            create.mutateToCallExpression(node, globalIds.binaryOp, [
                create.literal(operator),
                create.literal(chapter),
                left,
                right,
                create.literal(line),
                create.literal(column),
                create.literal(source)
            ]);
        },
        UnaryExpression: function (node) {
            var _a, _b, _c;
            var _d = ((_a = node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _d.line, column = _d.column;
            var source = (_c = (_b = node.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
            var _e = node, operator = _e.operator, argument = _e.argument;
            create.mutateToCallExpression(node, globalIds.unaryOp, [
                create.literal(operator),
                argument,
                create.literal(line),
                create.literal(column),
                create.literal(source)
            ]);
        }
    });
}
function getComputedProperty(computed, property) {
    return computed ? property : create.literal(property.name);
}
function transformPropertyAssignment(program, globalIds) {
    (0, walkers_1.simple)(program, {
        AssignmentExpression: function (node) {
            var _a;
            if (node.left.type === 'MemberExpression') {
                var _b = node.left, object = _b.object, property = _b.property, computed = _b.computed, loc = _b.loc;
                var _c = (loc !== null && loc !== void 0 ? loc : constants_1.UNKNOWN_LOCATION).start, line = _c.line, column = _c.column;
                var source = (_a = loc === null || loc === void 0 ? void 0 : loc.source) !== null && _a !== void 0 ? _a : null;
                create.mutateToCallExpression(node, globalIds.setProp, [
                    object,
                    getComputedProperty(computed, property),
                    node.right,
                    create.literal(line),
                    create.literal(column),
                    create.literal(source)
                ]);
            }
        }
    });
}
function transformPropertyAccess(program, globalIds) {
    (0, walkers_1.simple)(program, {
        MemberExpression: function (node) {
            var _a;
            var object = node.object, property = node.property, computed = node.computed, loc = node.loc;
            var _b = (loc !== null && loc !== void 0 ? loc : constants_1.UNKNOWN_LOCATION).start, line = _b.line, column = _b.column;
            var source = (_a = loc === null || loc === void 0 ? void 0 : loc.source) !== null && _a !== void 0 ? _a : null;
            create.mutateToCallExpression(node, globalIds.getProp, [
                object,
                getComputedProperty(computed, property),
                create.literal(line),
                create.literal(column),
                create.literal(source)
            ]);
        }
    });
}
function addInfiniteLoopProtection(program, globalIds, usedIdentifiers) {
    var getTimeAst = function () { return create.callExpression(create.identifier('get_time'), []); };
    function instrumentLoops(node) {
        var _a, _b, _c;
        var newStatements = [];
        for (var _i = 0, _d = node.body; _i < _d.length; _i++) {
            var statement = _d[_i];
            if (statement.type === 'ForStatement' || statement.type === 'WhileStatement') {
                var startTimeConst = (0, uniqueIds_1.getUniqueId)(usedIdentifiers, 'startTime');
                newStatements.push(create.constantDeclaration(startTimeConst, getTimeAst()));
                if (statement.body.type === 'BlockStatement') {
                    var _e = ((_a = statement.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start, line = _e.line, column = _e.column;
                    var source = (_c = (_b = statement.loc) === null || _b === void 0 ? void 0 : _b.source) !== null && _c !== void 0 ? _c : null;
                    statement.body.body.unshift(create.expressionStatement(create.callExpression(globalIds.throwIfTimeout, [
                        globalIds.native,
                        create.identifier(startTimeConst),
                        getTimeAst(),
                        create.literal(line),
                        create.literal(column),
                        create.literal(source)
                    ])));
                }
            }
            newStatements.push(statement);
        }
        node.body = newStatements;
    }
    (0, walkers_1.simple)(program, {
        Program: instrumentLoops,
        BlockStatement: instrumentLoops
    });
}
function wrapWithBuiltins(statements, nativeStorage) {
    return create.blockStatement(__spreadArray(__spreadArray([], getBuiltins(nativeStorage), true), [create.blockStatement(statements)], false));
}
function getDeclarationsToAccessTranspilerInternals(globalIds) {
    return Object.entries(globalIds).map(function (_a) {
        var key = _a[0], name = _a[1].name;
        var value;
        var kind = 'const';
        if (key === 'native') {
            value = create.identifier(constants_1.NATIVE_STORAGE_ID);
        }
        else if (key === 'globals') {
            value = create.memberExpression(globalIds.native, 'globals');
        }
        else {
            value = create.callExpression(create.memberExpression(create.memberExpression(globalIds.native, 'operators'), 'get'), [create.literal(key)]);
        }
        return create.declaration(name, kind, value);
    });
}
function transpileToSource(program, context, skipUndefined, importOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var usedIdentifiers, globalIds, functionsToStringMap, _a, modulePrefix, importNodes, otherNodes, statements, newStatements, map, transpiled, sourceMapJson;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    usedIdentifiers = new Set(__spreadArray(__spreadArray([], (0, uniqueIds_1.getIdentifiersInProgram)(program), true), (0, uniqueIds_1.getIdentifiersInNativeStorage)(context.nativeStorage), true));
                    globalIds = getNativeIds(program, usedIdentifiers);
                    if (program.body.length === 0) {
                        return [2 /*return*/, { transpiled: '' }];
                    }
                    functionsToStringMap = generateFunctionsToStringMap(program);
                    transformReturnStatementsToAllowProperTailCalls(program);
                    transformCallExpressionsToCheckIfFunction(program, globalIds);
                    transformUnaryAndBinaryOperationsToFunctionCalls(program, globalIds, context.chapter);
                    transformSomeExpressionsToCheckIfBoolean(program, globalIds);
                    transformPropertyAssignment(program, globalIds);
                    transformPropertyAccess(program, globalIds);
                    checkForUndefinedVariables(program, context.nativeStorage, globalIds, skipUndefined);
                    transformFunctionDeclarationsToArrowFunctions(program, functionsToStringMap);
                    wrapArrowFunctionsToAllowNormalCallsAndNiceToString(program, functionsToStringMap, globalIds);
                    addInfiniteLoopProtection(program, globalIds, usedIdentifiers);
                    return [4 /*yield*/, transformImportDeclarations(program, usedIdentifiers, importOptions, context, globalIds.native)];
                case 1:
                    _a = _b.sent(), modulePrefix = _a[0], importNodes = _a[1], otherNodes = _a[2];
                    program.body = importNodes.concat(otherNodes);
                    getGloballyDeclaredIdentifiers(program).forEach(function (id) {
                        return context.nativeStorage.previousProgramsIdentifiers.add(id);
                    });
                    statements = program.body;
                    newStatements = __spreadArray(__spreadArray(__spreadArray([], getDeclarationsToAccessTranspilerInternals(globalIds), true), [
                        evallerReplacer(globalIds.native, usedIdentifiers),
                        create.expressionStatement(create.identifier('undefined'))
                    ], false), statements, true);
                    program.body =
                        context.nativeStorage.evaller === null
                            ? [wrapWithBuiltins(newStatements, context.nativeStorage)]
                            : [create.blockStatement(newStatements)];
                    map = new source_map_1.SourceMapGenerator({ file: 'source' });
                    transpiled = modulePrefix + (0, astring_1.generate)(program, { sourceMap: map });
                    sourceMapJson = map.toJSON();
                    return [2 /*return*/, { transpiled: transpiled, sourceMapJson: sourceMapJson }];
            }
        });
    });
}
function transpileToFullJS(program, context, importOptions, skipUndefined) {
    return __awaiter(this, void 0, void 0, function () {
        var usedIdentifiers, globalIds, _a, modulePrefix, importNodes, otherNodes, transpiledProgram, sourceMap, transpiled, sourceMapJson;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    usedIdentifiers = new Set(__spreadArray(__spreadArray([], (0, uniqueIds_1.getIdentifiersInProgram)(program), true), (0, uniqueIds_1.getIdentifiersInNativeStorage)(context.nativeStorage), true));
                    globalIds = getNativeIds(program, usedIdentifiers);
                    checkForUndefinedVariables(program, context.nativeStorage, globalIds, skipUndefined);
                    return [4 /*yield*/, transformImportDeclarations(program, usedIdentifiers, importOptions, context, globalIds.native)];
                case 1:
                    _a = _b.sent(), modulePrefix = _a[0], importNodes = _a[1], otherNodes = _a[2];
                    (0, uniqueIds_1.getFunctionDeclarationNamesInProgram)(program).forEach(function (id) {
                        return context.nativeStorage.previousProgramsIdentifiers.add(id);
                    });
                    getGloballyDeclaredIdentifiers(program).forEach(function (id) {
                        return context.nativeStorage.previousProgramsIdentifiers.add(id);
                    });
                    transpiledProgram = create.program(__spreadArray(__spreadArray([
                        evallerReplacer(create.identifier(constants_1.NATIVE_STORAGE_ID), new Set()),
                        create.expressionStatement(create.identifier('undefined'))
                    ], importNodes, true), otherNodes, true));
                    sourceMap = new source_map_1.SourceMapGenerator({ file: 'source' });
                    transpiled = modulePrefix + (0, astring_1.generate)(transpiledProgram, { sourceMap: sourceMap });
                    sourceMapJson = sourceMap.toJSON();
                    return [2 /*return*/, { transpiled: transpiled, sourceMapJson: sourceMapJson }];
            }
        });
    });
}
function transpile(program, context, importOptions, skipUndefined) {
    if (importOptions === void 0) { importOptions = {}; }
    if (skipUndefined === void 0) { skipUndefined = false; }
    if (context.chapter === types_1.Chapter.FULL_JS || context.chapter === types_1.Chapter.PYTHON_1) {
        var fullImportOptions = __assign({ checkImports: false, loadTabs: true, wrapSourceModules: false }, importOptions);
        return transpileToFullJS(program, context, fullImportOptions, true);
    }
    else if (context.variant == types_1.Variant.NATIVE) {
        var fullImportOptions = __assign({ checkImports: true, loadTabs: true, wrapSourceModules: true }, importOptions);
        return transpileToFullJS(program, context, fullImportOptions, false);
    }
    else {
        var fullImportOptions = __assign({ checkImports: true, loadTabs: true, wrapSourceModules: true }, importOptions);
        return transpileToSource(program, context, skipUndefined, fullImportOptions);
    }
}
exports.transpile = transpile;
