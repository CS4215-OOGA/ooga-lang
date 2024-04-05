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
  = head:IdentifierStart tail:IdentifierPart*{
      return {
        tag: "Name",
        name: head + tail.join(""),
      };
    }

InitType
  = type:Type {
      switch(type[0]) {
        case "int":
          return "Integer";
        case "float32":
          return "Integer";
        case "float64":
            return "Integer";
        case "bool":
          return "Boolean";
        case "string":
          return "String";
        default:
          return "Null";
      }
    }

StructIdentifier
  = Identifier {
    return {
        tag: "Struct",
        name: text()
        };
    }

IdentifierStart
    = [a-zA-Z]

IdentifierPart
    = [a-zA-Z0-9]
    / "_"

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
  / ConstToken
  / IntegerToken
  / BooleanToken
  / StringToken
  / GoroutineToken

Type
  = IntegerToken
  / Float32Token
  / Float64Token
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
  = DecimalIntegerLiteral "." DecimalDigit* {
      return { tag: "Integer", value: parseFloat(text()) };
    }
  / DecimalIntegerLiteral {
      return { tag: "Integer", value: parseFloat(text()) };
    }

DecimalIntegerLiteral
  = "0"
  / "-"? NonZeroDigit DecimalDigit*

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
IntegerToken    = "int"        !IdentifierPart
Float32Token    = "float32"    !IdentifierPart
Float64Token    = "float64"    !IdentifierPart
BooleanToken    = "bool"       !IdentifierPart
StringToken     = "string"     !IdentifierPart
GoroutineToken  = "go"         !IdentifierPart
StructToken     = "struct"     !IdentifierPart
TypeToken       = "type"       !IdentifierPart

SingleLineComment
  = "//" (!LineTerminatorSequence .)* (LineTerminatorSequence / !.)

__
  = (WhiteSpace / LineTerminatorSequence / SingleLineComment)*

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
  = Struct
  / Identifier
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
        __ "." __ property:Identifier {
          return { property: property };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        return {
          tag: "MemberExpression",
          object: result,
          property: element.property
        };
      }, head);
    }

NewExpression
  = MemberExpression

CallExpression
  = head:(
      callee:(MemberExpression/LambdaDeclaration) __ args:Arguments { // Handle function calls on member expressions
        return { tag: "CallExpression", callee: callee, arguments: args };
      }
    )
    tail:(
        // The tail part remains the same, handling further call expressions and property accesses
        __ args:Arguments {
          return { tag: "CallExpression", arguments: args };
        }
      / __ "." __ property:Identifier { // Support for chaining dot syntax
          return {
            tag: "MemberExpression",
            object: head,
            property: property
          };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        // Depending on the type of element (call or member access), adjust the target of the call or property access
        if (element.tag === "CallExpression") {
          element.callee = result;
        } else { // For member expressions
          element.object = result;
        }
        return element;
      }, head);
    }

GoroutineCallExpression
  = head:(
      callee:MemberExpression __ args:Arguments { // Handles function/method calls
        return { tag: "GoroutineCallExpression", callee: callee, arguments: args };
      }
    )
    tail:(
        // For additional method calls or property accesses after the initial call
        __ args:Arguments {
          return { tag: "GoroutineCallExpression", arguments: args };
        }
      / __ "." __ property:Identifier __ args:Arguments { // Direct support for method calls with dot syntax
          return {
            tag: "GoroutineCallExpression",
            callee: {
              tag: "MemberExpression",
              object: head,
              property: property
            },
            arguments: args
          };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        // Similar logic as CallExpression, adjusting based on whether it's a further call or property access
        if (element.tag === "GoroutineCallExpression" || element.tag === "CallExpression") {
          element.callee = result;
        } else { // For member expressions
          element.object = result;
        }
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
  = head:LeftHandSideExpression
    tail:(__ UpdateOperator)?
    {
      if (tail) {
        return {
          tag: "UpdateExpression",
          operator: tail[1],
          id: head,
          prefix: false
        };
      } else {
        return head;
      }
    }

UpdateOperator
  = "++"
  / "--"

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

ShiftExpression
  = head:AdditiveExpression
    tail:(__ ShiftOperator __ AdditiveExpression)*
    { return buildBinaryExpression(head, tail); }

ShiftOperator
  = $("<<"  !"=")
  / $(">>>" !"=")
  / $(">>"  !"=")

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

BitwiseANDExpression
  = head:EqualityExpression
    tail:(__ BitwiseANDOperator __ EqualityExpression)*
    { return buildBinaryExpression(head, tail); }

BitwiseANDOperator
  = $("&" ![&=])

BitwiseXORExpression
  = head:BitwiseANDExpression
    tail:(__ BitwiseXOROperator __ BitwiseANDExpression)*
    { return buildBinaryExpression(head, tail); }

BitwiseXOROperator
  = $("^" !"=")

BitwiseORExpression
  = head:BitwiseXORExpression
    tail:(__ BitwiseOROperator __ BitwiseXORExpression)*
    { return buildBinaryExpression(head, tail); }

BitwiseOROperator
  = $("|" ![|=])

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
  / ExpressionStatement
  / IfStatement
  / ContinueStatement
  / BreakStatement
  / ReturnStatement
  / GoroutineStatement
  / FunctionDeclaration
  / ForStatement
  / ForInitStatement
  / StructDeclaration
  / MethodDeclaration
  / CallExpression

BlockStatement
  = "{" __ body:(StatementList __)? "}" {
      return {
        tag: "BlockStatement",
        body: extractOptional(body, 0)
      };
    }

StatementList
  = SequenceStatement

SequenceStatement
  = head:Statement tail:(__ Statement)* {
      return {
        tag: "SequenceStatement",
        body: buildList(head, tail, 1)
      };
    }

VariableStatement
    = VarToken __ id:Identifier __ type:(InitType) init:(__ Initialiser)? EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: type
        }
    }
    / VarToken __ id:Identifier __ type:(StructIdentifier) init:(__ StructInitializer) EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: type
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser) EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: "Unknown"
        }
    }
    / id:Identifier init:(__ ShorthandStructInitializer) EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: "Unknown"
        }
    }

ConstantStatement
    = ConstToken __ id:Identifier __ type:(InitType)? __ init:(__ Initialiser) EOS {
        return {
            tag: "ConstantDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: type || "Unknown"
        }
    }
    / ConstToken __ id:Identifier __ type:(StructIdentifier)? __ init:(__ StructInitializer) EOS {
        return {
            tag: "ConstantDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: type || "Unknown"
        }
    }

Initialiser
  = "=" !"=" __ expression:AssignmentExpression { return expression; }

ShorthandInitialiser
  = ":=" __ expression:AssignmentExpression { return expression; }


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
        alternate: { tag: "SequenceStatement", body: [] }
      };
    }

ForStatement
  = ForWithInitTestUpdate
  / ForWithTest
  / ForInfinite

ForWithInitTestUpdate
  = ForToken __
    init:ForInitStatement ";" __
    test:ForTest ";" __
    update:Expression __
    "{" __ body: StatementList? __ "}" __
    {
      return {
        tag: "ForStatement",
        type: "ForWithInitTestUpdate",
        init: init,
        test: test,
        update: update,
        body: body
      };
    }


ForWithTest
  = ForToken __
    test:ForTest __
    "{" __ body: StatementList? __ "}" __
    {
      return {
        tag: "ForStatement",
        type: "ForWithTest",
        init: null,
        test: test,
        update: null,
        body: body
      };
    }


ForInfinite
  = ForToken __
    "{" __ body: StatementList? __ "}" __
    {
      return {
        tag: "ForStatement",
        type: "ForInfinite",
        init: null,
        test: { tag: "Boolean", value: true },
        update: null,
        body: body
      };
    }

ForInitStatement
  = VarToken __ id:Identifier __ type:(InitType) init:(__ Initialiser) {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: type
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser) {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: "Unknown"
        }
    }

ForTest
  = LogicalORExpression
  / LogicalANDExpression
  / EqualityExpression
  / RelationalExpression
  / UnaryExpression
  / BooleanLiteral

ContinueStatement
  = ContinueToken EOS {
      return { tag: "ContinueStatement"};
    }

BreakStatement
  = BreakToken EOS {
      return { tag: "BreakStatement" };
    }


ReturnStatement
  = ReturnToken EOS {
      return { tag: "ReturnStatement", expression: null };
    }
  / ReturnToken _ argument:Expression EOS {
      return { tag: "ReturnStatement", expression: argument };
    }


GoroutineStatement
  = GoroutineToken _ argument:GoroutineCallExpression EOS {
      return { tag: "CallGoroutine", expression: argument }
    }
  / GoroutineToken _ lambda:LambdaDeclaration
    {
      return {
        tag: "GoroutineDeclaration",
        expression: lambda
      }
    }

// ----- A.5 Functions and Programs -----

LambdaDeclaration
  = FunctionToken __ "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnTypeList)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "LambdaDeclaration",
        params: optionalList(extractOptional(params, 0)),
        type: type || ["Null"],
        body: body
      }
    }

FunctionDeclaration
  = FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnTypeList)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "FunctionDeclaration",
        id: id,
        params: optionalList(extractOptional(params, 0)),
        type: type || ["Null"],
        body: body
      };
    }

// Arnav: Not sure what this is for!!
FunctionExpression
  = FunctionToken __ id:(Identifier __)?
    "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnTypeList)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "LambdaDeclaration",
        id: extractOptional(id, 0),
        params: optionalList(extractOptional(params, 0)),
        body: body,
        type: type || ["Null"]
      };
    }

FormalParameterList
  = head:FormalParameter tail:(__ "," __ FormalParameter)* {
      return buildList(head, tail, 3);
    }

FormalParameter
  = id:Identifier __ type:InitType {
      return { tag: id.tag, name: id.name, type: type };
    }
    / id:Identifier __ type:StructIdentifier {
      return { tag: id.tag, name: id.name, type: type };
    }


ReturnTypeList
  = head:ReturnType tail:(__ "," __ ReturnType)* {
      return buildList(head, tail, 3);
    }

ReturnType
  = type:InitType {
    return type;
  }
  / type:StructIdentifier {
    return type;
  }

FunctionBody
  = body:SourceElements? {
      return {
        tag: "BlockStatement",
        body: {
          tag: "SequenceStatement",
          body: optionalList(body)
        }
      };
    }

Program
  = body:SourceElements? {
      return {
        tag: "SequenceStatement",
        body: optionalList(body)
      };
    }

SourceElements
  = head:SourceElement tail:(__ SourceElement)* {
      return buildList(head, tail, 1);
    }

SourceElement
  = Statement
  / FunctionDeclaration
  / StructDeclaration
  / MethodDeclaration


// ----- Structs -----
StructDeclaration
  = TypeToken __ id:Identifier __ StructToken __ "{" __ fields:StructFieldList? __ "}" {
      return {
        tag: "StructDeclaration",
        id: id,
        fields: fields || []
      };
    }

StructFieldList
  = head:StructField tail:(__ StructField)* {
      return buildList(head, tail, 1);
    }

StructField
  = id:Identifier __ type:InitType EOS {
      return { tag: "StructField", name: id, type: type };
    }

// ----- Struct Initializers -----
Struct
    = type:StructIdentifier __ "{" __ fields:StructFieldInitializerList? __ "}" {
        return { tag: "StructInitializer", fields: fields || [], named: true, type: type };
    }
    / type:StructIdentifier __ "{" __ values:StructValueInitializerList? __ "}" {
        return { tag: "StructInitializer", fields: values || [], named: false, type: type };
    }

StructInitializer
  = "=" !"=" __ struct:Struct {
      return struct;
    }
    / "=" !"=" __ expression:AssignmentExpression { return expression; }

ShorthandStructInitializer
  = ":=" __ struct:Struct {
      return struct;
    }

StructFieldInitializerList
  = head:StructFieldInitializer tail:(__ "," __ StructFieldInitializer)* {
      return buildList(head, tail, 3);
    }

StructFieldInitializer
  = id:Identifier __ ":" __ value:AssignmentExpression {
      return { tag: "StructFieldInitializer", name: id, value: value };
    }

StructValueInitializerList
  = head:AssignmentExpression tail:(__ "," __ AssignmentExpression)* {
      return buildList(head, tail, 3);
    }

MethodDeclaration
  = FunctionToken __ "(" __ receiver:Receiver __ ")" __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnTypeList)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "MethodDeclaration",
        receiver: receiver,
        id: id,
        params: optionalList(extractOptional(params, 0)),
        type: type || ["Null"],
        body: body
      };
    }

Receiver
    = id:Identifier __ "*" __ type:StructIdentifier {
        return { tag: "Receiver", name: id, type: type, pointer: true };
    }
    / id:Identifier __ type:StructIdentifier {
        return { tag: "Receiver", name: id, type: type, pointer: false };
    }
