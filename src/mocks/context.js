"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockEnvironment = exports.mockClosure = exports.mockRuntimeContext = exports.mockImportDeclaration = exports.mockContext = void 0;
var createContext_1 = require("../createContext");
var closure_1 = require("../interpreter/closure");
var interpreter_1 = require("../interpreter/interpreter");
var types_1 = require("../types");
function mockContext(chapter, variant) {
    if (chapter === void 0) { chapter = types_1.Chapter.SOURCE_1; }
    if (variant === void 0) { variant = types_1.Variant.DEFAULT; }
    return (0, createContext_1.default)(chapter, variant);
}
exports.mockContext = mockContext;
function mockImportDeclaration() {
    var mockImportDecl = {
        type: 'ImportDeclaration',
        specifiers: [
            {
                type: 'ImportDefaultSpecifier',
                local: {
                    type: 'Identifier',
                    name: 'MockName'
                }
            }
        ],
        source: {
            type: 'Literal',
            value: 'mock-path',
            raw: "'mock-path'"
        }
    };
    return mockImportDecl;
}
exports.mockImportDeclaration = mockImportDeclaration;
function mockRuntimeContext() {
    var context = (0, createContext_1.default)();
    context.runtime = {
        break: false,
        debuggerOn: true,
        isRunning: true,
        environmentTree: new createContext_1.EnvTree(),
        environments: [],
        nodes: [
            {
                type: 'Literal',
                loc: {
                    start: { line: 1, column: 0 },
                    end: { line: 1, column: 1 }
                },
                value: 0,
                raw: '0',
                range: [0, 1]
            }
        ],
        control: null,
        stash: null,
        envStepsTotal: 0,
        breakpointSteps: []
    };
    return context;
}
exports.mockRuntimeContext = mockRuntimeContext;
function mockClosure() {
    return new closure_1.default({
        type: 'FunctionExpression',
        loc: null,
        id: null,
        params: [],
        body: {
            type: 'BlockStatement',
            body: []
        }
    }, {}, {});
}
exports.mockClosure = mockClosure;
function mockEnvironment(context, name, head) {
    if (name === void 0) { name = 'blockEnvironment'; }
    if (head === void 0) { head = {}; }
    return (0, interpreter_1.createBlockEnvironment)(context, name, head);
}
exports.mockEnvironment = mockEnvironment;
