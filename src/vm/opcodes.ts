export enum OpCodes {
  NOP = "NOP",
  LDCI = "LDCI",
  LDBI = "LDBI",
  LD = "LD",
  LDN = "LDN",  // load null
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
}

export default OpCodes;
