"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTreeTypesPrelude = void 0;
exports.parseTreeTypesPrelude = "\n\n// Types used to describe the shape of the parse tree\n// that is generated by the parse function in Source 4.\n\n// Program\ntype Program = Pair<\"sequence\", Pair<List<Statement>, null>>;\n\n// Statement\ntype Statement =\n  | ConstantDeclaration\n  | VariableDeclaration\n  | FunctionDeclaration\n  | ReturnStatement\n  | ConditionalStatement\n  | WhileLoop\n  | ForLoop\n  | BreakStatement\n  | ContinueStatement\n  | Block\n  | Expression;\n\ntype ConstantDeclaration = Pair<\"constant_declaration\", Pair<Name, Pair<Expression, null>>>;\ntype FunctionDeclaration = Pair<\"function_declaration\", Pair<Name, Pair<Parameters, Pair<Block, null>>>>;\ntype ReturnStatement = Pair<\"return_statement\", Pair<Expression, null>>;\ntype WhileLoop = Pair<\"while_loop\", Pair<Expression, Pair<Block, null>>>;\ntype ForLoop = Pair<\"for_loop\", Pair<Expression | VariableDeclaration, Pair<Expression, Pair<Expression, Pair<Block, null>>>>>;\ntype BreakStatement = Pair<\"break_statement\", null>;\ntype ContinueStatement = Pair<\"continue_statement\", null>;\n\n// Parameters\ntype Parameters = List<Name>;\n\n// If-Statement\ntype ConditionalStatement = Pair<\"conditional_statement\", Pair<Expression, Pair<Block, Pair<Block | ConditionalStatement, null>>>>;\n\n// Block\ntype Block = Pair<\"block\", Pair<Program, null>>;\n\n// Let\ntype VariableDeclaration = Pair<\"variable_declaration\", Pair<Name, Pair<Expression, null>>>;\n\n// Assignment\ntype Assignment = Pair<\"assignment\", Pair<Name, Pair<Expression, null>>>;\ntype ObjectAssignment = Pair<\"object_assignment\", Pair<ObjectAccess, Pair<Expression, null>>>;\n\n// Expression\ntype Expression =\n  | Literal\n  | Name\n  | LogicalComposition\n  | BinaryOperatorCombination\n  | UnaryOperatorCombination\n  | Application\n  | LambdaExpression\n  | ConditionalExpression\n  | Assignment\n  | ObjectAssignment\n  | ObjectAccess\n  | ArrayExpression;\n\ntype Literal = Pair<\"literal\", Pair<number | string | boolean | null, null>>;\ntype Name = Pair<\"name\", Pair<string, null>>;\ntype LogicalComposition = Pair<\"logical_composition\", Pair<LogicalOperator, Pair<Expression, Pair<Expression, null>>>>;\ntype BinaryOperatorCombination = Pair<\"binary_operator_combination\", Pair<BinaryOperator, Pair<Expression, Pair<Expression, null>>>>;\ntype UnaryOperatorCombination = Pair<\"unary_operator_combination\", Pair<UnaryOperator, Pair<Expression, null>>>;\ntype Application = Pair<\"application\", Pair<Expression, Pair<List<Expression>, null>>>;\ntype LambdaExpression = Pair<\"lambda_expression\", Pair<Parameters, Pair<Statement, null>>>;\ntype ConditionalExpression = Pair<\"conditional_expression\", Pair<Expression, Pair<Expression, Pair<Expression, null>>>>;\ntype ObjectAccess = Pair<\"object_access\", Pair<Expression, Pair<Expression, null>>>;\ntype ArrayExpression = Pair<\"array_expression\", Pair<List<Expression>, null>>;\n\n// Operators\ntype LogicalOperator = \"&&\" | \"||\";\ntype BinaryOperator = \"+\" | \"-\" | \"*\" | \"/\" | \"%\" | \"===\" | \"!==\" | \"<\" | \">\" | \"<=\" | \">=\";\ntype UnaryOperator = \"!\" | \"-unary\";\n";
