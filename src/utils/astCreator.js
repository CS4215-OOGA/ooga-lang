"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forStatement = exports.whileStatement = exports.ifStatement = exports.variableDeclarator = exports.variableDeclaration = exports.arrowFunctionExpression = exports.blockExpression = exports.functionDeclaration = exports.functionDeclarationExpression = exports.primitive = exports.unaryExpression = exports.binaryExpression = exports.assignmentExpression = exports.arrayExpression = exports.conditionalExpression = exports.mutateToConditionalExpression = exports.logicalExpression = exports.mutateToMemberExpression = exports.mutateToReturnStatement = exports.mutateToExpressionStatement = exports.mutateToAssignmentExpression = exports.mutateToCallExpression = exports.objectExpression = exports.property = exports.returnStatement = exports.program = exports.blockStatement = exports.functionExpression = exports.blockArrowFunction = exports.expressionStatement = exports.callExpression = exports.constantDeclaration = exports.declaration = exports.memberExpression = exports.literal = exports.identifier = exports.locationDummyNode = exports.getVariableDecarationName = void 0;
var getVariableDecarationName = function (decl) {
    return decl.declarations[0].id.name;
};
exports.getVariableDecarationName = getVariableDecarationName;
var locationDummyNode = function (line, column, source) {
    return (0, exports.literal)('Dummy', { start: { line: line, column: column }, end: { line: line, column: column }, source: source });
};
exports.locationDummyNode = locationDummyNode;
var identifier = function (name, loc) { return ({
    type: 'Identifier',
    name: name,
    loc: loc
}); };
exports.identifier = identifier;
var literal = function (value, loc) { return ({
    type: 'Literal',
    value: value,
    loc: loc
}); };
exports.literal = literal;
var memberExpression = function (object, property) { return ({
    type: 'MemberExpression',
    object: object,
    computed: typeof property === 'number',
    optional: false,
    property: typeof property === 'number' ? (0, exports.literal)(property) : (0, exports.identifier)(property)
}); };
exports.memberExpression = memberExpression;
var declaration = function (name, kind, init, loc) { return ({
    type: 'VariableDeclaration',
    declarations: [
        {
            type: 'VariableDeclarator',
            id: (0, exports.identifier)(name),
            init: init
        }
    ],
    kind: kind,
    loc: loc
}); };
exports.declaration = declaration;
var constantDeclaration = function (name, init, loc) { return (0, exports.declaration)(name, 'const', init, loc); };
exports.constantDeclaration = constantDeclaration;
var callExpression = function (callee, args, loc) { return ({
    type: 'CallExpression',
    callee: callee,
    arguments: args,
    optional: false,
    loc: loc
}); };
exports.callExpression = callExpression;
var expressionStatement = function (expression) { return ({
    type: 'ExpressionStatement',
    expression: expression
}); };
exports.expressionStatement = expressionStatement;
var blockArrowFunction = function (params, body, loc) { return ({
    type: 'ArrowFunctionExpression',
    expression: false,
    generator: false,
    params: params,
    body: Array.isArray(body) ? (0, exports.blockStatement)(body) : body,
    loc: loc
}); };
exports.blockArrowFunction = blockArrowFunction;
var functionExpression = function (params, body, loc, id) { return ({
    type: 'FunctionExpression',
    id: id !== null && id !== void 0 ? id : null,
    async: false,
    generator: false,
    params: params,
    body: Array.isArray(body) ? (0, exports.blockStatement)(body) : body,
    loc: loc
}); };
exports.functionExpression = functionExpression;
var blockStatement = function (body, loc) { return ({
    type: 'BlockStatement',
    body: body,
    loc: loc
}); };
exports.blockStatement = blockStatement;
var program = function (body) { return ({
    type: 'Program',
    sourceType: 'module',
    body: body
}); };
exports.program = program;
var returnStatement = function (argument, loc) { return ({
    type: 'ReturnStatement',
    argument: argument,
    loc: loc
}); };
exports.returnStatement = returnStatement;
var property = function (key, value) { return ({
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: (0, exports.identifier)(key),
    value: value,
    kind: 'init'
}); };
exports.property = property;
var objectExpression = function (properties) { return ({
    type: 'ObjectExpression',
    properties: properties
}); };
exports.objectExpression = objectExpression;
var mutateToCallExpression = function (node, callee, args) {
    node.type = 'CallExpression';
    node = node;
    node.callee = callee;
    node.arguments = args;
};
exports.mutateToCallExpression = mutateToCallExpression;
var mutateToAssignmentExpression = function (node, left, right) {
    node.type = 'AssignmentExpression';
    node = node;
    node.operator = '=';
    node.left = left;
    node.right = right;
};
exports.mutateToAssignmentExpression = mutateToAssignmentExpression;
var mutateToExpressionStatement = function (node, expr) {
    node.type = 'ExpressionStatement';
    node = node;
    node.expression = expr;
};
exports.mutateToExpressionStatement = mutateToExpressionStatement;
var mutateToReturnStatement = function (node, expr) {
    node.type = 'ReturnStatement';
    node = node;
    node.argument = expr;
};
exports.mutateToReturnStatement = mutateToReturnStatement;
var mutateToMemberExpression = function (node, obj, prop) {
    node.type = 'MemberExpression';
    node = node;
    node.object = obj;
    node.property = prop;
    node.computed = false;
};
exports.mutateToMemberExpression = mutateToMemberExpression;
var logicalExpression = function (operator, left, right, loc) { return ({
    type: 'LogicalExpression',
    operator: operator,
    left: left,
    right: right,
    loc: loc
}); };
exports.logicalExpression = logicalExpression;
var mutateToConditionalExpression = function (node, test, consequent, alternate) {
    node.type = 'ConditionalExpression';
    node = node;
    node.test = test;
    node.consequent = consequent;
    node.alternate = alternate;
};
exports.mutateToConditionalExpression = mutateToConditionalExpression;
var conditionalExpression = function (test, consequent, alternate, loc) { return ({
    type: 'ConditionalExpression',
    test: test,
    consequent: consequent,
    alternate: alternate,
    loc: loc
}); };
exports.conditionalExpression = conditionalExpression;
var arrayExpression = function (elements) { return ({
    type: 'ArrayExpression',
    elements: elements
}); };
exports.arrayExpression = arrayExpression;
var assignmentExpression = function (left, right, loc) { return ({
    type: 'AssignmentExpression',
    operator: '=',
    left: left,
    right: right,
    loc: loc
}); };
exports.assignmentExpression = assignmentExpression;
var binaryExpression = function (operator, left, right, loc) { return ({
    type: 'BinaryExpression',
    operator: operator,
    left: left,
    right: right,
    loc: loc
}); };
exports.binaryExpression = binaryExpression;
var unaryExpression = function (operator, argument, loc) { return ({
    type: 'UnaryExpression',
    operator: operator,
    prefix: true,
    argument: argument,
    loc: loc
}); };
exports.unaryExpression = unaryExpression;
// primitive: undefined is a possible value
var primitive = function (value) {
    return value === undefined ? (0, exports.identifier)('undefined') : (0, exports.literal)(value);
};
exports.primitive = primitive;
var functionDeclarationExpression = function (id, params, body, loc) { return ({
    type: 'FunctionExpression',
    id: id,
    params: params,
    body: body,
    loc: loc
}); };
exports.functionDeclarationExpression = functionDeclarationExpression;
var functionDeclaration = function (id, params, body, loc) { return ({
    type: 'FunctionDeclaration',
    id: id,
    params: params,
    body: body,
    loc: loc
}); };
exports.functionDeclaration = functionDeclaration;
var blockExpression = function (body, loc) { return ({
    type: 'BlockExpression',
    body: body,
    loc: loc
}); };
exports.blockExpression = blockExpression;
var arrowFunctionExpression = function (params, body, loc) { return ({
    type: 'ArrowFunctionExpression',
    expression: body.type !== 'BlockStatement',
    generator: false,
    params: params,
    body: body,
    loc: loc
}); };
exports.arrowFunctionExpression = arrowFunctionExpression;
var variableDeclaration = function (declarations, loc) { return ({
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: declarations,
    loc: loc
}); };
exports.variableDeclaration = variableDeclaration;
var variableDeclarator = function (id, init, loc) { return ({
    type: 'VariableDeclarator',
    id: id,
    init: init,
    loc: loc
}); };
exports.variableDeclarator = variableDeclarator;
var ifStatement = function (test, consequent, alternate, loc) { return ({
    type: 'IfStatement',
    test: test,
    consequent: consequent,
    alternate: alternate,
    loc: loc
}); };
exports.ifStatement = ifStatement;
var whileStatement = function (body, test, loc) { return ({
    type: 'WhileStatement',
    test: test,
    body: body,
    loc: loc
}); };
exports.whileStatement = whileStatement;
var forStatement = function (init, test, update, body, loc) { return ({
    type: 'ForStatement',
    init: init,
    test: test,
    update: update,
    body: body,
    loc: loc
}); };
exports.forStatement = forStatement;
