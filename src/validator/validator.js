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
exports.validateAndAnnotate = void 0;
var errors_1 = require("../errors/errors");
var validityErrors_1 = require("../errors/validityErrors");
var astCreator_1 = require("../utils/astCreator");
var walkers_1 = require("../utils/walkers");
var Declaration = /** @class */ (function () {
    function Declaration(isConstant) {
        this.isConstant = isConstant;
        this.accessedBeforeDeclaration = false;
    }
    return Declaration;
}());
function validateAndAnnotate(program, context) {
    var accessedBeforeDeclarationMap = new Map();
    var scopeHasCallExpressionMap = new Map();
    function processBlock(node) {
        var initialisedIdentifiers = new Map();
        for (var _i = 0, _a = node.body; _i < _a.length; _i++) {
            var statement = _a[_i];
            if (statement.type === 'VariableDeclaration') {
                initialisedIdentifiers.set((0, astCreator_1.getVariableDecarationName)(statement), new Declaration(statement.kind === 'const'));
            }
            else if (statement.type === 'FunctionDeclaration') {
                if (statement.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                initialisedIdentifiers.set(statement.id.name, new Declaration(true));
            }
        }
        scopeHasCallExpressionMap.set(node, false);
        accessedBeforeDeclarationMap.set(node, initialisedIdentifiers);
    }
    function processFunction(node) {
        accessedBeforeDeclarationMap.set(node, new Map(node.params.map(function (id) { return [id.name, new Declaration(false)]; })));
        scopeHasCallExpressionMap.set(node, false);
    }
    // initialise scope of variables
    (0, walkers_1.ancestor)(program, {
        Program: processBlock,
        BlockStatement: processBlock,
        FunctionDeclaration: processFunction,
        ArrowFunctionExpression: processFunction,
        ForStatement: function (forStatement, _ancestors) {
            var init = forStatement.init;
            if (init.type === 'VariableDeclaration') {
                accessedBeforeDeclarationMap.set(forStatement, new Map([[(0, astCreator_1.getVariableDecarationName)(init), new Declaration(init.kind === 'const')]]));
                scopeHasCallExpressionMap.set(forStatement, false);
            }
        }
    });
    function validateIdentifier(id, ancestors) {
        var name = id.name;
        var lastAncestor = ancestors[ancestors.length - 2];
        for (var i = ancestors.length - 1; i >= 0; i--) {
            var a = ancestors[i];
            var map = accessedBeforeDeclarationMap.get(a);
            if (map === null || map === void 0 ? void 0 : map.has(name)) {
                map.get(name).accessedBeforeDeclaration = true;
                if (lastAncestor.type === 'AssignmentExpression' && lastAncestor.left === id) {
                    if (map.get(name).isConstant) {
                        context.errors.push(new errors_1.ConstAssignment(lastAncestor, name));
                    }
                    if (a.type === 'ForStatement' && a.init !== lastAncestor && a.update !== lastAncestor) {
                        context.errors.push(new validityErrors_1.NoAssignmentToForVariable(lastAncestor));
                    }
                }
                break;
            }
        }
    }
    var customWalker = __assign(__assign({}, walkers_1.base), { VariableDeclarator: function (node, st, c) {
            // don't visit the id
            if (node.init) {
                c(node.init, st, 'Expression');
            }
        } });
    (0, walkers_1.ancestor)(program, {
        VariableDeclaration: function (node, ancestors) {
            var lastAncestor = ancestors[ancestors.length - 2];
            var name = (0, astCreator_1.getVariableDecarationName)(node);
            var accessedBeforeDeclaration = accessedBeforeDeclarationMap
                .get(lastAncestor)
                .get(name).accessedBeforeDeclaration;
            node.typability = accessedBeforeDeclaration ? 'Untypable' : 'NotYetTyped';
        },
        Identifier: validateIdentifier,
        FunctionDeclaration: function (node, ancestors) {
            // a function declaration can be typed if there are no function calls in the same scope before it
            var lastAncestor = ancestors[ancestors.length - 2];
            node.typability = scopeHasCallExpressionMap.get(lastAncestor) ? 'Untypable' : 'NotYetTyped';
        },
        Pattern: function (node, ancestors) {
            if (node.type === 'Identifier') {
                validateIdentifier(node, ancestors);
            }
            else if (node.type === 'MemberExpression') {
                if (node.object.type === 'Identifier') {
                    validateIdentifier(node.object, ancestors);
                }
            }
        },
        CallExpression: function (call, ancestors) {
            for (var i = ancestors.length - 1; i >= 0; i--) {
                var a = ancestors[i];
                if (scopeHasCallExpressionMap.has(a)) {
                    scopeHasCallExpressionMap.set(a, true);
                    break;
                }
            }
        }
    }, customWalker);
    /*
    simple(program, {
      VariableDeclaration(node: TypeAnnotatedNode<es.VariableDeclaration>) {
        console.log(getVariableDecarationName(node) + " " + node.typability);
      },
      FunctionDeclaration(node: TypeAnnotatedNode<es.FunctionDeclaration>) {
        console.log(node.id!.name + " " + node.typability);
      }
    })
  
     */
    return program;
}
exports.validateAndAnnotate = validateAndAnnotate;
