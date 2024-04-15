const enum OpCodes {
    NOP = 'NOP',
    POP = 'POP',
    LDCI = 'LDCI',
    LDCS = 'LDCS', // load string
    LDBI = 'LDBI',
    LDARR = 'LDARR', // load array
    LDARRI = 'LDARRI', // load array at index
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
    SET_ARRAY_FIELD = 'SET_ARR_FIELD',
    // These two OpCodes are added to support true "mutex"
    START_ATOMIC = 'START_ATOMIC',
    END_ATOMIC = 'END_ATOMIC',
    CREATE_UNBUFFERED = 'CREATE_UNBUFFERED',
    CREATE_BUFFERED = 'CREATE_BUFFERED',
    CREATE_SLICE = 'CREATE_SLICE',
    READ_CHANNEL = 'READ_CHANNEL',
    WRITE_CHANNEL = 'WRITE_CHANNEL',
    CHECK_CHANNEL = 'CHECK_CHANNEL',
    CHECK_WRITE = 'CHECK_WRITE',
    CHECK_READ = 'CHECK_READ',
    BREAKPOINT = 'BREAKPOINT',
    APPEND = 'APPEND',
}

export default OpCodes;
