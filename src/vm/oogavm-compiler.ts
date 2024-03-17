import {ast} from "peggy";

let wc;
let instrs;

function ast_to_json(program) {
  console.log(program);
  switch (program.type) {
    case "Program":
      return ast_to_json(program.body);
    case "BinaryExpression":
      return {
        type: "binary_expression",
        operator: program.operator,
        left: program.left,
      };
    case "FunctionDeclaration":
      return {
        type: "fun",
        sym: program.sym.name,
        params: program.params,
        body: ast_to_json(program.body)
      };
  }
}

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
  }
}

export function compile_program(program) {
  wc = 0;
  instrs = [];
  for (let i = 0; i < program.length; i++) {
    compile(program[i]);
  }
  instrs[wc++] = {tag: "DONE"};
  return instrs;
}
