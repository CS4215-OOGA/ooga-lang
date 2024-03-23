import {ast} from "peggy";
import Opcodes from "./opcodes.js";

let wc;
let instrs;

const push = (array, ...items) => {
  for (let item of items) {
    array.push(item)
  }
  return array
}

// **************************
// Compile time environment
// **************************
// Reuse the existing compile time environment as much as possible for safer guarantee on correctness
// A compile-time environment is an array of compile-time frames and a compile-time frame is an array of symbols
type CompileTimeFrame = string[];
type CompileTimeEnvironment = CompileTimeFrame[];

// Find the position [frame-index, value-index] of a given symbol x
function compileTimeEnvironmentPosition(env: CompileTimeEnvironment, x: string) {
  let frameIndex = env.length;
  while (frameIndex > 0 && valueIndex(env[--frameIndex], x) === -1) {}
  return [frameIndex, valueIndex(env[frameIndex], x)]
}

function valueIndex(frame: CompileTimeFrame, x: string) {
  for (let i = 0; i < frame.length; i++) {
    if (frame[i] === x) return i;
  }
  return -1;
}

function compileTimeEnvironmentExtend(vs: string[], e: CompileTimeEnvironment) {
  // shallow copy of e
  return push([...e], vs);
}

// TODO: Add builtins and constants frame to this
const globalCompileTimeEnvironment: CompileTimeEnvironment = [];

// TODO: Add type annotation here
// scans out the declarations from the block, ignoring nested blocks
// throws an error if the same variable is declared more than once
function scanForLocals(compBlock): string[] {
  let declarations: string[] = [];
  for (let i = 0; i < compBlock.length; i++) {
    let comp = compBlock[i];
    if (comp.tag === 'VariableDeclaration' || comp.tag === 'ConstantDeclaration') {
      // could probably use an extra set but i rather have smaller code
      if (declarations.includes(comp.id.name)) {
        throw Error("Variable " + comp.id.name + " declared more than once in the same block!");
      }
      declarations.push(comp.id.name);
    }
  }
  return declarations;
}

// ******************
// Compilation
// ******************
//

const compileComp = {
  "BinaryExpression": (comp, ce) => {
    compile(comp.left, ce);
    compile(comp.right, ce);
    switch (comp.operator) {
      case "+":
        instrs[wc++] = {tag: Opcodes.ADD};
        break;
      case "-":
        instrs[wc++] = {tag: Opcodes.SUB};
        break;
      case "*":
        instrs[wc++] = {tag: Opcodes.MUL};
        break;
      case "/":
        instrs[wc++] = {tag: Opcodes.DIV};
        break
      case "%":
        instrs[wc++] = {tag: Opcodes.MOD};
        break;
      default:
        throw Error("Unsupported symbol for compilation");
    }
  },
  "Integer": (comp, ce) => {
    instrs[wc++] = {tag: Opcodes.LDCI, val: comp.value};
  },
  "Boolean": (comp, ce) => {
    instrs[wc++] = {tag: Opcodes.LDBI, val: comp.value};
  },
  "Null": (comp, ce) => {
    instrs[wc++] = {tag: Opcodes.LDCI, val: comp.value};
  },
  "IfStatement": (comp, ce) => {
    compile(comp.test, ce);
    const jof = {tag: Opcodes.JOF, addr: undefined};
    instrs[wc++] = jof;
    compile(comp.consequent, ce);
    const goto_instr = {tag: Opcodes.GOTO, addr: undefined};
    instrs[wc++] = goto_instr;
    jof.addr = wc;
    compile(comp.alternate, ce);
    goto_instr.addr = wc;
  },
  "BlockStatement": (comp, ce) => {
    const declarations = scanForLocals(comp.body);
    instrs[wc++] = {tag: Opcodes.ENTER_SCOPE, num: declarations.length };
    ce = compileTimeEnvironmentExtend(declarations, ce);
    // TODO: Add enclosing environment
    // See: https://go101.org/article/blocks-and-scopes.html
    // For now, we simply compile as per normal
    // For Block statement, we should put a POP instruction after every statement
    // except for the last statement???
    for (let i = 0; i < comp.body.length; i++) {
      compile(comp.body[i], ce);
    }
  },
  // TODO: Our parser currently treats all the following equivalent
  //       var x int;
  //       var x int = 5;
  //       var x = 5;
  //       x := 5
  //       Since we do not intend to do type inference for now, we will throw an error here.
  //       A possible type inference hack (?) is to evaluate the expression then return the type.
  //       As I type this, I realise its probably the best way and probably not that hard (?)
  "VariableDeclaration": (comp, ce) => {
    // If the expression is null, the comp is of the form
    // var x int
    // and we can safely skip it.
    if (comp.expression !== null) {
      compile(comp.expression, ce);
    }
    // Note that this allows the value of the expression to be nil
    instrs[wc++] = {tag: Opcodes.ASSIGN, pos: compileTimeEnvironmentPosition(ce, comp.id.name)};
    // TODO: To handle the types here
  },
  "ConstantDeclaration": (comp, ce) => {

  },
  // TODO: The parser treats expressions of the form
  "AssignmentExpression": (comp, ce) => {
    compile(comp.right, ce);
    instrs[wc++] = {tag: Opcodes.ASSIGN, pos: compileTimeEnvironmentPosition(ce, comp.left.name)};
  },
  "Name": (comp, ce) => {
    // TODO: Might have to do type check here?
    instrs[wc++] = {tag: Opcodes.LD, sym: comp.name, pos: compileTimeEnvironmentPosition(ce, comp.name)};
  },
  // This handles expressions of the form
  // ++x;
  // --y;
  // Note the postfix expression. yes, at the moment, idk how to make the other one valid. and also not a big deal.
  "UpdateExpression": (comp, ce) => {
    compile(comp.argument, ce);
    switch (comp.operator) {
      case "++":
        instrs[wc++] = {tag: Opcodes.UADD};
        break;
      case "--":
        instrs[wc++] = {tag: Opcodes.USUB};
        break;
      default:
        throw Error("Invalid unary operator: " + comp.operator);
    }
  },
};

// TODO: Make everything proper classes so that its clearer
// NOTE: We are a left precedence
// we compile the left then the right
function compile(component, ce) {
  console.log("Compiling: ");
  console.log(component);
  return compileComp[component.tag](component, ce);
}

// FIXME: The problem with the current impl is that our PC does not start
//        at the first line, but really the main function (and the init function)
//        So we need a way for the machine to know where it must start
//        The termination condition for the program should also be when main ends
//        So, we should compile the entire thing, find where main ends and put DONE there.
//        To handle the main function entry point, perhaps the first line of the bytecode
//        can be reserved to indicating the start location for the PC.
//        But this seems like a band-aid fix.
export function compile_program(program) {
  wc = 0;
  instrs = [];
  // FIXME: Right now, we are not popping properly after each sequence
  for (let i = 0; i < program.length; i++) {
    compile(program[i], globalCompileTimeEnvironment);
  }
  instrs[wc++] = {tag: "DONE"};
  return instrs;
}
