import debug from 'debug';

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
    constructor(methodName: string, args: Type[], ret: Type, is_const: boolean = false) {
        super(args, ret, is_const);
        this.methodName = methodName;
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

    constructor(elem_type: Type, is_const: boolean = false) {
        super('Array', is_const);
        this.elem_type = elem_type;
    }
}

export function is_type(ts1: Type, ts2: Function) {
    return ts1 instanceof ts2;
}

export function equal_type(ts1: Type, ts2: Type) {
    if (ts1 instanceof AnyType || ts2 instanceof AnyType) {
        return true;
    }

    if (ts1 instanceof NullType && ts2 instanceof NullType) {
        return true;
    }

    if (ts1 instanceof IntegerType && ts2 instanceof IntegerType) {
        return true;
    }

    if (ts1 instanceof BooleanType && ts2 instanceof BooleanType) {
        return true;
    }

    if (ts1 instanceof StringType && ts2 instanceof StringType) {
        return true;
    }

    if (ts1 instanceof ArrayType && ts2 instanceof ArrayType) {
        return equal_type(ts1.elem_type, ts2.elem_type);
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
            if (!equal_type(ts1.fields[i].type, ts2.fields[i].type)) {
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
            if (!equal_type(ts1.methods[i], ts2.methods[i])) {
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

        if (ts1.ret.length !== ts2.ret.length) {
            return false;
        }

        for (let i = 0; i < ts1.args.length; i++) {
            if (!equal_type(ts1.args[i], ts2.args[i])) {
                return false;
            }
        }

        for (let i = 0; i < ts1.ret.length; i++) {
            if (!equal_type(ts1.ret[i], ts2.ret[i])) {
                return false;
            }
        }

        return true;
    }

    if (ts1 instanceof ReturnType && ts2 instanceof ReturnType) {
        return equal_type(ts1.type, ts2.type);
    }

    return false;
}
