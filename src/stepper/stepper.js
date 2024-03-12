"use strict";
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
exports.callee = exports.isStepperOutput = exports.getEvaluationSteps = exports.getRedex = exports.redexify = exports.javascriptify = exports.codify = void 0;
var astring_1 = require("astring");
var errors = require("../errors/errors");
var errors_1 = require("../modules/errors");
var moduleLoaderAsync_1 = require("../modules/moduleLoaderAsync");
var parser_1 = require("../parser/parser");
var transpiler_1 = require("../transpiler/transpiler");
var assert_1 = require("../utils/assert");
var helpers_1 = require("../utils/ast/helpers");
var ast = require("../utils/astCreator");
var dummyAstCreator_1 = require("../utils/dummyAstCreator");
var operators_1 = require("../utils/operators");
var rttc = require("../utils/rttc");
var converter_1 = require("./converter");
var builtin = require("./lib");
var util_1 = require("./util");
var irreducibleTypes = new Set([
    'Literal',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ArrayExpression'
]);
function isIrreducible(node, context) {
    return ((0, util_1.isBuiltinFunction)(node) ||
        (0, util_1.isImportedFunction)(node, context) ||
        (0, util_1.isAllowedLiterals)(node) ||
        (0, util_1.isNegNumber)(node) ||
        irreducibleTypes.has(node.type));
}
function isStatementsReducible(progs, context) {
    if (progs.body.length === 0)
        return false;
    if (progs.body.length > 1)
        return true;
    var lastStatement = progs.body[0];
    if (lastStatement.type !== 'ExpressionStatement') {
        return true;
    }
    return !isIrreducible(lastStatement.expression, context);
}
function scanOutBoundNames(node) {
    var declaredIds = [];
    if (node.type == 'ArrowFunctionExpression') {
        for (var _i = 0, _a = node.params; _i < _a.length; _i++) {
            var param = _a[_i];
            declaredIds.push(param);
        }
    }
    else if (node.type == 'BlockExpression' || node.type == 'BlockStatement') {
        for (var _b = 0, _c = node.body; _b < _c.length; _b++) {
            var stmt = _c[_b];
            // if stmt is assignment or functionDeclaration
            // add stmt into a set of identifiers
            // return that set
            if (stmt.type === 'VariableDeclaration') {
                stmt.declarations
                    .map(function (decn) { return decn.id; })
                    .forEach(function (name) { return declaredIds.push(name); });
                for (var _d = 0, _e = stmt.declarations; _d < _e.length; _d++) {
                    var decn = _e[_d];
                    if (decn.init !== null &&
                        decn.init !== undefined &&
                        decn.init.type == 'ArrowFunctionExpression') {
                        for (var _f = 0, _g = decn.init.params; _f < _g.length; _f++) {
                            var param = _g[_f];
                            declaredIds.push(param);
                        }
                    }
                }
            }
            else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
                declaredIds.push(stmt.id);
                stmt.params.forEach(function (param) { return declaredIds.push(param); });
            }
        }
    }
    return declaredIds;
}
function scanOutDeclarations(node) {
    var declaredIds = [];
    if (node.type === 'BlockExpression' ||
        node.type === 'BlockStatement' ||
        node.type === 'Program') {
        for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
            var stmt = _a[_i];
            // if stmt is assignment or functionDeclaration
            // add stmt into a set of identifiers
            // return that set
            if (stmt.type === 'VariableDeclaration') {
                stmt.declarations
                    .map(function (decn) { return decn.id; })
                    .forEach(function (name) { return declaredIds.push(name); });
            }
            else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
                declaredIds.push(stmt.id);
            }
        }
    }
    return declaredIds;
}
function getFreshName(paramName, counter, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement) {
    var added = true;
    while (added) {
        added = false;
        for (var _i = 0, freeTarget_1 = freeTarget; _i < freeTarget_1.length; _i++) {
            var f = freeTarget_1[_i];
            if (paramName + '_' + counter === f) {
                counter++;
                added = true;
            }
        }
        for (var _a = 0, freeReplacement_1 = freeReplacement; _a < freeReplacement_1.length; _a++) {
            var free = freeReplacement_1[_a];
            if (paramName + '_' + counter === free) {
                counter++;
                added = true;
            }
        }
        for (var _b = 0, boundTarget_1 = boundTarget; _b < boundTarget_1.length; _b++) {
            var notFree = boundTarget_1[_b];
            if (paramName + '_' + counter === notFree.name) {
                counter++;
                added = true;
            }
        }
        for (var _c = 0, boundUpperScope_1 = boundUpperScope; _c < boundUpperScope_1.length; _c++) {
            var boundName = boundUpperScope_1[_c];
            if (paramName + '_' + counter === boundName) {
                counter++;
                added = true;
            }
        }
        for (var _d = 0, boundReplacement_1 = boundReplacement; _d < boundReplacement_1.length; _d++) {
            var identifier = boundReplacement_1[_d];
            if (paramName + '_' + counter === identifier.name) {
                counter++;
                added = true;
            }
        }
    }
    return paramName + '_' + counter;
}
function findMain(target, seenBefore) {
    var params = [];
    if (target.type == 'FunctionExpression' ||
        target.type == 'ArrowFunctionExpression' ||
        target.type === 'FunctionDeclaration') {
        if (target.type == 'FunctionExpression' || target.type === 'FunctionDeclaration') {
            params.push(target.id.name);
        }
        for (var i = 0; i < target.params.length; i++) {
            params.push(target.params[i].name);
        }
    }
    var freeNames = [];
    var finders = {
        Identifier: function (target) {
            seenBefore.set(target, target);
            var bound = false;
            for (var i = 0; i < params.length; i++) {
                if (target.name == params[i]) {
                    bound = true;
                    break;
                }
            }
            if (!bound) {
                freeNames.push(target.name);
            }
        },
        ExpressionStatement: function (target) {
            seenBefore.set(target, target);
            find(target.expression);
        },
        BinaryExpression: function (target) {
            seenBefore.set(target, target);
            find(target.left);
            find(target.right);
        },
        UnaryExpression: function (target) {
            seenBefore.set(target, target);
            find(target.argument);
        },
        ConditionalExpression: function (target) {
            seenBefore.set(target, target);
            find(target.test);
            find(target.consequent);
            find(target.alternate);
        },
        LogicalExpression: function (target) {
            seenBefore.set(target, target);
            find(target.left);
            find(target.right);
        },
        CallExpression: function (target) {
            seenBefore.set(target, target);
            for (var i = 0; i < target.arguments.length; i++) {
                find(target.arguments[i]);
            }
            find(target.callee);
        },
        FunctionDeclaration: function (target) {
            seenBefore.set(target, target);
            var freeInNested = findMain(target, seenBefore);
            for (var _i = 0, freeInNested_1 = freeInNested; _i < freeInNested_1.length; _i++) {
                var free = freeInNested_1[_i];
                var bound = false;
                for (var _a = 0, params_1 = params; _a < params_1.length; _a++) {
                    var param = params_1[_a];
                    if (free === param) {
                        bound = true;
                    }
                }
                if (!bound) {
                    freeNames.push(free);
                }
            }
        },
        ArrowFunctionExpression: function (target) {
            seenBefore.set(target, target);
            var freeInNested = findMain(target, seenBefore);
            for (var _i = 0, freeInNested_2 = freeInNested; _i < freeInNested_2.length; _i++) {
                var free = freeInNested_2[_i];
                var bound = false;
                for (var _a = 0, params_2 = params; _a < params_2.length; _a++) {
                    var param = params_2[_a];
                    if (free === param) {
                        bound = true;
                    }
                }
                if (!bound) {
                    freeNames.push(free);
                }
            }
        },
        Program: function (target) {
            seenBefore.set(target, target);
            target.body.forEach(function (stmt) {
                find(stmt);
            });
        },
        BlockStatement: function (target) {
            seenBefore.set(target, target);
            var declaredNames = (0, util_1.getDeclaredNames)(target);
            for (var _i = 0, _a = declaredNames.values(); _i < _a.length; _i++) {
                var item = _a[_i];
                params.push(item);
            }
            target.body.forEach(function (stmt) {
                find(stmt);
            });
        },
        BlockExpression: function (target) {
            seenBefore.set(target, target);
            var declaredNames = (0, util_1.getDeclaredNames)(target);
            for (var _i = 0, _a = declaredNames.values(); _i < _a.length; _i++) {
                var item = _a[_i];
                params.push(item);
            }
            target.body.forEach(function (stmt) {
                find(stmt);
            });
        },
        ReturnStatement: function (target) {
            seenBefore.set(target, target);
            find(target.argument);
        },
        VariableDeclaration: function (target) {
            seenBefore.set(target, target);
            target.declarations.forEach(function (dec) {
                find(dec);
            });
        },
        VariableDeclarator: function (target) {
            seenBefore.set(target, target);
            find(target.init);
        },
        IfStatement: function (target) {
            seenBefore.set(target, target);
            find(target.test);
            find(target.consequent);
            find(target.alternate);
        },
        ArrayExpression: function (target) {
            seenBefore.set(target, target);
            target.elements.forEach(function (ele) {
                find(ele);
            });
        }
    };
    function find(target) {
        var result = seenBefore.get(target);
        if (!result) {
            var finder = finders[target.type];
            if (finder === undefined) {
                seenBefore.set(target, target);
            }
            else {
                return finder(target);
            }
        }
    }
    find(target.body);
    return freeNames;
}
/* tslint:disable:no-shadowed-variable */
// wrapper function, calls substitute immediately.
function substituteMain(name, replacement, target, paths) {
    var seenBefore = new Map();
    // initialises array to keep track of all paths visited
    // without modifying input path array
    var allPaths = [];
    var allPathsIndex = 0;
    var endMarker = '$';
    if (paths[0] === undefined) {
        allPaths.push([]);
    }
    else {
        allPaths.push(__spreadArray([], paths[0], true));
    }
    // substituters will stop expanding the path if index === -1
    var pathNotEnded = function (index) { return index > -1; };
    // branches out path into two different paths,
    // returns array index of branched path
    function branch(index) {
        allPathsIndex++;
        allPaths[allPathsIndex] = __spreadArray([], allPaths[index], true);
        return allPathsIndex;
    }
    // keeps track of names in upper scope so that it doesnt rename to these names
    var boundUpperScope = [];
    /**
     * Substituters are invoked only when the target is not seen before,
     *  therefore each function has the responsbility of registering the
     *  [target, replacement] pair in seenBefore.
     * How substituters work:
     * 1. Create dummy replacement and push [target, dummyReplacement]
     *    into the seenBefore array.
     * 2. [Recursive step] substitute the children;
     *    for each child, branch out the current path
     *    and push the appropriate access string into the path
     * 3. Return the dummyReplacement
     */
    var substituters = {
        // if name to be replaced is found,
        // push endMarker into path
        Identifier: function (target, index) {
            var re = / rename$/;
            if (replacement.type === 'Literal') {
                // only accept string, boolean and numbers for arguments
                if (target.name === name.name) {
                    if (pathNotEnded(index)) {
                        allPaths[index].push(endMarker);
                    }
                    return ast.primitive(replacement.value);
                }
                else {
                    return target;
                }
            }
            else if (replacement.type === 'Identifier' && re.test(replacement.name)) {
                if (target.name === name.name) {
                    if (pathNotEnded(index)) {
                        allPaths[index].push(endMarker);
                    }
                    return ast.identifier(replacement.name.split(' ')[0], replacement.loc);
                }
                else {
                    return target;
                }
            }
            else {
                if (target.name === name.name) {
                    if (pathNotEnded(index)) {
                        allPaths[index].push(endMarker);
                    }
                    return substitute(replacement, -1);
                }
                else {
                    return target;
                }
            }
        },
        ExpressionStatement: function (target, index) {
            var substedExpressionStatement = ast.expressionStatement((0, dummyAstCreator_1.dummyExpression)());
            seenBefore.set(target, substedExpressionStatement);
            if (pathNotEnded(index)) {
                allPaths[index].push('expression');
            }
            substedExpressionStatement.expression = substitute(target.expression, index);
            return substedExpressionStatement;
        },
        BinaryExpression: function (target, index) {
            var substedBinaryExpression = ast.binaryExpression(target.operator, (0, dummyAstCreator_1.dummyExpression)(), (0, dummyAstCreator_1.dummyExpression)(), target.loc);
            seenBefore.set(target, substedBinaryExpression);
            var nextIndex = index;
            if (pathNotEnded(index)) {
                nextIndex = branch(index);
                allPaths[index].push('left');
                allPaths[nextIndex].push('right');
            }
            substedBinaryExpression.left = substitute(target.left, index);
            substedBinaryExpression.right = substitute(target.right, nextIndex);
            return substedBinaryExpression;
        },
        UnaryExpression: function (target, index) {
            var substedUnaryExpression = ast.unaryExpression(target.operator, (0, dummyAstCreator_1.dummyExpression)(), target.loc);
            seenBefore.set(target, substedUnaryExpression);
            if (pathNotEnded(index)) {
                allPaths[index].push('argument');
            }
            substedUnaryExpression.argument = substitute(target.argument, index);
            return substedUnaryExpression;
        },
        ConditionalExpression: function (target, index) {
            var substedConditionalExpression = ast.conditionalExpression((0, dummyAstCreator_1.dummyExpression)(), (0, dummyAstCreator_1.dummyExpression)(), (0, dummyAstCreator_1.dummyExpression)(), target.loc);
            seenBefore.set(target, substedConditionalExpression);
            var nextIndex = index;
            var thirdIndex = index;
            if (pathNotEnded(index)) {
                nextIndex = branch(index);
                thirdIndex = branch(index);
                allPaths[index].push('test');
                allPaths[nextIndex].push('consequent');
                allPaths[thirdIndex].push('alternate');
            }
            substedConditionalExpression.test = substitute(target.test, index);
            substedConditionalExpression.consequent = substitute(target.consequent, nextIndex);
            substedConditionalExpression.alternate = substitute(target.alternate, thirdIndex);
            return substedConditionalExpression;
        },
        LogicalExpression: function (target, index) {
            var substedLocialExpression = ast.logicalExpression(target.operator, target.left, target.right);
            seenBefore.set(target, substedLocialExpression);
            var nextIndex = index;
            if (pathNotEnded(index)) {
                nextIndex = branch(index);
                allPaths[index].push('left');
                allPaths[nextIndex].push('right');
            }
            substedLocialExpression.left = substitute(target.left, index);
            substedLocialExpression.right = substitute(target.right, nextIndex);
            return substedLocialExpression;
        },
        CallExpression: function (target, index) {
            var dummyArgs = target.arguments.map(function () { return (0, dummyAstCreator_1.dummyExpression)(); });
            var substedCallExpression = ast.callExpression((0, dummyAstCreator_1.dummyExpression)(), dummyArgs, target.loc);
            seenBefore.set(target, substedCallExpression);
            var arr = [];
            var nextIndex = index;
            for (var i = 0; i < target.arguments.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('arguments[' + i + ']');
                }
                arr[i] = nextIndex;
                dummyArgs[i] = substitute(target.arguments[i], nextIndex);
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('callee');
            }
            substedCallExpression.callee = substitute(target.callee, index);
            return substedCallExpression;
        },
        FunctionDeclaration: function (target, index) {
            var substedParams = [];
            // creates a copy of the params so that the renaming only happens during substitution.
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                substedParams.push(ast.identifier(param.name, param.loc));
            }
            var re = / rename$/;
            var newID;
            var newBody = target.body;
            if (replacement.type === 'Identifier' && re.test(replacement.name)) {
                // renaming function name
                newID = ast.identifier(replacement.name.split(' ')[0], replacement.loc);
            }
            else {
                newID = ast.identifier(target.id.name, target.loc);
            }
            var substedFunctionDeclaration = ast.functionDeclaration(newID, substedParams, (0, dummyAstCreator_1.dummyBlockStatement)());
            seenBefore.set(target, substedFunctionDeclaration);
            var freeReplacement = [];
            var boundReplacement = [];
            if (replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') {
                freeReplacement = findMain(replacement, new Map());
                boundReplacement = scanOutBoundNames(replacement.body);
            }
            var freeTarget = findMain(target, new Map());
            var boundTarget = scanOutBoundNames(target.body);
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                if (param.type === 'Identifier' && param.name === name.name) {
                    substedFunctionDeclaration.body = target.body;
                    return substedFunctionDeclaration;
                }
                if (param.type == 'Identifier') {
                    if (freeReplacement.includes(param.name)) {
                        // change param name
                        var re_1 = /_\d+$/;
                        var newNum = void 0;
                        if (re_1.test(param.name)) {
                            var num = param.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            newBody = substituteMain(param, changed, target.body, [[]])[0];
                            substedFunctionDeclaration.params[i].name = changedName;
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(param.name, newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            newBody = substituteMain(param, changed, target.body, [[]])[0];
                            substedFunctionDeclaration.params[i].name = changedName;
                        }
                    }
                }
            }
            for (var _i = 0, substedParams_1 = substedParams; _i < substedParams_1.length; _i++) {
                var param = substedParams_1[_i];
                boundUpperScope.push(param.name);
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body');
            }
            substedFunctionDeclaration.body = substitute(newBody, index);
            return substedFunctionDeclaration;
        },
        FunctionExpression: function (target, index) {
            var substedParams = [];
            // creates a copy of the params so that the renaming only happens during substitution.
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                substedParams.push(ast.identifier(param.name, param.loc));
            }
            var substedFunctionExpression = target.id
                ? ast.functionDeclarationExpression(target.id, substedParams, (0, dummyAstCreator_1.dummyBlockStatement)())
                : ast.functionExpression(substedParams, (0, dummyAstCreator_1.dummyBlockStatement)());
            seenBefore.set(target, substedFunctionExpression);
            // check for free/bounded variable in replacement
            var freeReplacement = [];
            var boundReplacement = [];
            if (replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') {
                freeReplacement = findMain(replacement, new Map());
                boundReplacement = scanOutBoundNames(replacement.body);
            }
            var freeTarget = findMain(target, new Map());
            var boundTarget = scanOutBoundNames(target.body);
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                if (param.type === 'Identifier' && param.name === name.name) {
                    substedFunctionExpression.body = target.body;
                    return substedFunctionExpression;
                }
                if (param.type == 'Identifier') {
                    if (freeReplacement.includes(param.name)) {
                        // change param name
                        var re = /_\d+$/;
                        var newNum = void 0;
                        if (re.test(param.name)) {
                            var num = param.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            target.body = substituteMain(param, changed, target.body, [
                                []
                            ])[0];
                            substedFunctionExpression.params[i].name = changedName;
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(param.name, newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            target.body = substituteMain(param, changed, target.body, [
                                []
                            ])[0];
                            substedFunctionExpression.params[i].name = changedName;
                        }
                    }
                }
            }
            for (var _i = 0, substedParams_2 = substedParams; _i < substedParams_2.length; _i++) {
                var param = substedParams_2[_i];
                boundUpperScope.push(param.name);
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body');
            }
            substedFunctionExpression.body = substitute(target.body, index);
            return substedFunctionExpression;
        },
        Program: function (target, index) {
            var substedBody = target.body.map(function () { return (0, dummyAstCreator_1.dummyStatement)(); });
            var substedProgram = ast.program(substedBody);
            seenBefore.set(target, substedProgram);
            var declaredNames = (0, util_1.getDeclaredNames)(target);
            var re = / same/;
            // checks if the replacement is a functionExpression or arrowFunctionExpression and not from within the same block
            if ((replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') &&
                !re.test(name.name)) {
                var freeTarget = findMain(target, new Map());
                var declaredIds = scanOutDeclarations(target);
                var freeReplacement = findMain(replacement, new Map());
                var boundReplacement = scanOutDeclarations(replacement.body);
                for (var _i = 0, declaredIds_1 = declaredIds; _i < declaredIds_1.length; _i++) {
                    var declaredId = declaredIds_1[_i];
                    if (freeReplacement.includes(declaredId.name)) {
                        var re_2 = /_\d+$/;
                        var newNum = void 0;
                        if (re_2.test(declaredId.name)) {
                            var num = declaredId.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(declaredId.name, newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                    }
                }
            }
            var re2 = / rename/;
            if (declaredNames.has(name.name) && !re2.test(name.name)) {
                substedProgram.body = target.body;
                return substedProgram;
            }
            // if it is from the same block then the name would be name + " same", hence need to remove " same"
            // if not this statement does nothing as variable names should not have spaces
            name.name = name.name.split(' ')[0];
            var arr = [];
            var nextIndex = index;
            for (var i = 1; i < target.body.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('body[' + i + ']');
                }
                arr[i] = nextIndex;
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body[0]');
            }
            arr[0] = index;
            var arrIndex = -1;
            substedProgram.body = target.body.map(function (stmt) {
                arrIndex++;
                return substitute(stmt, arr[arrIndex]);
            });
            return substedProgram;
        },
        BlockStatement: function (target, index) {
            var substedBody = target.body.map(function () { return (0, dummyAstCreator_1.dummyStatement)(); });
            var substedBlockStatement = ast.blockStatement(substedBody);
            seenBefore.set(target, substedBlockStatement);
            var declaredNames = (0, util_1.getDeclaredNames)(target);
            var re = / same/;
            // checks if the replacement is a functionExpression or arrowFunctionExpression and not from within the same block
            if ((replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') &&
                !re.test(name.name)) {
                var freeTarget = findMain(target, new Map());
                var declaredIds = scanOutDeclarations(target);
                var freeReplacement = findMain(replacement, new Map());
                var boundReplacement = scanOutDeclarations(replacement.body);
                for (var _i = 0, declaredIds_2 = declaredIds; _i < declaredIds_2.length; _i++) {
                    var declaredId = declaredIds_2[_i];
                    if (freeReplacement.includes(declaredId.name)) {
                        var re_3 = /_\d+$/;
                        var newNum = void 0;
                        if (re_3.test(declaredId.name)) {
                            var num = declaredId.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(declaredId.name, newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                    }
                }
            }
            var re2 = / rename/;
            if (declaredNames.has(name.name) && !re2.test(name.name)) {
                substedBlockStatement.body = target.body;
                return substedBlockStatement;
            }
            // if it is from the same block then the name would be name + " same", hence need to remove " same"
            // if not this statement does nothing as variable names should not have spaces
            name.name = name.name.split(' ')[0];
            var arr = [];
            var nextIndex = index;
            for (var i = 1; i < target.body.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('body[' + i + ']');
                }
                arr[i] = nextIndex;
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body[0]');
            }
            arr[0] = index;
            var arrIndex = -1;
            substedBlockStatement.body = target.body.map(function (stmt) {
                arrIndex++;
                return substitute(stmt, arr[arrIndex]);
            });
            return substedBlockStatement;
        },
        BlockExpression: function (target, index) {
            var substedBody = target.body.map(function () { return (0, dummyAstCreator_1.dummyStatement)(); });
            var substedBlockExpression = ast.blockExpression(substedBody);
            seenBefore.set(target, substedBlockExpression);
            var declaredNames = (0, util_1.getDeclaredNames)(target);
            var re = / same/;
            // checks if the replacement is a functionExpression or arrowFunctionExpression and not from within the same block
            if ((replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') &&
                !re.test(name.name)) {
                var freeTarget = findMain(target, new Map());
                var declaredIds = scanOutDeclarations(target);
                var freeReplacement = findMain(replacement, new Map());
                var boundReplacement = scanOutDeclarations(replacement.body);
                for (var _i = 0, declaredIds_3 = declaredIds; _i < declaredIds_3.length; _i++) {
                    var declaredId = declaredIds_3[_i];
                    if (freeReplacement.includes(declaredId.name)) {
                        var re_4 = /_\d+$/;
                        var newNum = void 0;
                        if (re_4.test(declaredId.name)) {
                            var num = declaredId.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(declaredId.name, newNum, freeTarget, freeReplacement, declaredIds, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName + ' rename', declaredId.loc);
                            var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                            target = substituteMain(newName, changed, target, [[]])[0];
                        }
                    }
                }
            }
            var re2 = / rename/;
            if (declaredNames.has(name.name) && !re2.test(name.name)) {
                substedBlockExpression.body = target.body;
                return substedBlockExpression;
            }
            // if it is from the same block then the name would be name + " same", hence need to remove " same"
            // if not this statement does nothing as variable names should not have spaces
            name.name = name.name.split(' ')[0];
            var arr = [];
            var nextIndex = index;
            for (var i = 1; i < target.body.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('body[' + i + ']');
                }
                arr[i] = nextIndex;
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body[0]');
            }
            arr[0] = index;
            var arrIndex = -1;
            substedBlockExpression.body = target.body.map(function (stmt) {
                arrIndex++;
                return substitute(stmt, arr[arrIndex]);
            });
            return substedBlockExpression;
        },
        ReturnStatement: function (target, index) {
            var substedReturnStatement = ast.returnStatement((0, dummyAstCreator_1.dummyExpression)(), target.loc);
            seenBefore.set(target, substedReturnStatement);
            if (pathNotEnded(index)) {
                allPaths[index].push('argument');
            }
            substedReturnStatement.argument = substitute(target.argument, index);
            return substedReturnStatement;
        },
        // source 1
        ArrowFunctionExpression: function (target, index) {
            // creates a copy of the parameters so that renaming only happens during substitution
            var substedParams = [];
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                substedParams.push(ast.identifier(param.name, param.loc));
            }
            var newBody = target.body;
            var substedArrow = ast.arrowFunctionExpression(substedParams, (0, dummyAstCreator_1.dummyBlockStatement)());
            seenBefore.set(target, substedArrow);
            // check for free/bounded variable
            var freeReplacement = [];
            var boundReplacement = [];
            if (replacement.type == 'FunctionExpression' ||
                replacement.type == 'ArrowFunctionExpression') {
                freeReplacement = findMain(replacement, new Map());
                boundReplacement = scanOutBoundNames(replacement.body);
            }
            for (var i = 0; i < target.params.length; i++) {
                var param = target.params[i];
                if (param.type === 'Identifier' && param.name === name.name) {
                    substedArrow.body = target.body;
                    substedArrow.expression = target.body.type !== 'BlockStatement';
                    return substedArrow;
                }
                var freeTarget = findMain(target, new Map());
                var boundTarget = scanOutBoundNames(target.body);
                if (param.type == 'Identifier') {
                    if (freeReplacement.includes(param.name)) {
                        // change param name
                        var re = /_\d+$/;
                        var newNum = void 0;
                        if (re.test(param.name)) {
                            var num = param.name.split('_');
                            newNum = Number(num[1]) + 1;
                            var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            newBody = substituteMain(param, changed, target.body, [[]])[0];
                            substedArrow.params[i].name = changedName; // num[0] + '_' + newNum
                        }
                        else {
                            newNum = 1;
                            var changedName = getFreshName(param.name, newNum, freeTarget, freeReplacement, boundTarget, boundUpperScope, boundReplacement);
                            var changed = ast.identifier(changedName, param.loc);
                            newBody = substituteMain(param, changed, target.body, [[]])[0];
                            substedArrow.params[i].name = changedName;
                        }
                    }
                }
            }
            for (var _i = 0, substedParams_3 = substedParams; _i < substedParams_3.length; _i++) {
                var param = substedParams_3[_i];
                boundUpperScope.push(param.name);
            }
            for (var _a = 0, _b = target.params; _a < _b.length; _a++) {
                var param = _b[_a];
                if (param.type === 'Identifier' && param.name === name.name) {
                    substedArrow.body = target.body;
                    substedArrow.expression = target.body.type !== 'BlockStatement';
                    return substedArrow;
                }
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('body');
            }
            substedArrow.body = substitute(newBody, index);
            substedArrow.expression = target.body.type !== 'BlockStatement';
            return substedArrow;
        },
        VariableDeclaration: function (target, index) {
            var substedVariableDeclaration = ast.variableDeclaration([(0, dummyAstCreator_1.dummyVariableDeclarator)()]);
            seenBefore.set(target, substedVariableDeclaration);
            var arr = [];
            var nextIndex = index;
            for (var i = 1; i < target.declarations.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('declarations[' + i + ']');
                }
                arr[i] = nextIndex;
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('declarations[0]');
            }
            arr[0] = index;
            var arrIndex = -1;
            substedVariableDeclaration.declarations = target.declarations.map(function (dec) {
                arrIndex++;
                return substitute(dec, arr[arrIndex]);
            });
            return substedVariableDeclaration;
        },
        VariableDeclarator: function (target, index) {
            var subbed = ast.identifier(target.id.name);
            var substedVariableDeclarator = ast.variableDeclarator(subbed, (0, dummyAstCreator_1.dummyExpression)());
            seenBefore.set(target, substedVariableDeclarator);
            var re = / rename$/;
            if (target.id.type === 'Identifier' && name.name === target.id.name) {
                if (replacement.type == 'Identifier' && re.test(replacement.name)) {
                    var newName = ast.identifier(replacement.name.split(' ')[0], replacement.loc);
                    substedVariableDeclarator = ast.variableDeclarator(newName, (0, dummyAstCreator_1.dummyExpression)());
                }
                substedVariableDeclarator.init = target.init;
            }
            else {
                if (pathNotEnded(index)) {
                    allPaths[index].push('init');
                }
                substedVariableDeclarator.init = substitute(target.init, index);
            }
            return substedVariableDeclarator;
        },
        IfStatement: function (target, index) {
            var substedIfStatement = ast.ifStatement((0, dummyAstCreator_1.dummyExpression)(), (0, dummyAstCreator_1.dummyBlockStatement)(), (0, dummyAstCreator_1.dummyBlockStatement)(), target.loc);
            seenBefore.set(target, substedIfStatement);
            var nextIndex = index;
            var thirdIndex = index;
            if (pathNotEnded(index)) {
                nextIndex = branch(index);
                thirdIndex = branch(index);
                allPaths[index].push('test');
                allPaths[nextIndex].push('consequent');
                allPaths[thirdIndex].push('alternate');
            }
            substedIfStatement.test = substitute(target.test, index);
            substedIfStatement.consequent = substitute(target.consequent, nextIndex);
            substedIfStatement.alternate = target.alternate
                ? substitute(target.alternate, thirdIndex)
                : null;
            return substedIfStatement;
        },
        ArrayExpression: function (target, index) {
            var substedArray = ast.arrayExpression([(0, dummyAstCreator_1.dummyExpression)()]);
            seenBefore.set(target, substedArray);
            var arr = [];
            var nextIndex = index;
            for (var i = 1; i < target.elements.length; i++) {
                if (pathNotEnded(index)) {
                    nextIndex = branch(index);
                    allPaths[nextIndex].push('elements[' + i + ']');
                }
                arr[i] = nextIndex;
            }
            if (pathNotEnded(index)) {
                allPaths[index].push('elements[0]');
            }
            arr[0] = index;
            var arrIndex = -1;
            substedArray.elements = target.elements.map(function (ele) {
                arrIndex++;
                return substitute(ele, arr[arrIndex]);
            });
            return substedArray;
        }
    };
    /**
     * For mapper use, maps a [symbol, value] pair to the node supplied.
     * @param name the name to be replaced
     * @param replacement the expression to replace the name with
     * @param node a node holding the target symbols
     * @param seenBefore a list of nodes that are seen before in substitution
     */
    function substitute(target, index) {
        var result = seenBefore.get(target);
        if (result) {
            return result;
        }
        var substituter = substituters[target.type];
        if (substituter === undefined) {
            seenBefore.set(target, target);
            return target; // no need to subst, such as literals
        }
        else {
            // substituters are responsible of registering seenBefore
            return substituter(target, index);
        }
    }
    // after running substitute,
    // find paths that contain endMarker
    // and return only those paths
    var substituted = substitute(target, 0);
    var validPaths = [];
    for (var _i = 0, allPaths_1 = allPaths; _i < allPaths_1.length; _i++) {
        var path = allPaths_1[_i];
        if (path[path.length - 1] === endMarker) {
            validPaths.push(path.slice(0, path.length - 1));
        }
    }
    return [substituted, validPaths];
}
/**
 * Substitutes a call expression with the body of the callee (funExp)
 * and the body will have all ocurrences of parameters substituted
 * with the arguments.
 * @param callee call expression with callee as functionExpression
 * @param args arguments supplied to the call expression
 */
function apply(callee, args) {
    var substedBody = callee.body;
    var substedParams = callee.params;
    for (var i = 0; i < args.length; i++) {
        // source discipline requires parameters to be identifiers.
        var arg = args[i];
        if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            var freeTarget = findMain(ast.arrowFunctionExpression(substedParams, substedBody), new Map());
            var declaredIds = substedParams;
            var freeReplacement = findMain(arg, new Map());
            var boundReplacement = scanOutDeclarations(arg.body);
            var _loop_1 = function (declaredId) {
                if (freeReplacement.includes(declaredId.name)) {
                    var re = /_\d+$/;
                    var newNum = void 0;
                    if (re.test(declaredId.name)) {
                        var num = declaredId.name.split('_');
                        newNum = Number(num[1]) + 1;
                        var changedName = getFreshName(num[0], newNum, freeTarget, freeReplacement, declaredIds, [], boundReplacement);
                        var changed_1 = ast.identifier(changedName + ' rename', declaredId.loc);
                        var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                        substedBody = substituteMain(newName, changed_1, substedBody, [
                            []
                        ])[0];
                        substedParams = substedParams.map(function (param) {
                            return param.name === declaredId.name ? changed_1 : param;
                        });
                    }
                    else {
                        newNum = 1;
                        var changedName = getFreshName(declaredId.name, newNum, freeTarget, freeReplacement, declaredIds, [], boundReplacement);
                        var changed_2 = ast.identifier(changedName + ' rename', declaredId.loc);
                        var newName = ast.identifier(declaredId.name + ' rename', declaredId.loc);
                        substedBody = substituteMain(newName, changed_2, substedBody, [
                            []
                        ])[0];
                        substedParams = substedParams.map(function (param) {
                            return param.name === declaredId.name ? changed_2 : param;
                        });
                    }
                }
            };
            for (var _i = 0, declaredIds_4 = declaredIds; _i < declaredIds_4.length; _i++) {
                var declaredId = declaredIds_4[_i];
                _loop_1(declaredId);
            }
        }
        // source discipline requires parameters to be identifiers.
        var param = substedParams[i];
        substedBody = substituteMain(param, arg, substedBody, [[]])[0];
    }
    if (callee.type === 'ArrowFunctionExpression' && callee.expression) {
        return substedBody;
    }
    var firstStatement = substedBody.body[0];
    return firstStatement && firstStatement.type === 'ReturnStatement'
        ? firstStatement.argument
        : ast.blockExpression(substedBody.body);
}
// Wrapper function to house reduce, explain and bodify
function reduceMain(node, context) {
    // variable to control verbosity of bodify
    var verbose = true;
    // converts body of code to string
    function bodify(target) {
        var bodifiers = {
            Literal: function (target) {
                return target.raw !== undefined ? target.raw : String(target.value);
            },
            Identifier: function (target) {
                return target.name.startsWith('anonymous_') ? 'anonymous function' : target.name;
            },
            ExpressionStatement: function (target) {
                return bodify(target.expression) + ' finished evaluating';
            },
            BinaryExpression: function (target) {
                return bodify(target.left) + ' ' + target.operator + ' ' + bodify(target.right);
            },
            UnaryExpression: function (target) {
                return target.operator + bodify(target.argument);
            },
            ConditionalExpression: function (target) {
                return bodify(target.test) + ' ? ' + bodify(target.consequent) + ' : ' + bodify(target.alternate);
            },
            LogicalExpression: function (target) {
                return bodify(target.left) + ' ' + target.operator + ' ' + bodify(target.right);
            },
            CallExpression: function (target) {
                if (target.callee.type === 'ArrowFunctionExpression') {
                    return '(' + bodify(target.callee) + ')(' + target.arguments.map(bodify) + ')';
                }
                else {
                    return bodify(target.callee) + '(' + target.arguments.map(bodify) + ')';
                }
            },
            FunctionDeclaration: function (target) {
                var funcName = target.id !== null ? target.id.name : 'error';
                return ('Function ' +
                    funcName +
                    ' declared' +
                    (target.params.length > 0
                        ? ', parameter(s) ' + target.params.map(bodify) + ' required'
                        : ''));
            },
            FunctionExpression: function (target) {
                var id = target.id;
                return id === null || id === undefined ? '...' : id.name;
            },
            ReturnStatement: function (target) {
                return bodify(target.argument) + ' returned';
            },
            // guards against infinite text generation
            ArrowFunctionExpression: function (target) {
                if (verbose) {
                    verbose = false;
                    var redacted = (target.params.length > 0 ? target.params.map(bodify) : '()') +
                        ' => ' +
                        bodify(target.body);
                    verbose = true;
                    return redacted;
                }
                else {
                    return (target.params.length > 0 ? target.params.map(bodify) : '()') + ' => ...';
                }
            },
            VariableDeclaration: function (target) {
                return 'Constant ' +
                    bodify(target.declarations[0].id) +
                    ' declared and substituted into rest of block';
            },
            ArrayExpression: function (target) {
                return '[' +
                    bodify(target.elements[0]) +
                    ', ' +
                    bodify(target.elements[1]) +
                    ']';
            }
        };
        var bodifier = bodifiers[target.type];
        return bodifier === undefined ? '...' : bodifier(target);
    }
    // generates string to explain current step
    function explain(target) {
        var explainers = {
            BinaryExpression: function (target) {
                return 'Binary expression ' + bodify(target) + ' evaluated';
            },
            UnaryExpression: function (target) {
                return ('Unary expression evaluated, ' +
                    (target.operator === '!' ? 'boolean ' : 'value ') +
                    bodify(target.argument) +
                    ' negated');
            },
            ConditionalExpression: function (target) {
                return ('Conditional expression evaluated, condition is ' +
                    (bodify(target.test) === 'true'
                        ? 'true, consequent evaluated'
                        : 'false, alternate evaluated'));
            },
            LogicalExpression: function (target) {
                return target.operator === '&&'
                    ? 'AND operation evaluated, left of operator is ' +
                        (bodify(target.left) === 'true'
                            ? 'true, continue evaluating right of operator'
                            : 'false, stop evaluation')
                    : 'OR operation evaluated, left of operator is ' +
                        (bodify(target.left) === 'true'
                            ? 'true, stop evaluation'
                            : 'false, continue evaluating right of operator');
            },
            CallExpression: function (target) {
                if (target.callee.type === 'ArrowFunctionExpression') {
                    if (target.callee.params.length === 0) {
                        return bodify(target.callee) + ' runs';
                    }
                    else {
                        return (target.arguments.map(bodify) +
                            ' substituted into ' +
                            target.callee.params.map(bodify) +
                            ' of ' +
                            bodify(target.callee));
                    }
                }
                else if (target.callee.type === 'FunctionExpression') {
                    if (target.callee.params.length === 0) {
                        return 'Function ' + bodify(target.callee) + ' runs';
                    }
                    else {
                        return ('Function ' +
                            bodify(target.callee) +
                            ' takes in ' +
                            target.arguments.map(bodify) +
                            ' as input ' +
                            target.callee.params.map(bodify));
                    }
                }
                else {
                    return bodify(target.callee) + ' runs';
                }
            },
            Program: function (target) { return bodify(target.body[0]); },
            BlockExpression: function (target) {
                return target.body.length === 0 ? 'Empty block statement evaluated' : bodify(target.body[0]);
            },
            BlockStatement: function (target) {
                return target.body.length === 0 ? 'Empty block statement evaluated' : bodify(target.body[0]);
            },
            IfStatement: function (target) {
                return ('If statement evaluated, ' +
                    (bodify(target.test) === 'true'
                        ? 'condition true, proceed to if block'
                        : 'condition false, proceed to else block'));
            }
        };
        var explainer = explainers[target.type];
        return explainer === undefined ? '...' : explainer(target);
    }
    var reducers = {
        // source 0
        Identifier: function (node, context, paths) {
            // can only be built ins. the rest should have been declared
            if (!((0, util_1.isAllowedLiterals)(node) || (0, util_1.isBuiltinFunction)(node) || (0, util_1.isImportedFunction)(node, context))) {
                throw new errors.UndefinedVariable(node.name, node);
            }
            else {
                return [node, context, paths, 'identifier'];
            }
        },
        ExpressionStatement: function (node, context, paths) {
            paths[0].push('expression');
            var _a = reduce(node.expression, context, paths), reduced = _a[0], cont = _a[1], path = _a[2], str = _a[3];
            return [ast.expressionStatement(reduced), cont, path, str];
        },
        BinaryExpression: function (node, context, paths) {
            var operator = node.operator, left = node.left, right = node.right;
            if (isIrreducible(left, context)) {
                if (isIrreducible(right, context)) {
                    // if the ast are the same, then the values are the same
                    if (builtin.is_function(left).value &&
                        builtin.is_function(right).value &&
                        operator === '===') {
                        return [(0, converter_1.valueToExpression)(left === right), context, paths, explain(node)];
                    }
                    var _a = [left, right].map(converter_1.nodeToValue), leftValue = _a[0], rightValue = _a[1];
                    var error = rttc.checkBinaryExpression(node, operator, context.chapter, leftValue, rightValue);
                    if (error === undefined) {
                        var lit = (0, operators_1.evaluateBinaryExpression)(operator, leftValue, rightValue);
                        return [(0, converter_1.valueToExpression)(lit, context), context, paths, explain(node)];
                    }
                    else {
                        throw error;
                    }
                }
                else {
                    paths[0].push('right');
                    var _b = reduce(right, context, paths), reducedRight = _b[0], cont = _b[1], path = _b[2], str = _b[3];
                    var reducedExpression = ast.binaryExpression(operator, left, reducedRight, node.loc);
                    return [reducedExpression, cont, path, str];
                }
            }
            else {
                paths[0].push('left');
                var _c = reduce(left, context, paths), reducedLeft = _c[0], cont = _c[1], path = _c[2], str = _c[3];
                var reducedExpression = ast.binaryExpression(operator, reducedLeft, right, node.loc);
                return [reducedExpression, cont, path, str];
            }
        },
        UnaryExpression: function (node, context, paths) {
            var operator = node.operator, argument = node.argument;
            if (isIrreducible(argument, context)) {
                // tslint:disable-next-line
                var argumentValue = (0, converter_1.nodeToValue)(argument);
                var error = rttc.checkUnaryExpression(node, operator, argumentValue, context.chapter);
                if (error === undefined) {
                    var result = (0, operators_1.evaluateUnaryExpression)(operator, argumentValue);
                    return [(0, converter_1.valueToExpression)(result, context), context, paths, explain(node)];
                }
                else {
                    throw error;
                }
            }
            else {
                paths[0].push('argument');
                var _a = reduce(argument, context, paths), reducedArgument = _a[0], cont = _a[1], path = _a[2], str = _a[3];
                var reducedExpression = ast.unaryExpression(operator, reducedArgument, node.loc);
                return [reducedExpression, cont, path, str];
            }
        },
        ConditionalExpression: function (node, context, paths) {
            var test = node.test, consequent = node.consequent, alternate = node.alternate;
            if (test.type === 'Literal') {
                var error = rttc.checkIfStatement(node, test.value, context.chapter);
                if (error === undefined) {
                    return [
                        (test.value ? consequent : alternate),
                        context,
                        paths,
                        explain(node)
                    ];
                }
                else {
                    throw error;
                }
            }
            else {
                paths[0].push('test');
                var _a = reduce(test, context, paths), reducedTest = _a[0], cont = _a[1], path = _a[2], str = _a[3];
                var reducedExpression = ast.conditionalExpression(reducedTest, consequent, alternate, node.loc);
                return [reducedExpression, cont, path, str];
            }
        },
        LogicalExpression: function (node, context, paths) {
            var left = node.left, right = node.right;
            if (isIrreducible(left, context)) {
                if (!(left.type === 'Literal' && typeof left.value === 'boolean')) {
                    throw new rttc.TypeError(left, ' on left hand side of operation', 'boolean', left.type);
                }
                else {
                    var result = node.operator === '&&'
                        ? left.value
                            ? right
                            : ast.literal(false, node.loc)
                        : left.value
                            ? ast.literal(true, node.loc)
                            : right;
                    return [result, context, paths, explain(node)];
                }
            }
            else {
                paths[0].push('left');
                var _a = reduce(left, context, paths), reducedLeft = _a[0], cont = _a[1], path = _a[2], str = _a[3];
                return [
                    ast.logicalExpression(node.operator, reducedLeft, right, node.loc),
                    cont,
                    path,
                    str
                ];
            }
        },
        // core of the subst model
        CallExpression: function (node, context, paths) {
            var _a = [node.callee, node.arguments], callee = _a[0], args = _a[1];
            // source 0: discipline: any expression can be transformed into either literal, ident(builtin) or funexp
            // if functor can reduce, reduce functor
            if (!isIrreducible(callee, context)) {
                paths[0].push('callee');
                var _b = reduce(callee, context, paths), reducedCallee = _b[0], cont = _b[1], path = _b[2], str = _b[3];
                return [
                    ast.callExpression(reducedCallee, args, node.loc),
                    cont,
                    path,
                    str
                ];
            }
            else if (callee.type === 'Literal') {
                throw new errors.CallingNonFunctionValue(callee, node);
            }
            else if (callee.type === 'Identifier' &&
                !(callee.name in context.runtime.environments[0].head)) {
                throw new errors.UndefinedVariable(callee.name, callee);
            }
            else {
                // callee is builtin or funexp
                if ((callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') &&
                    args.length !== callee.params.length) {
                    throw new errors.InvalidNumberOfArguments(node, args.length, callee.params.length);
                }
                else {
                    for (var i = 0; i < args.length; i++) {
                        var currentArg = args[i];
                        if (!isIrreducible(currentArg, context)) {
                            paths[0].push('arguments[' + i + ']');
                            var _c = reduce(currentArg, context, paths), reducedCurrentArg = _c[0], cont = _c[1], path = _c[2], str = _c[3];
                            var reducedArgs = __spreadArray(__spreadArray(__spreadArray([], args.slice(0, i), true), [reducedCurrentArg], false), args.slice(i + 1), true);
                            return [
                                ast.callExpression(callee, reducedArgs, node.loc),
                                cont,
                                path,
                                str
                            ];
                        }
                        if (currentArg.type === 'Identifier' &&
                            !(currentArg.name in context.runtime.environments[0].head)) {
                            throw new errors.UndefinedVariable(currentArg.name, currentArg);
                        }
                    }
                }
                // if it reaches here, means all the arguments are legal.
                if (['FunctionExpression', 'ArrowFunctionExpression'].includes(callee.type)) {
                    return [
                        apply(callee, args),
                        context,
                        paths,
                        explain(node)
                    ];
                }
                else {
                    if (callee.name.includes('math')) {
                        return [
                            builtin.evaluateMath.apply(builtin, __spreadArray([callee.name], args, false)),
                            context,
                            paths,
                            explain(node)
                        ];
                    }
                    else if (typeof builtin[callee.name] === 'function') {
                        return [builtin[callee.name].apply(builtin, args), context, paths, explain(node)];
                    }
                    return [
                        builtin.evaluateModuleFunction.apply(builtin, __spreadArray([callee.name, context], args, false)),
                        context,
                        paths,
                        explain(node)
                    ];
                }
            }
        },
        Program: function (node, context, paths) {
            var _a;
            if (node.body.length === 0) {
                return [ast.expressionStatement(ast.identifier('undefined')), context, paths, explain(node)];
            }
            else {
                var _b = node.body, firstStatement = _b[0], otherStatements = _b.slice(1);
                if (firstStatement.type === 'ReturnStatement') {
                    return [firstStatement, context, paths, explain(node)];
                }
                else if (firstStatement.type === 'IfStatement') {
                    paths[0].push('body[0]');
                    var _c = reduce(firstStatement, context, paths), reduced_1 = _c[0], cont_1 = _c[1], path_1 = _c[2], str_1 = _c[3];
                    if (reduced_1.type === 'BlockStatement') {
                        var body = reduced_1.body;
                        if (body.length > 1) {
                            path_1[1] = __spreadArray([], path_1[0].slice(0, path_1[0].length - 1), true);
                        }
                        var wholeBlock = body.concat.apply(body, otherStatements);
                        return [ast.program(wholeBlock), cont_1, path_1, str_1];
                    }
                    else {
                        return [
                            ast.program(__spreadArray([reduced_1], otherStatements, true)),
                            cont_1,
                            path_1,
                            str_1
                        ];
                    }
                }
                else if (firstStatement.type === 'BlockStatement' && firstStatement.body.length === 0) {
                    paths[0].push('body[0]');
                    paths.push([]);
                    var stmt = ast.program(otherStatements);
                    return [stmt, context, paths, explain(firstStatement)];
                }
                else if (firstStatement.type === 'ExpressionStatement' &&
                    isIrreducible(firstStatement.expression, context)) {
                    // Intentionally ignore the remaining statements
                    var secondStatement = otherStatements[0];
                    if (secondStatement !== undefined &&
                        secondStatement.type == 'ExpressionStatement' &&
                        isIrreducible(secondStatement.expression, context)) {
                        paths[0].push('body[0]');
                        paths.push([]);
                        var stmt = ast.program(otherStatements);
                        return [stmt, context, paths, explain(node)];
                    }
                    else {
                        // Reduce the second statement and preserve the first statement
                        // Pass in a new path to avoid modifying the original path
                        var newPath = [[]];
                        var _d = reducers['Program'](ast.program(otherStatements), context, newPath), reduced_2 = _d[0], cont_2 = _d[1], path_2 = _d[2], str_2 = _d[3];
                        // Fix path highlighting after preserving first statement
                        path_2.forEach(function (pathStep) {
                            pathStep.forEach(function (_, i) {
                                if (i == 0) {
                                    pathStep[i] = pathStep[i].replace(/\d+/g, function (match) { return String(Number(match) + 1); });
                                }
                            });
                        });
                        (_a = paths[0]).push.apply(_a, path_2[0]);
                        var stmt = ast.program(__spreadArray([
                            firstStatement
                        ], reduced_2.body, true));
                        return [stmt, cont_2, path_2, str_2];
                    }
                }
                else if (firstStatement.type === 'FunctionDeclaration') {
                    if (firstStatement.id === null) {
                        throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                    }
                    var funDecExp = ast.functionDeclarationExpression(firstStatement.id, firstStatement.params, firstStatement.body);
                    // substitute body
                    funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                        []
                    ])[0];
                    // substitute the rest of the program
                    var remainingProgram = ast.program(otherStatements);
                    // substitution within the same program, add " same" so that substituter can differentiate between
                    // substitution within the program and substitution from outside the program
                    var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                    var subst = substituteMain(newId, funDecExp, remainingProgram, paths);
                    // concats paths such that:
                    // paths[0] -> path to the program to be substituted, pre-redex
                    // paths[1...] -> path(s) to the parts of the remaining program
                    // that were substituted, post-redex
                    paths[0].push('body[0]');
                    var allPaths = paths.concat(subst[1]);
                    if (subst[1].length === 0) {
                        allPaths.push([]);
                    }
                    return [subst[0], context, allPaths, explain(node)];
                }
                else if (firstStatement.type === 'VariableDeclaration') {
                    var kind = firstStatement.kind, declarations = firstStatement.declarations;
                    if (kind !== 'const') {
                        // TODO: cannot use let or var
                        return [(0, dummyAstCreator_1.dummyProgram)(), context, paths, 'cannot use let or var'];
                    }
                    else if (declarations.length <= 0 ||
                        declarations.length > 1 ||
                        declarations[0].type !== 'VariableDeclarator' ||
                        !declarations[0].init) {
                        // TODO: syntax error
                        return [(0, dummyAstCreator_1.dummyProgram)(), context, paths, 'syntax error'];
                    }
                    else {
                        var declarator = declarations[0];
                        var rhs = declarator.init;
                        if (declarator.id.type !== 'Identifier') {
                            // TODO: source does not allow destructuring
                            return [(0, dummyAstCreator_1.dummyProgram)(), context, paths, 'source does not allow destructuring'];
                        }
                        else if (isIrreducible(rhs, context)) {
                            var remainingProgram = ast.program(otherStatements);
                            // force casting for weird errors
                            // substitution within the same program, add " same" so that substituter can differentiate between
                            // substitution within the program and substitution from outside the program
                            var newId = ast.identifier(declarator.id.name + ' same', declarator.id.loc);
                            var subst = substituteMain(newId, rhs, remainingProgram, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else if (rhs.type === 'ArrowFunctionExpression' ||
                            rhs.type === 'FunctionExpression') {
                            var funDecExp = ast.functionDeclarationExpression(declarator.id, rhs.params, rhs.body.type === 'BlockStatement'
                                ? rhs.body
                                : ast.blockStatement([ast.returnStatement(rhs.body)]));
                            // substitute body
                            funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                                []
                            ])[0];
                            // substitute the rest of the program
                            var remainingProgram = ast.program(otherStatements);
                            // substitution within the same block, add " same" so that substituter can differentiate between
                            // substitution within the block and substitution from outside the block
                            var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                            var subst = substituteMain(newId, funDecExp, remainingProgram, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else {
                            paths[0].push('body[0]');
                            paths[0].push('declarations[0]');
                            paths[0].push('init');
                            var _e = reduce(rhs, context, paths), reducedRhs = _e[0], cont_3 = _e[1], path_3 = _e[2], str_3 = _e[3];
                            return [
                                ast.program(__spreadArray([
                                    ast.declaration(declarator.id.name, 'const', reducedRhs)
                                ], otherStatements, true)),
                                cont_3,
                                path_3,
                                str_3
                            ];
                        }
                    }
                }
                paths[0].push('body[0]');
                var _f = reduce(firstStatement, context, paths), reduced = _f[0], cont = _f[1], path = _f[2], str = _f[3];
                return [
                    ast.program(__spreadArray([reduced], otherStatements, true)),
                    cont,
                    path,
                    str
                ];
            }
        },
        BlockStatement: function (node, context, paths) {
            var _a;
            if (node.body.length === 0) {
                return [ast.expressionStatement(ast.identifier('undefined')), context, paths, explain(node)];
            }
            else {
                var _b = node.body, firstStatement = _b[0], otherStatements = _b.slice(1);
                if (firstStatement.type === 'ReturnStatement') {
                    return [firstStatement, context, paths, explain(node)];
                }
                else if (firstStatement.type === 'IfStatement') {
                    paths[0].push('body[0]');
                    var _c = reduce(firstStatement, context, paths), reduced_3 = _c[0], cont_4 = _c[1], path_4 = _c[2], str_4 = _c[3];
                    if (reduced_3.type === 'BlockStatement') {
                        var body = reduced_3.body;
                        if (body.length > 1) {
                            path_4[1] = __spreadArray([], path_4[0].slice(0, path_4[0].length - 1), true);
                        }
                        var wholeBlock = body.concat.apply(body, otherStatements);
                        return [ast.blockStatement(wholeBlock), cont_4, path_4, str_4];
                    }
                    else {
                        return [
                            ast.blockStatement(__spreadArray([reduced_3], otherStatements, true)),
                            cont_4,
                            path_4,
                            str_4
                        ];
                    }
                }
                else if (firstStatement.type === 'BlockStatement' && firstStatement.body.length === 0) {
                    paths[0].push('body[0]');
                    paths.push([]);
                    var stmt = ast.blockStatement(otherStatements);
                    return [stmt, context, paths, explain(firstStatement)];
                }
                else if (firstStatement.type === 'ExpressionStatement' &&
                    isIrreducible(firstStatement.expression, context)) {
                    // Intentionally ignore the remaining statements
                    var secondStatement = otherStatements[0];
                    if (secondStatement == undefined) {
                        var stmt = ast.expressionStatement(firstStatement.expression);
                        return [stmt, context, paths, explain(node)];
                    }
                    else if (secondStatement.type == 'ExpressionStatement' &&
                        isIrreducible(secondStatement.expression, context)) {
                        paths[0].push('body[0]');
                        paths.push([]);
                        var stmt = ast.blockStatement(otherStatements);
                        return [stmt, context, paths, explain(node)];
                    }
                    else {
                        // Reduce the second statement and preserve the first statement
                        // Pass in a new path to avoid modifying the original path
                        var newPath = [[]];
                        var _d = reducers['BlockStatement'](ast.blockStatement(otherStatements), context, newPath), reduced_4 = _d[0], cont_5 = _d[1], path_5 = _d[2], str_5 = _d[3];
                        // Fix path highlighting after preserving first statement
                        path_5.forEach(function (pathStep) {
                            pathStep.forEach(function (_, i) {
                                if (i == 0) {
                                    pathStep[i] = pathStep[i].replace(/\d+/g, function (match) { return String(Number(match) + 1); });
                                }
                            });
                        });
                        (_a = paths[0]).push.apply(_a, path_5[0]);
                        var stmt = ast.blockStatement(__spreadArray([
                            firstStatement
                        ], reduced_4.body, true));
                        return [stmt, cont_5, paths, str_5];
                    }
                }
                else if (firstStatement.type === 'FunctionDeclaration') {
                    var funDecExp = ast.functionDeclarationExpression(firstStatement.id, firstStatement.params, firstStatement.body);
                    // substitute body
                    funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                        []
                    ])[0];
                    // substitute the rest of the blockStatement
                    var remainingBlockStatement = ast.blockStatement(otherStatements);
                    // substitution within the same block, add " same" so that substituter can differentiate between
                    // substitution within the block and substitution from outside the block
                    var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                    var subst = substituteMain(newId, funDecExp, remainingBlockStatement, paths);
                    // concats paths such that:
                    // paths[0] -> path to the program to be substituted, pre-redex
                    // paths[1...] -> path(s) to the parts of the remaining program
                    // that were substituted, post-redex
                    paths[0].push('body[0]');
                    var allPaths = paths.concat(subst[1]);
                    if (subst[1].length === 0) {
                        allPaths.push([]);
                    }
                    return [subst[0], context, allPaths, explain(node)];
                }
                else if (firstStatement.type === 'VariableDeclaration') {
                    var kind = firstStatement.kind, declarations = firstStatement.declarations;
                    if (kind !== 'const') {
                        // TODO: cannot use let or var
                        return [(0, dummyAstCreator_1.dummyBlockStatement)(), context, paths, 'cannot use let or var'];
                    }
                    else if (declarations.length <= 0 ||
                        declarations.length > 1 ||
                        declarations[0].type !== 'VariableDeclarator' ||
                        !declarations[0].init) {
                        // TODO: syntax error
                        return [(0, dummyAstCreator_1.dummyBlockStatement)(), context, paths, 'syntax error'];
                    }
                    else {
                        var declarator = declarations[0];
                        var rhs = declarator.init;
                        if (declarator.id.type !== 'Identifier') {
                            // TODO: source does not allow destructuring
                            return [(0, dummyAstCreator_1.dummyBlockStatement)(), context, paths, 'source does not allow destructuring'];
                        }
                        else if (isIrreducible(rhs, context)) {
                            var remainingBlockStatement = ast.blockStatement(otherStatements);
                            // force casting for weird errors
                            // substitution within the same block, add " same" so that substituter can differentiate between
                            // substitution within the block and substitution from outside the block
                            var newId = ast.identifier(declarator.id.name + ' same', declarator.id.loc);
                            var subst = substituteMain(newId, rhs, remainingBlockStatement, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else if (rhs.type === 'ArrowFunctionExpression' ||
                            rhs.type === 'FunctionExpression') {
                            var funDecExp = ast.functionDeclarationExpression(declarator.id, rhs.params, rhs.body.type === 'BlockStatement'
                                ? rhs.body
                                : ast.blockStatement([ast.returnStatement(rhs.body)]));
                            // substitute body
                            funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                                []
                            ])[0];
                            // substitute the rest of the blockStatement
                            var remainingBlockStatement = ast.blockStatement(otherStatements);
                            // substitution within the same block, add " same" so that substituter can differentiate between
                            // substitution within the block and substitution from outside the block
                            var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                            var subst = substituteMain(newId, funDecExp, remainingBlockStatement, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else {
                            paths[0].push('body[0]');
                            paths[0].push('declarations[0]');
                            paths[0].push('init');
                            var _e = reduce(rhs, context, paths), reducedRhs = _e[0], cont_6 = _e[1], path_6 = _e[2], str_6 = _e[3];
                            return [
                                ast.blockStatement(__spreadArray([
                                    ast.declaration(declarator.id.name, 'const', reducedRhs)
                                ], otherStatements, true)),
                                cont_6,
                                path_6,
                                str_6
                            ];
                        }
                    }
                }
                paths[0].push('body[0]');
                var _f = reduce(firstStatement, context, paths), reduced = _f[0], cont = _f[1], path = _f[2], str = _f[3];
                return [
                    ast.blockStatement(__spreadArray([reduced], otherStatements, true)),
                    cont,
                    path,
                    str
                ];
            }
        },
        BlockExpression: function (node, context, paths) {
            var _a;
            if (node.body.length === 0) {
                return [ast.identifier('undefined'), context, paths, explain(node)];
            }
            else {
                var _b = node.body, firstStatement = _b[0], otherStatements = _b.slice(1);
                if (firstStatement.type === 'ReturnStatement') {
                    var arg = firstStatement.argument;
                    return [arg, context, paths, explain(node)];
                }
                else if (firstStatement.type === 'IfStatement') {
                    paths[0].push('body[0]');
                    var _c = reduce(firstStatement, context, paths), reduced_5 = _c[0], cont_7 = _c[1], path_7 = _c[2], str_7 = _c[3];
                    if (reduced_5.type === 'BlockStatement') {
                        var body = reduced_5.body;
                        if (body.length > 1) {
                            path_7[1] = __spreadArray([], path_7[0].slice(0, path_7[0].length - 1), true);
                        }
                        var wholeBlock = body.concat.apply(body, otherStatements);
                        return [ast.blockExpression(wholeBlock), cont_7, path_7, str_7];
                    }
                    else {
                        return [
                            ast.blockExpression(__spreadArray([
                                reduced_5
                            ], otherStatements, true)),
                            cont_7,
                            path_7,
                            str_7
                        ];
                    }
                }
                else if (firstStatement.type === 'BlockStatement' && firstStatement.body.length === 0) {
                    paths[0].push('body[0]');
                    paths.push([]);
                    var stmt = ast.blockExpression(otherStatements);
                    return [stmt, context, paths, explain(firstStatement)];
                }
                else if (firstStatement.type === 'ExpressionStatement' &&
                    isIrreducible(firstStatement.expression, context)) {
                    // Intentionally ignore the remaining statements
                    var secondStatement = otherStatements[0];
                    if (secondStatement == undefined) {
                        var stmt = ast.identifier('undefined');
                        return [stmt, context, paths, explain(node)];
                    }
                    else if ((secondStatement.type == 'ExpressionStatement' &&
                        isIrreducible(secondStatement.expression, context)) ||
                        secondStatement.type === 'ReturnStatement') {
                        paths[0].push('body[0]');
                        paths.push([]);
                        var stmt = ast.blockExpression(otherStatements);
                        return [stmt, context, paths, explain(node)];
                    }
                    else {
                        // Reduce the second statement and preserve the first statement
                        // Pass in a new path to avoid modifying the original path
                        var newPath = [[]];
                        var _d = reducers['BlockExpression'](ast.blockExpression(otherStatements), context, newPath), reduced_6 = _d[0], cont_8 = _d[1], path_8 = _d[2], str_8 = _d[3];
                        // Fix path highlighting after preserving first statement
                        path_8.forEach(function (pathStep) {
                            pathStep.forEach(function (_, i) {
                                if (i == 0) {
                                    pathStep[i] = pathStep[i].replace(/\d+/g, function (match) { return String(Number(match) + 1); });
                                }
                            });
                        });
                        (_a = paths[0]).push.apply(_a, path_8[0]);
                        var stmt = ast.blockExpression(__spreadArray([
                            firstStatement
                        ], reduced_6.body, true));
                        return [stmt, cont_8, paths, str_8];
                    }
                }
                else if (firstStatement.type === 'FunctionDeclaration') {
                    var funDecExp = ast.functionDeclarationExpression(firstStatement.id, firstStatement.params, firstStatement.body);
                    // substitute body
                    funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                        []
                    ])[0];
                    // substitute the rest of the blockExpression
                    var remainingBlockExpression = ast.blockExpression(otherStatements);
                    // substitution within the same block, add " same" so that substituter can differentiate between
                    // substitution within the block and substitution from outside the block
                    var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                    var subst = substituteMain(newId, funDecExp, remainingBlockExpression, paths);
                    // concats paths such that:
                    // paths[0] -> path to the program to be substituted, pre-redex
                    // paths[1...] -> path(s) to the parts of the remaining program
                    // that were substituted, post-redex
                    paths[0].push('body[0]');
                    var allPaths = paths.concat(subst[1]);
                    if (subst[1].length === 0) {
                        allPaths.push([]);
                    }
                    return [subst[0], context, allPaths, explain(node)];
                }
                else if (firstStatement.type === 'VariableDeclaration') {
                    var kind = firstStatement.kind, declarations = firstStatement.declarations;
                    if (kind !== 'const') {
                        // TODO: cannot use let or var
                        return [(0, dummyAstCreator_1.dummyBlockExpression)(), context, paths, 'cannot use let or var'];
                    }
                    else if (declarations.length <= 0 ||
                        declarations.length > 1 ||
                        declarations[0].type !== 'VariableDeclarator' ||
                        !declarations[0].init) {
                        // TODO: syntax error
                        return [(0, dummyAstCreator_1.dummyBlockExpression)(), context, paths, 'syntax error'];
                    }
                    else {
                        var declarator = declarations[0];
                        var rhs = declarator.init;
                        if (declarator.id.type !== 'Identifier') {
                            // TODO: source does not allow destructuring
                            return [(0, dummyAstCreator_1.dummyBlockExpression)(), context, paths, 'source does not allow destructuring'];
                        }
                        else if (isIrreducible(rhs, context)) {
                            var remainingBlockExpression = ast.blockExpression(otherStatements);
                            // forced casting for some weird errors
                            // substitution within the same block, add " same" so that substituter can differentiate between
                            // substitution within the block and substitution from outside the block
                            var newId = ast.identifier(declarator.id.name + ' same', declarator.id.loc);
                            var subst = substituteMain(newId, rhs, remainingBlockExpression, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else if (rhs.type === 'ArrowFunctionExpression' ||
                            rhs.type === 'FunctionExpression') {
                            var funDecExp = ast.functionDeclarationExpression(declarator.id, rhs.params, rhs.body.type === 'BlockStatement'
                                ? rhs.body
                                : ast.blockStatement([ast.returnStatement(rhs.body)]));
                            // substitute body
                            funDecExp = substituteMain(funDecExp.id, funDecExp, funDecExp, [
                                []
                            ])[0];
                            // substitute the rest of the blockExpression
                            var remainingBlockExpression = ast.blockExpression(otherStatements);
                            // substitution within the same block, add " same" so that substituter can differentiate between
                            // substitution within the block and substitution from outside the block
                            var newId = ast.identifier(funDecExp.id.name + ' same', funDecExp.id.loc);
                            var subst = substituteMain(newId, funDecExp, remainingBlockExpression, paths);
                            // concats paths such that:
                            // paths[0] -> path to the program to be substituted, pre-redex
                            // paths[1...] -> path(s) to the parts of the remaining program
                            // that were substituted, post-redex
                            paths[0].push('body[0]');
                            var allPaths = paths.concat(subst[1]);
                            if (subst[1].length === 0) {
                                allPaths.push([]);
                            }
                            return [subst[0], context, allPaths, explain(node)];
                        }
                        else {
                            paths[0].push('body[0]');
                            paths[0].push('declarations[0]');
                            paths[0].push('init');
                            var _e = reduce(rhs, context, paths), reducedRhs = _e[0], cont_9 = _e[1], path_9 = _e[2], str_9 = _e[3];
                            return [
                                ast.blockExpression(__spreadArray([
                                    ast.declaration(declarator.id.name, 'const', reducedRhs)
                                ], otherStatements, true)),
                                cont_9,
                                path_9,
                                str_9
                            ];
                        }
                    }
                }
                paths[0].push('body[0]');
                var _f = reduce(firstStatement, context, paths), reduced = _f[0], cont = _f[1], path = _f[2], str = _f[3];
                return [
                    ast.blockExpression(__spreadArray([reduced], otherStatements, true)),
                    cont,
                    path,
                    str
                ];
            }
        },
        // source 1
        IfStatement: function (node, context, paths) {
            var test = node.test, consequent = node.consequent, alternate = node.alternate;
            if (test.type === 'Literal') {
                var error = rttc.checkIfStatement(node, test.value, context.chapter);
                if (error === undefined) {
                    return [
                        (test.value ? consequent : alternate),
                        context,
                        paths,
                        explain(node)
                    ];
                }
                else {
                    throw error;
                }
            }
            else {
                paths[0].push('test');
                var _a = reduce(test, context, paths), reducedTest = _a[0], cont = _a[1], path = _a[2], str = _a[3];
                var reducedIfStatement = ast.ifStatement(reducedTest, consequent, alternate, node.loc);
                return [reducedIfStatement, cont, path, str];
            }
        }
    };
    /**
     * Reduces one step of the program and returns
     * 1. The reduced program
     * 2. The path(s) leading to the redex
     *    - If substitution not involved, returns array containing one path
     *    - If substitution is involved, returns array containing
     *      path to program to be substituted pre-redex, as well as
     *      path(s) to the parts of the program that were substituted post-redex
     * 3. String explaining the reduction
     */
    function reduce(node, context, paths) {
        var reducer = reducers[node.type];
        if (reducer === undefined) {
            return [ast.program([]), context, [], 'error']; // exit early
        }
        else {
            return reducer(node, context, paths);
        }
    }
    return reduce(node, context, [[]]);
}
// Main creates a scope for us to control the verbosity
function treeifyMain(target) {
    // recurse down the program like substitute
    // if see a function at expression position,
    //   has an identifier: replace with the name
    //   else: replace with an identifer "=>"
    var verboseCount = 0;
    var treeifiers = {
        // Identifier: return
        ExpressionStatement: function (target) {
            return ast.expressionStatement(treeify(target.expression));
        },
        BinaryExpression: function (target) {
            return ast.binaryExpression(target.operator, treeify(target.left), treeify(target.right));
        },
        UnaryExpression: function (target) {
            return ast.unaryExpression(target.operator, treeify(target.argument));
        },
        ConditionalExpression: function (target) {
            return ast.conditionalExpression(treeify(target.test), treeify(target.consequent), treeify(target.alternate));
        },
        LogicalExpression: function (target) {
            return ast.logicalExpression(target.operator, treeify(target.left), treeify(target.right));
        },
        CallExpression: function (target) {
            return ast.callExpression(treeify(target.callee), target.arguments.map(function (arg) { return treeify(arg); }));
        },
        FunctionDeclaration: function (target) {
            return ast.functionDeclaration(target.id, target.params, treeify(target.body));
        },
        // CORE
        FunctionExpression: function (target) {
            if (target.id) {
                return target.id;
            }
            else if (verboseCount < 5) {
                // here onwards is guarding against arrow turned function expressions
                verboseCount++;
                var redacted = ast.arrowFunctionExpression(target.params, treeify(target.body));
                verboseCount = 0;
                return redacted;
            }
            else {
                // shortens body after 5 iterations
                return ast.arrowFunctionExpression(target.params, ast.identifier('...'));
            }
        },
        Program: function (target) {
            return ast.program(target.body.map(function (stmt) { return treeify(stmt); }));
        },
        BlockStatement: function (target) {
            return ast.blockStatement(target.body.map(function (stmt) { return treeify(stmt); }));
        },
        BlockExpression: function (target) {
            return ast.blockStatement(target.body.map(treeify));
        },
        ReturnStatement: function (target) {
            return ast.returnStatement(treeify(target.argument));
        },
        // source 1
        // CORE
        ArrowFunctionExpression: function (target) {
            if (verboseCount < 5) {
                // here onwards is guarding against arrow turned function expressions
                verboseCount++;
                var redacted = ast.arrowFunctionExpression(target.params, treeify(target.body));
                verboseCount = 0;
                return redacted;
            }
            else {
                // shortens body after 5 iterations
                return ast.arrowFunctionExpression(target.params, ast.identifier('...'));
            }
        },
        VariableDeclaration: function (target) {
            return ast.variableDeclaration(target.declarations.map(treeify));
        },
        VariableDeclarator: function (target) {
            return ast.variableDeclarator(target.id, treeify(target.init));
        },
        IfStatement: function (target) {
            return ast.ifStatement(treeify(target.test), treeify(target.consequent), treeify(target.alternate));
        },
        // source 2
        ArrayExpression: function (target) {
            return ast.arrayExpression(target.elements.map(treeify));
        }
    };
    function treeify(target) {
        var treeifier = treeifiers[target.type];
        if (treeifier === undefined) {
            return target;
        }
        else {
            return treeifier(target);
        }
    }
    return treeify(target);
}
function jsTreeifyMain(target, visited, readOnly) {
    // recurse down the program like substitute
    // if see a function at expression position,
    //   visited before recursing to this target: replace with the name
    //   else: replace with a FunctionExpression
    var verboseCount = 0;
    var treeifiers = {
        Identifier: function (target) {
            if (readOnly && target.name.startsWith('anonymous_')) {
                return ast.identifier('[Function]');
            }
            return target;
        },
        Literal: function (target) {
            if (typeof target.value === 'object' && target.value !== null) {
                target.raw = (0, converter_1.objectToString)(target.value);
            }
            return target;
        },
        ExpressionStatement: function (target) {
            return ast.expressionStatement(treeify(target.expression));
        },
        BinaryExpression: function (target) {
            return ast.binaryExpression(target.operator, treeify(target.left), treeify(target.right));
        },
        UnaryExpression: function (target) {
            return ast.unaryExpression(target.operator, treeify(target.argument));
        },
        ConditionalExpression: function (target) {
            return ast.conditionalExpression(treeify(target.test), treeify(target.consequent), treeify(target.alternate));
        },
        LogicalExpression: function (target) {
            return ast.logicalExpression(target.operator, treeify(target.left), treeify(target.right));
        },
        CallExpression: function (target) {
            return ast.callExpression(treeify(target.callee), target.arguments.map(function (arg) { return treeify(arg); }));
        },
        FunctionDeclaration: function (target) {
            return ast.functionDeclaration(target.id, target.params, treeify(target.body));
        },
        // CORE
        FunctionExpression: function (target) {
            if (visited.has(target) && target.id) {
                return target.id;
            }
            visited.add(target);
            if (readOnly && target.id) {
                return target.id;
            }
            else if (target.id) {
                return ast.functionExpression(target.params, treeify(target.body), target.loc, target.id);
            }
            else {
                return ast.functionExpression(target.params, treeify(target.body), target.loc);
            }
        },
        Program: function (target) {
            return ast.program(target.body.map(function (stmt) { return treeify(stmt); }));
        },
        BlockStatement: function (target) {
            return ast.blockStatement(target.body.map(function (stmt) { return treeify(stmt); }));
        },
        BlockExpression: function (target) {
            return ast.blockStatement(target.body.map(function (node) { return treeify(node); }));
        },
        ReturnStatement: function (target) {
            return ast.returnStatement(treeify(target.argument));
        },
        // source 1
        ArrowFunctionExpression: function (target) {
            if (verboseCount < 5) {
                // here onwards is guarding against arrow turned function expressions
                verboseCount++;
                var redacted = ast.arrowFunctionExpression(target.params, treeify(target.body));
                verboseCount = 0;
                return redacted;
            }
            else {
                // shortens body after 5 iterations
                return ast.arrowFunctionExpression(target.params, ast.identifier('...'));
            }
        },
        VariableDeclaration: function (target) {
            return ast.variableDeclaration(target.declarations.map(treeify));
        },
        VariableDeclarator: function (target) {
            return ast.variableDeclarator(target.id, treeify(target.init));
        },
        IfStatement: function (target) {
            return ast.ifStatement(treeify(target.test), treeify(target.consequent), treeify(target.alternate));
        },
        // source 2
        ArrayExpression: function (target) {
            return ast.arrayExpression(target.elements.map(treeify));
        }
    };
    function treeify(target) {
        var treeifier = treeifiers[target.type];
        if (treeifier === undefined) {
            return target;
        }
        else {
            return treeifier(target);
        }
    }
    return treeify(target);
}
// Mainly kept for testing
var codify = function (node) { return (0, astring_1.generate)(treeifyMain(node)); };
exports.codify = codify;
var javascriptify = function (node) {
    return '(' + (0, astring_1.generate)(jsTreeifyMain(node, new Set(), false)) + ');';
};
exports.javascriptify = javascriptify;
/**
 * Recurses down the tree, tracing path to redex
 * and calling treeifyMain on all other children
 * Once redex is found, extract redex from tree
 * and put redexMarker in its place
 * Returns array containing modified tree and
 * extracted redex
 */
function pathifyMain(target, paths, visited) {
    var pathIndex = 0;
    var path = paths[0];
    var redex = ast.program([]);
    var endIndex = path === undefined ? 0 : path.length - 1;
    var redexMarker = ast.identifier('@redex');
    var withBrackets = ast.identifier('(@redex)');
    var pathifiers = {
        ExpressionStatement: function (target) {
            var exp = jsTreeifyMain(target.expression, visited, true);
            if (path[pathIndex] === 'expression') {
                if (pathIndex === endIndex) {
                    redex = exp;
                    exp =
                        target.expression.type === 'ArrowFunctionExpression'
                            ? withBrackets
                            : redexMarker;
                }
                else {
                    pathIndex++;
                    exp = pathify(target.expression);
                }
            }
            return ast.expressionStatement(exp);
        },
        BinaryExpression: function (target) {
            var left = jsTreeifyMain(target.left, visited, true);
            var right = jsTreeifyMain(target.right, visited, true);
            if (path[pathIndex] === 'left') {
                if (pathIndex === endIndex) {
                    redex = left;
                    if (redex.type === 'ConditionalExpression') {
                        left = withBrackets;
                    }
                    else {
                        left = redexMarker;
                    }
                }
                else {
                    pathIndex++;
                    left = pathify(target.left);
                }
            }
            else if (path[pathIndex] === 'right') {
                if (pathIndex === endIndex) {
                    redex = right;
                    if (redex.type === 'BinaryExpression' || redex.type === 'ConditionalExpression') {
                        right = withBrackets;
                    }
                    else {
                        right = redexMarker;
                    }
                }
                else {
                    pathIndex++;
                    right = pathify(target.right);
                }
            }
            return ast.binaryExpression(target.operator, left, right);
        },
        UnaryExpression: function (target) {
            var arg = jsTreeifyMain(target.argument, visited, true);
            if (path[pathIndex] === 'argument') {
                if (pathIndex === endIndex) {
                    redex = arg;
                    arg = redexMarker;
                }
                else {
                    pathIndex++;
                    arg = pathify(target.argument);
                }
            }
            return ast.unaryExpression(target.operator, arg);
        },
        ConditionalExpression: function (target) {
            var test = jsTreeifyMain(target.test, visited, true);
            var cons = jsTreeifyMain(target.consequent, visited, true);
            var alt = jsTreeifyMain(target.alternate, visited, true);
            if (path[pathIndex] === 'test') {
                if (pathIndex === endIndex) {
                    redex = test;
                    test = redexMarker;
                }
                else {
                    pathIndex++;
                    test = pathify(target.test);
                }
            }
            else if (path[pathIndex] === 'consequent') {
                if (pathIndex === endIndex) {
                    redex = cons;
                    cons = redexMarker;
                }
                else {
                    pathIndex++;
                    cons = pathify(target.consequent);
                }
            }
            else if (path[pathIndex] === 'alternate') {
                if (pathIndex === endIndex) {
                    redex = alt;
                    alt = redexMarker;
                }
                else {
                    pathIndex++;
                    alt = pathify(target.alternate);
                }
            }
            return ast.conditionalExpression(test, cons, alt);
        },
        LogicalExpression: function (target) {
            var left = jsTreeifyMain(target.left, visited, true);
            var right = jsTreeifyMain(target.right, visited, true);
            if (path[pathIndex] === 'left') {
                if (pathIndex === endIndex) {
                    redex = left;
                    left = redexMarker;
                }
                else {
                    pathIndex++;
                    left = pathify(target.left);
                }
            }
            else if (path[pathIndex] === 'right') {
                if (pathIndex === endIndex) {
                    redex = right;
                    right = redexMarker;
                }
                else {
                    pathIndex++;
                    right = pathify(target.right);
                }
            }
            return ast.logicalExpression(target.operator, left, right);
        },
        CallExpression: function (target) {
            var callee = jsTreeifyMain(target.callee, visited, true);
            var args = target.arguments.map(function (arg) { return jsTreeifyMain(arg, visited, true); });
            if (path[pathIndex] === 'callee') {
                if (pathIndex === endIndex) {
                    redex = callee;
                    callee =
                        target.callee.type === 'ArrowFunctionExpression'
                            ? withBrackets
                            : redexMarker;
                }
                else {
                    pathIndex++;
                    callee = pathify(target.callee);
                }
            }
            else {
                var argIndex = void 0;
                var isEnd = pathIndex === endIndex;
                for (var i = 0; i < target.arguments.length; i++) {
                    if (path[pathIndex] === 'arguments[' + i + ']') {
                        argIndex = i;
                        break;
                    }
                }
                if (argIndex !== undefined) {
                    pathIndex++;
                    if (isEnd) {
                        redex = args[argIndex];
                        args[argIndex] = redexMarker;
                    }
                    else {
                        args[argIndex] = pathify(target.arguments[argIndex]);
                    }
                }
            }
            return ast.callExpression(callee, args);
        },
        FunctionDeclaration: function (target) {
            var body = jsTreeifyMain(target.body, visited, true);
            if (path[pathIndex] === 'body') {
                if (pathIndex === endIndex) {
                    redex = body;
                    body = redexMarker;
                }
                else {
                    pathIndex++;
                    body = pathify(target.body);
                }
            }
            return ast.functionDeclaration(target.id, target.params, body);
        },
        FunctionExpression: function (target) {
            if (target.id) {
                return target.id;
            }
            else {
                var body = jsTreeifyMain(target.body, visited, true);
                if (path[pathIndex] === 'body') {
                    if (pathIndex === endIndex) {
                        redex = body;
                        body = redexMarker;
                    }
                    else {
                        pathIndex++;
                        body = pathify(target.body);
                    }
                }
                return ast.arrowFunctionExpression(target.params, body);
            }
        },
        Program: function (target) {
            var body = target.body.map(function (node) { return jsTreeifyMain(node, visited, true); });
            var bodyIndex;
            var isEnd = pathIndex === endIndex;
            for (var i = 0; i < target.body.length; i++) {
                if (path[pathIndex] === 'body[' + i + ']') {
                    bodyIndex = i;
                    break;
                }
            }
            if (bodyIndex !== undefined) {
                if (isEnd) {
                    redex = body[bodyIndex];
                    body[bodyIndex] = redexMarker;
                }
                else {
                    pathIndex++;
                    body[bodyIndex] = pathify(target.body[bodyIndex]);
                }
            }
            return ast.program(body);
        },
        BlockStatement: function (target) {
            var body = target.body.map(function (node) { return jsTreeifyMain(node, visited, true); });
            var bodyIndex;
            var isEnd = pathIndex === endIndex;
            for (var i = 0; i < target.body.length; i++) {
                if (path[pathIndex] === 'body[' + i + ']') {
                    bodyIndex = i;
                    break;
                }
            }
            if (bodyIndex !== undefined) {
                if (isEnd) {
                    redex = body[bodyIndex];
                    body[bodyIndex] = redexMarker;
                }
                else {
                    pathIndex++;
                    body[bodyIndex] = pathify(target.body[bodyIndex]);
                }
            }
            return ast.blockStatement(body);
        },
        BlockExpression: function (target) {
            var body = target.body.map(function (node) { return jsTreeifyMain(node, visited, true); });
            var bodyIndex;
            var isEnd = pathIndex === endIndex;
            for (var i = 0; i < target.body.length; i++) {
                if (path[pathIndex] === 'body[' + i + ']') {
                    bodyIndex = i;
                    break;
                }
            }
            if (bodyIndex !== undefined) {
                if (isEnd) {
                    redex = body[bodyIndex];
                    body[bodyIndex] = redexMarker;
                }
                else {
                    pathIndex++;
                    body[bodyIndex] = pathify(target.body[bodyIndex]);
                }
            }
            return ast.blockStatement(body);
        },
        ReturnStatement: function (target) {
            var arg = jsTreeifyMain(target.argument, visited, true);
            if (path[pathIndex] === 'argument') {
                if (pathIndex === endIndex) {
                    redex = arg;
                    arg = redexMarker;
                }
                else {
                    pathIndex++;
                    arg = pathify(target.argument);
                }
            }
            return ast.returnStatement(arg);
        },
        // source 1
        ArrowFunctionExpression: function (target) {
            var body = jsTreeifyMain(target.body, visited, true);
            if (path[pathIndex] === 'body') {
                if (pathIndex === endIndex) {
                    redex = body;
                    body = redexMarker;
                }
                else {
                    pathIndex++;
                    body = pathify(target.body);
                }
            }
            //localhost:8000
            return ast.arrowFunctionExpression(target.params, body);
        },
        VariableDeclaration: function (target) {
            var decl = target.declarations.map(function (node) {
                return jsTreeifyMain(node, visited, true);
            });
            var declIndex;
            var isEnd = pathIndex === endIndex;
            for (var i = 0; i < target.declarations.length; i++) {
                if (path[pathIndex] === 'declarations[' + i + ']') {
                    declIndex = i;
                    break;
                }
            }
            if (declIndex !== undefined) {
                if (isEnd) {
                    redex = decl[declIndex];
                    decl[declIndex] = redexMarker;
                }
                else {
                    pathIndex++;
                    decl[declIndex] = pathify(target.declarations[declIndex]);
                }
            }
            return ast.variableDeclaration(decl);
        },
        VariableDeclarator: function (target) {
            var init = jsTreeifyMain(target.init, visited, true);
            if (path[pathIndex] === 'init') {
                if (pathIndex === endIndex) {
                    redex = init;
                    init = redexMarker;
                }
                else {
                    pathIndex++;
                    init = pathify(target.init);
                }
            }
            return ast.variableDeclarator(target.id, init);
        },
        IfStatement: function (target) {
            var test = jsTreeifyMain(target.test, visited, true);
            var cons = jsTreeifyMain(target.consequent, visited, true);
            var alt = jsTreeifyMain(target.alternate, visited, true);
            if (path[pathIndex] === 'test') {
                if (pathIndex === endIndex) {
                    redex = test;
                    test = redexMarker;
                }
                else {
                    pathIndex++;
                    test = pathify(target.test);
                }
            }
            else if (path[pathIndex] === 'consequent') {
                if (pathIndex === endIndex) {
                    redex = cons;
                    cons = redexMarker;
                }
                else {
                    pathIndex++;
                    cons = pathify(target.consequent);
                }
            }
            else if (path[pathIndex] === 'alternate') {
                if (pathIndex === endIndex) {
                    redex = alt;
                    alt = redexMarker;
                }
                else {
                    pathIndex++;
                    alt = pathify(target.alternate);
                }
            }
            return ast.ifStatement(test, cons, alt);
        },
        // source 2
        ArrayExpression: function (target) {
            var eles = target.elements.map(function (node) {
                return jsTreeifyMain(node, visited, true);
            });
            var eleIndex;
            var isEnd = pathIndex === endIndex;
            for (var i = 0; i < target.elements.length; i++) {
                if (path[pathIndex] === 'elements[' + i + ']') {
                    eleIndex = i;
                    break;
                }
            }
            if (eleIndex !== undefined) {
                if (isEnd) {
                    redex = eles[eleIndex];
                    eles[eleIndex] = redexMarker;
                }
                else {
                    pathIndex++;
                    eles[eleIndex] = pathify(target.elements[eleIndex]);
                }
            }
            return ast.arrayExpression(eles);
        }
    };
    function pathify(target) {
        var pathifier = pathifiers[target.type];
        if (pathifier === undefined) {
            return jsTreeifyMain(target, visited, true);
        }
        else {
            return pathifier(target);
        }
    }
    if (path === undefined || path[0] === undefined) {
        return [jsTreeifyMain(target, visited, true), ast.program([])];
    }
    else {
        var pathified = pathify(target);
        // runs pathify more than once if more than one substitution path
        for (var i = 1; i < paths.length; i++) {
            pathIndex = 0;
            path = paths[i];
            endIndex = path === undefined ? 0 : path.length - 1;
            pathified = pathify(pathified);
        }
        return [pathified, redex];
    }
}
// Function to convert array from getEvaluationSteps into text
var redexify = function (node, path) { return [
    (0, astring_1.generate)(pathifyMain(node, path, new Set())[0]),
    (0, astring_1.generate)(pathifyMain(node, path, new Set())[1])
]; };
exports.redexify = redexify;
var getRedex = function (node, path) {
    return pathifyMain(node, path, new Set())[1];
};
exports.getRedex = getRedex;
// strategy: we remember how many statements are there originally in program.
// since listPrelude are just functions, they will be disposed of one by one
// we prepend the program with the program resulting from the definitions,
//   and reduce the combined program until the program body
//   has number of statement === original program
// then we return it to the getEvaluationSteps
function substPredefinedFns(program, context) {
    if (context.prelude) {
        // replace all occurences of '$' with 'helper_' to
        // prevent collision with redex (temporary solution)
        // context.prelude = context.prelude.replace(/\$/gi, 'helper_')
        // evaluate the list prelude first
        var listPreludeProgram = (0, parser_1.parse)(context.prelude, context);
        var origBody = program.body;
        program.body = listPreludeProgram.body;
        program.body.push(ast.blockStatement(origBody));
        while (program.body.length > 1) {
            program = reduceMain(program, context)[0];
        }
        program.body = program.body[0].body;
    }
    return [program, context];
}
function substPredefinedConstants(program) {
    var constants = [['undefined', undefined]];
    var mathConstants = Object.getOwnPropertyNames(Math)
        .filter(function (name) { return typeof Math[name] !== 'function'; })
        .map(function (name) { return ['math_' + name, Math[name]]; });
    var substed = program;
    for (var _i = 0, _a = constants.concat(mathConstants); _i < _a.length; _i++) {
        var nameValuePair = _a[_i];
        substed = substituteMain(ast.identifier(nameValuePair[0]), ast.literal(nameValuePair[1]), substed, [[]])[0];
    }
    return substed;
}
function removeDebuggerStatements(program) {
    // recursively detect and remove debugger statements
    function remove(removee) {
        if (removee.type === 'BlockStatement' || removee.type === 'Program') {
            removee.body = removee.body.filter(function (s) { return s.type !== 'DebuggerStatement'; });
            removee.body.forEach(function (s) { return remove(s); });
        }
        else if (removee.type === 'VariableDeclaration') {
            removee.declarations.forEach(function (s) { return remove(s.init); });
        }
        else if (removee.type === 'FunctionDeclaration') {
            remove(removee.body);
        }
        else if (removee.type === 'IfStatement') {
            remove(removee.consequent);
            remove(removee.alternate);
        }
        else if (removee.type === 'ArrowFunctionExpression') {
            remove(removee.body);
        }
    }
    remove(program);
    return program;
}
function evaluateImports(program_1, context_1, _a) {
    return __awaiter(this, arguments, void 0, function (program, context, _b) {
        var _c, importNodeMap, otherNodes, environment_1, error_1;
        var _this = this;
        var loadTabs = _b.loadTabs, checkImports = _b.checkImports, wrapSourceModules = _b.wrapSourceModules;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _c = (0, helpers_1.filterImportDeclarations)(program), importNodeMap = _c[0], otherNodes = _c[1];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    environment_1 = (0, util_1.currentEnvironment)(context);
                    return [4 /*yield*/, Promise.all(Object.entries(importNodeMap).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var functions, _i, nodes_1, node, _c, _d, spec;
                            var moduleName = _b[0], nodes = _b[1];
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, (0, moduleLoaderAsync_1.initModuleContextAsync)(moduleName, context, loadTabs)];
                                    case 1:
                                        _e.sent();
                                        return [4 /*yield*/, (0, moduleLoaderAsync_1.loadModuleBundleAsync)(moduleName, context, wrapSourceModules, nodes[0])];
                                    case 2:
                                        functions = _e.sent();
                                        for (_i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                                            node = nodes_1[_i];
                                            for (_c = 0, _d = node.specifiers; _c < _d.length; _c++) {
                                                spec = _d[_c];
                                                (0, assert_1.default)(spec.type === 'ImportSpecifier', "Only ImportSpecifiers are supported, got: ".concat(spec.type));
                                                if (checkImports && !(spec.imported.name in functions)) {
                                                    throw new errors_1.UndefinedImportError(spec.imported.name, moduleName, spec);
                                                }
                                                (0, util_1.declareIdentifier)(context, spec.local.name, node, environment_1);
                                                (0, util_1.defineVariable)(context, spec.local.name, functions[spec.imported.name], true, node);
                                            }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _d.sent();
                    // console.log(error)
                    (0, util_1.handleRuntimeError)(context, error_1);
                    return [3 /*break*/, 4];
                case 4:
                    program.body = otherNodes;
                    return [2 /*return*/];
            }
        });
    });
}
// the context here is for builtins
function getEvaluationSteps(program_1, context_1, _a) {
    return __awaiter(this, arguments, void 0, function (program, context, _b) {
        var steps, limit, start, reducedWithPath, i, limitExceeded, error_2;
        var importOptions = _b.importOptions, stepLimit = _b.stepLimit;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    steps = [];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    (0, transpiler_1.checkProgramForUndefinedVariables)(program, context);
                    limit = stepLimit === undefined ? 1000 : stepLimit % 2 === 0 ? stepLimit : stepLimit + 1;
                    return [4 /*yield*/, evaluateImports(program, context, importOptions)
                        // starts with substituting predefined constants
                    ];
                case 2:
                    _c.sent();
                    start = substPredefinedConstants(program);
                    // and predefined fns
                    start = substPredefinedFns(start, context)[0];
                    // and remove debugger statements.
                    start = removeDebuggerStatements(start);
                    reducedWithPath = [
                        start,
                        context,
                        [],
                        'Start of evaluation'
                    ];
                    steps.push([
                        reducedWithPath[0],
                        reducedWithPath[2].length > 1 ? reducedWithPath[2].slice(1) : reducedWithPath[2],
                        reducedWithPath[3]
                    ]);
                    steps.push([reducedWithPath[0], [], '']);
                    i = 1;
                    limitExceeded = false;
                    while (isStatementsReducible(reducedWithPath[0], context)) {
                        //Should work on isReducibleStatement instead of checking body.length
                        if (steps.length === limit) {
                            steps[steps.length - 1] = [ast.program([]), [], 'Maximum number of steps exceeded'];
                            limitExceeded = true;
                            break;
                        }
                        reducedWithPath = reduceMain(reducedWithPath[0], context);
                        steps.push([
                            reducedWithPath[0],
                            reducedWithPath[2].length > 1 ? reducedWithPath[2].slice(1) : reducedWithPath[2],
                            reducedWithPath[3]
                        ]);
                        steps.push([reducedWithPath[0], [], '']);
                        if (i > 0) {
                            steps[i][1] = reducedWithPath[2].length > 1 ? [reducedWithPath[2][0]] : reducedWithPath[2];
                            steps[i][2] = reducedWithPath[3];
                        }
                        i += 2;
                    }
                    if (!limitExceeded && steps.length > 0) {
                        steps[steps.length - 1][2] = 'Evaluation complete';
                    }
                    if (steps.length === 0) {
                        steps.push([reducedWithPath[0], [], 'Nothing to evaluate']);
                    }
                    return [2 /*return*/, steps];
                case 3:
                    error_2 = _c.sent();
                    context.errors.push(error_2);
                    return [2 /*return*/, steps];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getEvaluationSteps = getEvaluationSteps;
function isStepperOutput(output) {
    return 'code' in output;
}
exports.isStepperOutput = isStepperOutput;
function callee(content, context) {
    if (content.type === 'CallExpression') {
        var reducedArgs = true;
        for (var _i = 0, _a = content.arguments; _i < _a.length; _i++) {
            var arg = _a[_i];
            if (!isIrreducible(arg, context)) {
                reducedArgs = false;
            }
        }
        return reducedArgs ? content.callee : undefined;
    }
    else {
        return undefined;
    }
}
exports.callee = callee;
