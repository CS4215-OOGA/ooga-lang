import { pair, head, tail, error } from '../utils/utils.js';
import debug from 'debug';
import {
    Type,
    IntegerType,
    BooleanType,
    NullType,
    StructType,
    StructField,
    MethodType,
    FunctionType,
    is_type,
    equal_type,
    AnyType,
    StringType,
    ReturnType,
} from './oogavm-types.js';
import assert from 'assert';
import { get } from 'http';

const log = debug('ooga:typechecker');

const StructTable = new Map<string, StructType>();

function getType(t, te) {
    log('getType: ', t);
    if (t.type === 'Struct') {
        if (!StructTable.has(t.name)) {
            throw new Error('struct ' + t.name + ' not found');
        }
        return StructTable.get(t.name);
    } else if (t.tag === 'Method') {
        return new MethodType(
            t.args.map(arg => getType(arg, te)),
            getType({ type: t.res }, te)
        );
    } else if (t.tag === 'FunctionDeclaration') {
        return new FunctionType(
            t.params.map(p => getType(p, te)),
            getType({ type: t.type }, te)
        );
    } else if (t.tag === 'LambdaDeclaration') {
        return new FunctionType(
            t.params.map(p => getType(p, te)),
            getType({ type: t.type }, te)
        );
    } else if (t.type === 'Integer') {
        log('Returning IntegerType');
        return new IntegerType();
    } else if (t.type === 'Boolean') {
        return new BooleanType();
    } else if (t.type === 'Null') {
        return new NullType();
    } else if (t === 'String') {
        return new StringType();
    } else {
        throw new Error('Unknown type: ' + t.tag);
    }
}

function is_integer(x) {
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

const unparse = ast => {
    return JSON.stringify(ast, null, 2);
};

const unparse_types = t => {
    return JSON.stringify(t, null, 2);
};

const unary_arith_type = new FunctionType([new IntegerType()], new IntegerType());

const binary_arith_type = new FunctionType(
    [new IntegerType(), new IntegerType()],
    new IntegerType()
);

const number_comparison_type = new FunctionType(
    [new IntegerType(), new IntegerType()],
    new BooleanType()
);

const binary_bool_type = new FunctionType(
    [new BooleanType(), new BooleanType()],
    new BooleanType()
);

const unary_bool_type = new FunctionType([new BooleanType()], new BooleanType());

const binary_equal_type = new FunctionType([new AnyType(), new AnyType()], new BooleanType());

const global_type_frame = {
    '+': binary_arith_type,
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

const lookup_type = (x, e): Type => {
    if (e === null) {
        throw new Error('unbound name: ' + x);
    }

    if (head(e).hasOwnProperty(x)) {
        return head(e)[x];
    }

    return lookup_type(x, tail(e));
};

const extend_type_environment = (xs, ts, e) => {
    if (ts.length > xs.length) throw new Error('too few parameters in function declaration');
    if (ts.length < xs.length) throw new Error('too many parameters in function declaration');
    if (xs.length === 0) return e;
    log('Extending type environment with', xs, ts);
    const new_frame = {};
    for (let i = 0; i < xs.length; i++) new_frame[xs[i]] = ts[i];
    return pair(new_frame, e);
};

const extend_current_type_environment = (xs, ts, e) => {
    if (ts.length > xs.length) throw new Error('too few parameters in function declaration');
    if (ts.length < xs.length) throw new Error('too many parameters in function declaration');
    log('Extending current type environment with', xs, ts);
    // add the types to the current frame
    for (let i = 0; i < xs.length; i++) head(e)[xs[i]] = ts[i];
    return e;
};

let in_func = false;
let expected_ret;
// type_comp has the typing
// functions for each component tag

/**
 * Represents a collection of type checking functions for different AST node types.
 * Each property of this object corresponds to a specific AST node type, and its value is a type checking function for that node type.
 * The type checking function takes in two parameters: `comp` (the AST node to be type checked) and `te` (the type environment).
 * It returns the inferred type of the AST node.
 */
const type_comp = {
    Integer: (comp, te) => {
        if (!is_integer(comp.value)) {
            throw new Error('Type checker: Expected number, got ' + comp.value);
        }
        return new IntegerType();
    },

    Boolean: (comp, te) => {
        if (!is_boolean(comp.value)) {
            throw new Error('Type checker: Expected boolean, got ' + comp.value);
        }
        return new BooleanType();
    },
    String: (comp, te) => {
        if (!is_string(comp.value)) {
            throw new Error('Type checker: Expected string, got ' + comp.value);
        }
        return new StringType();
    },
    Null: (comp, te) => {
        if (!is_null(comp.value)) {
            throw new Error('Type checker: Expected null, got ' + comp.value);
        }
        return new NullType();
    },
    Name: (comp, te) => {
        log('Name');
        log(unparse(comp));
        let ret_type = lookup_type(comp.name, te);
        log('Exiting Name, returning', ret_type);
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
        log('IfStatement: t0', t0);
        if (!is_type(t0, BooleanType)) {
            throw new Error('expected predicate type: Boolean, got ' + t0);
        }
        const t1 = type(comp.consequent, te);
        log('IfStatement: t1', t1);
        const t2 = type(comp.alternate, te);
        log('IfStatement: t2', t2);
        if (in_func) {
            if (is_type(t1, ReturnType) && equal_type(t1, t2)) {
                return t1;
            } else {
                log('IfStatement: t1', t1, 't2', t2);
                log('Not equal');
            }
        }

        return new NullType();
    },
    FunctionDeclaration: (comp, te) => {
        log('FunctionDeclaration');
        log(JSON.stringify(comp, null, 2));
        const new_te = extend_type_environment(
            comp.params.map(p => p.name),
            comp.params.map(p => getType(p, te)),
            te
        );

        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;

        in_func = true;
        expected_ret = comp.type.ret;
        log('FunctionDeclaration: expected_ret', expected_ret);
        let ret_type = type(comp.body, new_te);

        log(
            'FunctionDeclaration: Got ret_type: ',
            unparse_types(ret_type),
            'Expected ret_type: ',
            unparse_types(expected_ret)
        );

        if (!is_type(ret_type, ReturnType)) {
            ret_type = new ReturnType(new NullType());
        }

        if (!equal_type(ret_type.type, expected_ret)) {
            throw new Error(
                'type error in function declaration; declared return type: ' +
                    unparse_types(expected_ret) +
                    ', actual return type: ' +
                    unparse_types(ret_type.type)
            );
        }

        in_func = prev_in_func;
        expected_ret = prev_expected_ret;
    },
    LambdaDeclaration: (comp, te) => {
        const new_te = extend_type_environment(
            comp.params.map(p => p.name),
            comp.params.map(p => getType(p, te)),
            te
        );

        const t = getType(comp, te);
        log('LambdaDeclaration: t', t);
        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;
        in_func = true;
        expected_ret = t.ret;
        log('LambdaDeclaration: expected_ret', expected_ret);
        let ret_type = type(comp.body, new_te);
        log('LambdaDeclaration: Got ret_type: ', ret_type, 'Expected ret_type: ', expected_ret);

        if (!is_type(ret_type, ReturnType)) {
            ret_type = new ReturnType(new NullType());
        }

        log('LambdaDeclaration: ret_type', ret_type);
        if (!equal_type(ret_type.type, expected_ret)) {
            throw new Error(
                'type error in lambda declaration; declared return type: ' +
                    unparse_types(expected_ret) +
                    ', actual return type: ' +
                    unparse_types(ret_type.type)
            );
        }

        in_func = prev_in_func;
        expected_ret = prev_expected_ret;
        log('LambdaDeclaration: t', t);
        return t;
    },
    MethodDeclaration: (comp, te) => {
        // Check if the receiver type is a struct
        if (comp.receiver.type.tag !== types.Struct || !StructTable[comp.receiver.type.name]) {
            throw new Error('receiver type must be a struct');
        }

        StructTable[comp.receiver.type.name].methods.push({
            methodName: comp.id.name,
            params: comp.params,
            body: comp.body,
            type: comp.type,
            receiver: comp.receiver.name.name,
        });

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
        log(JSON.stringify(comp, null, 2));
        const fun_type = type(comp.callee, te);
        log('fun_type', fun_type);
        if (!is_type(fun_type, FunctionType)) {
            throw new Error(
                'type error in application; function ' +
                    'expression must have function type; ' +
                    'actual type: ' +
                    unparse_types(fun_type)
            );
        }
        const expected_arg_types = fun_type.args;
        // The reason we need to flatten the arguments is because the arguments can be nested
        // e.g.
        // f(g(x), h(y))
        // The arguments are [g(x), h(y)]
        // The types of the arguments are [[Integer], [Integer]]
        // We need to flatten the types to [Integer, Integer]
        const actual_arg_types = comp.arguments.map(e => type(e, te)).flat();
        log('expected_arg_types', expected_arg_types);
        log('actual_arg_types', actual_arg_types);

        if (expected_arg_types.length !== actual_arg_types.length) {
            throw new Error(
                'type error in application; ' +
                    'expected number of arguments: ' +
                    expected_arg_types.length +
                    ', ' +
                    'actual number of arguments: ' +
                    actual_arg_types.length
            );
        }

        for (let i = 0; i < expected_arg_types.length; i++) {
            if (!equal_type(expected_arg_types[i], actual_arg_types[i])) {
                throw new Error(
                    'type error in application; ' +
                        'expected type: ' +
                        unparse_types(expected_arg_types[i]) +
                        ', ' +
                        'actual type: ' +
                        unparse_types(actual_arg_types[i])
                );
            }
        }

        log('Returning', fun_type.ret);
        log('Exiting CallExpression');

        return fun_type.ret;
    },
    ConstantDeclaration: (comp, te) => {
        log('ConstantDeclaration');
        const actual_type = type(comp.expression, te);
        log(actual_type);
        log('Exiting ConstantDeclaration');
        return actual_type;
    },
    VariableDeclaration: (comp, te) => {
        log('VariableDeclaration');
        const actual_type = comp.expression ? type(comp.expression, te) : types.Any;
        const prev_type = lookup_type(comp.id.name, te);
        log('VariableDeclaration: actual_type', actual_type, 'comp.type', prev_type);

        if (!equal_type(prev_type, actual_type)) {
            throw new Error(
                'type error in variable declaration; ' +
                    'expected type: ' +
                    unparse_types(comp.type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(actual_type)
            );
        }

        log(actual_type);
        log('Exiting VariableDeclaration');
        return actual_type;
    },
    SequenceStatement: (comp, te) => {
        log('SequenceStatement');
        log(JSON.stringify(comp, null, 2));
        let latest_type: Type = new NullType();
        let stmt;
        let new_type;
        for (let i = 0; i < comp.body.length; i++) {
            stmt = comp.body[i];
            new_type = type(stmt, te);
            latest_type = new_type;
            if (is_type(new_type, ReturnType)) {
                break;
            }
        }
        log('Exiting SequenceStatement, returning', latest_type);
        return latest_type;
    },
    BlockStatement: (comp, te) => {
        // scan out declarations
        log('BlockStatement');
        log(JSON.stringify(comp, null, 2));

        // Capture all struct declarations
        const struct_decls = comp.body.body.filter(comp => comp.tag === 'StructDeclaration');
        for (let i = 0; i < struct_decls.length; i++) {
            log('StructDeclaration for', struct_decls[i].id.name);
            const comp = struct_decls[i];

            log(JSON.stringify(comp, null, 2));
            log('StructTable: ', StructTable);
            if (StructTable.has(comp.id.name)) {
                throw new Error('struct ' + comp.id.name + ' already exists');
            }

            const structInfo = new StructType(comp.id.name, []);
            StructTable.set(comp.id.name, structInfo);

            log('Fields: ', unparse(comp.fields));
            const fields = comp.fields.map(f => {
                return getType(f, te);
            });
            log('Fields: ', fields);
            // There can be no methods declared at the StructDeclaration level
            structInfo.fields = fields;
            log('Exiting StructDeclaration');
        }

        // Capture all method declarations
        const method_decls = comp.body.body.filter(comp => comp.tag === 'MethodDeclaration');
        for (let i = 0; i < method_decls.length; i++) {
            log('MethodDeclaration for', method_decls[i].id.name);
            type(method_decls[i], te);
        }

        const decls = comp.body.body.filter(
            comp =>
                comp.tag === 'VariableDeclaration' ||
                comp.tag === 'FunctionDeclaration' ||
                comp.tag === 'ConstantDeclaration'
        );

        const decls_known_type = decls.filter(comp => comp.type !== 'Unknown');

        let extended_te = extend_type_environment([], [], te);

        for (let i = 0; i < decls_known_type.length; i++) {
            log(
                'VariableDeclaration for',
                decls_known_type[i].id.name,
                unparse(decls_known_type[i])
            );
            log('Getting type for', decls_known_type[i].type);
            let t = getType(decls_known_type[i], extended_te);
            decls_known_type[i].type = t;
            log('VariableDeclaration: t', t);
            extended_te = extend_current_type_environment(
                [decls_known_type[i].id.name],
                [t],
                extended_te
            );
        }

        const decls_method = comp.body.body.filter(comp => comp.tag === 'MethodDeclaration');
        for (let i = 0; i < decls_method.length; i++) {
            log('MethodDeclaration for', decls_method[i].id.name);
            type(decls_method[i], extended_te);
        }
        // log('Extended type environment');
        // log(JSON.stringify(extended_te));
        const decls_unknown_type = decls.filter(comp => comp.type === 'Unknown');
        log('Unknown type declarations');
        log(JSON.stringify(decls_unknown_type, null, 2));
        let extended_te2 = extended_te;
        // We have to use a for loop here because one unknown type declaration can depend on another
        for (let i = 0; i < decls_unknown_type.length; i++) {
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
    ReturnStatement: (comp, te) => {
        if (comp.expression === null) {
            return new ReturnType(new NullType());
        }
        let ret_type = type(comp.expression, te);
        log('ReturnStatement: ret_type', ret_type);
        log('Expected return type', expected_ret);
        if (in_func) {
            if (!equal_type(ret_type, expected_ret)) {
                throw new Error(
                    'type error in return statement; ' +
                        'expected return type: ' +
                        unparse_types(expected_ret) +
                        ', ' +
                        'actual return type: ' +
                        unparse_types(ret_type)
                );
            }
        } else {
            throw new Error('return statement outside of function');
        }
        const to_return = new ReturnType(ret_type);
        log('Exiting ReturnStatement, returning', to_return);
        return to_return;
    },
    AssignmentExpression: (comp, te) => {
        log('AssignmentExpression');
        log(JSON.stringify(comp, null, 2));
        const id_type = type(comp.left, te);
        const expr_type = type(comp.right, te);
        if (!equal_type(id_type, expr_type)) {
            throw new Error(
                'type error in assignment; ' +
                    'expected type: ' +
                    unparse_types(id_type) +
                    ', ' +
                    'actual type: ' +
                    unparse_types(expr_type)
            );
        }
        log('Exiting AssignmentExpression');
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
    GoroutineCallExpression: (comp, te) =>
        type(
            {
                tag: 'CallExpression',
                callee: comp.callee,
                arguments: comp.arguments,
            },
            te
        ),
    GoroutineDeclaration: (comp, te) => type(comp.expression, te),
    ForStatement: (comp, te) => {
        log('ForStatement');
        log(JSON.stringify(comp, null, 2));
        // we need to extend the type environment with the type of the init expression, init can be null
        if (comp.init && comp.init.tag !== 'VariableDeclaration') {
            throw new Error('for loop init expression must be a variable declaration');
        }
        const extended_te = comp.init
            ? extend_type_environment([comp.init.id.name], [type(comp.init.expression, te)], te)
            : te;
        log('ForStatement: extended_te', extended_te);
        // check the test expression, this can be null as well
        const t0 = comp.test ? type(comp.test, extended_te) : types.Boolean;
        log('ForStatement: t0', t0);
        if (!is_type(t0, BooleanType)) {
            throw new Error('expected predicate type: Boolean, got ' + t0);
        }
        // check the update expression, this can be null as well
        // the update expression should either be a CallExpression or an AssignmentExpression
        const t1 = comp.update ? type(comp.update, extended_te) : new NullType();
        log('ForStatement: update type: ', t1);
        const t2 = comp.body ? type(comp.body, extended_te) : new NullType();
        log('ForStatement: body type: ', t2);
        return new NullType();
    },
    BreakStatement: (comp, te) => new NullType(),
    ContinueStatement: (comp, te) => new NullType(),
    StructDeclaration: (comp, te) => {
        return new NullType();
    },
    StructInitializer: (comp, te) => {
        log('StructInitializer');
        log(JSON.stringify(comp, null, 2));
        const struct = StructTable[comp.type.name];
        log(struct);
        if (!struct) {
            throw new Error('struct ' + comp.type.name + ' not found');
        }

        if (comp.named) {
            // Allow for fewer fields if they are named, the rest will be set to the 0 value of their type
            if (struct.fields.length < comp.fields.length) {
                throw new Error(
                    'expected ' + struct.fields.length + ' fields, got ' + comp.fields.length
                );
            }

            // Check that there are no duplicate fields
            const field_names = comp.fields.map(f => f.name.name);
            const unique_field_names = new Set(field_names);
            if (field_names.length !== unique_field_names.size) {
                throw new Error('duplicate field names in struct initializer');
            }

            // Check that all fields are present in the struct
            for (let i = 0; i < comp.fields.length; i++) {
                const field = comp.fields[i];
                const struct_field = struct.fields.find(f => f.name === field.name.name);
                if (!struct_field) {
                    throw new Error(
                        'field ' + field.name.name + ' not found in struct ' + comp.type.name
                    );
                }
                const field_type = type(field.value, te);
                if (!equal_type(field_type, struct_field.type)) {
                    throw new Error(
                        'type error in struct initializer; ' +
                            'expected type: ' +
                            unparse_types(struct_field.type) +
                            ', ' +
                            'actual type: ' +
                            unparse_types(field_type)
                    );
                }
            }
        } else {
            if (struct.fields.length !== comp.fields.length) {
                throw new Error(
                    'expected ' + struct.fields.length + ' fields, got ' + comp.fields.length
                );
            }

            for (let i = 0; i < comp.fields.length; i++) {
                const field = comp.fields[i];
                const field_type = type(field, te);
                if (!equal_type(field_type, struct.fields[i].type)) {
                    throw new Error(
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

        log('Exiting StructInitializer');
        return { tag: types.Struct, name: comp.type.name };
    },
    MemberExpression: (comp, te) => {
        log('MemberExpression');
        log(JSON.stringify(comp, null, 2));
        const obj_type = type(comp.object, te);
        if (obj_type.tag !== types.Struct || !StructTable[obj_type.name]) {
            throw new Error('expected struct type, got ' + unparse_types(obj_type));
        }
        const struct = StructTable[obj_type.name];
        const field = struct.fields.find(f => f.name === comp.property.name);
        const method = struct.methods.find(m => m.methodName === comp.property.name);
        log('Method:');
        log(JSON.stringify(method, null, 2));
        if (!field && !method) {
            throw new Error(
                'field or method ' + comp.property.name + ' not found in struct ' + obj_type.name
            );
        }
        log('Exiting MemberExpression');
        return field
            ? field.type
            : {
                  tag: 'Method',
                  args: method.params.map(p => p.type),
                  res: method.type,
                  receiver: method.receiver,
              };
    },
};

/**
 * Type checks the given component using the provided type environment.
 * @param {any} comp - The component to be type checked.
 * @param {any} te - The type environment.
 * @returns {any} - The result of type checking the component.
 */
const type = (comp, te): Type => {
    log('type');
    log(JSON.stringify(comp, null, 2));
    const t: Type = type_comp[comp.tag](comp, te);
    log('exiting type');
    return t;
};

/**
 * Checks the types of the given program.
 *
 * @param program - The program to check the types for.
 * @returns A copy of the program where all unknown types have been resolved.
 */
export function checkTypes(program: object) {
    log('Checking types');
    // Make a deep copy of the program
    let program_copy = JSON.parse(JSON.stringify(program));
    const t = type(program_copy, global_type_environment);
    log('Exiting checkTypes, returning', t);
    // This is a copy of the program where all unknown types have been resolved
    log(JSON.stringify(program_copy, null, 2));
    return program_copy;
}
