"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dummyVariableDeclarator = exports.dummyBlockExpression = exports.dummyFunctionDeclaration = exports.dummyFunctionExpression = exports.dummyPrimitive = exports.dummyUnaryExpression = exports.dummyBinaryExpression = exports.dummyArrayExpression = exports.dummyConditionalExpression = exports.dummyLogicalExpression = exports.dummyReturnStatement = exports.dummyProgram = exports.dummyArrowFunctionExpression = exports.dummyBlockStatement = exports.dummyStatement = exports.dummyExpressionStatement = exports.dummyCallExpression = exports.dummyExpression = exports.dummyLiteral = exports.dummyIdentifier = exports.dummyLocation = void 0;
var DUMMY_STRING = '__DUMMY__';
var DUMMY_UNARY_OPERATOR = '!';
var DUMMY_LOGICAL_OPERATOR = '||';
var DUMMY_BINARY_OPERATOR = '+';
var dummyLocation = function () { return ({
    start: { line: -1, column: -1 },
    end: { line: -1, column: -1 }
}); };
exports.dummyLocation = dummyLocation;
var dummyIdentifier = function () { return ({
    type: 'Identifier',
    name: DUMMY_STRING
}); };
exports.dummyIdentifier = dummyIdentifier;
var dummyLiteral = function () { return ({
    type: 'Literal',
    value: DUMMY_STRING,
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyLiteral = dummyLiteral;
var dummyExpression = function () { return (0, exports.dummyLiteral)(); };
exports.dummyExpression = dummyExpression;
var dummyCallExpression = function () { return ({
    type: 'CallExpression',
    callee: (0, exports.dummyExpression)(),
    arguments: [],
    loc: (0, exports.dummyLocation)(),
    optional: false
}); };
exports.dummyCallExpression = dummyCallExpression;
var dummyExpressionStatement = function () { return ({
    type: 'ExpressionStatement',
    expression: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyExpressionStatement = dummyExpressionStatement;
var dummyStatement = function () { return (0, exports.dummyExpressionStatement)(); };
exports.dummyStatement = dummyStatement;
var dummyBlockStatement = function () { return ({
    type: 'BlockStatement',
    body: [],
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyBlockStatement = dummyBlockStatement;
var dummyArrowFunctionExpression = function () { return ({
    type: 'ArrowFunctionExpression',
    expression: false,
    generator: false,
    params: [],
    body: (0, exports.dummyBlockStatement)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyArrowFunctionExpression = dummyArrowFunctionExpression;
var dummyProgram = function () { return ({
    type: 'Program',
    body: [],
    loc: (0, exports.dummyLocation)(),
    sourceType: 'module'
}); };
exports.dummyProgram = dummyProgram;
var dummyReturnStatement = function () { return ({
    type: 'ReturnStatement',
    argument: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyReturnStatement = dummyReturnStatement;
/*
export const property = (): es.Property => ({
  type: 'Property',
  method: false,
  shorthand: false,
  computed: false,
  key: dummyIdentifier(),
  value: dummyExpression(),
  kind: 'init'
})

export const objectExpression = (properties: es.Property[]): es.ObjectExpression => ({
  type: 'ObjectExpression',
  properties
})

export const mutateToCallExpression = (
  node: es.Node,
  callee: es.Expression,
  args: es.Expression[]
) => {
  node.type = 'CallExpression'
  node = node as es.CallExpression
  node.callee = callee
  node.arguments = args
}
*/
var dummyLogicalExpression = function () { return ({
    type: 'LogicalExpression',
    operator: DUMMY_LOGICAL_OPERATOR,
    left: (0, exports.dummyExpression)(),
    right: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyLogicalExpression = dummyLogicalExpression;
var dummyConditionalExpression = function () { return ({
    type: 'ConditionalExpression',
    test: (0, exports.dummyExpression)(),
    consequent: (0, exports.dummyExpression)(),
    alternate: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyConditionalExpression = dummyConditionalExpression;
var dummyArrayExpression = function () { return ({
    type: 'ArrayExpression',
    elements: []
}); };
exports.dummyArrayExpression = dummyArrayExpression;
var dummyBinaryExpression = function () { return ({
    type: 'BinaryExpression',
    operator: DUMMY_BINARY_OPERATOR,
    left: (0, exports.dummyExpression)(),
    right: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyBinaryExpression = dummyBinaryExpression;
var dummyUnaryExpression = function () { return ({
    type: 'UnaryExpression',
    operator: DUMMY_UNARY_OPERATOR,
    prefix: true,
    argument: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyUnaryExpression = dummyUnaryExpression;
// primitive: undefined is a possible value
var dummyPrimitive = function () { return (0, exports.dummyLiteral)(); };
exports.dummyPrimitive = dummyPrimitive;
var dummyFunctionExpression = function () { return ({
    type: 'FunctionExpression',
    id: (0, exports.dummyIdentifier)(),
    params: [],
    body: (0, exports.dummyBlockStatement)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyFunctionExpression = dummyFunctionExpression;
var dummyFunctionDeclaration = function () { return ({
    type: 'FunctionDeclaration',
    id: (0, exports.dummyIdentifier)(),
    params: [],
    body: (0, exports.dummyBlockStatement)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyFunctionDeclaration = dummyFunctionDeclaration;
var dummyBlockExpression = function () { return ({
    type: 'BlockExpression',
    body: [],
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyBlockExpression = dummyBlockExpression;
var dummyVariableDeclarator = function () { return ({
    type: 'VariableDeclarator',
    id: (0, exports.dummyIdentifier)(),
    init: (0, exports.dummyExpression)(),
    loc: (0, exports.dummyLocation)()
}); };
exports.dummyVariableDeclarator = dummyVariableDeclarator;
