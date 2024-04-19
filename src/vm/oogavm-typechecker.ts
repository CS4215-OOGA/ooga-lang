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
    ChanType,
} from './oogavm-types.js';
import assert from 'assert';
import { CompilerError, TypecheckError } from './oogavm-errors.js';

const log = debug('ooga:typechecker');

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
    new FunctionType([new AnyType(), new StringType()], new StringType()),
    new FunctionType([new StringType(), new AnyType()], new StringType()),
];

const mutexType = new StructType(
    'Mutex',
    [],
    [
        new MethodType('Lock', [], new NullType(), true),
        new MethodType('Unlock', [], new NullType(), true),
    ]
);

const global_type_frame = {
    '+': binary_add_type, // This allows for other types to be added to strings
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
    '+unary': unary_arith_type,
    '!': unary_bool_type,
    '++': unary_arith_type,
    '--': unary_arith_type,
    '==': binary_equal_type,
    print: new FunctionType([new AnyType()], new NullType()),
    len: new FunctionType([new AnyType()], new IntegerType()),
    lockMutex: new FunctionType([mutexType], new NullType()),
    unlockMutex: new FunctionType([mutexType], new NullType()),
    startAtomic: new FunctionType([], new NullType()),
    endAtomic: new FunctionType([], new NullType()),
    yieldThread: new FunctionType([], new NullType()),
    blockThread: new FunctionType([], new NullType()),
    getThreadID: new FunctionType([], new IntegerType()),
    oogaError: new FunctionType([], new NullType()),
    getTime: new FunctionType([], new IntegerType()),
};

const empty_type_environment = null;
let global_type_environment = pair(global_type_frame, empty_type_environment);
let global_struct_environment = pair({}, empty_type_environment);

const lookup_type = (x, e): Type => {
    if (e === null) {
        throw new TypecheckError('Variable not declared in scope: ' + x);
    }
    if (head(e).hasOwnProperty(x)) {
        return head(e)[x];
    }
    return lookup_type(x, tail(e));
};

const lookup_type_current_frame = (x, e): Type | null => {
    if (head(e).hasOwnProperty(x)) {
        return head(e)[x];
    }

    return null;
};

const extend_type_environment = (xs, ts: Type[], e) => {
    if (ts.length > xs.length)
        throw new TypecheckError('too few parameters in function declaration');
    if (ts.length < xs.length)
        throw new TypecheckError('too many parameters in function declaration');
    const new_frame = {};
    for (let i = 0; i < xs.length; i++) new_frame[xs[i]] = ts[i];
    return pair(new_frame, e);
};

const extend_current_type_environment = (xs: string, ts: Type, e) => {
    // add the types to the current frame
    head(e)[xs] = ts;
    return e;
};

let in_func = false;
let expected_ret;

function getType(t, struct_te): Type {
    log('getTType: ', t);
    log('is_const');
    if (is_type(t.type, Type)) {
        log('Exiting getType, found Type');
        return t.type;
    }

    if (t.type === 'Function') {
        log('Exiting getType, returning FunctionType');
        t.type = new FunctionType(
            t.params.map(p => getType(p, struct_te)),
            getType(t.ret, struct_te)
        );
        return t.type;
    } else if (t.type === 'Method') {
        log('Exiting getType, returning MethodType');
        t.receiver.type = getType(t.receiver, struct_te);
        log(t.receiver.type);
        if (!is_type(t.receiver.type, StructType)) {
            throw new TypecheckError('expected struct type');
        }

        const methodType = new MethodType(
            t.id.name,
            t.params.map(p => getType(p, struct_te)),
            getType(t.ret, struct_te),
            t.receiver.pointer
        );

        t.receiver.type.methods.push(methodType);
        t.type = methodType;
        return t.type;
    } else if (t.type === 'Integer') {
        log('Exiting getType, returning IntegerType');
        t.type = new IntegerType();
        return t.type;
    } else if (t.type === 'Float') {
        log('Exiting getType, returning FloatType');
        t.type = new FloatType();
        return t.type;
    } else if (t.type === 'Boolean') {
        log('Exiting getType, returning BooleanType');
        t.type = new BooleanType();
        return t.type;
    } else if (t.type === 'String') {
        log('Exiting getType, returning StringType');
        t.type = new StringType();
        return t.type;
    } else if (t.type === 'Null') {
        log('Exiting getType, returning NullType');
        t.type = new NullType();
        return t.type;
    } else if (t.type === 'Any') {
        log('Exiting getType, returning AnyType');
        t.type = new AnyType();
        return t.type;
    } else if (t.type.tag === 'Struct') {
        // Ensure that the struct is defined
        log('GetType StructType:', t.type.name, struct_te);
        const structType = lookup_type(t.type.name, struct_te);
        t.type = structType;
        log('Exiting getType, returning StructType, ', structType);
        return structType;
    } else if (t.type.tag === 'Array') {
        t.type = new ArrayType(
            getType(t.type.elementType, struct_te),
            t.type.length,
            t.type.is_bound
        );
        return t.type;
    } else if (t.type.tag === 'Channel') {
        t.type = new ChanType(getType(t.type.elementType, struct_te));
        return t.type;
    } else if (t.type.tag === 'FunctionType') {
        t.type = new FunctionType(
            t.type.args.map(a => getType(a, struct_te)),
            getType(t.type.ret, struct_te)
        );
        return t.type;
    }

    throw new TypecheckError('Unknown type: ' + t.type);
}

function unparse_types(t) {
    log('UnparseTypes: ', t);
    // These are the go types
    if (is_type(t, IntegerType)) {
        return 'int';
    } else if (is_type(t, FloatType)) {
        return 'float64';
    } else if (is_type(t, BooleanType)) {
        return 'bool';
    } else if (is_type(t, StringType)) {
        return 'string';
    } else if (is_type(t, NullType)) {
        return 'nil';
    } else if (is_type(t, AnyType)) {
        return 'any';
    } else if (is_type(t, FunctionType)) {
        return 'func(' + t.args.map(a => unparse_types(a)).join(', ') + ') ' + unparse_types(t.ret);
    } else if (is_type(t, StructType)) {
        return t.name;
    } else if (is_type(t, ArrayType)) {
        return '[]' + unparse_types(t.elem_type);
    } else if (is_type(t, ChanType)) {
        return 'chan ' + unparse_types(t.elem_type);
    } else if (is_type(t, ReturnType)) {
        return 'return ' + unparse_types(t.type);
    } else if (is_type(t, MethodType)) {
        return 'method ' + t.name + '(' + t.args.map(a => unparse_types(a)).join(', ') + ')';
    } else {
        throw new TypecheckError('Unknown type: ' + t);
    }
}
/**
 * Represents a collection of type checking functions for different AST node types.
 * Each property of this object corresponds to a specific AST node type, and its value is a type checking function for that node type.
 * The type checking function takes in two parameters: `comp` (the AST node to be type checked) and `te` (the type environment).
 * It returns the inferred type of the AST node.
 */
const type_comp = {
    Integer: (comp, te, struct_te) => {
        if (!is_integer(comp.value)) {
            throw new TypecheckError('Expected int value, got ' + comp.value);
        }

        comp.type = new IntegerType();
        return new IntegerType();
    },
    Float: (comp, te, struct_te) => {
        if (!is_float(comp.value)) {
            throw new TypecheckError('Expected float value, got ' + comp.value);
        }

        comp.type = new FloatType();
        return new FloatType();
    },
    Boolean: (comp, te, struct_te) => {
        if (!is_boolean(comp.value)) {
            throw new TypecheckError('Expected boolean value, got ' + comp.value);
        }

        comp.type = new BooleanType();
        return new BooleanType();
    },
    String: (comp, te, struct_te) => {
        if (!is_string(comp.value)) {
            throw new TypecheckError('Expected string value, got ' + comp.value);
        }

        comp.type = new StringType();
        return new StringType();
    },
    Null: (comp, te, struct_te) => {
        if (!is_null(comp.value)) {
            throw new TypecheckError('Expected null value, got ' + comp.value);
        }

        comp.type = new NullType();
        return new NullType();
    },
    ArraySliceLiteral: (comp, te, struct_te) => {
        log('ArraySliceLiteral');
        comp.type = getType(comp, struct_te);
        log(unparse(comp));
        if (comp.type.length != -1 && comp.elements.length != comp.type.length) {
            throw new TypecheckError(
                'Array expected ' + comp.type.length + ' elements, got ' + comp.elements.length
            );
        }

        // log('ArraySliceLiteral: ', comp.type.elem_type);
        for (let i = 0; i < comp.elements.length; i++) {
            const t = type(comp.elements[i], te, struct_te);
            // log('ArraySliceLiteral: ', t);
            if (!equal_type(t, comp.type.elem_type)) {
                throw new TypecheckError(
                    'Array expected element type ' +
                        unparse_types(comp.type.elem_type) +
                        ', got ' +
                        unparse_types(t)
                );
            }
        }

        return comp.type;
    },
    Name: (comp, te, struct_te) => {
        log('Name');
        log(unparse(comp));
        let ret_type = lookup_type(comp.name, te);
        comp.type = ret_type;
        log('Exiting Name, returning', unparse(ret_type));
        return ret_type;
    },
    BlockStatement: (comp, te, struct_te) => {
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
        if (!comp.body || !comp.body.body || comp.body.body.length === 0) {
            return new NullType();
        }
        const struct_decls = comp.body.body.filter(comp => comp.tag === 'StructDeclaration');
        let extended_struct_te = extend_type_environment([], [], struct_te);
        if (struct_decls.length > 0) {
            extended_struct_te = extend_type_environment([], [], struct_te);
            for (let i = 0; i < struct_decls.length; i++) {
                const comp = struct_decls[i];
                const structName = comp.id.name;

                log('Struct TE:', extended_struct_te);
                if (lookup_type_current_frame(structName, extended_struct_te)) {
                    throw new TypecheckError(
                        'Struct ' + structName + ' declared more than once in the same block!'
                    );
                }
                const struct_t = new StructType(structName, []);
                comp.type = struct_t;
                // StructTable.set(structName, struct_t);
                extended_struct_te = extend_current_type_environment(
                    structName,
                    struct_t,
                    extended_struct_te
                );

                // We now can set the fields of the struct. We do this now to allow for recursive struct definitions
                const fields = comp.fields.map(
                    f => new StructField(f.name.name, getType(f, extended_struct_te))
                );
                // log('Fields for struct', structName);
                // log(fields);
                struct_t.fields = fields;

                // log('StructDeclaration Comp:', unparse(comp));
            }
        }

        const decls = comp.body.body.filter(
            comp =>
                comp.tag === 'VariableDeclaration' ||
                comp.tag === 'FunctionDeclaration' ||
                comp.tag === 'ConstantDeclaration' ||
                comp.tag === 'MethodDeclaration'
        );

        const decls_known_type = decls.filter(comp => comp.type !== 'Unknown');

        let extended_te = extend_type_environment([], [], te);
        for (let i = 0; i < decls_known_type.length; i++) {
            const comp = decls_known_type[i];
            const name = comp.id.name;

            if (lookup_type_current_frame(name, extended_te)) {
                throw new TypecheckError(
                    'Variable ' + name + ' declared more than once in the same block!'
                );
            }

            const type = getType(comp, extended_struct_te);
            log('Known type declaration:', name, type);
            log(unparse(type));
            extended_te = extend_current_type_environment(name, type, extended_te);
        }
        // log('Comp after setting known types');
        // log(unparse(comp));
        // log('Extended type environment');
        // log(JSON.stringify(extended_te));
        const decls_unknown_type = decls.filter(comp => comp.type === 'Unknown');
        // log('Unknown type declarations');
        // log(unparse(decls_unknown_type));
        // We have to use a for loop here because one unknown type declaration can depend on another
        for (let i = 0; i < decls_unknown_type.length; i++) {
            // log('Setting unknown type for', decls_unknown_type[i].id.name);
            const comp = decls_unknown_type[i];
            const name = comp.id.name;
            if (lookup_type_current_frame(name, extended_te)) {
                throw new TypecheckError(
                    'Variable ' + name + ' declared more than once in the same block!'
                );
            }
            const t = type(comp.expression, extended_te, extended_struct_te);
            log('Unknown type declaration:', name, t);
            comp.type = t;
            extended_te = extend_current_type_environment(name, t, extended_te);
        }

        // log('Extended type environment');
        // log(JSON.stringify(extended_te, null, 2));
        const ret_type = type(comp.body, extended_te, extended_struct_te);
        log('Exiting BlockStatement, returning', ret_type);
        return ret_type;
    },
    UpdateExpression: (comp, te, struct_te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.id],
            },
            te,
            struct_te
        ),
    BinaryExpression: (comp, te, struct_te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.left, comp.right],
            },
            te,
            struct_te
        ),
    IfStatement: (comp, te, struct_te) => {
        const t0 = type(comp.test, te, struct_te);
        // log('IfStatement: t0', t0);
        if (!is_type(t0, BooleanType))
            throw new TypecheckError('Expected predicate type: Boolean, got ' + unparse_types(t0));
        const t1 = type(comp.consequent, te, struct_te);
        // log('IfStatement: t1', t1);
        const t2 = type(comp.alternate, te, struct_te);
        // log('IfStatement: t2', t2);
        if (in_func) {
            if (is_type(t1, ReturnType) && equal_type(t1, t2)) {
                return t1;
            }
        }

        return new NullType();
    },
    SwitchStatement: (comp, te, struct_te) => {
        log('SwitchStatement');
        log(unparse(comp));

        // t0 can be any type
        const t0 = type(comp.discriminant, te, struct_te);

        // the case tests can be of any type - this can be checked in the runtime
        // the type of this switch statement is the return type of every case including the default case return the same type
        // else, the type of the switch statement is null

        let ret_type = new NullType();
        for (let i = 0; i < comp.cases.length; i++) {
            const t1 = type(comp.cases[i], te, struct_te);
            // log('SwitchStatement: t1', t1);
            if (i === 0) {
                ret_type = t1;
            } else if (!equal_type(t1, ret_type)) {
                // log('SwitchStatement: Expected return type', ret_type, 'Actual return type', t1);
                ret_type = new NullType();
            }
        }

        log('Exiting SwitchStatement, returning', ret_type);
        comp.type = ret_type;
        return ret_type;
    },
    SwitchCase: (comp, te, struct_te) => {
        log('SwitchCase');
        log(unparse(comp));
        const t0 = comp.test ? type(comp.test, te, struct_te) : new NullType();
        // We don't have to check the type of t0, it can be any type - this can be checked in the runtime
        const t1 = type(comp.consequent, te, struct_te);

        log('Exiting SwitchCase, returning', t1);
        return t1;
    },
    FunctionDeclaration: (comp, te, struct_te) => {
        log('FunctionDeclaration');
        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;

        comp.type = getType(comp, struct_te);
        log(unparse(comp));

        const new_te = extend_type_environment(
            comp.params.map(p => p.name),
            comp.params.map(p => getType(p, struct_te)),
            te
        );

        in_func = true;

        const func_type = comp.type;
        assert(func_type instanceof FunctionType, 'expected function type');
        expected_ret = func_type.ret;
        let ret_type = type(comp.body, new_te, struct_te);
        // log('FunctionDeclaration: Got ret_type: ', ret_type, 'Expected ret_type: ', expected_ret);
        if (!is_type(ret_type, ReturnType)) {
            ret_type = new ReturnType(new NullType());
        }

        assert(ret_type instanceof ReturnType, 'expected return type');

        if (!equal_type(ret_type.type, expected_ret)) {
            throw new TypecheckError(
                'Type error in function declaration; declared return type: ' +
                    unparse_types(expected_ret) +
                    ', actual return type: ' +
                    unparse_types(ret_type.type)
            );
        }

        in_func = prev_in_func;
        expected_ret = prev_expected_ret;
        return func_type;
    },
    LambdaDeclaration: (comp, te, struct_te) => {
        return type(
            {
                tag: 'FunctionDeclaration',
                params: comp.params,
                type: comp.type,
                body: comp.body,
                ret: comp.ret,
            },
            te,
            struct_te
        );
    },
    MethodDeclaration: (comp, te, struct_te) => {
        log('MethodDeclaration');

        // Check if the receiver type is a struct
        comp.type = getType(comp, struct_te);
        log(unparse(comp));

        const methodType = comp.type;
        if (!is_type(methodType, MethodType)) {
            throw new TypecheckError('expected method type');
        }

        assert(methodType instanceof MethodType, 'expected method type');

        const structType = comp.receiver.type;

        assert(structType instanceof StructType, 'expected struct type');

        // structType.methods.push(methodType);

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
            te,
            struct_te
        );
    },
    CallExpression: (comp, te, struct_te) => {
        log('CallExpression');
        log(unparse(comp));
        const fun_types: Type = type(comp.callee, te, struct_te);
        const actual_arg_types = comp.arguments.map(e => {
            log(e);
            return type(e, te, struct_te);
        });

        let fun_type: Type | undefined;
        log(comp.callee);
        log('fun_types:', fun_types);
        if (Array.isArray(fun_types)) {
            // The function can take in/return multiple types, we need to check which one is the correct one and use that
            assert(
                Array.isArray(fun_types) &&
                    fun_types.every(f => {
                        log('------------------------');
                        log(f, is_type(f, FunctionType));
                        return is_type(f, FunctionType);
                    }),
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

        comp.type = fun_type.ret;
        log('Exiting CallExpression, returning', fun_type.ret);
        return fun_type.ret;
    },
    MakeCallExpression: (comp, te, struct_te) => {
        log('MakeCallExpression');
        log(unparse(comp));

        let t = getType(comp, struct_te);
        comp.type = t;

        if (is_type(t, ChanType)) {
            assert(t instanceof ChanType, 'expected ChanType');
            if (comp.args.length > 1) {
                throw new TypecheckError('Expected 1 argument to make(chan)');
            }

            const is_buffered = comp.args.length === 1;
            t.is_buffered = is_buffered;

            if (is_buffered) {
                const arg_type = type(comp.args[0], te, struct_te);

                if (!equal_type(arg_type, new IntegerType())) {
                    throw new TypecheckError('Expected integer argument to make(chan)');
                }
            }
        } else if (is_type(t, ArrayType)) {
            assert(t instanceof ArrayType, 'expected ArrayType');
            // Ensure that type is not bound
            if ((t as ArrayType).is_array) {
                throw new TypecheckError('Expected slice type');
            }

            // First argument is the number of elements in the array, second argument is the capacity of the array
            if (comp.args.length > 2 || comp.args.length < 1) {
                throw new TypecheckError('Expected 1 or 2 arguments to make a slice');
            }

            const arg_type = type(comp.args[0], te, struct_te);

            if (!equal_type(arg_type, new IntegerType())) {
                throw new TypecheckError('Expected integer argument n to make([]T, n)');
            }

            if (comp.args.length === 2) {
                const arg_type = type(comp.args[1], te, struct_te);

                if (!equal_type(arg_type, new IntegerType())) {
                    throw new TypecheckError('Expected integer argument m to make([]T, n, m)');
                }
            }
        } else {
            throw new TypecheckError('Make call expects channel or slice type');
        }

        log(unparse(comp));
        return t;
    },
    AppendExpression: (comp, te, struct_te) => {
        log('Append Expression');
        log(unparse(comp));
        let ts = type(comp.name, te, struct_te);
        log('ts is ' + ts);
        if (is_type(ts, ArrayType) && !(ts as ArrayType).is_array) {
            if (comp.args.length !== 1) {
                throw new CompilerError(
                    'Expected 1 argument to append but got ' + comp.args.length + ' args.'
                );
            }
            const elem_type = (ts as ArrayType).elem_type;
            const arg_type = type(comp.args[0], te, struct_te);
            if (!equal_type(elem_type, arg_type)) {
                throw new TypecheckError(
                    'Expected to append ' + elem_type + ' but got ' + arg_type + ' instead.'
                );
            }
        } else {
            throw new TypecheckError('Expected slice type but got ' + ts);
        }
        return ts;
    },
    ConstantDeclaration: (comp, te, struct_te) => {
        log('ConstantDeclaration');
        log(unparse(comp));
        const expected_type = lookup_type(comp.id.name, te);
        const actual_type = type(comp.expression, te, struct_te);
        log('Expected type: ', expected_type, 'Actual type:', actual_type);
        if (!equal_type(expected_type, actual_type)) {
            throw new TypecheckError('type error in const decl');
        }
        // log(actual_type);
        log('Exiting ConstantDeclaration, returning', actual_type);
        return actual_type;
    },
    VariableDeclaration: (comp, te, struct_te) => {
        log('VariableDeclaration');
        log(unparse(comp));
        const actual_type = comp.expression ? type(comp.expression, te, struct_te) : new AnyType();
        log('Actual type:', actual_type);
        const expected_type = lookup_type(comp.id.name, te);

        if (!equal_type(expected_type, actual_type)) {
            throw new TypecheckError(
                'type error in variable declaration; ' +
                    'expected type: ' +
                    unparse_types(expected_type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(actual_type)
            );
        }

        log('Exiting VariableDeclaration, returning', actual_type);
        return actual_type;
    },
    SequenceStatement: (comp, te, struct_te) => {
        log('SequenceStatement');
        log(unparse(comp));
        let latest_type = new NullType();
        let stmt;
        let new_type;
        for (let i = 0; i < comp.body.length; i++) {
            stmt = comp.body[i];
            new_type = type(stmt, te, struct_te);
            latest_type = new_type;
            if (is_type(latest_type, ReturnType)) {
                break;
            }
        }
        log('Exiting SequenceStatement, returning', latest_type);
        return latest_type;
    },
    ReturnStatement: (comp, te, struct_te) => {
        if (comp.expression === null) {
            return new ReturnType(new NullType());
        }
        let ret_type = type(comp.expression, te, struct_te);
        // log('Actual return type:', ret_type);
        // log('Expected return type:', expected_ret);
        if (in_func) {
            if (!equal_type(ret_type, expected_ret)) {
                throw new TypecheckError(
                    'Type error in return statement; ' +
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
    UnaryExpression: (comp, te, struct_te) => {
        const t = type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.argument],
            },
            te,
            struct_te
        );

        comp.type = t;
        return t;
    },
    AssignmentExpression: (comp, te, struct_te) => {
        log('AssignmentExpression');
        log(unparse(comp));
        const id_type = type(comp.left, te, struct_te);
        const expr_type = type(comp.right, te, struct_te);
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
    LogicalExpression: (comp, te, struct_te) =>
        type(
            {
                tag: 'CallExpression',
                callee: { tag: 'Name', name: comp.operator },
                arguments: [comp.left, comp.right],
            },
            te,
            struct_te
        ),
    CallGoroutine: (comp, te, struct_te) => type(comp.expression, te, struct_te),
    GoroutineCallExpression: (comp, te, struct_te) => {
        const t = type(
            {
                tag: 'CallExpression',
                callee: comp.callee,
                arguments: comp.arguments,
            },
            te,
            struct_te
        );

        // Goroutines inherently discard any return values and return null
        return new NullType();
    },
    ForStatement: (comp, te, struct_te) => {
        log('ForStatement');
        log(unparse(comp));
        // we need to extend the type environment with the type of the init expression, init can be null
        if (comp.init && comp.init.tag !== 'VariableDeclaration') {
            throw new TypecheckError('for loop init expression must be a variable declaration');
        }
        const extended_te = comp.init
            ? extend_type_environment(
                  [comp.init.id.name],
                  [type(comp.init.expression, te, struct_te)],
                  te
              )
            : te;
        // log('ForStatement: extended_te', extended_te);
        // check the test expression, this can be null as well
        const t0 = comp.test ? type(comp.test, extended_te, struct_te) : new BooleanType();
        // log('ForStatement: t0', t0);
        if (!is_type(t0, BooleanType)) {
            throw new TypecheckError('expected predicate type: Boolean, got ' + t0);
        }
        // check the update expression, this can be null as well
        // the update expression should either be a CallExpression or an AssignmentExpression
        const t1 = comp.update ? type(comp.update, extended_te, struct_te) : new NullType();
        // log('ForStatement: update type: ', t1);
        const t2 = comp.body ? type(comp.body, extended_te, struct_te) : new NullType();
        // log('ForStatement: body type: ', t2);
        return t2;
    },
    BreakStatement: (comp, te, struct_te) => new NullType(),
    ContinueStatement: (comp, te, struct_te) => new NullType(),
    StructDeclaration: (comp, te, struct_te) => {
        log('StructDeclaration');
        log(unparse(comp));
        // All struct declarations are handled in the BlockStatement type checker
        return new StructType(comp.id.name, []);
    },
    StructInitializer: (comp, te, struct_te) => {
        log('StructInitializer');
        comp.type = getType(comp, struct_te);
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
                const field_type = type(field.value, te, struct_te);
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
                const field_type = type(field, te, struct_te);
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
    MemberExpression: (comp, te, struct_te) => {
        log('MemberExpression');
        log(unparse(comp));
        const struct = type(comp.object, te, struct_te);
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
    ArraySliceIndex: (comp, te, struct_te) => {
        log('ArraySliceIndex');
        log(unparse(comp));

        const arrayType = type(comp.arrayExpression, te, struct_te);

        if (!is_type(arrayType, ArrayType)) {
            throw new TypecheckError('expected array type, got ' + unparse_types(arrayType));
        }

        assert(arrayType instanceof ArrayType, 'expected array type');

        const indexType = type(comp.index, te, struct_te);

        if (!is_type(indexType, IntegerType)) {
            throw new TypecheckError('expected integer index, got ' + unparse_types(indexType));
        }

        comp.type = arrayType.elem_type;

        log('Exiting ArraySliceIndex, returning', arrayType.elem_type);
        return arrayType.elem_type;
    },
    ChannelReadExpression: (comp, te, struct_te) => {
        log('ChannelReadExpression');
        log(unparse(comp));

        const chanType = type(comp.channel, te, struct_te);

        if (!is_type(chanType, ChanType)) {
            throw new TypecheckError('expected channel type, got ' + unparse_types(chanType));
        }

        assert(chanType instanceof ChanType, 'expected channel type');

        comp.type = chanType.elem_type;

        log('Exiting ChannelReadExpression, returning', chanType.elem_type);
        return chanType.elem_type;
    },
    ChannelWriteExpression: (comp, te, struct_te) => {
        log('ChannelWriteExpression');
        log(unparse(comp));

        const chanType = type(comp.channel, te, struct_te);

        if (!is_type(chanType, ChanType)) {
            throw new TypecheckError('Expected channel type, got ' + unparse_types(chanType));
        }

        assert(chanType instanceof ChanType, 'expected channel type');

        const elemType = type(comp.value, te, struct_te);

        if (!equal_type(elemType, chanType.elem_type)) {
            throw new TypecheckError(
                'type error in channel write; ' +
                    'expected type: ' +
                    unparse_types(chanType.elem_type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(elemType)
            );
        }

        comp.type = new NullType();

        log('Exiting ChannelWriteExpression, returning', new NullType());
        return new NullType();
    },
    SelectStatement: (comp, te, struct_te) => {
        log('SelectStatement');
        log(unparse(comp));

        let t0 = new NullType();
        for (let i = 0; i < comp.cases.length; i++) {
            const t = type(comp.cases[i], te, struct_te);
            // log('SelectStatement: t', t);
            if (i === 0) {
                t0 = t;
            } else if (!equal_type(t0, t)) {
                t0 = new NullType();
            }
        }

        comp.type = t0;
        return comp.type;
    },
    SelectWriteCase: (comp, te, struct_te) => {
        let t0: Type = type(comp.operation, te, struct_te);
        // Now we need to check the body of the case, using the extended type environment
        const t1 = type(comp.body, te, struct_te);
        log('Exiting SelectCase, returning', t1);
        return t1;
    },
    SelectReadCase: (comp, te, struct_te) => {
        let t0: Type = type(comp.operation, te, struct_te);
        // Now we need to check the body of the case, using the extended type environment
        const t1 = type(comp.body, te, struct_te);
        log('Exiting SelectCase, returning', t1);
        return t1;
    },
    SelectReadVariableCase: (comp, te, struct_te) => {
        let t0: Type;
        let extended_te = te;
        // Extend the type environment with the type of the variable - this is similar to the for loop init expression
        // Note that this variable declaration is considered to be in the same block as the body of the case - there can be a variable with the same name in the outer block
        const name = comp.operation.id.name;
        const id_type = type(comp.operation.expression, te, struct_te);
        comp.operation.type = id_type;
        extended_te = extend_type_environment([name], [id_type], te);
        log('SelectCase: extended_te', extended_te);
        t0 = type(comp.operation, extended_te, struct_te);
        // Now we need to check the body of the case, using the extended type environment
        const t1 = type(comp.body, extended_te, struct_te);
        log('Exiting SelectCase, returning', t1);
        return t1;
    },
    SelectDefaultCase: (comp, te, struct_te) => {
        log('SelectDefaultCase');
        log(unparse(comp));
        const t = type(comp.body, te, struct_te);
        log('Exiting SelectDefaultCase, returning', t);
        return t;
    },
    BreakpointStatement: (comp, te, struct_te) => {
        comp.type = new NullType();
        return comp.type;
    },
};

/**
 * Type checks the given component using the provided type environment.
 * @param {any} comp - The component to be type checked.
 * @param {any} te - The type environment.
 * @returns {any} - The result of type checking the component.
 */
const type = (comp, te, struct_te): Type => {
    // log('Type');
    // log(unparse(comp));
    return type_comp[comp.tag](comp, te, struct_te);
};

/**
 * Checks the types of the given program.
 *
 * @param program - The program to check the types for.
 * @returns A copy of the program where all unknown types have been resolved.
 */
export function checkTypes(program: object) {
    log('Checking types');
    // StructTable = new Map<string, StructType>();
    // Make a deep copy of the program
    let program_copy = JSON.parse(unparse(program));

    global_type_environment = pair(global_type_frame, empty_type_environment);
    global_struct_environment = pair({}, empty_type_environment);
    const t = type(program_copy, global_type_environment, global_struct_environment);
    log('Exiting checkTypes, returning', t);
    // This is a copy of the program where all unknown types have been resolved
    log(unparse(program_copy));

    return program_copy;
}
