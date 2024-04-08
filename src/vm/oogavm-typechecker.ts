import { pair, head, tail, unparse } from '../utils/utils.js';
import debug from 'debug';
import {
    AnyType,
    BooleanType,
    FunctionType,
    IntegerType,
    NullType,
    StructType,
    StructField,
    MethodType,
    is_type,
    equal_type,
    StringType,
    Type,
    ReturnType,
    ArrayType,
    FloatType,
} from './oogavm-types.js';
import assert from 'assert';
import { TypecheckError } from './oogavm-errors.js';
import { Null } from './oogavm-heap.js';

const log = debug('ooga:typechecker');

let StructTable = new Map<string, StructType>();

function is_integer(x) {
    return typeof x === 'number' && Number.isInteger(x);
}

function is_float(x) {
    return typeof x === 'number';
}

function is_boolean(x) {
    return typeof x === 'boolean';
}

function is_null(x) {
    return x === null;
}

function is_string(x) {
    return typeof x === 'string';
}

const unparse_types = t => {
    return JSON.stringify(t, null, 2);
};

const unary_arith_type = [
    new FunctionType([new IntegerType()], new IntegerType()),
    new FunctionType([new FloatType()], new FloatType()),
];

const binary_arith_type = new FunctionType(
    [new IntegerType(), new IntegerType()],
    new IntegerType()
);

// TODO: This is abit annoying and error-prone - is there a better way to do this?
const number_comparison_type = [
    new FunctionType([new IntegerType(), new IntegerType()], new BooleanType()),
    new FunctionType([new FloatType(), new FloatType()], new BooleanType()),
    new FunctionType([new IntegerType(), new FloatType()], new BooleanType()),
    new FunctionType([new FloatType(), new IntegerType()], new BooleanType()),
];

const binary_bool_type = new FunctionType(
    [new BooleanType(), new BooleanType()],
    new BooleanType()
);

const unary_bool_type = new FunctionType([new BooleanType()], new BooleanType());

const binary_equal_type = new FunctionType([new AnyType(), new AnyType()], new BooleanType());

const binary_add_type = [
    new FunctionType([new StringType(), new StringType()], new StringType()),
    new FunctionType([new IntegerType(), new IntegerType()], new IntegerType()),
    new FunctionType([new FloatType(), new FloatType()], new FloatType()),
    new FunctionType([new IntegerType(), new FloatType()], new FloatType()),
    new FunctionType([new FloatType(), new IntegerType()], new FloatType()),
];

const global_type_frame = {
    '+': binary_add_type,
    '-': binary_arith_type,
    '*': binary_arith_type,
    '/': binary_arith_type,
    '<': number_comparison_type,
    '>': number_comparison_type,
    '<=': number_comparison_type,
    '>=': number_comparison_type,
    '&&': binary_bool_type,
    '||': binary_bool_type,
    '-unary': unary_arith_type,
    '!': unary_bool_type,
    '++': unary_arith_type,
    '--': unary_arith_type,
    '==': binary_equal_type,
    print: new FunctionType([new AnyType()], new NullType()),
};

// A type environment is null or a pair
// whose head is a frame and whose tail
// is a type environment.
const empty_type_environment = null;
const global_type_environment = pair(global_type_frame, empty_type_environment);

const lookup_type = (x, e) => {
    if (e === null) {
        throw new TypecheckError('unbound name: ' + x);
    }
    if (head(e).hasOwnProperty(x)) {
        return head(e)[x];
    }
    return lookup_type(x, tail(e));
};

const extend_type_environment = (xs, ts: Type[], e) => {
    if (ts.length > xs.length)
        throw new TypecheckError('too few parameters in function declaration');
    if (ts.length < xs.length)
        throw new TypecheckError('too many parameters in function declaration');
    if (xs.length === 0) return e;
    const new_frame = {};
    for (let i = 0; i < xs.length; i++) new_frame[xs[i]] = ts[i];
    return pair(new_frame, e);
};

const extend_current_type_environment = (xs, ts: Type[], e) => {
    if (ts.length > xs.length)
        throw new TypecheckError('too few parameters in function declaration');
    if (ts.length < xs.length)
        throw new TypecheckError('too many parameters in function declaration');
    // add the types to the current frame
    for (let i = 0; i < xs.length; i++) head(e)[xs[i]] = ts[i];
    return e;
};

let in_func = false;
let expected_ret;

function getType(t) {
    log('getType: ', t);
    if (is_type(t.type, Type)) {
        log('Exiting getType, found Type');
        return t.type;
    }

    if (t.type === 'Function') {
        log('Exiting getType, returning FunctionType');
        t.type = new FunctionType(
            t.params.map(p => getType(p)),
            getType(t.ret)
        );
        return t.type;
    } else if (t.type === 'Method') {
        log('Exiting getType, returning MethodType');
        t.receiver.type = getType(t.receiver);
        if (!is_type(t.receiver.type, StructType)) {
            throw new TypecheckError('expected struct type');
        }

        const methodType = new MethodType(
            t.id.name,
            t.params.map(p => getType(p)),
            getType(t.ret)
        );

        t.receiver.type.methods.push(methodType);
        t.type = methodType;
        return t.type;
    } else if (t.type === 'Integer') {
        log('Exiting getType, returning IntegerType');
        t.type = new IntegerType();
        return new IntegerType();
    } else if (t.type === 'Float') {
        log('Exiting getType, returning FloatType');
        t.type = new FloatType();
        return new FloatType();
    } else if (t.type === 'Boolean') {
        log('Exiting getType, returning BooleanType');
        t.type = new BooleanType();
        return new BooleanType();
    } else if (t.type === 'String') {
        log('Exiting getType, returning StringType');
        t.type = new StringType();
        return new StringType();
    } else if (t.type === 'Null') {
        log('Exiting getType, returning NullType');
        t.type = new NullType();
        return new NullType();
    } else if (t.type === 'Any') {
        log('Exiting getType, returning AnyType');
        t.type = new AnyType();
        return new AnyType();
    } else if (t.type.tag === 'Struct') {
        // Ensure that the struct is defined
        if (!StructTable.has(t.type.name)) {
            throw new TypecheckError('struct ' + t.type.name + ' not found');
        }
        t.type = StructTable.get(t.type.name);
        log('Exiting getType, returning StructType, ', t.type);
        return t.type;
    } else if (t.type.tag === 'Array') {
        t.type = new ArrayType(getType(t.type.elementType), t.type.length, t.type.is_bound);
        return t.type;
    }

    throw new TypecheckError('Unknown type: ' + t.type);
}
/**
 * Represents a collection of type checking functions for different AST node types.
 * Each property of this object corresponds to a specific AST node type, and its value is a type checking function for that node type.
 * The type checking function takes in two parameters: `comp` (the AST node to be type checked) and `te` (the type environment).
 * It returns the inferred type of the AST node.
 */
const type_comp = {
    Integer: (comp, te) => {
        if (!is_integer(comp.value)) {
            throw new TypecheckError('expected integer, got ' + comp.value);
        }

        comp.type = new IntegerType();
        return new IntegerType();
    },
    Float: (comp, te) => {
        if (!is_float(comp.value)) {
            throw new TypecheckError('expected float, got ' + comp.value);
        }

        comp.type = new FloatType();
        return new FloatType();
    },
    Boolean: (comp, te) => {
        if (!is_boolean(comp.value)) {
            throw new TypecheckError('expected boolean, got ' + comp.value);
        }

        comp.type = new BooleanType();
        return new BooleanType();
    },
    String: (comp, te) => {
        if (!is_string(comp.value)) {
            throw new TypecheckError('expected string, got ' + comp.value);
        }

        comp.type = new StringType();
        return new StringType();
    },
    Null: (comp, te) => {
        if (!is_null(comp.value)) {
            throw new TypecheckError('expected null, got ' + comp.value);
        }

        comp.type = new NullType();
        return new NullType();
    },
    ArraySliceLiteral: (comp, te) => {
        log('ArraySliceLiteral');
        comp.type = getType(comp);
        log(unparse(comp));
        if (comp.elements.length != comp.type.length) {
            throw new TypecheckError(
                'Array expected ' + comp.type.length + ' elements, got ' + comp.elements.length
            );
        }

        const expected_type = comp.type.elem_type;
        for (let i = 0; i < comp.elements.length; i++) {
            const elem_type = type(comp.elements[i], te);
            if (!equal_type(elem_type, expected_type)) {
                throw new TypecheckError(
                    'Expected element type: ' +
                        unparse_types(comp.type.elem_type) +
                        ', got ' +
                        unparse_types(elem_type)
                );
            }
        }

        return comp.type;
    },
    Name: (comp, te) => {
        log('Name');
        log(unparse(comp));
        let ret_type = lookup_type(comp.name, te);
        comp.type = ret_type;
        log('Exiting Name, returning', unparse(ret_type));
        return ret_type;
    },
    BlockStatement: (comp, te) => {
        log('BlockStatement');
        log(unparse(comp));
        // Scan out declarations
        // Order of scanning is important
        // We should do the following in order:
        // 1. Struct declarations - these don't actually have to put anything in the type environment, we just
        // 2. Separate out known type declarations (VariableDeclaration, ConstantDeclaration, FunctionDeclaration, MethodDeclaration)
        // 3. Assign each of these and their constituent expressions to their respective types
        // 4. Separate out unknown type declarations
        // 5. Assign each of these and their constituent expressions to their respective types - these types should be set dynamically

        // NOTE: here we only set the "supposed" type of the declarations, as defined by the programmer
        const struct_decls = comp.body.body.filter(comp => comp.tag === 'StructDeclaration');
        for (let i = 0; i < struct_decls.length; i++) {
            const comp = struct_decls[i];
            const structName = comp.id.name;
            // log('StructDeclaration for', structName);
            // Check that the struct name is unique
            if (StructTable.has(structName)) {
                throw new TypecheckError('struct ' + struct_decls[i].id.name + ' already declared');
            }

            const struct_t = new StructType(structName, []);
            comp.type = struct_t;
            StructTable.set(structName, struct_t);

            // We now can set the fields of the struct. We do this now to allow for recursive struct definitions
            const fields = comp.fields.map(f => new StructField(f.name.name, getType(f)));
            // log('Fields for struct', structName);
            // log(fields);
            struct_t.fields = fields;

            // log('StructDeclaration Comp:', unparse(comp));
        }

        const decls = comp.body.body.filter(
            comp =>
                comp.tag === 'VariableDeclaration' ||
                comp.tag === 'FunctionDeclaration' ||
                comp.tag === 'ConstantDeclaration' ||
                comp.tag === 'MethodDeclaration'
        );

        const decls_known_type = decls.filter(comp => comp.type !== 'Unknown');

        const extended_te = extend_type_environment(
            decls_known_type.map(comp => comp.id.name),
            decls_known_type.map(comp => {
                // log('Setting known type for', comp.id.name);
                comp.type = getType(comp);
                return comp.type;
            }),
            te
        );

        // log('Comp after setting known types');
        // log(unparse(comp));
        // log('Extended type environment');
        // log(JSON.stringify(extended_te));
        const decls_unknown_type = decls.filter(comp => comp.type === 'Unknown');
        // log('Unknown type declarations');
        // log(unparse(decls_unknown_type));
        let extended_te2 = extended_te;
        // We have to use a for loop here because one unknown type declaration can depend on another
        for (let i = 0; i < decls_unknown_type.length; i++) {
            // log('Setting unknown type for', decls_unknown_type[i].id.name);
            const t = type(decls_unknown_type[i].expression, extended_te2);
            decls_unknown_type[i].type = t;
            extended_te2 = extend_current_type_environment(
                [decls_unknown_type[i].id.name],
                [t],
                extended_te2
            );
        }

        // log('Extended type environment 2');
        // log(JSON.stringify(extended_te2, null, 2));
        const ret_type = type(comp.body, extended_te2);
        log('Exiting BlockStatement, returning', ret_type);
        return ret_type;
    },
    UpdateExpression: (comp, te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.id],
            },
            te
        ),
    BinaryExpression: (comp, te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.left, comp.right],
            },
            te
        ),
    IfStatement: (comp, te) => {
        const t0 = type(comp.test, te);
        // log('IfStatement: t0', t0);
        if (!is_type(t0, BooleanType))
            throw new TypecheckError('expected predicate type: Boolean, got ' + t0);
        const t1 = type(comp.consequent, te);
        // log('IfStatement: t1', t1);
        const t2 = type(comp.alternate, te);
        // log('IfStatement: t2', t2);
        if (in_func) {
            if (is_type(t1, ReturnType) && equal_type(t1, t2)) {
                return t1;
            }
        }

        return new NullType();
    },
    FunctionDeclaration: (comp, te) => {
        log('FunctionDeclaration');
        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;

        comp.type = getType(comp);
        log(unparse(comp));

        const new_te = extend_type_environment(
            comp.params.map(p => p.name),
            comp.params.map(p => getType(p)),
            te
        );

        in_func = true;

        const func_type = comp.type;
        assert(func_type instanceof FunctionType, 'expected function type');
        expected_ret = func_type.ret;
        let ret_type = type(comp.body, new_te);
        // log('FunctionDeclaration: Got ret_type: ', ret_type, 'Expected ret_type: ', expected_ret);
        if (!is_type(ret_type, ReturnType)) {
            ret_type = new ReturnType(new NullType());
        }

        assert(ret_type instanceof ReturnType, 'expected return type');

        if (!equal_type(ret_type.type, expected_ret)) {
            throw new TypecheckError(
                'type error in function declaration; declared return type: ' +
                    unparse_types(expected_ret) +
                    ', actual return type: ' +
                    unparse_types(ret_type.type)
            );
        }

        in_func = prev_in_func;
        expected_ret = prev_expected_ret;
        return func_type;
    },
    LambdaDeclaration: (comp, te) => {
        return type(
            {
                tag: 'FunctionDeclaration',
                params: comp.params,
                type: comp.type,
                body: comp.body,
                ret: comp.ret,
            },
            te
        );
    },
    MethodDeclaration: (comp, te) => {
        log('MethodDeclaration');

        // Check if the receiver type is a struct
        comp.type = getType(comp);
        log(unparse(comp));

        const methodType = comp.type;
        if (!is_type(methodType, MethodType)) {
            throw new TypecheckError('expected method type');
        }

        assert(methodType instanceof MethodType, 'expected method type');

        const structType = comp.receiver.type;

        assert(structType instanceof StructType, 'expected struct type');

        structType.methods.push(methodType);

        return type(
            {
                tag: 'FunctionDeclaration',
                id: comp.id,
                params: [
                    {
                        name: comp.receiver.name.name,
                        type: comp.receiver.type,
                    },
                    ...comp.params,
                ],
                type: comp.type,
                body: comp.body,
            },
            te
        );
    },
    CallExpression: (comp, te) => {
        log('CallExpression');
        log(unparse(comp));
        const fun_types: FunctionType | FunctionType[] = type(comp.callee, te);

        const actual_arg_types = comp.arguments.map(e => type(e, te));
        let fun_type: FunctionType;

        if (Array.isArray(fun_types)) {
            // The function can take in/return multiple types, we need to check which one is the correct one and use that
            assert(
                Array.isArray(fun_types) && fun_types.every(f => is_type(f, FunctionType)),
                'expected array of FunctionTypes'
            );

            fun_type = fun_types.find(f => {
                if (f.args.length !== actual_arg_types.length) return false;
                for (let i = 0; i < f.args.length; i++) {
                    if (!equal_type(f.args[i], actual_arg_types[i])) return false;
                }
                return true;
            });

            if (!fun_type) {
                throw new TypecheckError(
                    'type error in application; ' +
                        'expected function type: ' +
                        unparse_types(fun_types) +
                        ', ' +
                        'actual argument types: ' +
                        unparse_types(actual_arg_types)
                );
            }
        } else {
            fun_type = fun_types;
        }

        if (!is_type(fun_type, FunctionType)) {
            throw new TypecheckError(
                'type error in application; function ' +
                    'expression must have function type; ' +
                    'actual type: ' +
                    unparse_types(fun_type)
            );
        }

        assert(fun_type instanceof FunctionType, 'expected function type');
        const expected_arg_types = fun_type.args;

        if (actual_arg_types.length !== expected_arg_types.length) {
            throw new TypecheckError(
                'type error in application; ' +
                    'expected number of arguments: ' +
                    expected_arg_types.length +
                    ', ' +
                    'actual number of arguments: ' +
                    actual_arg_types.length
            );
        }

        for (let i = 0; i < actual_arg_types.length; i++) {
            if (!equal_type(actual_arg_types[i], expected_arg_types[i])) {
                throw new TypecheckError(
                    'type error in application; ' +
                        'expected argument types: ' +
                        unparse_types(expected_arg_types) +
                        ', ' +
                        'actual argument types: ' +
                        unparse_types(actual_arg_types)
                );
            }
        }

        log('Exiting CallExpression, returning', fun_type.ret);
        return fun_type.ret;
    },
    ConstantDeclaration: (comp, te) => {
        // TODO: Check this properly and make sure constants can't be changed
        log('ConstantDeclaration');
        log(unparse(comp));
        const actual_type = type(comp.expression, te);
        actual_type.is_const = true;
        // log(actual_type);
        log('Exiting ConstantDeclaration, returning', actual_type);
        return actual_type;
    },
    VariableDeclaration: (comp, te) => {
        log('VariableDeclaration');
        log(unparse(comp));
        const actual_type = comp.expression ? type(comp.expression, te) : new AnyType();
        const expected_type = lookup_type(comp.id.name, te);

        if (!equal_type(expected_type, actual_type)) {
            throw new TypecheckError(
                'type error in variable declaration; ' +
                    'expected type: ' +
                    unparse_types(comp.type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(actual_type)
            );
        }

        log('Exiting VariableDeclaration, returning', actual_type);
        return actual_type;
    },
    SequenceStatement: (comp, te) => {
        log('SequenceStatement');
        log(unparse(comp));
        let latest_type = new NullType();
        let stmt;
        let new_type;
        for (let i = 0; i < comp.body.length; i++) {
            stmt = comp.body[i];
            new_type = type(stmt, te);
            latest_type = new_type;
            if (is_type(latest_type, ReturnType)) {
                break;
            }
        }
        log('Exiting SequenceStatement, returning', latest_type);
        return latest_type;
    },
    ReturnStatement: (comp, te) => {
        if (comp.expression === null) {
            return new ReturnType(new NullType());
        }
        let ret_type = type(comp.expression, te);
        // log('Actual return type:', ret_type);
        // log('Expected return type:', expected_ret);
        if (in_func) {
            if (!equal_type(ret_type, expected_ret)) {
                throw new TypecheckError(
                    'type error in return statement; ' +
                        'expected return type: ' +
                        unparse_types(expected_ret) +
                        ', ' +
                        'actual return type: ' +
                        unparse_types(ret_type)
                );
            }
        }
        const to_return = new ReturnType(ret_type);
        log('Exiting ReturnStatement, returning', to_return);
        return to_return;
    },
    AssignmentExpression: (comp, te) => {
        log('AssignmentExpression');
        log(unparse(comp));
        const id_type = type(comp.left, te);
        const expr_type = type(comp.right, te);
        if (!equal_type(id_type, expr_type)) {
            throw new TypecheckError(
                'type error in assignment; ' +
                    'expected type: ' +
                    unparse_types(id_type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(expr_type)
            );
        }
        log('Exiting AssignmentExpression, returning', id_type);
        return id_type;
    },
    LogicalExpression: (comp, te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.left, comp.right],
            },
            te
        ),
    CallGoroutine: (comp, te) => type(comp.expression, te),
    GoroutineCallExpression: (comp, te) => {
        const t = type(
            {
                tag: 'CallExpression',
                callee: comp.callee,
                arguments: comp.arguments,
            },
            te
        );

        // Goroutines inherently discard any return values and return null
        return new NullType();
    },
    ForStatement: (comp, te) => {
        log('ForStatement');
        log(unparse(comp));
        // we need to extend the type environment with the type of the init expression, init can be null
        if (comp.init && comp.init.tag !== 'VariableDeclaration') {
            throw new TypecheckError('for loop init expression must be a variable declaration');
        }
        const extended_te = comp.init
            ? extend_type_environment([comp.init.id.name], [type(comp.init.expression, te)], te)
            : te;
        // log('ForStatement: extended_te', extended_te);
        // check the test expression, this can be null as well
        const t0 = comp.test ? type(comp.test, extended_te) : new BooleanType();
        // log('ForStatement: t0', t0);
        if (!is_type(t0, BooleanType)) {
            throw new TypecheckError('expected predicate type: Boolean, got ' + t0);
        }
        // check the update expression, this can be null as well
        // the update expression should either be a CallExpression or an AssignmentExpression
        const t1 = comp.update ? type(comp.update, extended_te) : new NullType();
        // log('ForStatement: update type: ', t1);
        const t2 = comp.body ? type(comp.body, extended_te) : new NullType();
        // log('ForStatement: body type: ', t2);
        return t2;
    },
    BreakStatement: (comp, te) => new NullType(),
    ContinueStatement: (comp, te) => new NullType(),
    StructDeclaration: (comp, te) => {
        log('StructDeclaration');
        log(unparse(comp));
        // All struct declarations are handled in the BlockStatement type checker
        return new StructType(comp.id.name, []);
    },
    StructInitializer: (comp, te) => {
        log('StructInitializer');
        comp.type = getType(comp);
        log(unparse(comp));

        assert(comp.type instanceof StructType, 'expected struct type');

        const struct = comp.type;

        if (struct.fields.length !== comp.fields.length) {
            throw new TypecheckError(
                'expected ' + struct.fields.length + ' fields, got ' + comp.fields.length
            );
        }

        if (comp.named) {
            // Allow for fewer fields if they are named, the rest will be set to the 0 value of their type
            for (let i = 0; i < struct.fields.length; i++) {
                const field = comp.fields.find(f => f.name.name === struct.fields[i].fieldName);
                if (!field) {
                    throw new TypecheckError('field ' + struct.fields[i].fieldName + ' not found');
                }
                const field_type = type(field.value, te);
                if (!equal_type(field_type, struct.fields[i].type)) {
                    throw new TypecheckError(
                        'type error in struct initializer; ' +
                            'expected type: ' +
                            unparse_types(struct.fields[i].type) +
                            ', ' +
                            'actual type: ' +
                            unparse_types(field_type)
                    );
                }
            }
        } else {
            if (struct.fields.length !== comp.fields.length) {
                throw new TypecheckError(
                    'expected ' + struct.fields.length + ' fields, got ' + comp.fields.length
                );
            }

            for (let i = 0; i < comp.fields.length; i++) {
                const field = comp.fields[i];
                const field_type = type(field, te);
                if (!equal_type(field_type, struct.fields[i].type)) {
                    throw new TypecheckError(
                        'type error in struct initializer; ' +
                            'expected type: ' +
                            unparse_types(struct.fields[i].type) +
                            ', ' +
                            'actual type: ' +
                            unparse_types(field_type)
                    );
                }
            }
        }

        log('Exiting StructInitializer, returning', struct);
        return struct;
    },
    MemberExpression: (comp, te) => {
        log('MemberExpression');
        log(unparse(comp));
        const struct = type(comp.object, te);
        // log('obj_type', struct);

        if (!is_type(struct, StructType)) {
            throw new TypecheckError('expected struct type, got ' + unparse_types(struct));
        }

        assert(struct instanceof StructType, 'expected struct type');

        const field = struct.fields.find(f => f.fieldName === comp.property.name);
        // log('Fields', struct.fields);
        const method = struct.methods.find(m => m.methodName === comp.property.name);
        // log('Methods', struct.methods);

        if (!field && !method) {
            throw new TypecheckError(
                'field or method ' + comp.property.name + ' not found in struct ' + struct.name
            );
        }

        if (field) {
            comp.type = field.type;
            log('Exiting MemberExpression, returning', field.type);
            return field.type;
        } else {
            comp.type = method;
            log('Exiting MemberExpression, returning', method);
            return method;
        }
    },
};

/**
 * Type checks the given component using the provided type environment.
 * @param {any} comp - The component to be type checked.
 * @param {any} te - The type environment.
 * @returns {any} - The result of type checking the component.
 */
const type = (comp, te): Type => {
    // log('Type');
    // log(unparse(comp));
    return type_comp[comp.tag](comp, te);
};

/**
 * Checks the types of the given program.
 *
 * @param program - The program to check the types for.
 * @returns A copy of the program where all unknown types have been resolved.
 */
export function checkTypes(program: object) {
    log('Checking types');
    StructTable = new Map<string, StructType>();
    // Make a deep copy of the program
    let program_copy = JSON.parse(unparse(program));
    const t = type(program_copy, global_type_environment);
    log('Exiting checkTypes, returning', t);
    // This is a copy of the program where all unknown types have been resolved
    log(unparse(program_copy));
    return program_copy;
}
