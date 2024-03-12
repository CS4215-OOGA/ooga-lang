"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = exports.parse = void 0;
var parser_1 = require("../parser/parser");
var source_1 = require("../parser/source");
var syntax_1 = require("../parser/source/syntax");
var formatters_1 = require("../utils/formatters");
var list_1 = require("./list");
var ParseError = /** @class */ (function (_super) {
    __extends(ParseError, _super);
    function ParseError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ParseError';
        return _this;
    }
    return ParseError;
}(Error));
function unreachable() {
    // tslint:disable-next-line:no-console
    console.error((0, formatters_1.oneLine)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    UNREACHABLE CODE REACHED!\n    Please file an issue at\n    https://github.com/source-academy/js-slang/issues\n    if you see this.\n  "], ["\n    UNREACHABLE CODE REACHED!\n    Please file an issue at\n    https://github.com/source-academy/js-slang/issues\n    if you see this.\n  "]))));
}
// sequences of expressions of length 1
// can be represented by the element itself,
// instead of constructing a sequence
function makeSequenceIfNeeded(exs) {
    return exs.length === 1
        ? transform(exs[0])
        : (0, list_1.vector_to_list)(['sequence', (0, list_1.vector_to_list)(exs.map(transform))]);
}
function makeBlockIfNeeded(exs) {
    return hasDeclarationAtToplevel(exs)
        ? (0, list_1.vector_to_list)(['block', makeSequenceIfNeeded(exs)])
        : makeSequenceIfNeeded(exs);
}
// checks if sequence has declaration at toplevel
// (outside of any block)
function hasDeclarationAtToplevel(exs) {
    return exs.reduce(function (b, ex) { return b || ex.type === 'VariableDeclaration' || ex.type === 'FunctionDeclaration'; }, false);
}
var transformers = new Map([
    [
        'Program',
        function (node) {
            node = node;
            return makeSequenceIfNeeded(node.body);
        }
    ],
    [
        'BlockStatement',
        function (node) {
            return makeBlockIfNeeded(node.body);
        }
    ],
    [
        'ExpressionStatement',
        function (node) {
            return transform(node.expression);
        }
    ],
    [
        'IfStatement',
        function (node) {
            return (0, list_1.vector_to_list)([
                'conditional_statement',
                transform(node.test),
                transform(node.consequent),
                node.alternate === null
                    ? makeSequenceIfNeeded([])
                    : transform(node.alternate)
            ]);
        }
    ],
    [
        'FunctionDeclaration',
        function (node) {
            return (0, list_1.vector_to_list)([
                'function_declaration',
                transform(node.id),
                (0, list_1.vector_to_list)(node.params.map(transform)),
                makeBlockIfNeeded(node.body.body)
            ]);
        }
    ],
    [
        'VariableDeclaration',
        function (node) {
            if (node.kind === 'let') {
                return (0, list_1.vector_to_list)([
                    'variable_declaration',
                    transform(node.declarations[0].id),
                    transform(node.declarations[0].init)
                ]);
            }
            else if (node.kind === 'const') {
                return (0, list_1.vector_to_list)([
                    'constant_declaration',
                    transform(node.declarations[0].id),
                    transform(node.declarations[0].init)
                ]);
            }
            else {
                unreachable();
                throw new ParseError('Invalid declaration kind');
            }
        }
    ],
    [
        'ReturnStatement',
        function (node) {
            return (0, list_1.vector_to_list)(['return_statement', transform(node.argument)]);
        }
    ],
    [
        'CallExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'application',
                transform(node.callee),
                (0, list_1.vector_to_list)(node.arguments.map(transform))
            ]);
        }
    ],
    [
        'UnaryExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'unary_operator_combination',
                node.operator === '-' ? '-unary' : node.operator,
                transform(node.argument)
            ]);
        }
    ],
    [
        'BinaryExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'binary_operator_combination',
                node.operator,
                transform(node.left),
                transform(node.right)
            ]);
        }
    ],
    [
        'LogicalExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'logical_composition',
                node.operator,
                transform(node.left),
                transform(node.right)
            ]);
        }
    ],
    [
        'ConditionalExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'conditional_expression',
                transform(node.test),
                transform(node.consequent),
                transform(node.alternate)
            ]);
        }
    ],
    [
        'ArrowFunctionExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'lambda_expression',
                (0, list_1.vector_to_list)(node.params.map(transform)),
                node.body.type === 'BlockStatement'
                    ? // body.body: strip away one layer of block:
                        // The body of a function is the statement
                        // inside the curly braces.
                        makeBlockIfNeeded(node.body.body)
                    : (0, list_1.vector_to_list)(['return_statement', transform(node.body)])
            ]);
        }
    ],
    [
        'Identifier',
        function (node) {
            return (0, list_1.vector_to_list)(['name', node.name]);
        }
    ],
    [
        'Literal',
        function (node) {
            return (0, list_1.vector_to_list)(['literal', node.value]);
        }
    ],
    [
        'ArrayExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'array_expression',
                (0, list_1.vector_to_list)(node.elements.map(transform))
            ]);
        }
    ],
    [
        'AssignmentExpression',
        function (node) {
            if (node.left.type === 'Identifier') {
                return (0, list_1.vector_to_list)([
                    'assignment',
                    transform(node.left),
                    transform(node.right)
                ]);
            }
            else if (node.left.type === 'MemberExpression') {
                return (0, list_1.vector_to_list)([
                    'object_assignment',
                    transform(node.left),
                    transform(node.right)
                ]);
            }
            else {
                unreachable();
                throw new ParseError('Invalid assignment');
            }
        }
    ],
    [
        'ForStatement',
        function (node) {
            return (0, list_1.vector_to_list)([
                'for_loop',
                transform(node.init),
                transform(node.test),
                transform(node.update),
                transform(node.body)
            ]);
        }
    ],
    [
        'WhileStatement',
        function (node) {
            return (0, list_1.vector_to_list)(['while_loop', transform(node.test), transform(node.body)]);
        }
    ],
    [
        'BreakStatement',
        function (_node) {
            return (0, list_1.vector_to_list)(['break_statement']);
        }
    ],
    [
        'ContinueStatement',
        function (_node) {
            return (0, list_1.vector_to_list)(['continue_statement']);
        }
    ],
    [
        'ObjectExpression',
        function (node) {
            return (0, list_1.vector_to_list)(['object_expression', (0, list_1.vector_to_list)(node.properties.map(transform))]);
        }
    ],
    [
        'MemberExpression',
        function (node) {
            // "computed" property of MemberExpression distinguishes
            // between dot access (not computed) and
            // a[...] (computed)
            // the key in dot access is meant as string, and
            // represented by a "property" node in parse result
            return (0, list_1.vector_to_list)([
                'object_access',
                transform(node.object),
                !node.computed && node.property.type === 'Identifier'
                    ? (0, list_1.vector_to_list)(['property', node.property.name])
                    : transform(node.property)
            ]);
        }
    ],
    [
        'Property',
        function (node) {
            // identifiers before the ":" in literal objects are meant
            // as string, and represented by a "property" node in parse result
            return (0, list_1.vector_to_list)([
                'key_value_pair',
                node.key.type === 'Identifier'
                    ? (0, list_1.vector_to_list)(['property', node.key.name])
                    : transform(node.key),
                transform(node.value)
            ]);
        }
    ],
    [
        'ImportDeclaration',
        function (node) {
            return (0, list_1.vector_to_list)([
                'import_declaration',
                (0, list_1.vector_to_list)(node.specifiers.map(transform)),
                node.source.value
            ]);
        }
    ],
    [
        'ImportSpecifier',
        function (node) {
            return (0, list_1.vector_to_list)(['name', node.imported.name]);
        }
    ],
    [
        'ImportDefaultSpecifier',
        function (_node) {
            return (0, list_1.vector_to_list)(['default']);
        }
    ],
    [
        'ExportNamedDeclaration',
        function (node) {
            return (0, list_1.vector_to_list)([
                'export_named_declaration',
                node.declaration ? transform(node.declaration) : node.specifiers.map(transform)
            ]);
        }
    ],
    [
        'ExportDefaultDeclaration',
        function (node) {
            return (0, list_1.vector_to_list)(['export_default_declaration', transform(node.declaration)]);
        }
    ],
    [
        'ExportSpecifier',
        function (node) {
            return (0, list_1.vector_to_list)(['name', node.exported.name]);
        }
    ],
    [
        'ClassDeclaration',
        function (node) {
            return (0, list_1.vector_to_list)([
                'class_declaration',
                (0, list_1.vector_to_list)([
                    'name',
                    node.id === null ? null : node.id.name,
                    node.superClass === null || node.superClass === undefined
                        ? null
                        : transform(node.superClass),
                    node.body.body.map(transform)
                ])
            ]);
        }
    ],
    [
        'NewExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'new_expression',
                transform(node.callee),
                (0, list_1.vector_to_list)(node.arguments.map(transform))
            ]);
        }
    ],
    [
        'MethodDefinition',
        function (node) {
            return (0, list_1.vector_to_list)([
                'method_definition',
                node.kind,
                node.static,
                transform(node.key),
                transform(node.value)
            ]);
        }
    ],
    [
        'FunctionExpression',
        function (node) {
            return (0, list_1.vector_to_list)([
                'lambda_expression',
                (0, list_1.vector_to_list)(node.params.map(transform)),
                makeBlockIfNeeded(node.body.body)
            ]);
        }
    ],
    [
        'ThisExpression',
        function (_node) {
            return (0, list_1.vector_to_list)(['this_expression']);
        }
    ],
    [
        'Super',
        function (_node) {
            return (0, list_1.vector_to_list)(['super_expression']);
        }
    ],
    [
        'TryStatement',
        function (node) {
            return (0, list_1.vector_to_list)([
                'try_statement',
                transform(node.block),
                node.handler === null || node.handler === undefined
                    ? null
                    : (0, list_1.vector_to_list)(['name', node.handler.param.name]),
                node.handler === null || node.handler === undefined ? null : transform(node.handler.body)
            ]);
        }
    ],
    [
        'ThrowStatement',
        function (node) {
            return (0, list_1.vector_to_list)(['throw_statement', transform(node.argument)]);
        }
    ],
    [
        'SpreadElement',
        function (node) {
            return (0, list_1.vector_to_list)(['spread_element', transform(node.argument)]);
        }
    ],
    [
        'RestElement',
        function (node) {
            return (0, list_1.vector_to_list)(['rest_element', transform(node.argument)]);
        }
    ]
]);
function transform(node) {
    if (transformers.has(node.type)) {
        var transformer = transformers.get(node.type);
        var transformed = transformer(node);
        // Attach location information
        if (transformed !== null &&
            transformed !== undefined &&
            typeof transformed === 'object' &&
            transformed.tag !== undefined) {
            transformed.loc = node.loc;
        }
        return transformed;
    }
    else {
        unreachable();
        throw new ParseError('Cannot transform unknown type: ' + node.type);
    }
}
function parse(x, context) {
    context.chapter = syntax_1.libraryParserLanguage;
    var program = (0, parser_1.parse)(x, context);
    if (context.errors.length > 0) {
        throw new ParseError(context.errors[0].explain());
    }
    if (program) {
        return transform(program);
    }
    else {
        unreachable();
        throw new ParseError('Invalid parse');
    }
}
exports.parse = parse;
function tokenize(x, context) {
    var tokensArr = source_1.SourceParser.tokenize(x, context).map(function (tok) { return x.substring(tok.start, tok.end); });
    return (0, list_1.vector_to_list)(tokensArr);
}
exports.tokenize = tokenize;
var templateObject_1;
