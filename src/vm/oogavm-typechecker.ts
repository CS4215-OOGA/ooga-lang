function array_test(x) {
    if (Array.isArray === undefined) {
        return x instanceof Array;
    } else {
        return Array.isArray(x);
    }
}

function pair(x, xs) {
    return [x, xs];
}

function is_pair(x) {
    return array_test(x) && x.length === 2;
}

function head(xs) {
    if (is_pair(xs)) {
        return xs[0];
    } else {
        throw new Error('head(xs) expects a pair as argument xs, but encountered ' + xs);
    }
}

function tail(xs) {
    if (is_pair(xs)) {
        return xs[1];
    } else {
        throw new Error('tail(xs) expects a pair as argument xs, but encountered ' + xs);
    }
}

function error(value, ...strs) {
    const output = (strs[0] === undefined ? '' : strs[0] + ' ') + (0, stringify_1.stringify)(value);
    throw new Error(output);
}

function is_number(x) {
    return typeof x === 'number';
}

function is_boolean(x) {
    return typeof x === 'boolean';
}

function is_undefined(x) {
    return x === undefined;
}

function is_null(x) {
    return x === null;
}

function is_string(x) {
    return typeof x === 'string';
}

const unparse_types = ts =>
    ts.length === 0
        ? 'null'
        : ts.reduce((s, t) => (s === '' ? unparse_type(t) : s + ', ' + unparse_type(t)), '');
const unparse_type = t => {
    return is_string(t)
        ? t
        : t.tag === 'fun'
          ? '(' + unparse_types(t.args) + ' > ' + unparse_type(t.res) + ')'
          : // t is ret
            t.type;
};

const equal_types = (ts1, ts2) => unparse_types(ts1) === unparse_types(ts2);

const equal_type = (t1, t2) => unparse_type(t1) === unparse_type(t2);

const unary_arith_type = { tag: 'fun', args: ['number'], res: 'number' };

const binary_arith_type = {
    tag: 'fun',
    args: ['number', 'number'],
    res: 'number',
};

const number_comparison_type = {
    tag: 'fun',
    args: ['number', 'number'],
    res: 'bool',
};

const binary_bool_type = { tag: 'fun', args: ['bool'], res: 'bool' };

const unary_bool_type = { tag: 'fun', args: ['bool'], res: 'bool' };

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
    const new_frame = {};
    for (let i = 0; i < xs.length; i++) new_frame[xs[i]] = ts[i];
    return pair(new_frame, e);
};

let in_func = false;
let expected_ret;
// type_comp has the typing
// functions for each component tag
const type_comp = {
    Integer: (comp, te) =>
        is_number(comp.value) ? 'number' : error('expected number, got ' + comp.value),
    Boolean: (comp, te) =>
        is_boolean(comp.value) ? 'bool' : error('expected bool, got ' + comp.value),
    String: (comp, te) =>
        is_string(comp.value) ? 'string' : error('expected string, got ' + comp.value),
    Null: (comp, te) => (is_null(comp.value) ? 'null' : error('expected null, got ' + comp.value)),
    Name: (comp, te) => lookup_type(comp.name, te),
    UpdateExpression: (comp, te) =>
        type(
            { tag: 'CallExpression', callee: { tag: 'Name', name: '++' }, arguments: [comp.id] },
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
        if (t0 !== 'bool') error('expected predicate type: bool, got ' + t0);
        const t1 = type(comp.consequent, te);
        const t2 = type(comp.alternate, te);
        if (in_func) {
            if (equal_type(t1, t2)) return t1;
        }
        return 'null';
    },
    FunctionDeclaration: (comp, te) => {
        const new_te = extend_type_environment(
            comp.params,
            comp.params.map(p => p.type),
            te
        );
        const ret_type = type(comp.body, new_te);
        if (in_func) {
            if (equal_type(ret_type, expected_ret))
                return { tag: 'fun', args: comp.params.map(p => p.type), res: ret_type };
        }
        return 'undefined';
    },
    // LOOK HERE:
    // type checking of function declarations
    // is missing. Homework consists of properly
    // checking function declarations.
    fun: (comp, te) => {
        if (comp.prms.length > comp.type.args.length) {
            error('too many parameters in function declaration');
        } else if (comp.prms.length < comp.type.args.length) {
            error('too few parameters in function declaration');
        }
        const new_te = extend_type_environment(comp.prms, comp.type.args, te);

        let prev_in_func = in_func;
        let prev_expected_ret = expected_ret;
        in_func = true;
        expected_ret = comp.type.res;
        let ret_type = type(comp.body, new_te);
        in_func = prev_in_func;
        expected_ret = prev_expected_ret;

        if (ret_type?.tag !== 'ret') {
            ret_type = { tag: 'ret', type: 'undefined' };
        }

        if (!equal_type(ret_type.type, comp.type.res)) {
            error(
                'type error in function declaration; declared return type: ' +
                    unparse_type(comp.type.res) +
                    ', actual return type: ' +
                    unparse_type(ret_type.type)
            );
        }

        return 'undefined';
    },
    app: (comp, te) => {
        const fun_type = type(comp.fun, te);
        if (fun_type.tag !== 'fun')
            error(
                'type error in application; function ' +
                    'expression must have function type; ' +
                    'actual type: ' +
                    unparse_type(fun_type)
            );
        const expected_arg_types = fun_type.args;
        const actual_arg_types = comp.args.map(e => type(e, te));
        if (equal_types(actual_arg_types, expected_arg_types)) {
            return fun_type.res;
        } else {
            error(
                'type error in application; ' +
                    'expected argument types: ' +
                    unparse_types(expected_arg_types) +
                    ', ' +
                    'actual argument types: ' +
                    unparse_types(actual_arg_types)
            );
        }
    },
    const: (comp, te) => {
        const declared_type = lookup_type(comp.sym, te);
        const actual_type = type(comp.expr, te);
        if (equal_type(actual_type, declared_type)) {
            return 'undefined';
        } else {
            error(
                'type error in constant declaration; ' +
                    'declared type: ' +
                    unparse_type(declared_type) +
                    ', ' +
                    'actual type: ' +
                    unparse_type(actual_type)
            );
        }
    },
    seq: (comp, te) => {
        const component_types = [];
        let stmt;
        let new_type;
        for (let i = 0; i < comp.stmts.length; i++) {
            stmt = comp.stmts[i];
            new_type = type(stmt, te);
            component_types.push(new_type);
            if (new_type?.tag === 'ret') {
                break;
            }
        }
        return component_types.length === 0
            ? 'undefined'
            : component_types[component_types.length - 1];
    },
    blk: (comp, te) => {
        // scan out declarations
        const decls = comp.body.stmts.filter(comp => comp.tag === 'const' || comp.tag === 'fun');
        const extended_te = extend_type_environment(
            decls.map(comp => comp.sym),
            decls.map(comp => comp.type),
            te
        );
        return type(comp.body, extended_te);
    },
    ret: (comp, te) => {
        return { tag: 'ret', type: type(comp.expr, te) };
    },
};

const type = (comp, te) => type_comp[comp.tag](comp, te);

export function checkType(program: object) {
    return type(program, global_type_environment);
}
