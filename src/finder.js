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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAncestors = exports.isInLoc = exports.findDeclarationNode = exports.findIdentifierNode = void 0;
var walkers_1 = require("./utils/walkers");
// Finds the innermost node that matches the given location
function findIdentifierNode(root, context, loc) {
    function findByLocationPredicate(type, node) {
        var location = node.loc;
        var nodeType = node.type;
        if (nodeType && location) {
            return (nodeType === 'Identifier' &&
                location.start.line === loc.line &&
                location.start.column <= loc.column &&
                location.end.column >= loc.column);
        }
        return false;
    }
    var found = (0, walkers_1.findNodeAt)(root, undefined, undefined, findByLocationPredicate, customWalker);
    return found === null || found === void 0 ? void 0 : found.node;
}
exports.findIdentifierNode = findIdentifierNode;
// Recursively searches up the ancestors of the identifier from innermost to outermost scope
function findDeclarationNode(program, identifier) {
    var ancestors = findAncestors(program, identifier);
    if (!ancestors)
        return undefined;
    var declarations = [];
    for (var _i = 0, ancestors_1 = ancestors; _i < ancestors_1.length; _i++) {
        var root = ancestors_1[_i];
        (0, walkers_1.recursive)(root, undefined, {
            BlockStatement: function (node, state, callback) {
                if (containsNode(node, identifier)) {
                    node.body.map(function (n) { return callback(n, state); });
                }
            },
            ForStatement: function (node, state, callback) {
                if (containsNode(node, identifier)) {
                    callback(node.init, state);
                    callback(node.body, state);
                }
            },
            FunctionDeclaration: function (node, state, callback) {
                if (node.id && node.id.name === identifier.name) {
                    declarations.push(node.id);
                }
                else if (containsNode(node, identifier)) {
                    var param = node.params.find(function (n) { return n.name === identifier.name; });
                    if (param) {
                        declarations.push(param);
                    }
                    else {
                        callback(node.body, state);
                    }
                }
            },
            ArrowFunctionExpression: function (node, state, callback) {
                if (containsNode(node, identifier)) {
                    var param = node.params.find(function (n) { return n.name === identifier.name; });
                    if (param) {
                        declarations.push(param);
                    }
                    else {
                        callback(node.body, state);
                    }
                }
            },
            VariableDeclarator: function (node, _state, _callback) {
                if (node.id.name === identifier.name) {
                    declarations.push(node.id);
                }
            },
            ImportSpecifier: function (node, _state, _callback) {
                if (node.imported.name === identifier.name) {
                    declarations.push(node.imported);
                }
            }
        });
        if (declarations.length > 0) {
            return declarations.shift();
        }
    }
    return undefined;
}
exports.findDeclarationNode = findDeclarationNode;
function containsNode(nodeOuter, nodeInner) {
    var outerLoc = nodeOuter.loc;
    var innerLoc = nodeInner.loc;
    return (outerLoc != null &&
        innerLoc != null &&
        isInLoc(innerLoc.start.line, innerLoc.start.column, outerLoc) &&
        isInLoc(innerLoc.end.line, innerLoc.end.column, outerLoc));
}
// This checks if a given (line, col) value is part of another node.
function isInLoc(line, col, location) {
    if (location == null) {
        return false;
    }
    if (location.start.line < line && location.end.line > line) {
        return true;
    }
    else if (location.start.line === line && location.end.line > line) {
        return location.start.column <= col;
    }
    else if (location.start.line < line && location.end.line === line) {
        return location.end.column >= col;
    }
    else if (location.start.line === line && location.end.line === line) {
        if (location.start.column <= col && location.end.column >= col) {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}
exports.isInLoc = isInLoc;
function findAncestors(root, identifier) {
    var foundAncestors = [];
    (0, walkers_1.ancestor)(root, {
        Identifier: function (node, ancestors) {
            if (identifier.name === node.name && identifier.loc === node.loc) {
                foundAncestors = Object.assign([], ancestors).reverse();
                foundAncestors.shift(); // Remove the identifier node
            }
        },
        /* We need a separate visitor for VariablePattern because
      acorn walk ignores Identifers on the left side of expressions.
      Here is a github issue in acorn-walk related to this:
      https://github.com/acornjs/acorn/issues/686
      */
        VariablePattern: function (node, ancestors) {
            if (identifier.name === node.name && identifier.loc === node.loc) {
                foundAncestors = Object.assign([], ancestors).reverse();
            }
        }
    }, customWalker);
    return foundAncestors;
}
exports.findAncestors = findAncestors;
var customWalker = __assign(__assign({}, walkers_1.base), { ImportSpecifier: function (node, st, c) {
        c(node.imported, st, 'Expression');
    } });
