"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectToString = exports.nodeToValueWithContext = exports.nodeToValue = exports.valueToExpression = void 0;
var context_1 = require("../mocks/context");
var parser_1 = require("../parser/parser");
var types_1 = require("../types");
var builtin = require("./lib");
var stepper_1 = require("./stepper");
var util = require("./util");
// the value in the parameter is not an ast node, but a underlying javascript value
// return by evaluateBinaryExpression and evaluateUnaryExpression.
function valueToExpression(value, context) {
    if (typeof value === 'object') {
        return {
            type: 'Literal',
            value: value,
            raw: objectToString(value)
        };
    }
    if (typeof value === 'function' && context) {
        var functionName = 'anonymous_' + generateRandomFunctionName();
        while (Object.keys(context.runtime.environments[0]).includes(functionName)) {
            functionName = 'anonymous_' + generateRandomFunctionName();
        }
        util.declareIdentifier(context, functionName, (0, context_1.mockImportDeclaration)(), context.runtime.environments[0]);
        util.defineVariable(context, functionName, value, true, (0, context_1.mockImportDeclaration)());
        return {
            type: 'Identifier',
            name: functionName
        };
    }
    var programString = (typeof value === 'string' ? "\"" + value + "\"" : String(value)) + ';';
    var program = (0, parser_1.parse)(programString, context ? context : (0, context_1.mockContext)(types_1.Chapter.SOURCE_2));
    return program.body[0].expression;
}
exports.valueToExpression = valueToExpression;
function generateRandomFunctionName() {
    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < 10; i++) {
        var randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    return result;
}
function nodeToValue(node) {
    return node.type === 'Literal'
        ? node.value
        : util.isBuiltinFunction(node)
            ? builtin[node.name]
            : // tslint:disable-next-line
                eval((0, stepper_1.javascriptify)(node));
}
exports.nodeToValue = nodeToValue;
function nodeToValueWithContext(node, context) {
    return node.type === 'Literal'
        ? node.value
        : util.isBuiltinFunction(node)
            ? builtin[node.name]
            : node.type === 'Identifier' && util.isImportedFunction(node, context)
                ? context.runtime.environments[0].head[node.name]
                : // tslint:disable-next-line
                    evaluateFunctionObject(node, context);
}
exports.nodeToValueWithContext = nodeToValueWithContext;
function evaluateFunctionObject(node, context) {
    var builtinFunctions = context.runtime.environments[0].head;
    // add identifiers used in the node to the global environment
    function lookUpIdentifiers(node, visited) {
        if (visited.has(node)) {
            return;
        }
        visited.add(node);
        if (node.type === 'Identifier' && builtinFunctions[node.name]) {
            global[node.name] = builtinFunctions[node.name];
        }
        for (var key in node) {
            if (node[key] && typeof node[key] === 'object') {
                lookUpIdentifiers(node[key], visited);
            }
        }
    }
    lookUpIdentifiers(node, new Set());
    var code = (0, stepper_1.javascriptify)(node);
    return eval(code);
}
function objectToString(value) {
    if (value !== null && 'toReplString' in value) {
        return value.toReplString();
    }
    return '[Object]';
}
exports.objectToString = objectToString;
