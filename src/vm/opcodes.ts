const enum OpCodes {
  NOP = "NOP",
  POP = "POP",
  LDCI = "LDCI",
  LDBI = "LDBI",
  LDU = "LDU", // load undefined
  LD = "LD",
  LDN = "LDN",  // load null
  LDF = "LDF",  // load func
  BINOP = "BINOP",
  LOG = "LOG",
  UNARY = "UNARY",
  JOF = "JOF",
  GOTO = "GOTO",
  ASSIGN = "ASSIGN",
  ENTER_SCOPE = "ENTER_SCOPE",
  EXIT_SCOPE = "EXIT_SCOPE",
  RESET = "RESET",
  CALL = "CALL",
  TAIL_CALL = "TAIL_CALL",
  NEW_THREAD = "NEW_THREAD",
  DONE = "DONE",
}

export default OpCodes;
