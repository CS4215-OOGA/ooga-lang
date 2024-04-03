// Collection of ooga errors to distinguish ooga-lang errors from typescript errors.
export class OogaError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ParseError extends OogaError {}

export class HeapError extends OogaError {
    constructor(msg: string) {
        super(msg);
    }
}

// HeapOutOfMemoryError is an error that might be fixable.
export class HeapOutOfMemoryError extends OogaError {
    constructor() {
        super('Out of memory!');
    }
}

// No more memory and cannot save. OOGA!
export class HeapDeadError extends OogaError {
    constructor() {
        super('Out of memory!');
    }
}
