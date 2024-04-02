import { pair, head, tail, error } from '../utils/utils.js';
import debug from 'debug';
const log = debug('ooga:typechecker');

const types = {
    Any: 'Any',
    Integer: 'Integer',
    Boolean: 'Boolean',
    String: 'String',
    Null: 'Null',
};

function is_integer(x) {
    return typeof x === 'number' && x % 1 === 0;
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
    return JSON.stringify(t);
};

const equal_type = (ts1, ts2) => {
    // ts1 and ts2 can be either a string or an array of strings
    // types.Any is a special type that can be used to match any type
    log('equal_type', ts1, ts2);
    if (ts1 === ts2) {
        return true;
    }
    if (typeof ts1 === 'string' && typeof ts2 === 'string') {
        return ts1 === types.Any || ts2 === types.Any;
    }
    if (typeof ts1 === 'string') {
        return ts2.length === 1 && (ts2[0] === ts1 || ts2[0] === types.Any);
    }
    if (typeof ts2 === 'string') {
        return ts1.length === 1 && (ts1[0] === ts2 || ts1[0] === types.Any);
    }
    if (ts1.length !== ts2.length) {
        return false;
    }
    for (let i = 0; i < ts1.length; i++) {
        if (!equal_type(ts1[i], ts2[i])) {
            return false;
        }
    }
    return true;
};

const unary_arith_type = { tag: 'Function', args: [types.Integer], res: [types.Integer] };

const binary_arith_type = {
    tag: 'Function',
    args: [types.Integer, types.Integer],
    res: [types.Integer],
};

const number_comparison_type = {
    tag: 'Function',
    args: [types.Integer, types.Integer],
    res: [types.Boolean],
};

const binary_bool_type = {
    tag: 'Function',
    args: [types.Boolean, types.Boolean],
    res: [types.Boolean],
};

const unary_bool_type = { tag: 'Function', args: [types.Boolean], res: [types.Boolean] };

const binary_equal_type = {
    tag: 'Function',
    args: [types.Any, types.Any],
    res: [types.Boolean],
};

const global_type_frame = {
    undefined: 'undefined',
    math_E: 'number',
    math_PI: 'number',
    math_sin: unary_arith_type,
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
    print: { tag: 'Function', args: [types.Any], res: [types.Null] },
};

// A type environment is null or a pair
// whose head is a frame and whose tail
// is a type environment.
const empty_type_environment = null;
const global_type_environment = pair(global_type_frame, empty_type_environment);

const lookup_type = (x, e) =>
    e === null
        ? error('unbound name: ' + x)
        : head(e).hasOwnProperty(x)
          ? head(e)[x]
          : lookup_type(x, tail(e));

const extend_type_environment = (xs, ts, e) => {
    if (ts.length > xs.length) error('too few parameters in function declaration');
    if (ts.length < xs.length) error('too many parameters in function declaration');
    if (xs.length === 0) return e;
    log('Extending type environment with', xs, ts);
    const new_frame = {};
    for (let i = 0; i < xs.length; i++) new_frame[xs[i]] = ts[i];
    return pair(new_frame, e);
};

const extend_current_type_environment = (xs, ts, e) => {
    if (ts.length > xs.length) error('too few parameters in function declaration');
    if (ts.length < xs.length) error('too many parameters in function declaration');
    log('Extending current type environment with', xs, ts);
    // add the types to the current frame
    for (let i = 0; i < xs.length; i++) head(e)[xs[i]] = ts[i];
    return e;
};

let in_func = false;
let expected_ret;
// type_comp has the typing
// functions for each component tag
const type_comp = {
    Integer: (comp, te) =>
        is_integer(comp.value) ? types.Integer : error('expected number, got ' + comp.value),
    Boolean: (comp, te) =>
        is_boolean(comp.value) ? types.Boolean : error('expected bool, got ' + comp.value),
    String: (comp, te) =>
        is_string(comp.value) ? types.String : error('expected string, got ' + comp.value),
    Null: (comp, te) =>
        is_null(comp.value) ? types.Null : error('expected null, got ' + comp.value),
    Name: (comp, te) => {
        log('Name');
        log(JSON.stringify(comp, null, 2));
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
        if (!equal_type(t0, types.Boolean)) error('expected predicate type: Boolean, got ' + t0);
        const t1 = type(comp.consequent, te);
        log('IfStatement: t1', t1);
        const t2 = type(comp.alternate, te);
        log('IfStatement: t2', t2);
        if (in_func) {
            if (equal_type(t1, t2)) return t1;
        }
        return 'null';
    },
    FunctionDeclaration: (comp, te) => {
        const new_te = extend_type_environment(
            comp.params.map(p => p.name),
            comp.params.map(p => p.type),
            te
        );

        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;

        in_func = true;
        expected_ret = comp.type;
        let ret_type = type(comp.body, new_te);
        log('FunctionDeclaration: Got ret_type: ', ret_type, 'Expected ret_type: ', expected_ret);
        if (ret_type?.tag !== 'ret') {
            ret_type = { tag: 'ret', type: [types.Null] };
        }

        if (!equal_type(ret_type.type, expected_ret)) {
            error(
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
            comp.params.map(p => p.type),
            te
        );

        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;

        in_func = true;
        expected_ret = comp.type;
        let ret_type = type(comp.body, new_te);
        log('LambdaDeclaration: Got ret_type: ', ret_type, 'Expected ret_type: ', expected_ret);
        if (ret_type?.tag !== 'ret') {
            ret_type = { tag: 'ret', type: [types.Null] };
        }

        if (!equal_type(ret_type.type, expected_ret)) {
            error(
                'type error in function declaration; declared return type: ' +
                    unparse_types(expected_ret) +
                    ', actual return type: ' +
                    unparse_types(ret_type.type)
            );
        }

        in_func = prev_in_func;
        expected_ret = prev_expected_ret;

        return { tag: 'Function', args: comp.params.map(p => p.type), res: comp.type };
    },
    CallExpression: (comp, te) => {
        log('CallExpression');
        log(JSON.stringify(comp, null, 2));
        const fun_type = type(comp.callee, te);
        log('fun_type', fun_type);
        if (fun_type.tag !== 'Function')
            error(
                'type error in application; function ' +
                    'expression must have function type; ' +
                    'actual type: ' +
                    unparse_types(fun_type)
            );
        const expected_arg_types = fun_type.args;
        const actual_arg_types = comp.arguments.map(e => type(e, te));

        if (!equal_type(actual_arg_types, expected_arg_types)) {
            error(
                'type error in application; ' +
                    'expected argument types: ' +
                    unparse_types(expected_arg_types) +
                    ', ' +
                    'actual argument types: ' +
                    unparse_types(actual_arg_types)
            );
        }

        log('Exiting CallExpression');
        return fun_type.res;
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
        const actual_type = type(comp.expression, te);
        const prev_type = lookup_type(comp.id.name, te);
        log('VariableDeclaration: actual_type', actual_type, 'comp.type', prev_type);

        if (!equal_type(prev_type, actual_type)) {
            error(
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
        let latest_type = types.Null;
        let stmt;
        let new_type;
        for (let i = 0; i < comp.body.length; i++) {
            stmt = comp.body[i];
            new_type = type(stmt, te);
            latest_type = new_type;
            if (new_type?.tag === 'ret') {
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
        const decls = comp.body.body.filter(
            comp =>
                comp.tag === 'VariableDeclaration' ||
                comp.tag === 'FunctionDeclaration' ||
                comp.tag === 'ConstantDeclaration'
        );
        const decls_known_type = decls.filter(comp => comp.type !== 'Unknown');
        const extended_te = extend_type_environment(
            decls_known_type.map(comp => comp.id.name),
            decls_known_type.map(comp =>
                comp.tag === 'VariableDeclaration'
                    ? comp.type
                    : { tag: 'Function', args: comp.params.map(p => p.type), res: comp.type }
            ),
            te
        );
        // log('Extended type environment');
        // log(JSON.stringify(extended_te));
        const decls_unknown_type = decls.filter(comp => comp.type === 'Unknown');
        log('Unknown type declarations');
        log(JSON.stringify(decls_unknown_type, null, 2));
        const extended_te2 = extend_current_type_environment(
            decls_unknown_type.map(comp => comp.id.name),
            decls_unknown_type.map(comp => type(comp.expression, extended_te)),
            extended_te
        );
        log('Extended type environment 2');
        log(JSON.stringify(extended_te2, null, 2));
        const ret_type = type(comp.body, extended_te2);
        log('Exiting BlockStatement, returning', ret_type);
        return ret_type;
    },
    ReturnStatement: (comp, te) => {
        if (comp.expression === null) {
            return { tag: 'ret', type: [types.Null] };
        }
        let ret_type = type(comp.expression, te);
        if (in_func) {
            if (!equal_type(ret_type, expected_ret)) {
                error(
                    'type error in return statement; ' +
                        'expected return type: ' +
                        unparse_types(expected_ret) +
                        ', ' +
                        'actual return type: ' +
                        unparse_types(ret_type)
                );
            }
        }
        return { tag: 'ret', type: Array.isArray(ret_type) ? ret_type : [ret_type] };
    },
    AssignmentExpression: (comp, te) => {
        log('AssignmentExpression');
        log(JSON.stringify(comp, null, 2));
        const id_type = type(comp.left, te);
        const expr_type = type(comp.right, te);
        if (!equal_type(id_type, expr_type)) {
            error(
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
            error('for loop init expression must be a variable declaration');
        }
        const extended_te = comp.init
            ? extend_type_environment([comp.init.id.name], [type(comp.init.expression, te)], te)
            : te;
        log('ForStatement: extended_te', extended_te);
        // check the test expression, this can be null as well
        const t0 = comp.test ? type(comp.test, extended_te) : types.Boolean;
        log('ForStatement: t0', t0);
        if (!equal_type(t0, types.Boolean)) {
            error('expected predicate type: Boolean, got ' + t0);
        }
        // check the update expression, this can be null as well
        // the update expression should either be a CallExpression or an AssignmentExpression
        const t1 = comp.update ? type(comp.update, extended_te) : types.Null;
        log('ForStatement: t1', t1);
        const t2 = type(comp.body, extended_te);
        log('ForStatement: t2', t2);
        return types.Null;
    },
    BreakStatement: (comp, te) => types.Null,
    ContinueStatement: (comp, te) => types.Null,
};

const type = (comp, te) => {
    log('type');
    log(JSON.stringify(comp, null, 2));
    log('exiting type');
    return type_comp[comp.tag](comp, te);
};

export function checkTypes(program: object) {
    log('Checking types');
    return type(program, global_type_environment);
}
