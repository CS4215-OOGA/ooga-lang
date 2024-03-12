"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpileToLazy = void 0;
var create = require("../utils/astCreator");
var uniqueIds_1 = require("../utils/uniqueIds");
var walkers_1 = require("../utils/walkers");
var lazyPrimitives = new Set(['makeLazyFunction', 'wrapLazyCallee', 'forceIt', 'delayIt']);
var forcingNodes = new Set(['BinaryExpression', 'UnaryExpression']);
function transformFunctionDeclarationsToArrowFunctions(program) {
    (0, walkers_1.simple)(program, {
        FunctionDeclaration: function (node) {
            var _a = node, id = _a.id, params = _a.params, body = _a.body;
            if (id === null) {
                throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
            }
            node.type = 'VariableDeclaration';
            node = node;
            var asArrowFunction = create.callExpression(create.identifier('makeLazyFunction', node.loc), [create.blockArrowFunction(params, body, node.loc)], node.loc);
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
function insertDelayAndForce(program) {
    function transformConditionals(node) {
        var test = node.type === 'LogicalExpression' ? 'left' : 'test';
        if (forcingNodes.has(node[test].type)) {
            return;
        }
        node[test] = create.callExpression(create.identifier('forceIt'), [node[test]], node.loc);
    }
    (0, walkers_1.simple)(program, {
        BinaryExpression: function (node) {
            node.left = create.callExpression(create.identifier('forceIt'), [node.left], node.left.loc);
            node.right = create.callExpression(create.identifier('forceIt'), [node.right], node.right.loc);
        },
        UnaryExpression: function (node) {
            node.argument = create.callExpression(create.identifier('forceIt'), [node.argument], node.argument.loc);
        },
        IfStatement: transformConditionals,
        ConditionalExpression: transformConditionals,
        LogicalExpression: transformConditionals,
        ForStatement: transformConditionals,
        WhileStatement: transformConditionals,
        CallExpression: function (node) {
            if (node.callee.type === 'Identifier' && lazyPrimitives.has(node.callee.name)) {
                return;
            }
            node.callee = create.callExpression(create.identifier('wrapLazyCallee', node.callee.loc), [node.callee], node.callee.loc);
            node.arguments = node.arguments.map(function (arg) {
                return create.callExpression(create.identifier('delayIt'), [create.arrowFunctionExpression([], arg, arg.loc)], arg.loc);
            });
        }
    });
}
// transpiles if possible and modifies program to a Source program that makes use of lazy primitives
function transpileToLazy(program) {
    var identifiers = (0, uniqueIds_1.getIdentifiersInProgram)(program);
    if (identifiers.has('forceIt') || identifiers.has('delayIt')) {
        program.body.unshift(create.expressionStatement(create.callExpression(create.identifier('display'), [
            create.literal('Manual use of lazy library detected, turning off automatic lazy evaluation transformation.')
        ], {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 }
        })));
        return;
    }
    transformFunctionDeclarationsToArrowFunctions(program);
    insertDelayAndForce(program);
}
exports.transpileToLazy = transpileToLazy;
