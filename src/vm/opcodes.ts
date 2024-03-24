const enum OpCodes {
  NOP = "NOP",
  POP = "POP",
  LDCI = "LDCI",
  LDBI = "LDBI",
  LDU = "LDU", // load undefined
  LD = "LD",
  LDN = "LDN",  // load null
  LDF = "LDF",  // load func
  UADD = "UADD", // unary add ++
  USUB = "USUB", // unary add ++
  ADD = "ADD",
  SUB = "SUB",
  MUL = "MUL",
  DIV = "DIV",
  MOD = "MOD",
  NOT = "NOT",
  JOF = "JOF",
  GOTO = "GOTO",
  ASSIGN = "ASSIGN",
  ENTER_SCOPE = "ENTER_SCOPE",
  EXIT_SCOPE = "EXIT_SCOPE",
  RESET = "RESET",
  CALL = "CALL",
  TAIL_CALL = "TAIL_CALL",
}

export default OpCodes;
