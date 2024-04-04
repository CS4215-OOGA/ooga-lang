const enum OpCodes {
    NOP = 'NOP',
    POP = 'POP',
    LDCI = 'LDCI',
    LDCS = 'LDCS', // load string
    LDBI = 'LDBI',
    LDU = 'LDU', // load undefined
    LD = 'LD',
    LDN = 'LDN', // load null
    LDF = 'LDF', // load func
    BINOP = 'BINOP',
    LOG = 'LOG',
    UNARY = 'UNARY',
    JOF = 'JOF',
    GOTO = 'GOTO',
    ASSIGN = 'ASSIGN',
    ENTER_SCOPE = 'ENTER_SCOPE',
    EXIT_SCOPE = 'EXIT_SCOPE',
    RESET = 'RESET',
    CALL = 'CALL',
    TAIL_CALL = 'TAIL_CALL',
    NEW_THREAD = 'NEW_THREAD',
    DONE = 'DONE',
    NEW_STRUCT = 'NEW_STRUCT',
    INIT_FIELD = 'INIT_FIELD',
    ACCESS_FIELD = 'ACCESS_FIELD',
    SET_FIELD = 'SET_FIELD',
}

export default OpCodes;
