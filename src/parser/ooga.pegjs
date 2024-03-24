{{
  var TYPES_TO_PROPERTY_NAMES = {
    CallExpression:   "callee",
    MemberExpression: "object",
  };
  function filledArray(count, value) {
    return Array.apply(null, new Array(count))
      .map(function() { return value; });
  }
  function extractOptional(optional, index) {
    return optional ? optional[index] : null;
  }
  function extractList(list, index) {
    return list.map(function(element) { return element[index]; });
  }
  function buildList(head, tail, index) {
    return [head].concat(extractList(tail, index));
  }
  function buildBinaryExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        tag: "BinaryExpression",
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }
  function buildLogicalExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        tag: "LogicalExpression",
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }
  function optionalList(value) {
    return value !== null ? value : [];
  }
}}

Start
  = __ program:Program __ { return program; }

// ----- A.1 Lexical Grammar -----

SourceCharacter
  = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"

Identifier
  = !ReservedWord name:IdentifierName { return name; }

IdentifierName "Name"
  = head:IdentifierStart tail:IdentifierPart* type:(__ InitType)?{
      return {
        tag: "Name",
        name: head + tail.join(""),
        type: extractOptional(type, 1) ? extractOptional(type, 1) : "Null"
      };
    }

InitType
  = type:Type {
      switch(type[0]) {
        case "int":
          return "Integer";
        case "bool":
          return "Boolean";
        case "string":
          return "String";
        default:
          return "Null";
      }
    }

IdentifierStart
    = [a-zA-Z]

IdentifierPart
    = [a-zA-Z0-9]
    / "_"
    / "-"

ReservedWord
  = Keyword
  / NullLiteral
  / BooleanLiteral

Keyword
  = BreakToken
  / ContinueToken
  / ElseToken
  / ForToken
  / FunctionToken
  / IfToken
  / ReturnToken
  / ThisToken
  / VarToken
  / WhileToken
  / ConstToken
  / IntegerToken
  / BooleanToken
  / StringToken
  / GoroutineToken

Type
  = IntegerToken
  / BooleanToken
  / StringToken

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

NullLiteral
  = NullToken { return { tag: "Null", value: null }; }

BooleanLiteral
  = TrueToken  { return { tag: "Boolean", value: true  }; }
  / FalseToken { return { tag: "Boolean", value: false }; }

NumericLiteral "number"
  = literal:DecimalLiteral !(IdentifierStart / DecimalDigit) {
      return literal;
    }

DecimalLiteral
  = DecimalIntegerLiteral {
      return { tag: "Integer", value: parseFloat(text()) };
    }

DecimalIntegerLiteral
  = "0"
  / NonZeroDigit DecimalDigit*

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

StringLiteral "string"
  = '"' chars:DoubleStringCharacter* '"' {
      return { tag: "String", value: chars.join("") };
    }
  / "'" chars:SingleStringCharacter* "'" {
      return { tag: "String", value: chars.join("") };
    }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation

SingleStringCharacter
  = !("'" / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation

LineContinuation
  = "\\" LineTerminatorSequence { return ""; }

EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit { return "\0"; }

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = "'"
  / '"'
  / "\\"
  / "b"  { return "\b"; }
  / "f"  { return "\f"; }
  / "n"  { return "\n"; }
  / "r"  { return "\r"; }
  / "t"  { return "\t"; }
  / "v"  { return "\v"; }

NonEscapeCharacter
  = !(EscapeCharacter / LineTerminator) SourceCharacter { return text(); }

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

// Tokens

BreakToken      = "break"      !IdentifierPart
ConstToken      = "const"      !IdentifierPart
ContinueToken   = "continue"   !IdentifierPart
ElseToken       = "else"       !IdentifierPart
FalseToken      = "false"      !IdentifierPart
ForToken        = "for"        !IdentifierPart
FunctionToken   = "func"       !IdentifierPart
IfToken         = "if"         !IdentifierPart
NullToken       = "nil"        !IdentifierPart
ReturnToken     = "return"     !IdentifierPart
ThisToken       = "this"       !IdentifierPart
TrueToken       = "true"       !IdentifierPart
VarToken        = "var"        !IdentifierPart
WhileToken      = "while"      !IdentifierPart
IntegerToken    = "int"        !IdentifierPart
BooleanToken    = "bool"       !IdentifierPart
StringToken     = "string"     !IdentifierPart
GoroutineToken  = "go"         !IdentifierPart

__
  = (WhiteSpace / LineTerminatorSequence)*

_
  = WhiteSpace*

// Automatic Semicolon Insertion

EOS
  = __ ";"
  / _ LineTerminatorSequence
  / _ &"}"
  / __ EOF

EOF
  = !.

// ----- A.3 Expressions -----

PrimaryExpression
  = Identifier
  / Literal
  / ArrayLiteral
  / "(" __ expression:Expression __ ")" { return expression; }

ArrayLiteral
  = "[" __ elision:(Elision __)? "]" {
      return {
        tag: "ArrayExpression",
        elements: optionalList(extractOptional(elision, 0))
      };
    }
  / "[" __ elements:ElementList __ "]" {
      return {
        tag: "ArrayExpression",
        elements: elements
      };
    }
  / "[" __ elements:ElementList __ "," __ elision:(Elision __)? "]" {
      return {
        tag: "ArrayExpression",
        elements: elements.concat(optionalList(extractOptional(elision, 0)))
      };
    }

ElementList
  = head:(
      elision:(Elision __)? element:AssignmentExpression {
        return optionalList(extractOptional(elision, 0)).concat(element);
      }
    )
    tail:(
      __ "," __ elision:(Elision __)? element:AssignmentExpression {
        return optionalList(extractOptional(elision, 0)).concat(element);
      }
    )*
    { return Array.prototype.concat.apply(head, tail); }

Elision
  = "," commas:(__ ",")* { return filledArray(commas.length + 1, null); }

MemberExpression
  = head:(
        PrimaryExpression
      / FunctionExpression
    )
    tail:(
        __ "[" __ property:Expression __ "]" {
          return { property: property, computed: true };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        return {
          tag: "MemberExpression",
          object: result,
          property: element.property,
          computed: element.computed
        };
      }, head);
    }

NewExpression
  = MemberExpression

CallExpression
  = head:(
      callee:MemberExpression __ args:Arguments {
        return { tag: "CallExpression", callee: callee, arguments: args };
      }
    )
    tail:(
        __ args:Arguments {
          return { tag: "CallExpression", arguments: args };
        }
      / __ "[" __ property:Expression __ "]" {
          return {
            tag: "MemberExpression",
            property: property,
            computed: true
          };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;
        return element;
      }, head);
    }

Arguments
  = "(" __ args:(ArgumentList __)? ")" {
      return optionalList(extractOptional(args, 0));
    }

ArgumentList
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return buildList(head, tail, 3);
    }

LeftHandSideExpression
  = CallExpression
  / NewExpression

PostfixExpression
  = LeftHandSideExpression

UnaryExpression
  = PostfixExpression
  / operator:UnaryOperator __ argument:UnaryExpression {
      var type = (operator === "++" || operator === "--")
        ? "UpdateExpression"
        : "UnaryExpression";
      return {
        tag: type,
        operator: operator,
        argument: argument,
        prefix: true
      };
    }

UnaryOperator
  = "!"
  / "++"
  / "--"
  / $("+" !"=")
  / $("-" !"=")
  / "~"

MultiplicativeExpression
  = head:UnaryExpression
    tail:(__ MultiplicativeOperator __ MultiplicativeExpression)*
    { return buildBinaryExpression(head, tail); }

MultiplicativeOperator
  = $("*" !"=")
  / $("/" !"=")
  / $("%" !"=")

AdditiveExpression
  = head:MultiplicativeExpression
    tail:(__ AdditiveOperator __ MultiplicativeExpression)*
    { return buildBinaryExpression(head, tail); }

AdditiveOperator
  = $("+" ![+=])
  / $("-" ![-=])

RelationalExpression
  = head:AdditiveExpression
    tail:(__ RelationalOperator __ AdditiveExpression)*
    { return buildLogicalExpression(head, tail); }

RelationalOperator
  = "<="
  / ">="
  / $("<" !"<")
  / $(">" !">")

EqualityExpression
  = head:RelationalExpression
    tail:(__ EqualityOperator __ RelationalExpression)*
    { return buildLogicalExpression(head, tail); }

EqualityOperator
  = "=="
  / "!="

LogicalANDExpression
  = head:EqualityExpression
    tail:(__ LogicalANDOperator __ EqualityExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalANDOperator
  = "&&"

LogicalORExpression
  = head:LogicalANDExpression
    tail:(__ LogicalOROperator __ LogicalANDExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalOROperator
  = "||"

ConditionalExpression
  = LogicalORExpression

AssignmentExpression
  = left:LeftHandSideExpression __
    "=" !"=" __
    right:AssignmentExpression
    {
      return {
        tag: "AssignmentExpression",
        operator: "=",
        left: left,
        right: right
      };
    }
  / left:LeftHandSideExpression __
    operator:AssignmentOperator __
    right:AssignmentExpression
    {
      return {
        tag: "AssignmentExpression",
        operator: operator,
        left: left,
        right: right
      };
    }
  / ConditionalExpression

AssignmentOperator
  = "*="
  / "/="
  / "%="
  / "+="
  / "-="

Expression
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return tail.length > 0
        ? { tag: "SequenceExpression", expressions: buildList(head, tail, 3) }
        : head;
    }

// ----- A.4 Statements -----

Statement
  = BlockStatement
  / VariableStatement
  / ConstantStatement
  / EmptyStatement
  / ExpressionStatement
  / IfStatement
  / ContinueStatement
  / BreakStatement
  / ReturnStatement
  / GoroutineStatement
  / FunctionDeclaration

BlockStatement
  = "{" __ body:(StatementList __)? "}" {
      return {
        tag: "BlockStatement",
        body: optionalList(extractOptional(body, 0))
      };
    }

StatementList
  = head:Statement tail:(__ Statement)* { return buildList(head, tail, 1); }

VariableStatement
    = VarToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser)? EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1)
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser)? EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1)
        }
    }

ConstantStatement
    = ConstToken __ id:Identifier __ type:(InitType)? init:(__ Initialiser) EOS {
        return {
            tag: "ConstantDeclaration",
            id: id,
            expression: extractOptional(init, 1)
        }
    }

Initialiser
  = "=" !"=" __ expression:AssignmentExpression { return expression; }

ShorthandInitialiser
  = ":=" __ expression:AssignmentExpression { return expression; }

EmptyStatement
  = ";" { return { tag: "EmptyStatement" }; }

ExpressionStatement
  = !("{" / FunctionToken) expression:Expression EOS {
    return expression;
      // return {
      //   tag: "ExpressionStatement",
      //   expression: expression
      // };
    }

IfStatement
  = IfToken __ test:Expression __
    consequent:Statement __
    ElseToken __
    alternate:Statement
    {
      return {
        tag: "IfStatement",
        test: test,
        consequent: consequent,
        alternate: alternate
      };
    }
  / IfToken __ test:Expression __
    consequent:Statement {
      return {
        tag: "IfStatement",
        test: test,
        consequent: consequent,
        alternate: null
      };
    }

ContinueStatement
  = ContinueToken EOS {
      return { tag: "ContinueStatement", label: null };
    }
  / ContinueToken _ label:Identifier EOS {
      return { tag: "ContinueStatement", label: label };
    }

BreakStatement
  = BreakToken EOS {
      return { tag: "BreakStatement", label: null };
    }
  / BreakToken _ label:Identifier EOS {
      return { tag: "BreakStatement", label: label };
    }

ReturnStatement
  = ReturnToken EOS {
      return { tag: "ReturnStatement", expression: null };
    }
  / ReturnToken _ argument:Expression EOS {
      return { tag: "ReturnStatement", expression: argument };
    }

GoroutineStatement
  = GoroutineToken _ argument:CallExpression EOS {
      return { tag: "CallGoroutine", argument: argument }
    }

// ----- A.5 Functions and Programs -----

FunctionDeclaration
  = FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    type:(InitType)? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "FunctionDeclaration",
        id: id,
        params: optionalList(extractOptional(params, 0)),
        type: type,
        body: body
      };
    }
  / FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    "(" __ type:(ReturnTypeList) __ ")" __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "FunctionDeclaration",
        id: id,
        params: optionalList(extractOptional(params, 0)),
        type: type,
        body: body
      };
    }

FunctionExpression
  = FunctionToken __ id:(Identifier __)?
    "(" __ params:(FormalParameterList __)? ")" __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "FunctionExpression",
        id: extractOptional(id, 0),
        params: optionalList(extractOptional(params, 0)),
        body: body
      };
    }

FormalParameterList
  = head:Identifier tail:(__ "," __ Identifier)* {
      return buildList(head, tail, 3);
    }

ReturnTypeList
  = head:InitType tail:(__ "," __ InitType)* {
    return buildList(head, tail, 3);
  }

FunctionBody
  = body:SourceElements? {
      return {
        tag: "BlockStatement",
        body: optionalList(body)
      };
    }

Program
  = body:SourceElements? {
      return optionalList(body);
    }

SourceElements
  = head:SourceElement tail:(__ SourceElement)* {
      return buildList(head, tail, 1);
    }

SourceElement
  = Statement
  / FunctionDeclaration
