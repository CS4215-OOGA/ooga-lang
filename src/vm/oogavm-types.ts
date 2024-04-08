import debug from 'debug';
import { unparse } from '../utils/utils.js';

const log = debug('ooga:vm:types');

export class Type {
    is_const: boolean;
    name: string;

    constructor(name: string, is_const: boolean = false) {
        this.name = name;
        this.is_const = is_const;
    }
}

export class IntegerType extends Type {
    constructor(is_const: boolean = false) {
        super('Integer', is_const);
    }
}

export class FloatType extends Type {
    constructor(is_const: boolean = false) {
        super('Float', is_const);
    }
}

export class BooleanType extends Type {
    constructor(is_const: boolean = false) {
        super('Boolean', is_const);
    }
}

export class StringType extends Type {
    constructor(is_const: boolean = false) {
        super('String', is_const);
    }
}

export class AnyType extends Type {
    constructor(is_const: boolean = false) {
        super('Any', is_const);
    }
}

export class NullType extends Type {
    constructor(is_const: boolean = false) {
        super('Null', is_const);
    }
}

export class FunctionType extends Type {
    args: Type[];
    ret: Type;

    constructor(args: Type[], ret: Type, is_const: boolean = false) {
        super('Function', is_const);
        this.args = args;
        this.ret = ret;
    }
}

export class MethodType extends FunctionType {
    methodName: string;
    isPointer: boolean;
    constructor(
        methodName: string,
        args: Type[],
        ret: Type,
        is_pointer: boolean = true,
        is_const: boolean = false
    ) {
        super(args, ret, is_const);
        this.methodName = methodName;
        this.isPointer = is_pointer;
        this.name = 'Method';
    }
}

export class StructField extends Type {
    fieldName: string;
    type: Type;

    constructor(fieldName: string, type: Type, is_const: boolean = false) {
        super('StructField', is_const);
        this.fieldName = fieldName;
        this.type = type;
    }
}

export class StructType extends Type {
    structName: string;
    fields: StructField[];
    methods: MethodType[];
    constructor(structName: string, fields: StructField[], is_const: boolean = false) {
        super('Struct', is_const);
        this.structName = structName;
        this.fields = fields;
        this.methods = [];
    }
}

export class ReturnType extends Type {
    type: Type;

    constructor(type: Type, is_const: boolean = false) {
        super('Return', is_const);
        this.type = type;
    }
}

export class ArrayType extends Type {
    elem_type: Type;
    length: number;
    is_array: boolean;

    constructor(
        elem_type: Type,
        length: number,
        is_array: boolean = false,
        is_const: boolean = false
    ) {
        super('Array', is_const);
        this.elem_type = elem_type;
        this.length = length;
        this.is_array = is_array;
    }
}

export function is_type(ts1: Type, ts2: Function) {
    return ts1 instanceof ts2;
}

export function equal_type(ts1: Type, ts2: Type, cache = new Set<string>()): boolean {
    const cache_key = `${unparse(ts1)}:${unparse(ts2)}`;

    if (cache.has(cache_key)) {
        return true;
    }

    cache.add(cache_key);

    if (ts1 instanceof AnyType || ts2 instanceof AnyType) {
        return true;
    }

    if (ts1 instanceof NullType && ts2 instanceof NullType) {
        return true;
    }

    if (ts1 instanceof IntegerType && ts2 instanceof IntegerType) {
        return true;
    }

    if (ts1 instanceof FloatType && ts2 instanceof FloatType) {
        return true;
    }

    if (ts1 instanceof BooleanType && ts2 instanceof BooleanType) {
        return true;
    }

    if (ts1 instanceof StringType && ts2 instanceof StringType) {
        return true;
    }

    if (ts1 instanceof ArrayType && ts2 instanceof ArrayType) {
        const result =
            equal_type(ts1.elem_type, ts2.elem_type, cache) &&
            ts1.is_array === ts2.is_array &&
            (ts1.is_array ? ts1.length === ts2.length : true);

        return result;
    }

    if (ts1 instanceof StructType && ts2 instanceof StructType) {
        log('Comparing struct types', ts1, ts2);
        if (ts1.structName !== ts2.structName) {
            log('Struct names do not match');

            return false;
        }

        if (ts1.fields.length !== ts2.fields.length) {
            log('Field lengths do not match');

            return false;
        }

        // Check fields
        for (let i = 0; i < ts1.fields.length; i++) {
            log('Comparing field', ts1.fields[i], ts2.fields[i]);
            if (!equal_type(ts1.fields[i].type, ts2.fields[i].type, cache)) {
                log('Field types do not match', ts1.fields[i].type, ts2.fields[i].type);

                return false;
            }
        }

        // Check methods
        if (ts1.methods.length !== ts2.methods.length) {
            log('Method lengths do not match');

            return false;
        }

        for (let i = 0; i < ts1.methods.length; i++) {
            if (!equal_type(ts1.methods[i], ts2.methods[i], cache)) {
                log('Method types do not match');

                return false;
            }
        }

        return true;
    }

    if (ts1 instanceof FunctionType && ts2 instanceof FunctionType) {
        if (ts1.args.length !== ts2.args.length) {
            return false;
        }

        for (let i = 0; i < ts1.args.length; i++) {
            if (!equal_type(ts1.args[i], ts2.args[i], cache)) {
                return false;
            }
        }

        if (!equal_type(ts1.ret, ts2.ret)) {
            return false;
        }

        return true;
    }

    if (ts1 instanceof ReturnType && ts2 instanceof ReturnType) {
        const result = equal_type(ts1.type, ts2.type, cache);

        return result;
    }

    return false;
}
