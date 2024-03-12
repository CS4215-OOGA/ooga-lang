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
exports.getProgramNames = exports.getKeywords = void 0;
var constants_1 = require("../constants");
var moduleErrors_1 = require("../errors/moduleErrors");
var finder_1 = require("../finder");
var moduleLoader_1 = require("../modules/moduleLoader");
var syntax_1 = require("../parser/source/syntax");
var KIND_IMPORT = 'import';
var KIND_FUNCTION = 'func';
// const KIND_LET = 'let'
var KIND_PARAM = 'param';
var KIND_CONST = 'const';
function isImportDeclaration(node) {
    return node.type === 'ImportDeclaration';
}
function isDeclaration(node) {
    return node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration';
}
function isFunction(node) {
    return (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression');
}
function isLoop(node) {
    return node.type === 'WhileStatement' || node.type === 'ForStatement';
}
// Update this to use exported check from "acorn-loose" package when it is released
function isDummyName(name) {
    return name === '✖';
}
var KEYWORD_SCORE = 20000;
// Ensure that keywords are prioritized over names
var keywordsInBlock = {
    FunctionDeclaration: [{ name: 'function', meta: 'keyword', score: KEYWORD_SCORE }],
    VariableDeclaration: [{ name: 'const', meta: 'keyword', score: KEYWORD_SCORE }],
    AssignmentExpression: [{ name: 'let', meta: 'keyword', score: KEYWORD_SCORE }],
    WhileStatement: [{ name: 'while', meta: 'keyword', score: KEYWORD_SCORE }],
    IfStatement: [
        { name: 'if', meta: 'keyword', score: KEYWORD_SCORE },
        { name: 'else', meta: 'keyword', score: KEYWORD_SCORE }
    ],
    ForStatement: [{ name: 'for', meta: 'keyword', score: KEYWORD_SCORE }]
};
var keywordsInLoop = {
    BreakStatement: [{ name: 'break', meta: 'keyword', score: KEYWORD_SCORE }],
    ContinueStatement: [{ name: 'continue', meta: 'keyword', score: KEYWORD_SCORE }]
};
var keywordsInFunction = {
    ReturnStatement: [{ name: 'return', meta: 'keyword', score: KEYWORD_SCORE }]
};
/**
 * Retrieves keyword suggestions based on what node the cursor is currently over.
 * For example, only suggest `let` when the cursor is over the init part of a for
 * statement
 * @param prog Program to parse
 * @param cursorLoc Current location of the cursor
 * @param context Evaluation context
 * @returns A list of keywords as suggestions
 */
function getKeywords(prog, cursorLoc, context) {
    var _a, _b;
    var identifier = (0, finder_1.findIdentifierNode)(prog, context, cursorLoc);
    if (!identifier) {
        return [];
    }
    var ancestors = (0, finder_1.findAncestors)(prog, identifier);
    if (!ancestors) {
        return [];
    }
    // In the init part of a for statement, `let` is the only valid keyword
    if (ancestors[0].type === 'ForStatement' &&
        identifier === ancestors[0].init) {
        return context.chapter >= syntax_1.default.AssignmentExpression
            ? keywordsInBlock.AssignmentExpression
            : [];
    }
    var keywordSuggestions = [];
    function addAllowedKeywords(keywords) {
        Object.entries(keywords)
            .filter(function (_a) {
            var nodeType = _a[0];
            return context.chapter >= syntax_1.default[nodeType];
        })
            .forEach(function (_a) {
            var _nodeType = _a[0], decl = _a[1];
            return keywordSuggestions.push.apply(keywordSuggestions, decl);
        });
    }
    // The rest of the keywords are only valid at the beginning of a statement
    if (ancestors[0].type === 'ExpressionStatement' &&
        ((_a = ancestors[0].loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION).start === ((_b = identifier.loc) !== null && _b !== void 0 ? _b : constants_1.UNKNOWN_LOCATION).start) {
        addAllowedKeywords(keywordsInBlock);
        // Keywords only allowed in functions
        if (ancestors.some(function (node) { return isFunction(node); })) {
            addAllowedKeywords(keywordsInFunction);
        }
        // Keywords only allowed in loops
        if (ancestors.some(function (node) { return isLoop(node); })) {
            addAllowedKeywords(keywordsInLoop);
        }
    }
    return keywordSuggestions;
}
exports.getKeywords = getKeywords;
/**
 * Retrieve the list of names present within the program. If the cursor is within a comment,
 * or when the user is declaring a variable or function arguments, suggestions should not be displayed,
 * indicated by the second part of the return value of this function.
 * @param prog Program to parse for names
 * @param comments Comments found within the program
 * @param cursorLoc Current location of the cursor
 * @returns Tuple consisting of the list of suggestions, and a boolean value indicating if
 * suggestions should be displayed, i.e. `[suggestions, shouldPrompt]`
 */
function getProgramNames(prog, comments, cursorLoc) {
    function before(first, second) {
        return first.line < second.line || (first.line === second.line && first.column <= second.column);
    }
    function cursorInLoc(nodeLoc) {
        if (nodeLoc === null || nodeLoc === undefined) {
            return false;
        }
        return before(nodeLoc.start, cursorLoc) && before(cursorLoc, nodeLoc.end);
    }
    for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
        var comment = comments_1[_i];
        if (cursorInLoc(comment.loc)) {
            // User is typing comments
            return [[], false];
        }
    }
    // BFS to get names
    var queue = [prog];
    var nameQueue = [];
    while (queue.length > 0) {
        // Workaround due to minification problem
        // tslint:disable-next-line
        var node = queue.shift();
        if (isFunction(node)) {
            // This is the only time we want raw identifiers
            nameQueue.push.apply(nameQueue, node.params);
        }
        var body = getNodeChildren(node);
        for (var _a = 0, body_1 = body; _a < body_1.length; _a++) {
            var child = body_1[_a];
            if (isImportDeclaration(child)) {
                nameQueue.push(child);
            }
            if (isDeclaration(child)) {
                nameQueue.push(child);
            }
            if (cursorInLoc(child.loc)) {
                queue.push(child);
            }
        }
    }
    // Do not prompt user if he is declaring a variable
    for (var _b = 0, nameQueue_1 = nameQueue; _b < nameQueue_1.length; _b++) {
        var nameNode = nameQueue_1[_b];
        if (cursorInIdentifier(nameNode, function (n) { return cursorInLoc(n.loc); })) {
            return [[], false];
        }
    }
    var res = {};
    nameQueue
        .map(function (node) { return getNames(node, function (n) { return cursorInLoc(n.loc); }); })
        .reduce(function (prev, cur) { return prev.concat(cur); }, []) // no flatmap feelsbad
        .forEach(function (decl, idx) {
        res[decl.name] = __assign(__assign({}, decl), { score: idx });
    }); // Deduplicate, ensure deeper declarations overwrite
    return [Object.values(res), true];
}
exports.getProgramNames = getProgramNames;
function isNotNull(x) {
    // This function exists to appease the mighty typescript type checker
    return x !== null;
}
function getNodeChildren(node) {
    switch (node.type) {
        case 'Program':
            return node.body;
        case 'BlockStatement':
            return node.body;
        case 'WhileStatement':
            return [node.test, node.body];
        case 'ForStatement':
            return [node.init, node.test, node.update, node.body].filter(function (n) { return n !== undefined && n !== null; });
        case 'ExpressionStatement':
            return [node.expression];
        case 'IfStatement':
            var children = [node.test, node.consequent];
            if (node.alternate !== undefined && node.alternate !== null) {
                children.push(node.alternate);
            }
            return children;
        case 'ReturnStatement':
            return node.argument ? [node.argument] : [];
        case 'FunctionDeclaration':
            return [node.body];
        case 'VariableDeclaration':
            return node.declarations
                .map(getNodeChildren)
                .reduce(function (prev, cur) { return prev.concat(cur); });
        case 'VariableDeclarator':
            return node.init ? [node.init] : [];
        case 'ArrowFunctionExpression':
            return [node.body];
        case 'FunctionExpression':
            return [node.body];
        case 'UnaryExpression':
            return [node.argument];
        case 'BinaryExpression':
            return [node.left, node.right];
        case 'LogicalExpression':
            return [node.left, node.right];
        case 'ConditionalExpression':
            return [node.test, node.alternate, node.consequent];
        case 'CallExpression':
            return __spreadArray(__spreadArray([], node.arguments, true), [node.callee], false);
        // case 'Identifier':
        // case 'DebuggerStatement':
        // case 'BreakStatement':
        // case 'ContinueStatement':
        // case 'MemberPattern':
        case 'ArrayExpression':
            return node.elements.filter(isNotNull);
        case 'AssignmentExpression':
            return [node.left, node.right];
        case 'MemberExpression':
            return [node.object, node.property];
        case 'Property':
            return [node.key, node.value];
        case 'ObjectExpression':
            return __spreadArray([], node.properties, true);
        case 'NewExpression':
            return __spreadArray(__spreadArray([], node.arguments, true), [node.callee], false);
        default:
            return [];
    }
}
function cursorInIdentifier(node, locTest) {
    switch (node.type) {
        case 'VariableDeclaration':
            for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
                var decl = _a[_i];
                if (locTest(decl.id)) {
                    return true;
                }
            }
            return false;
        case 'FunctionDeclaration':
            return node.id ? locTest(node.id) : false;
        case 'Identifier':
            return locTest(node);
        default:
            return false;
    }
}
// locTest is a callback that returns whether cursor is in location of node
/**
 * Gets a list of `NameDeclarations` from the given node
 * @param node Node to search for names
 * @param locTest Callback of type `(node: es.Node) => boolean`. Should return true if the cursor
 * is located within the node, false otherwise
 * @returns List of found names
 */
function getNames(node, locTest) {
    switch (node.type) {
        case 'ImportDeclaration':
            var specs = node.specifiers.filter(function (x) { return !isDummyName(x.local.name); });
            try {
                var docs_1 = (0, moduleLoader_1.memoizedloadModuleDocs)(node.source.value, node);
                if (!docs_1) {
                    return specs.map(function (spec) { return ({
                        name: spec.local.name,
                        meta: KIND_IMPORT,
                        docHTML: "Unable to retrieve documentation for <code>".concat(spec.local.name, "</code> from ").concat(node.source.value, " module")
                    }); });
                }
                return specs.map(function (spec) {
                    if (spec.type !== 'ImportSpecifier' || docs_1[spec.local.name] === undefined) {
                        return {
                            name: spec.local.name,
                            meta: KIND_IMPORT,
                            docHTML: "No documentation available for <code>".concat(spec.local.name, "</code> from ").concat(node.source.value, " module")
                        };
                    }
                    else {
                        return {
                            name: spec.local.name,
                            meta: KIND_IMPORT,
                            docHTML: docs_1[spec.local.name]
                        };
                    }
                });
            }
            catch (err) {
                if (!(err instanceof moduleErrors_1.ModuleNotFoundError || err instanceof moduleErrors_1.ModuleConnectionError))
                    throw err;
                return specs.map(function (spec) { return ({
                    name: spec.local.name,
                    meta: KIND_IMPORT,
                    docHTML: "Unable to retrieve documentation for <code>".concat(spec.local.name, "</code> from ").concat(node.source.value, " module")
                }); });
            }
        case 'VariableDeclaration':
            var declarations = [];
            for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
                var decl = _a[_i];
                var id = decl.id;
                var name_1 = id.name;
                if (!name_1 ||
                    isDummyName(name_1) ||
                    (decl.init && !isFunction(decl.init) && locTest(decl.init)) // Avoid suggesting `let foo = foo`, but suggest recursion with arrow functions
                ) {
                    continue;
                }
                if (node.kind === KIND_CONST && decl.init && isFunction(decl.init)) {
                    // constant initialized with arrow function will always be a function
                    declarations.push({ name: name_1, meta: KIND_FUNCTION });
                }
                else {
                    declarations.push({ name: name_1, meta: node.kind });
                }
            }
            return declarations;
        case 'FunctionDeclaration':
            return node.id && !isDummyName(node.id.name)
                ? [{ name: node.id.name, meta: KIND_FUNCTION }]
                : [];
        case 'Identifier': // Function/Arrow function param
            return !isDummyName(node.name) ? [{ name: node.name, meta: KIND_PARAM }] : [];
        default:
            return [];
    }
}
