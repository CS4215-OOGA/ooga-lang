"use strict";
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
exports.removeTSNodes = exports.checkForTypeErrors = void 0;
var parser_1 = require("@babel/parser");
var lodash_1 = require("lodash");
var moduleErrors_1 = require("../errors/moduleErrors");
var typeErrors_1 = require("../errors/typeErrors");
var moduleLoader_1 = require("../modules/moduleLoader");
var types_1 = require("../types");
var internalTypeErrors_1 = require("./internalTypeErrors");
var parseTreeTypes_prelude_1 = require("./parseTreeTypes.prelude");
var utils_1 = require("./utils");
// Context and type environment are saved as global variables so that they are not passed between functions excessively
var context = {};
var env = [];
/**
 * Entry function for type error checker.
 * Checks program for type errors, and returns the program with all TS-related nodes removed.
 */
function checkForTypeErrors(program, inputContext) {
    // Set context as global variable
    context = inputContext;
    // Deep copy type environment to avoid modifying type environment in the context,
    // which might affect the type inference checker
    env = (0, lodash_1.cloneDeep)(context.typeEnvironment);
    // Override predeclared function types
    for (var _i = 0, _a = (0, utils_1.getTypeOverrides)(context.chapter); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], type = _b[1];
        (0, utils_1.setType)(name_1, type, env);
    }
    if (context.chapter >= 4) {
        // Add parse tree types to type environment
        var source4Types = (0, parser_1.parse)(parseTreeTypes_prelude_1.parseTreeTypesPrelude, {
            sourceType: 'module',
            plugins: ['typescript', 'estree']
        }).program;
        typeCheckAndReturnType(source4Types);
    }
    try {
        typeCheckAndReturnType(program);
    }
    catch (error) {
        // Catch-all for thrown errors
        // (either errors that cause early termination or errors that should not be reached logically)
        console.error(error);
        context.errors.push(error instanceof internalTypeErrors_1.TypecheckError
            ? error
            : new internalTypeErrors_1.TypecheckError(program, 'Uncaught error during typechecking, report this to the administrators!\n' +
                error.message));
    }
    // Reset global variables
    context = {};
    env = [];
    return removeTSNodes(program);
}
exports.checkForTypeErrors = checkForTypeErrors;
/**
 * Recurses through the given node to check for any type errors,
 * then returns the node's inferred/declared type.
 * Any errors found are added to the context.
 */
function typeCheckAndReturnType(node) {
    var _a;
    switch (node.type) {
        case 'Literal': {
            // Infers type
            if (node.value === undefined) {
                return utils_1.tUndef;
            }
            if (node.value === null) {
                // For Source 1, skip typecheck as null literals will be handled by the noNull rule,
                // which is run after typechecking
                return context.chapter === types_1.Chapter.SOURCE_1 ? utils_1.tAny : utils_1.tNull;
            }
            if (typeof node.value !== 'string' &&
                typeof node.value !== 'number' &&
                typeof node.value !== 'boolean') {
                // Skip typecheck as unspecified literals will be handled by the noUnspecifiedLiteral rule,
                // which is run after typechecking
                return utils_1.tAny;
            }
            // Casting is safe here as above check already narrows type to string, number or boolean
            return (0, utils_1.tPrimitive)(typeof node.value, node.value);
        }
        case 'TemplateLiteral': {
            // Quasis array should only have one element as
            // string interpolation is not allowed in Source
            return (0, utils_1.tPrimitive)('string', node.quasis[0].value.raw);
        }
        case 'Identifier': {
            var varName = node.name;
            var varType = lookupTypeAndRemoveForAllAndPredicateTypes(varName);
            if (varType) {
                return varType;
            }
            else {
                context.errors.push(new typeErrors_1.UndefinedVariableTypeError(node, varName));
                return utils_1.tAny;
            }
        }
        case 'RestElement':
        case 'SpreadElement':
            // TODO: Add support for rest and spread element
            return utils_1.tAny;
        case 'Program':
        case 'BlockStatement': {
            var returnType = utils_1.tVoid;
            (0, utils_1.pushEnv)(env);
            if (node.type === 'Program') {
                // Import statements should only exist in program body
                handleImportDeclarations(node);
            }
            // Add all declarations in the current scope to the environment first
            addTypeDeclarationsToEnvironment(node);
            // Check all statements in program/block body
            for (var _i = 0, _b = node.body; _i < _b.length; _i++) {
                var stmt = _b[_i];
                if (stmt.type === 'IfStatement' || stmt.type === 'ReturnStatement') {
                    returnType = typeCheckAndReturnType(stmt);
                    if (stmt.type === 'ReturnStatement') {
                        // If multiple return statements are present, only take the first type
                        break;
                    }
                }
                else {
                    typeCheckAndReturnType(stmt);
                }
            }
            if (node.type === 'BlockStatement') {
                // Types are saved for programs, but not for blocks
                env.pop();
            }
            return returnType;
        }
        case 'ExpressionStatement': {
            // Check expression
            return typeCheckAndReturnType(node.expression);
        }
        case 'ConditionalExpression':
        case 'IfStatement': {
            // Typecheck predicate against boolean
            var predicateType = typeCheckAndReturnType(node.test);
            checkForTypeMismatch(node, predicateType, utils_1.tBool);
            // Return type is union of consequent and alternate type
            var consType = typeCheckAndReturnType(node.consequent);
            var altType = node.alternate ? typeCheckAndReturnType(node.alternate) : utils_1.tUndef;
            return mergeTypes(node, consType, altType);
        }
        case 'UnaryExpression': {
            var argType = typeCheckAndReturnType(node.argument);
            var operator = node.operator;
            switch (operator) {
                case '-':
                    // Typecheck against number
                    checkForTypeMismatch(node, argType, utils_1.tNumber);
                    return utils_1.tNumber;
                case '!':
                    // Typecheck against boolean
                    checkForTypeMismatch(node, argType, utils_1.tBool);
                    return utils_1.tBool;
                case 'typeof':
                    // No checking needed, typeof operation can be used on any type
                    return utils_1.tString;
                default:
                    throw new internalTypeErrors_1.TypecheckError(node, 'Unknown operator');
            }
        }
        case 'BinaryExpression': {
            return typeCheckAndReturnBinaryExpressionType(node);
        }
        case 'LogicalExpression': {
            // Typecheck left type against boolean
            var leftType = typeCheckAndReturnType(node.left);
            checkForTypeMismatch(node, leftType, utils_1.tBool);
            // Return type is union of boolean and right type
            var rightType = typeCheckAndReturnType(node.right);
            return mergeTypes(node, utils_1.tBool, rightType);
        }
        case 'ArrowFunctionExpression': {
            return typeCheckAndReturnArrowFunctionType(node);
        }
        case 'FunctionDeclaration':
            if (node.id === null) {
                // Block should not be reached since node.id is only null when function declaration
                // is part of `export default function`, which is not used in Source
                throw new internalTypeErrors_1.TypecheckError(node, 'Function declaration should always have an identifier');
            }
            // Only identifiers/rest elements are used as function params in Source
            var params = node.params.filter(function (param) {
                return param.type === 'Identifier' || param.type === 'RestElement';
            });
            if (params.length !== node.params.length) {
                throw new internalTypeErrors_1.TypecheckError(node, 'Unknown function parameter type');
            }
            var fnName = node.id.name;
            var expectedReturnType = getTypeAnnotationType(node.returnType);
            // If the function has variable number of arguments, set function type as any
            // TODO: Add support for variable number of function arguments
            var hasVarArgs = params.reduce(function (prev, curr) { return prev || curr.type === 'RestElement'; }, false);
            if (hasVarArgs) {
                (0, utils_1.setType)(fnName, utils_1.tAny, env);
                return utils_1.tUndef;
            }
            var types = getParamTypes(params);
            // Return type will always be last item in types array
            types.push(expectedReturnType);
            var fnType = utils_1.tFunc.apply(void 0, types);
            // Typecheck function body, creating new environment to store arg types, return type and function type
            (0, utils_1.pushEnv)(env);
            params.forEach(function (param) {
                (0, utils_1.setType)(param.name, getTypeAnnotationType(param.typeAnnotation), env);
            });
            // Set unique identifier so that typechecking can be carried out for return statements
            (0, utils_1.setType)(utils_1.RETURN_TYPE_IDENTIFIER, expectedReturnType, env);
            (0, utils_1.setType)(fnName, fnType, env);
            var actualReturnType = typeCheckAndReturnType(node.body);
            env.pop();
            if ((0, lodash_1.isEqual)(actualReturnType, utils_1.tVoid) &&
                !(0, lodash_1.isEqual)(expectedReturnType, utils_1.tAny) &&
                !(0, lodash_1.isEqual)(expectedReturnType, utils_1.tVoid)) {
                // Type error where function does not return anything when it should
                context.errors.push(new typeErrors_1.FunctionShouldHaveReturnValueError(node));
            }
            else {
                checkForTypeMismatch(node, actualReturnType, expectedReturnType);
            }
            // Save function type in type env
            (0, utils_1.setType)(fnName, fnType, env);
            return utils_1.tUndef;
        case 'VariableDeclaration': {
            if (node.kind === 'var') {
                throw new internalTypeErrors_1.TypecheckError(node, 'Variable declaration using "var" is not allowed');
            }
            if (node.declarations.length !== 1) {
                throw new internalTypeErrors_1.TypecheckError(node, 'Variable declaration should have one and only one declaration');
            }
            if (node.declarations[0].id.type !== 'Identifier') {
                throw new internalTypeErrors_1.TypecheckError(node, 'Variable declaration ID should be an identifier');
            }
            var id = node.declarations[0].id;
            if (!node.declarations[0].init) {
                throw new internalTypeErrors_1.TypecheckError(node, 'Variable declaration must have value');
            }
            var init = node.declarations[0].init;
            // Look up declared type if current environment contains name
            var expectedType_1 = env[env.length - 1].typeMap.has(id.name)
                ? (_a = lookupTypeAndRemoveForAllAndPredicateTypes(id.name)) !== null && _a !== void 0 ? _a : getTypeAnnotationType(id.typeAnnotation)
                : getTypeAnnotationType(id.typeAnnotation);
            var initType = typeCheckAndReturnType(init);
            checkForTypeMismatch(node, initType, expectedType_1);
            // Save variable type and decl kind in type env
            (0, utils_1.setType)(id.name, expectedType_1, env);
            (0, utils_1.setDeclKind)(id.name, node.kind, env);
            return utils_1.tUndef;
        }
        case 'CallExpression': {
            var callee = node.callee;
            var args = node.arguments;
            if (context.chapter >= 2 && callee.type === 'Identifier') {
                // Special functions for Source 2+: list, head, tail, stream
                // The typical way of getting the return type of call expressions is insufficient to type lists,
                // as we need to save the pair representation of the list as well (lists are pairs).
                // head and tail should preserve the pair representation of lists whenever possible.
                // Hence, these 3 functions are handled separately.
                // Streams are treated similarly to lists, except only for Source 3+ and we do not need to store the pair representation.
                var fnName_1 = callee.name;
                if (fnName_1 === 'list') {
                    if (args.length === 0) {
                        return utils_1.tNull;
                    }
                    // Element type is union of all types of arguments in list
                    var elementType = typeCheckAndReturnType(args[0]);
                    for (var i = 1; i < args.length; i++) {
                        elementType = mergeTypes(node, elementType, typeCheckAndReturnType(args[i]));
                    }
                    // Type the list as a pair, for use when checking for type mismatches against pairs
                    var pairType = (0, utils_1.tPair)(typeCheckAndReturnType(args[args.length - 1]), utils_1.tNull);
                    for (var i = args.length - 2; i >= 0; i--) {
                        pairType = (0, utils_1.tPair)(typeCheckAndReturnType(args[i]), pairType);
                    }
                    return (0, utils_1.tList)(elementType, pairType);
                }
                if (fnName_1 === 'head' || fnName_1 === 'tail') {
                    if (args.length !== 1) {
                        context.errors.push(new typeErrors_1.InvalidNumberOfArgumentsTypeError(node, 1, args.length));
                        return utils_1.tAny;
                    }
                    var actualType_1 = typeCheckAndReturnType(args[0]);
                    // Argument should be either a pair or a list
                    var expectedType_2 = (0, utils_1.tUnion)((0, utils_1.tPair)(utils_1.tAny, utils_1.tAny), (0, utils_1.tList)(utils_1.tAny));
                    var numErrors = context.errors.length;
                    checkForTypeMismatch(node, actualType_1, expectedType_2);
                    if (context.errors.length > numErrors) {
                        // If errors were found, return "any" type
                        return utils_1.tAny;
                    }
                    return fnName_1 === 'head' ? getHeadType(node, actualType_1) : getTailType(node, actualType_1);
                }
                if (fnName_1 === 'stream' && context.chapter >= 3) {
                    if (args.length === 0) {
                        return utils_1.tNull;
                    }
                    // Element type is union of all types of arguments in stream
                    var elementType = typeCheckAndReturnType(args[0]);
                    for (var i = 1; i < args.length; i++) {
                        elementType = mergeTypes(node, elementType, typeCheckAndReturnType(args[i]));
                    }
                    return (0, utils_1.tStream)(elementType);
                }
            }
            var calleeType = typeCheckAndReturnType(callee);
            if (calleeType.kind !== 'function') {
                if (calleeType.kind !== 'primitive' || calleeType.name !== 'any') {
                    context.errors.push(new typeErrors_1.TypeNotCallableError(node, (0, utils_1.formatTypeString)(calleeType)));
                }
                return utils_1.tAny;
            }
            var expectedTypes = calleeType.parameterTypes;
            var returnType = calleeType.returnType;
            // If any of the arguments is a spread element, skip type checking of arguments
            // TODO: Add support for type checking of call expressions with spread elements
            var hasVarArgs_1 = args.reduce(function (prev, curr) { return prev || curr.type === 'SpreadElement'; }, false);
            if (hasVarArgs_1) {
                return returnType;
            }
            // Check argument types before returning declared return type
            if (args.length !== expectedTypes.length) {
                context.errors.push(new typeErrors_1.InvalidNumberOfArgumentsTypeError(node, expectedTypes.length, args.length));
                return returnType;
            }
            for (var i = 0; i < expectedTypes.length; i++) {
                var node_1 = args[i];
                var actualType_2 = typeCheckAndReturnType(node_1);
                // Get all valid type variable mappings for current argument
                var mappings = getTypeVariableMappings(node_1, actualType_2, expectedTypes[i]);
                // Apply type variable mappings to subsequent argument types and return type
                for (var _c = 0, mappings_1 = mappings; _c < mappings_1.length; _c++) {
                    var mapping = mappings_1[_c];
                    var typeVar = (0, utils_1.tVar)(mapping[0]);
                    var typeToSub = mapping[1];
                    for (var j = i; j < expectedTypes.length; j++) {
                        expectedTypes[j] = substituteVariableTypes(expectedTypes[j], typeVar, typeToSub);
                    }
                    returnType = substituteVariableTypes(returnType, typeVar, typeToSub);
                }
                // Typecheck current argument
                checkForTypeMismatch(node_1, actualType_2, expectedTypes[i]);
            }
            return returnType;
        }
        case 'AssignmentExpression':
            var expectedType = typeCheckAndReturnType(node.left);
            var actualType = typeCheckAndReturnType(node.right);
            if (node.left.type === 'Identifier' && (0, utils_1.lookupDeclKind)(node.left.name, env) === 'const') {
                context.errors.push(new typeErrors_1.ConstNotAssignableTypeError(node, node.left.name));
            }
            checkForTypeMismatch(node, actualType, expectedType);
            return actualType;
        case 'ArrayExpression':
            // Casting is safe here as Source disallows use of spread elements and holes in arrays
            var elements = node.elements.filter(function (elem) {
                return elem !== null && elem.type !== 'SpreadElement';
            });
            if (elements.length !== node.elements.length) {
                throw new internalTypeErrors_1.TypecheckError(node, 'Disallowed array element type');
            }
            if (elements.length === 0) {
                return (0, utils_1.tArray)(utils_1.tAny);
            }
            var elementTypes = elements.map(function (elem) { return typeCheckAndReturnType(elem); });
            return (0, utils_1.tArray)(mergeTypes.apply(void 0, __spreadArray([node], elementTypes, false)));
        case 'MemberExpression':
            var indexType = typeCheckAndReturnType(node.property);
            var objectType = typeCheckAndReturnType(node.object);
            // Typecheck index against number
            if (hasTypeMismatchErrors(node, indexType, utils_1.tNumber)) {
                context.errors.push(new typeErrors_1.InvalidIndexTypeError(node, (0, utils_1.formatTypeString)(indexType, true)));
            }
            // Expression being accessed must be array
            if (objectType.kind !== 'array') {
                context.errors.push(new typeErrors_1.InvalidArrayAccessTypeError(node, (0, utils_1.formatTypeString)(objectType)));
                return utils_1.tAny;
            }
            return objectType.elementType;
        case 'ReturnStatement': {
            if (!node.argument) {
                // Skip typecheck as unspecified literals will be handled by the noImplicitReturnUndefined rule,
                // which is run after typechecking
                return utils_1.tUndef;
            }
            else {
                // Check type only if return type is specified
                var expectedType_3 = lookupTypeAndRemoveForAllAndPredicateTypes(utils_1.RETURN_TYPE_IDENTIFIER);
                if (expectedType_3) {
                    var argumentType = typeCheckAndReturnType(node.argument);
                    checkForTypeMismatch(node, argumentType, expectedType_3);
                    return expectedType_3;
                }
                else {
                    return typeCheckAndReturnType(node.argument);
                }
            }
        }
        case 'WhileStatement': {
            // Typecheck predicate against boolean
            var testType = typeCheckAndReturnType(node.test);
            checkForTypeMismatch(node, testType, utils_1.tBool);
            return typeCheckAndReturnType(node.body);
        }
        case 'ForStatement': {
            // Add new environment so that new variable declared in init node can be isolated to within for statement only
            (0, utils_1.pushEnv)(env);
            if (node.init) {
                typeCheckAndReturnType(node.init);
            }
            if (node.test) {
                // Typecheck predicate against boolean
                var testType = typeCheckAndReturnType(node.test);
                checkForTypeMismatch(node, testType, utils_1.tBool);
            }
            if (node.update) {
                typeCheckAndReturnType(node.update);
            }
            var bodyType = typeCheckAndReturnType(node.body);
            env.pop();
            return bodyType;
        }
        case 'ImportDeclaration':
            // No typechecking needed, import declarations have already been handled separately
            return utils_1.tUndef;
        case 'TSTypeAliasDeclaration':
            // No typechecking needed, type has already been added to environment
            return utils_1.tUndef;
        case 'TSAsExpression':
            var originalType = typeCheckAndReturnType(node.expression);
            var typeToCastTo = getTypeAnnotationType(node);
            var formatAsLiteral = typeContainsLiteralType(originalType) || typeContainsLiteralType(typeToCastTo);
            // Type to cast to must have some overlap with original type
            if (hasTypeMismatchErrors(node, typeToCastTo, originalType)) {
                context.errors.push(new typeErrors_1.TypecastError(node, (0, utils_1.formatTypeString)(originalType, formatAsLiteral), (0, utils_1.formatTypeString)(typeToCastTo, formatAsLiteral)));
            }
            return typeToCastTo;
        case 'TSInterfaceDeclaration':
            throw new internalTypeErrors_1.TypecheckError(node, 'Interface declarations are not allowed');
        default:
            throw new internalTypeErrors_1.TypecheckError(node, 'Unknown node type');
    }
}
/**
 * Adds types for imported functions to the type environment.
 * All imports have their types set to the "any" primitive type.
 */
function handleImportDeclarations(node) {
    var importStmts = node.body.filter(function (stmt) { return stmt.type === 'ImportDeclaration'; });
    if (importStmts.length === 0) {
        return;
    }
    var modules = (0, moduleLoader_1.memoizedGetModuleManifest)();
    var moduleList = Object.keys(modules);
    importStmts.forEach(function (stmt) {
        // Source only uses strings for import source value
        var moduleName = stmt.source.value;
        if (!moduleList.includes(moduleName)) {
            context.errors.push(new moduleErrors_1.ModuleNotFoundError(moduleName, stmt));
        }
        stmt.specifiers.map(function (spec) {
            if (spec.type !== 'ImportSpecifier') {
                throw new internalTypeErrors_1.TypecheckError(stmt, 'Unknown specifier type');
            }
            (0, utils_1.setType)(spec.local.name, utils_1.tAny, env);
        });
    });
}
/**
 * Adds all types for variable/function/type declarations to the current environment.
 * This is so that the types can be referenced before the declarations are initialized.
 * Type checking is not carried out as this function is only responsible for hoisting declarations.
 */
function addTypeDeclarationsToEnvironment(node) {
    node.body.forEach(function (bodyNode) {
        switch (bodyNode.type) {
            case 'FunctionDeclaration':
                if (bodyNode.id === null) {
                    throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
                }
                // Only identifiers/rest elements are used as function params in Source
                var params = bodyNode.params.filter(function (param) {
                    return param.type === 'Identifier' || param.type === 'RestElement';
                });
                if (params.length !== bodyNode.params.length) {
                    throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Unknown function parameter type');
                }
                var fnName = bodyNode.id.name;
                var returnType = getTypeAnnotationType(bodyNode.returnType);
                // If the function has variable number of arguments, set function type as any
                // TODO: Add support for variable number of function arguments
                var hasVarArgs = params.reduce(function (prev, curr) { return prev || curr.type === 'RestElement'; }, false);
                if (hasVarArgs) {
                    (0, utils_1.setType)(fnName, utils_1.tAny, env);
                    break;
                }
                var types = getParamTypes(params);
                // Return type will always be last item in types array
                types.push(returnType);
                var fnType = utils_1.tFunc.apply(void 0, types);
                // Save function type in type env
                (0, utils_1.setType)(fnName, fnType, env);
                break;
            case 'VariableDeclaration':
                if (bodyNode.kind === 'var') {
                    throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Variable declaration using "var" is not allowed');
                }
                if (bodyNode.declarations.length !== 1) {
                    throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Variable declaration should have one and only one declaration');
                }
                if (bodyNode.declarations[0].id.type !== 'Identifier') {
                    throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Variable declaration ID should be an identifier');
                }
                var id = bodyNode.declarations[0].id;
                var expectedType = getTypeAnnotationType(id.typeAnnotation);
                // Save variable type and decl kind in type env
                (0, utils_1.setType)(id.name, expectedType, env);
                (0, utils_1.setDeclKind)(id.name, bodyNode.kind, env);
                break;
            case 'TSTypeAliasDeclaration':
                if (node.type === 'BlockStatement') {
                    throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Type alias declarations may only appear at the top level');
                }
                var alias = bodyNode.id.name;
                if (Object.values(utils_1.typeAnnotationKeywordToBasicTypeMap).includes(alias)) {
                    context.errors.push(new typeErrors_1.TypeAliasNameNotAllowedError(bodyNode, alias));
                    break;
                }
                if ((0, utils_1.lookupTypeAlias)(alias, env) !== undefined) {
                    // Only happens when attempting to declare type aliases that share names with predeclared types (e.g. Pair, List)
                    // Declaration of two type aliases with the same name will be caught as syntax error by parser
                    context.errors.push(new typeErrors_1.DuplicateTypeAliasError(bodyNode, alias));
                    break;
                }
                var type = utils_1.tAny;
                if (bodyNode.typeParameters && bodyNode.typeParameters.params.length > 0) {
                    var typeParams_1 = [];
                    // Check validity of type parameters
                    (0, utils_1.pushEnv)(env);
                    bodyNode.typeParameters.params.forEach(function (param) {
                        if (param.type !== 'TSTypeParameter') {
                            throw new internalTypeErrors_1.TypecheckError(bodyNode, 'Invalid type parameter type');
                        }
                        var name = param.name;
                        if (Object.values(utils_1.typeAnnotationKeywordToBasicTypeMap).includes(name)) {
                            context.errors.push(new typeErrors_1.TypeParameterNameNotAllowedError(param, name));
                            return;
                        }
                        typeParams_1.push((0, utils_1.tVar)(name));
                    });
                    type = (0, utils_1.tForAll)(getTypeAnnotationType(bodyNode), typeParams_1);
                    env.pop();
                }
                else {
                    type = getTypeAnnotationType(bodyNode);
                }
                (0, utils_1.setTypeAlias)(alias, type, env);
                break;
            default:
                break;
        }
    });
}
/**
 * Typechecks the body of a binary expression, adding any type errors to context if necessary.
 * Then, returns the type of the binary expression, inferred based on the operator.
 */
function typeCheckAndReturnBinaryExpressionType(node) {
    var leftType = typeCheckAndReturnType(node.left);
    var rightType = typeCheckAndReturnType(node.right);
    var leftTypeString = (0, utils_1.formatTypeString)(leftType);
    var rightTypeString = (0, utils_1.formatTypeString)(rightType);
    var operator = node.operator;
    switch (operator) {
        case '-':
        case '*':
        case '/':
        case '%':
            // Typecheck both sides against number
            checkForTypeMismatch(node, leftType, utils_1.tNumber);
            checkForTypeMismatch(node, rightType, utils_1.tNumber);
            // Return type number
            return utils_1.tNumber;
        case '+':
            // Typecheck both sides against number or string
            // However, the case where one side is string and other side is number is not allowed
            if (leftTypeString === 'number' || leftTypeString === 'string') {
                checkForTypeMismatch(node, rightType, leftType);
                // If left type is number or string, return left type
                return leftType;
            }
            if (rightTypeString === 'number' || rightTypeString === 'string') {
                checkForTypeMismatch(node, leftType, rightType);
                // If left type is not number or string but right type is number or string, return right type
                return rightType;
            }
            checkForTypeMismatch(node, leftType, (0, utils_1.tUnion)(utils_1.tNumber, utils_1.tString));
            checkForTypeMismatch(node, rightType, (0, utils_1.tUnion)(utils_1.tNumber, utils_1.tString));
            // Return type is number | string if both left and right are neither number nor string
            return (0, utils_1.tUnion)(utils_1.tNumber, utils_1.tString);
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '!==':
        case '===':
            // In Source 3 and above, skip type checking as equality can be applied between two items of any type
            if (context.chapter > 2 && (operator === '===' || operator === '!==')) {
                return utils_1.tBool;
            }
            // Typecheck both sides against number or string
            // However, case where one side is string and other side is number is not allowed
            if (leftTypeString === 'number' || leftTypeString === 'string') {
                checkForTypeMismatch(node, rightType, leftType);
                return utils_1.tBool;
            }
            if (rightTypeString === 'number' || rightTypeString === 'string') {
                checkForTypeMismatch(node, leftType, rightType);
                return utils_1.tBool;
            }
            checkForTypeMismatch(node, leftType, (0, utils_1.tUnion)(utils_1.tNumber, utils_1.tString));
            checkForTypeMismatch(node, rightType, (0, utils_1.tUnion)(utils_1.tNumber, utils_1.tString));
            // Return type boolean
            return utils_1.tBool;
        default:
            throw new internalTypeErrors_1.TypecheckError(node, 'Unknown operator');
    }
}
/**
 * Typechecks the body of an arrow function, adding any type errors to context if necessary.
 * Then, returns the inferred/declared type of the function.
 */
function typeCheckAndReturnArrowFunctionType(node) {
    // Only identifiers/rest elements are used as function params in Source
    var params = node.params.filter(function (param) {
        return param.type === 'Identifier' || param.type === 'RestElement';
    });
    if (params.length !== node.params.length) {
        throw new internalTypeErrors_1.TypecheckError(node, 'Unknown function parameter type');
    }
    var expectedReturnType = getTypeAnnotationType(node.returnType);
    // If the function has variable number of arguments, set function type as any
    // TODO: Add support for variable number of function arguments
    var hasVarArgs = params.reduce(function (prev, curr) { return prev || curr.type === 'RestElement'; }, false);
    if (hasVarArgs) {
        return utils_1.tAny;
    }
    // Typecheck function body, creating new environment to store arg types and return type
    (0, utils_1.pushEnv)(env);
    params.forEach(function (param) {
        (0, utils_1.setType)(param.name, getTypeAnnotationType(param.typeAnnotation), env);
    });
    // Set unique identifier so that typechecking can be carried out for return statements
    (0, utils_1.setType)(utils_1.RETURN_TYPE_IDENTIFIER, expectedReturnType, env);
    var actualReturnType = typeCheckAndReturnType(node.body);
    env.pop();
    if ((0, lodash_1.isEqual)(actualReturnType, utils_1.tVoid) &&
        !(0, lodash_1.isEqual)(expectedReturnType, utils_1.tAny) &&
        !(0, lodash_1.isEqual)(expectedReturnType, utils_1.tVoid)) {
        // Type error where function does not return anything when it should
        context.errors.push(new typeErrors_1.FunctionShouldHaveReturnValueError(node));
    }
    else {
        checkForTypeMismatch(node, actualReturnType, expectedReturnType);
    }
    var types = getParamTypes(params);
    // Return type will always be last item in types array
    types.push(node.returnType ? expectedReturnType : actualReturnType);
    return utils_1.tFunc.apply(void 0, types);
}
/**
 * Recurses through the two given types and returns an array of tuples
 * that map type variable names to the type to substitute.
 */
function getTypeVariableMappings(node, actualType, expectedType) {
    // If type variable mapping is found, terminate early
    if (expectedType.kind === 'variable') {
        return [[expectedType.name, actualType]];
    }
    // If actual type is a type reference, expand type first
    if (actualType.kind === 'variable') {
        actualType = lookupTypeAliasAndRemoveForAllTypes(node, actualType);
    }
    var mappings = [];
    switch (expectedType.kind) {
        case 'pair':
            if (actualType.kind === 'list') {
                if (actualType.typeAsPair !== undefined) {
                    mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.typeAsPair.headType, expectedType.headType));
                    mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.typeAsPair.tailType, expectedType.tailType));
                }
                else {
                    mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.elementType, expectedType.headType));
                    mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.elementType, expectedType.tailType));
                }
            }
            if (actualType.kind === 'pair') {
                mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.headType, expectedType.headType));
                mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.tailType, expectedType.tailType));
            }
            break;
        case 'list':
            if (actualType.kind === 'list') {
                mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.elementType, expectedType.elementType));
            }
            break;
        case 'function':
            if (actualType.kind === 'function' &&
                actualType.parameterTypes.length === expectedType.parameterTypes.length) {
                for (var i = 0; i < actualType.parameterTypes.length; i++) {
                    mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.parameterTypes[i], expectedType.parameterTypes[i]));
                }
                mappings.push.apply(mappings, getTypeVariableMappings(node, actualType.returnType, expectedType.returnType));
            }
            break;
        default:
            break;
    }
    return mappings;
}
/**
 * Checks if the actual type matches the expected type.
 * If not, adds type mismatch error to context.
 */
function checkForTypeMismatch(node, actualType, expectedType) {
    var formatAsLiteral = typeContainsLiteralType(expectedType) || typeContainsLiteralType(actualType);
    if (hasTypeMismatchErrors(node, actualType, expectedType)) {
        context.errors.push(new typeErrors_1.TypeMismatchError(node, (0, utils_1.formatTypeString)(actualType, formatAsLiteral), (0, utils_1.formatTypeString)(expectedType, formatAsLiteral)));
    }
}
/**
 * Returns true if given type contains literal type, false otherwise.
 * This is necessary to determine whether types should be formatted as
 * literal type or primitive type in error messages.
 */
function typeContainsLiteralType(type) {
    switch (type.kind) {
        case 'primitive':
        case 'variable':
            return false;
        case 'literal':
            return true;
        case 'function':
            return (typeContainsLiteralType(type.returnType) ||
                type.parameterTypes.reduce(function (prev, curr) { return prev || typeContainsLiteralType(curr); }, false));
        case 'union':
            return type.types.reduce(function (prev, curr) { return prev || typeContainsLiteralType(curr); }, false);
        default:
            return false;
    }
}
/**
 * Returns true if the actual type and the expected type do not match, false otherwise.
 * The two types will not match if the intersection of the two types is empty.
 *
 * @param node Current node being checked
 * @param actualType Type being checked
 * @param expectedType Type the actual type is being checked against
 * @param visitedTypeAliasesForActualType Array that keeps track of previously encountered type aliases
 * for actual type to prevent infinite recursion
 * @param visitedTypeAliasesForExpectedType Array that keeps track of previously encountered type aliases
 * for expected type to prevent infinite recursion
 * @param skipTypeAliasExpansion If true, type aliases are not expanded (e.g. in type alias declarations)
 * @returns true if the actual type and the expected type do not match, false otherwise
 */
function hasTypeMismatchErrors(node, actualType, expectedType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion) {
    var _a;
    if (visitedTypeAliasesForActualType === void 0) { visitedTypeAliasesForActualType = []; }
    if (visitedTypeAliasesForExpectedType === void 0) { visitedTypeAliasesForExpectedType = []; }
    if (skipTypeAliasExpansion === void 0) { skipTypeAliasExpansion = false; }
    if ((0, lodash_1.isEqual)(actualType, utils_1.tAny) || (0, lodash_1.isEqual)(expectedType, utils_1.tAny)) {
        // Exit early as "any" is guaranteed not to cause type mismatch errors
        return false;
    }
    if (expectedType.kind !== 'variable' && actualType.kind === 'variable') {
        // If the expected type is not a variable type but the actual type is a variable type,
        // Swap the order of the types around
        // This removes the need to check if the actual type is a variable type in all of the switch cases
        return hasTypeMismatchErrors(node, expectedType, actualType, visitedTypeAliasesForExpectedType, visitedTypeAliasesForActualType, skipTypeAliasExpansion);
    }
    if (expectedType.kind !== 'union' && actualType.kind === 'union') {
        // If the expected type is not a union type but the actual type is a union type,
        // Check if the expected type matches any of the actual types
        // This removes the need to check if the actual type is a union type in all of the switch cases
        return !containsType(node, actualType.types, expectedType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType);
    }
    switch (expectedType.kind) {
        case 'variable':
            if (actualType.kind === 'variable') {
                // If both are variable types, types match if both name and type arguments match
                if (expectedType.name === actualType.name) {
                    if (expectedType.typeArgs === undefined || expectedType.typeArgs.length === 0) {
                        return actualType.typeArgs === undefined ? false : actualType.typeArgs.length !== 0;
                    }
                    if (((_a = actualType.typeArgs) === null || _a === void 0 ? void 0 : _a.length) !== expectedType.typeArgs.length) {
                        return true;
                    }
                    for (var i = 0; i < expectedType.typeArgs.length; i++) {
                        if (hasTypeMismatchErrors(node, actualType.typeArgs[i], expectedType.typeArgs[i], visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion)) {
                            return true;
                        }
                    }
                    return false;
                }
            }
            for (var _i = 0, visitedTypeAliasesForExpectedType_1 = visitedTypeAliasesForExpectedType; _i < visitedTypeAliasesForExpectedType_1.length; _i++) {
                var visitedType = visitedTypeAliasesForExpectedType_1[_i];
                if ((0, lodash_1.isEqual)(visitedType, expectedType)) {
                    // Circular dependency, treat as type mismatch
                    return true;
                }
            }
            // Skips expansion, treat as type mismatch
            if (skipTypeAliasExpansion) {
                return true;
            }
            visitedTypeAliasesForExpectedType.push(expectedType);
            // Expand type and continue typechecking
            var aliasType = lookupTypeAliasAndRemoveForAllTypes(node, expectedType);
            return hasTypeMismatchErrors(node, actualType, aliasType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
        case 'primitive':
            if (actualType.kind === 'literal') {
                return expectedType.value === undefined
                    ? typeof actualType.value !== expectedType.name
                    : actualType.value !== expectedType.value;
            }
            if (actualType.kind !== 'primitive') {
                return true;
            }
            return actualType.name !== expectedType.name;
        case 'function':
            if (actualType.kind !== 'function') {
                return true;
            }
            // Check parameter types
            var actualParamTypes = actualType.parameterTypes;
            var expectedParamTypes = expectedType.parameterTypes;
            if (actualParamTypes.length !== expectedParamTypes.length) {
                return true;
            }
            for (var i = 0; i < actualType.parameterTypes.length; i++) {
                // Note that actual and expected types are swapped here
                // to simulate contravariance for function parameter types
                // This will be useful if type checking in Source Typed were to be made stricter in the future
                if (hasTypeMismatchErrors(node, expectedParamTypes[i], actualParamTypes[i], visitedTypeAliasesForExpectedType, visitedTypeAliasesForActualType, skipTypeAliasExpansion)) {
                    return true;
                }
            }
            // Check return type
            return hasTypeMismatchErrors(node, actualType.returnType, expectedType.returnType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
        case 'union':
            // If actual type is not union type, check if actual type matches one of the expected types
            if (actualType.kind !== 'union') {
                return !containsType(node, expectedType.types, actualType);
            }
            // If both are union types, there are no type errors as long as one of the types match
            for (var _b = 0, _c = actualType.types; _b < _c.length; _b++) {
                var type = _c[_b];
                if (containsType(node, expectedType.types, type)) {
                    return false;
                }
            }
            return true;
        case 'literal':
            if (actualType.kind !== 'literal' && actualType.kind !== 'primitive') {
                return true;
            }
            if (actualType.kind === 'primitive' && actualType.value === undefined) {
                return actualType.name !== typeof expectedType.value;
            }
            return actualType.value !== expectedType.value;
        case 'pair':
            if (actualType.kind === 'list') {
                // Special case, as lists are pairs
                if (actualType.typeAsPair !== undefined) {
                    // If pair representation of list is present, check against pair type
                    return hasTypeMismatchErrors(node, actualType.typeAsPair, expectedType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
                }
                // Head of pair should match list element type; tail of pair should match list type
                return (hasTypeMismatchErrors(node, actualType.elementType, expectedType.headType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion) ||
                    hasTypeMismatchErrors(node, actualType, expectedType.tailType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion));
            }
            if (actualType.kind !== 'pair') {
                return true;
            }
            return (hasTypeMismatchErrors(node, actualType.headType, expectedType.headType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion) ||
                hasTypeMismatchErrors(node, actualType.tailType, expectedType.tailType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion));
        case 'list':
            if ((0, lodash_1.isEqual)(actualType, utils_1.tNull)) {
                // Null matches against any list type as null is empty list
                return false;
            }
            if (actualType.kind === 'pair') {
                // Special case, as pairs can be lists
                if (expectedType.typeAsPair !== undefined) {
                    // If pair representation of list is present, check against pair type
                    return hasTypeMismatchErrors(node, actualType, expectedType.typeAsPair, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
                }
                // Head of pair should match list element type; tail of pair should match list type
                return (hasTypeMismatchErrors(node, actualType.headType, expectedType.elementType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion) ||
                    hasTypeMismatchErrors(node, actualType.tailType, expectedType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion));
            }
            if (actualType.kind !== 'list') {
                return true;
            }
            return hasTypeMismatchErrors(node, actualType.elementType, expectedType.elementType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
        case 'array':
            if (actualType.kind === 'union') {
                // Special case: number[] | string[] matches with (number | string)[]
                var types = actualType.types.filter(function (type) { return type.kind === 'array'; });
                if (types.length !== actualType.types.length) {
                    return true;
                }
                var combinedType = types.map(function (type) { return type.elementType; });
                return hasTypeMismatchErrors(node, utils_1.tUnion.apply(void 0, combinedType), expectedType.elementType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
            }
            if (actualType.kind !== 'array') {
                return true;
            }
            return hasTypeMismatchErrors(node, actualType.elementType, expectedType.elementType, visitedTypeAliasesForActualType, visitedTypeAliasesForExpectedType, skipTypeAliasExpansion);
        default:
            return true;
    }
}
/**
 * Converts type annotation/type alias declaration node to its corresponding type representation in Source.
 * If no type annotation exists, returns the "any" primitive type.
 */
function getTypeAnnotationType(annotationNode) {
    if (!annotationNode) {
        return utils_1.tAny;
    }
    return getAnnotatedType(annotationNode.typeAnnotation);
}
/**
 * Converts type node to its corresponding type representation in Source.
 */
function getAnnotatedType(typeNode) {
    switch (typeNode.type) {
        case 'TSFunctionType':
            var params = typeNode.parameters;
            // If the function has variable number of arguments, set function type as any
            // TODO: Add support for variable number of function arguments
            var hasVarArgs = params.reduce(function (prev, curr) { return prev || curr.type === 'RestElement'; }, false);
            if (hasVarArgs) {
                return utils_1.tAny;
            }
            var fnTypes = getParamTypes(params);
            // Return type will always be last item in types array
            fnTypes.push(getTypeAnnotationType(typeNode.typeAnnotation));
            return utils_1.tFunc.apply(void 0, fnTypes);
        case 'TSLiteralType':
            var value = typeNode.literal.value;
            if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                throw new internalTypeErrors_1.TypecheckError(typeNode, 'Unknown literal type');
            }
            return (0, utils_1.tLiteral)(value);
        case 'TSArrayType':
            return (0, utils_1.tArray)(getAnnotatedType(typeNode.elementType));
        case 'TSUnionType':
            var unionTypes = typeNode.types.map(function (node) { return getAnnotatedType(node); });
            return mergeTypes.apply(void 0, __spreadArray([typeNode], unionTypes, false));
        case 'TSIntersectionType':
            throw new internalTypeErrors_1.TypecheckError(typeNode, 'Intersection types are not allowed');
        case 'TSTypeReference':
            var name_2 = typeNode.typeName.name;
            // Save name and type arguments in variable type
            if (typeNode.typeParameters) {
                var typesToSub = [];
                for (var _i = 0, _a = typeNode.typeParameters.params; _i < _a.length; _i++) {
                    var paramNode = _a[_i];
                    if (paramNode.type === 'TSTypeParameter') {
                        throw new internalTypeErrors_1.TypecheckError(typeNode, 'Type argument should not be type parameter');
                    }
                    typesToSub.push(getAnnotatedType(paramNode));
                }
                return (0, utils_1.tVar)(name_2, typesToSub);
            }
            return (0, utils_1.tVar)(name_2);
        case 'TSParenthesizedType':
            return getAnnotatedType(typeNode.typeAnnotation);
        default:
            return getBasicType(typeNode);
    }
}
/**
 * Converts an array of function parameters into an array of types.
 */
function getParamTypes(params) {
    return params.map(function (param) { return getTypeAnnotationType(param.typeAnnotation); });
}
/**
 * Returns the head type of the input type.
 */
function getHeadType(node, type) {
    switch (type.kind) {
        case 'pair':
            return type.headType;
        case 'list':
            return type.elementType;
        case 'union':
            return utils_1.tUnion.apply(void 0, type.types.map(function (type) { return getHeadType(node, type); }));
        case 'variable':
            return getHeadType(node, lookupTypeAliasAndRemoveForAllTypes(node, type));
        default:
            return type;
    }
}
/**
 * Returns the tail type of the input type.
 */
function getTailType(node, type) {
    switch (type.kind) {
        case 'pair':
            return type.tailType;
        case 'list':
            return (0, utils_1.tList)(type.elementType, type.typeAsPair && type.typeAsPair.tailType.kind === 'pair'
                ? type.typeAsPair.tailType
                : undefined);
        case 'union':
            return utils_1.tUnion.apply(void 0, type.types.map(function (type) { return getTailType(node, type); }));
        case 'variable':
            return getTailType(node, lookupTypeAliasAndRemoveForAllTypes(node, type));
        default:
            return type;
    }
}
/**
 * Converts node type to basic type, adding errors to context if disallowed/unknown types are used.
 * If errors are found, returns the "any" type to prevent throwing of further errors.
 */
function getBasicType(node) {
    var _a;
    var basicType = (_a = utils_1.typeAnnotationKeywordToBasicTypeMap[node.type]) !== null && _a !== void 0 ? _a : 'unknown';
    if (types_1.disallowedTypes.includes(basicType) ||
        (context.chapter === 1 && basicType === 'null')) {
        context.errors.push(new typeErrors_1.TypeNotAllowedError(node, basicType));
        return utils_1.tAny;
    }
    return (0, utils_1.tPrimitive)(basicType);
}
/**
 * Wrapper function for lookupTypeAlias that removes forall and predicate types.
 * Predicate types are substituted with the function type that takes in 1 argument and returns a boolean.
 * For forall types, the poly type is returned.
 */
function lookupTypeAndRemoveForAllAndPredicateTypes(name) {
    var type = (0, utils_1.lookupType)(name, env);
    if (!type) {
        return undefined;
    }
    if (type.kind === 'forall') {
        if (type.polyType.kind !== 'function') {
            // Skip typecheck as function has variable number of arguments;
            // this only occurs for certain prelude functions
            // TODO: Add support for functions with variable number of arguments
            return utils_1.tAny;
        }
        // Clone type so that original type is not modified
        return (0, lodash_1.cloneDeep)(type.polyType);
    }
    if (type.kind === 'predicate') {
        // All predicate functions (e.g. is_number)
        // take in 1 parameter and return a boolean
        return (0, utils_1.tFunc)(utils_1.tAny, utils_1.tBool);
    }
    return type;
}
/**
 * Wrapper function for lookupTypeAlias that removes forall and predicate types.
 * An error is thrown for predicate types as type aliases should not ever be predicate types.
 * For forall types, the given type arguments are substituted into the poly type,
 * and the resulting type is returned.
 */
function lookupTypeAliasAndRemoveForAllTypes(node, varType) {
    var _a;
    // Check if type alias exists
    var aliasType = (0, utils_1.lookupTypeAlias)(varType.name, env);
    if (!aliasType) {
        context.errors.push(new typeErrors_1.TypeNotFoundError(node, varType.name));
        return utils_1.tAny;
    }
    // If type saved in type environment is not generic,
    // given variable type should not have type arguments
    if (aliasType.kind !== 'forall') {
        if (varType.typeArgs !== undefined && varType.typeArgs.length > 0) {
            context.errors.push(new typeErrors_1.TypeNotGenericError(node, varType.name));
            return utils_1.tAny;
        }
        return aliasType;
    }
    // Check type parameters
    if (aliasType.typeParams === undefined) {
        if (varType.typeArgs !== undefined && varType.typeArgs.length > 0) {
            context.errors.push(new typeErrors_1.TypeNotGenericError(node, varType.name));
        }
        return utils_1.tAny;
    }
    if (((_a = varType.typeArgs) === null || _a === void 0 ? void 0 : _a.length) !== aliasType.typeParams.length) {
        context.errors.push(new typeErrors_1.InvalidNumberOfTypeArgumentsForGenericTypeError(node, varType.name, aliasType.typeParams.length));
        return utils_1.tAny;
    }
    // Clone type to prevent modifying generic type saved in type env
    var polyType = (0, lodash_1.cloneDeep)(aliasType.polyType);
    // Substitute all type parameters with type arguments
    for (var i = 0; i < varType.typeArgs.length; i++) {
        polyType = substituteVariableTypes(polyType, aliasType.typeParams[i], varType.typeArgs[i]);
    }
    return polyType;
}
/**
 * Recurses through the given type and returns a new type
 * with all variable types that match the given type variable substituted with the type to substitute.
 */
function substituteVariableTypes(type, typeVar, typeToSub) {
    switch (type.kind) {
        case 'primitive':
        case 'literal':
            return type;
        case 'variable':
            if ((0, lodash_1.isEqual)(type, typeVar)) {
                return typeToSub;
            }
            if (type.typeArgs !== undefined) {
                for (var i = 0; i < type.typeArgs.length; i++) {
                    if ((0, lodash_1.isEqual)(type.typeArgs[i], typeVar)) {
                        type.typeArgs[i] = typeToSub;
                    }
                }
            }
            return type;
        case 'function':
            var types = type.parameterTypes.map(function (param) {
                return substituteVariableTypes(param, typeVar, typeToSub);
            });
            types.push(substituteVariableTypes(type.returnType, typeVar, typeToSub));
            return utils_1.tFunc.apply(void 0, types);
        case 'union':
            return utils_1.tUnion.apply(void 0, type.types.map(function (type) { return substituteVariableTypes(type, typeVar, typeToSub); }));
        case 'pair':
            return (0, utils_1.tPair)(substituteVariableTypes(type.headType, typeVar, typeToSub), substituteVariableTypes(type.tailType, typeVar, typeToSub));
        case 'list':
            return (0, utils_1.tList)(substituteVariableTypes(type.elementType, typeVar, typeToSub), type.typeAsPair && substituteVariableTypes(type.typeAsPair, typeVar, typeToSub));
        case 'array':
            return (0, utils_1.tArray)(substituteVariableTypes(type.elementType, typeVar, typeToSub));
        default:
            return type;
    }
}
/**
 * Combines all types provided in the parameters into one, removing duplicate types in the process.
 * Type aliases encountered are not expanded as it is sufficient to compare the variable types at name level without expanding them;
 * in fact, expanding type aliases here would lead to type aliases with circular dependencies being incorrectly flagged as not declared.
 */
function mergeTypes(node) {
    var types = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        types[_i - 1] = arguments[_i];
    }
    var mergedTypes = [];
    for (var _a = 0, types_2 = types; _a < types_2.length; _a++) {
        var currType = types_2[_a];
        if ((0, lodash_1.isEqual)(currType, utils_1.tAny)) {
            return utils_1.tAny;
        }
        if (currType.kind === 'union') {
            for (var _b = 0, _c = currType.types; _b < _c.length; _b++) {
                var type = _c[_b];
                if (!containsType(node, mergedTypes, type, [], [], true)) {
                    mergedTypes.push(type);
                }
            }
        }
        else {
            if (!containsType(node, mergedTypes, currType, [], [], true)) {
                mergedTypes.push(currType);
            }
        }
    }
    if (mergedTypes.length === 1) {
        return mergedTypes[0];
    }
    return utils_1.tUnion.apply(void 0, mergedTypes);
}
/**
 * Checks if a type exists in an array of types.
 */
function containsType(node, arr, typeToCheck, visitedTypeAliasesForTypes, visitedTypeAliasesForTypeToCheck, skipTypeAliasExpansion) {
    if (visitedTypeAliasesForTypes === void 0) { visitedTypeAliasesForTypes = []; }
    if (visitedTypeAliasesForTypeToCheck === void 0) { visitedTypeAliasesForTypeToCheck = []; }
    if (skipTypeAliasExpansion === void 0) { skipTypeAliasExpansion = false; }
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var type = arr_1[_i];
        if (!hasTypeMismatchErrors(node, typeToCheck, type, visitedTypeAliasesForTypeToCheck, visitedTypeAliasesForTypes, skipTypeAliasExpansion)) {
            return true;
        }
    }
    return false;
}
/**
 * Traverses through the program and removes all TS-related nodes, returning the result.
 */
function removeTSNodes(node) {
    if (node === undefined || node === null) {
        return node;
    }
    var type = node.type;
    switch (type) {
        case 'Literal':
        case 'Identifier': {
            return node;
        }
        case 'Program':
        case 'BlockStatement': {
            var newBody_1 = [];
            node.body.forEach(function (stmt) {
                var type = stmt.type;
                if (type.startsWith('TS')) {
                    switch (type) {
                        case 'TSAsExpression':
                            newBody_1.push(removeTSNodes(stmt));
                            break;
                        default:
                            // Remove node from body
                            break;
                    }
                }
                else {
                    newBody_1.push(removeTSNodes(stmt));
                }
            });
            node.body = newBody_1;
            return node;
        }
        case 'ExpressionStatement': {
            node.expression = removeTSNodes(node.expression);
            return node;
        }
        case 'ConditionalExpression':
        case 'IfStatement': {
            node.test = removeTSNodes(node.test);
            node.consequent = removeTSNodes(node.consequent);
            node.alternate = removeTSNodes(node.alternate);
            return node;
        }
        case 'UnaryExpression':
        case 'RestElement':
        case 'SpreadElement':
        case 'ReturnStatement': {
            node.argument = removeTSNodes(node.argument);
            return node;
        }
        case 'BinaryExpression':
        case 'LogicalExpression':
        case 'AssignmentExpression': {
            node.left = removeTSNodes(node.left);
            node.right = removeTSNodes(node.right);
            return node;
        }
        case 'ArrowFunctionExpression':
        case 'FunctionDeclaration':
            node.body = removeTSNodes(node.body);
            return node;
        case 'VariableDeclaration': {
            node.declarations[0].init = removeTSNodes(node.declarations[0].init);
            return node;
        }
        case 'CallExpression': {
            node.arguments = node.arguments.map(removeTSNodes);
            return node;
        }
        case 'ArrayExpression':
            // Casting is safe here as Source disallows use of spread elements and holes in arrays
            node.elements = node.elements.map(removeTSNodes);
            return node;
        case 'MemberExpression':
            node.property = removeTSNodes(node.property);
            node.object = removeTSNodes(node.object);
            return node;
        case 'WhileStatement': {
            node.test = removeTSNodes(node.test);
            node.body = removeTSNodes(node.body);
            return node;
        }
        case 'ForStatement': {
            node.init = removeTSNodes(node.init);
            node.test = removeTSNodes(node.test);
            node.update = removeTSNodes(node.update);
            node.body = removeTSNodes(node.body);
            return node;
        }
        case 'TSAsExpression':
            // Remove wrapper node
            return removeTSNodes(node.expression);
        default:
            // Remove all other TS nodes
            return type.startsWith('TS') ? undefined : node;
    }
}
exports.removeTSNodes = removeTSNodes;
