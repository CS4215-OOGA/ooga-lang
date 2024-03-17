import {ast} from "peggy";

let wc;
let instrs;

// TODO: Make everything proper classes so that its clearer
// NOTE: We are a left precedence
// we compile the left then the right
function compile(component) {
  console.log(component);
  switch (component.tag) {
    case "BinaryExpression":
      compile(component.left);
      compile(component.right);
      instrs[wc++] = {tag: "BINOP", sym: component.operator};
      break;
    case "Integer":
      instrs[wc++] = {tag: "LDC", val: component.value};
      break;
    case "Boolean":
      instrs[wc++] = {tag: "LDC", val: component.value};
      break;
    case "IfStatement":
      compile(component.test);
      const jof = {tag: "JOF", addr: undefined};
      instrs[wc++] = jof;
      compile(component.consequent);
      const goto_instr = {tag: "GOTO", addr: undefined};
      instrs[wc++] = goto_instr;
      const alternative_addr = wc;
      jof.addr = alternative_addr;
      compile(component.alternate);
      goto_instr.addr = wc;
      break;
    case "BlockStatement":
      // TODO: Add enclosing environment
      // See: https://go101.org/article/blocks-and-scopes.html
      // For now, we simply compile as per normal
      // For Block statement, we should put a POP instruction after every statement
      // except for the last statement???
      for (let i = 0; i < component.body.length; i++) {
        compile(component.body[i]);
      }
      break;
  }
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
    compile(program[i]);
  }
  instrs[wc++] = {tag: "DONE"};
  return instrs;
}
