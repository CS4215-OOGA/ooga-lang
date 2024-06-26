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
        case "float64":
            return "Float";
        case "bool":
          return "Boolean";
        case "string":
          return "String";
        case "any":
            return "Any";
        default:
          return "Null";
      }
    }
    // Array types
    / sliceType:"[]" _ type:InitType {
        return { tag: "Array", elementType: {type: type}, length: -1, is_bound: false};
    }
    / arrayType:"[" length:DecimalDigit+ "]" _ type:InitType {
        return { tag: "Array", elementType: {type: type}, length: parseInt(length.join("")), is_bound: true};
    }
    // Channel types
    / ChanType
    / StructIdentifier
    /FunctionType

FunctionType
  = FunctionToken __ "(" __ args:(InitTypeList __)? ")" __ type:TypeWithOptionalParens {
      return {
        tag: "FunctionType",
        args: optionalList(extractOptional(args, 0)),
        ret: {type: type || "Null"}
      };
    }

TypeWithOptionalParens
  = "(" __ type:InitType? __ ")" { return type; }  // Correctly handles the case with parentheses
  / type:InitType { return type; }                  // Handles the case without parentheses


InitTypeList
    = head:InitType tail:(__ "," __ InitType)* {
        // for each item, we need to wrap it in an object with the tag "type"
        return buildList(head, tail, 3).map(function(item) {
            return {type: item};
        });
        }

StructIdentifier
  = Identifier {
    return {
        tag: "Struct",
        name: text()
        };
    }

ChanType
  = "chan" _ type:InitType {
    return { tag: "Channel", elementType: {type: type}};
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
  / Float64Token
  / BooleanToken
  / StringToken
  / GoroutineToken
  / StructToken
  / TypeToken
  / AnyToken
  / ChanToken
  / MakeToken
  / SwitchToken
  / CaseToken
  / DefaultToken
  / SelectToken
  / BreakpointToken
  / AppendToken


Type
  = IntegerToken
  / Float64Token
  / BooleanToken
  / StringToken
  / AnyToken

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
      return { tag: "Float", value: parseFloat(text()) };
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
Float64Token    = "float64"    !IdentifierPart
BooleanToken    = "bool"       !IdentifierPart
StringToken     = "string"     !IdentifierPart
GoroutineToken  = "go"         !IdentifierPart
StructToken     = "struct"     !IdentifierPart
TypeToken       = "type"       !IdentifierPart
AnyToken        = "any"        !IdentifierPart
ChanToken       = "chan"       !IdentifierPart
MakeToken       = "make"       !IdentifierPart
SwitchToken     = "switch"     !IdentifierPart
CaseToken       = "case"       !IdentifierPart
DefaultToken    = "default"    !IdentifierPart
SelectToken     = "select"     !IdentifierPart
BreakpointToken = "breakpoint" !IdentifierPart
AppendToken     = "append"     !IdentifierPart


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
  / ArraySliceLiteral
  / ChannelReadExpression
  / "(" __ expression:Expression __ ")" { return expression; }


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
      / __ "[" __ index:Expression __ "]" {
          return { index: index };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        if (element.property) {
          return {
            tag: "MemberExpression",
            object: result,
            property: element.property
          };
        } else {
          return {
            tag: "ArraySliceIndex",
            arrayExpression: result,
            index: element.index
          };
        }
      }, head);
    }

NewExpression
  = MemberExpression

CallExpression
  = head:(
      callee:(MemberExpression / LambdaDeclaration) __ args:Arguments { // Handle function calls on member expressions
        return { tag: "CallExpression", callee: callee, arguments: args };
      }
    )
    tail:(
        __ "." __ property:Identifier { // Support for chaining dot syntax
          return {
            operation: "propertyAccess",
            property: property
          };
        }
      / __ "[" __ index:Expression __ "]" { // Allow for immediate index access
          return {
            operation: "indexAccess",
            index: index
          };
        }
      / __ args:Arguments { // Handle additional arguments
          return {
            operation: "call",
            arguments: args
          };
        }
    )*
    {
      return tail.reduce(function(result, element) {
        if (element.operation === "propertyAccess") {
          return {
            tag: "MemberExpression",
            object: result,
            property: element.property
          };
        } else if (element.operation === "indexAccess") {
          return {
            tag: "ArraySliceIndex",
            arrayExpression: result,
            index: element.index
          };
        } else if (element.operation === "call") {
          return {
            tag: "CallExpression",
            callee: result,
            arguments: element.arguments
          };
        }
      }, head);
    }
    // This is supporting make calls - this is mainly for channels and slices
    // It should be able to take in a type as the first argument, then two optional arguments
    / MakeToken __ "(" __ type:InitType __ args:MakeArguments? __ ")" {
        return {
            tag: "MakeCallExpression",
            type: type,
            args: args || []
        };
    }
    / AppendToken __ "(" __ name:Identifier __ "," __ args:ArgumentList __ ")" {
      return {
        tag: "AppendExpression",
        name: name,
        args: args
      }
    }

MakeArguments
  = "," __ args:ArgumentList {
      return args
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
  / operator:UnaryOperator argument:UnaryExpression {
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
  / $("+" !"=") { return "+unary"; }
  / $("-" !"=") { return "-unary"; }
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
  / $("<" !"<" !"-")
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
  / SwitchStatement
  / SelectStatement
  / StructDeclaration
  / MethodDeclaration
  / CallExpression
  / ChannelWriteExpression
  / BreakpointStatement

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

TypeWithoutInit
  = type:(StructIdentifier / InitType)? {
      return {
        type: type || null,
        init: null
      };
  }

TypeWithInit
    = type:(StructIdentifier / InitType)? init:(__ (StructInitializer / Initialiser)) {
        return {
            type: type || null,
            init: init
        };
    }

VariableStatement
    = VarToken __ id:Identifier __ typeInit:(TypeWithInit)? EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: typeInit.init ? extractOptional(typeInit.init, 1) : null,
            type: typeInit.type || "Unknown"
        }
    }
    / VarToken __ id:Identifier __ typeInit:(TypeWithoutInit)? EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: null,
            type: typeInit.type || "Unknown"
        }
    }
    / id:Identifier init:(__ ShorthandInitialiser) EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: "Unknown",
            shorthand: true
        }
    }
    / id:Identifier init:(__ ShorthandStructInitializer) EOS {
        return {
            tag: "VariableDeclaration",
            id: id,
            expression: extractOptional(init, 1),
            type: "Unknown",
            shorthand: true
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
    body:BlockStatement __
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
    body:BlockStatement __
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
    body:BlockStatement __
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

SwitchStatement
  = SwitchToken __ "("? __ discriminant:Expression __ ")"? __
    cases:CaseBlock
    {
      return {
        tag: "SwitchStatement",
        discriminant: discriminant,
        cases: cases
      };
    }

CaseBlock
  = "{" __ clauses:(CaseClauses __)? "}" {
    // Add a default case if none is present
    return optionalList(extractOptional(clauses, 0))
        .concat(
            {
                tag: "SwitchCase",
                test: null,
                consequent: {tag: "BlockStatement", body: []}
            }
        );
  }
  / "{" __
    before:(CaseClauses __)?
    default_:DefaultClause? __ "}"
    {
      return optionalList(extractOptional(before, 0))
        .concat(default_);
    }

CaseClauses
  = head:CaseClause tail:(__ CaseClause)* { return buildList(head, tail, 1); }

CaseClause
  = CaseToken __ test:Expression __ ":" consequent:(__ StatementList)? {
    return {
      tag: "SwitchCase",
      test: test,
      consequent: {tag:'BlockStatement', body: optionalList(extractOptional(consequent, 1))}
    };
  }

DefaultClause
  = DefaultToken __ ":" consequent:(__ StatementList)? {
    return {
      tag: "SwitchCase",
      test: null,
      consequent: {tag:'BlockStatement', body: optionalList(extractOptional(consequent, 1))}
    };
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

// ----- A.5 Functions and Programs -----

LambdaDeclaration
  = FunctionToken __ "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnType)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "LambdaDeclaration",
        params: optionalList(extractOptional(params, 0)),
        ret: {type:type || "Null"},
        type: "Function",
        body: body
      }
    }

FunctionDeclaration
  = FunctionToken __ id:Identifier __
    "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnType)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "FunctionDeclaration",
        id: id,
        params: optionalList(extractOptional(params, 0)),
        ret: {type: type || "Null"},
        type: "Function",
        body: body
      };
    }

FunctionExpression
  = FunctionToken __ id:(Identifier __)?
    "(" __ params:(FormalParameterList __)? ")" __
    "("? __ type:(ReturnType)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "LambdaDeclaration",
        id: extractOptional(id, 0),
        params: optionalList(extractOptional(params, 0)),
        body: body,
        ret: {type:type || "Null"},
        type: "Function"
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
    / id:Identifier __ type:StructIdentifier EOS {
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
    "("? __ type:(ReturnType)? __ ")"? __
    "{" __ body:FunctionBody __ "}"
    {
      return {
        tag: "MethodDeclaration",
        receiver: receiver,
        id: id,
        params: optionalList(extractOptional(params, 0)),
        ret: {type: type || "Null"},
        type: "Method",
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


// Arrays

// Handle trailing commas, not sure if needed!
ElementList
  = head:AssignmentExpression
    tail:(_ "," _ element:AssignmentExpression)*
    trailingComma:(_ ",")? {
      var elements = buildList(head, tail, 3);
      return elements;
    }


ArraySliceLiteral
  = "[" _ length:DecimalDigit+ _ "]" _ type:InitType _ "{"_ elements:ElementList _"}" {
      return {
        tag: "ArraySliceLiteral",
        type: {
                tag:'Array',
                elementType: {type: type},
                length: parseInt(length.join("")),
                is_bound: true
            },
        elements: elements,

      };
    }
    / "[" _ "]" _ type:InitType _ "{"_ elements:ElementList _"}" {
      return {
        tag: "ArraySliceLiteral",
        type: {
                tag:'Array',
                elementType: {type: type},
                length: elements.length,
                is_bound: false
            },
        elements: elements,

      };
    }


// Channels

ChannelReadExpression
  = "<-" __ channel:Expression {
      return {
        tag: "ChannelReadExpression",
        channel: channel
      };
    }


ChannelWriteExpression
    = channel:Expression __ "<-" __ value:Expression EOS? {
        return {
            tag: "ChannelWriteExpression",
            channel: channel,
            value: value
        };
    }

// Select
// These are select statements as per the Go spec
// The cases can be a send or receive operation, or a default case
// Example:
// select {
//     case i := <-c:
//         fmt.Printf("Received %d\n", i)
//     case c <- 0:
//         fmt.Println("Sent 0")
//     case <-quit:
//         fmt.Println("Quit")
//     default:
//         fmt.Println("No communication")
// }
// Note that we also need to account for the fact that the read can be assigned to a variable (VariableDeclaration)
// The cases have 3 possible forms:
// 1. case <-channel:
// 2. case variable := <-channel: or case var x = <-channel: or case var x int = <-channel: (All of these are covered by the VariableDeclaration rule)
// 3. case channel <- value:

ChannelOperation
  = ChannelReadExpression
    / ChannelWriteExpression

SelectCaseBlock
    = "{" __ clauses:(SelectClause)* __ def:SelectDefaultClause? __ "}" {
        if (def) {
            return optionalList(clauses).concat(def);
        } else {
            return optionalList(clauses);
        }
    }

// This should be either
// 1. var x = <-channel:
// 2. var x int = <-channel:
// 3. var x := <-channel:
ChannelVariableStatement
  = id:Identifier __ ":=" __ operation:ChannelReadExpression {
    return {
        tag: "VariableDeclaration",
        id: id,
        expression: operation,
        type: "Unknown"
    };
  }
  / VarToken __ id:Identifier __ type:(InitType)? __ "=" __ operation:ChannelReadExpression {
    return {
        tag: "VariableDeclaration",
        id: id,
        expression: operation,
        type: type || "Unknown"
    };
  }

SelectClause
  = CaseToken __ varDecl:ChannelVariableStatement __ ":" __ body:(__ StatementList)? __ {
    return {
      tag: "SelectReadVariableCase",
      operation: varDecl,
      body: {tag: "BlockStatement", body: optionalList(extractOptional(body, 1))}
    };
  }
  / CaseToken __ chanop:ChannelReadExpression __ ":" __ body:(__ StatementList)? __ {
    return {
      tag: "SelectReadCase",
      operation: chanop,
      body: {tag: "BlockStatement", body: optionalList(extractOptional(body, 1))}
    };
  }
  / CaseToken __ chanop:ChannelWriteExpression __ ":" __ body:(__ StatementList)? __ {
    return {
      tag: "SelectWriteCase",
      operation: chanop,
      body: {tag: "BlockStatement", body: optionalList(extractOptional(body, 1))}
    };
  }

SelectDefaultClause
  = DefaultToken __ ":" __ body:(__ StatementList)? __ {
    return {
      tag: "SelectDefaultCase",
      body: {tag: "BlockStatement", body: optionalList(extractOptional(body, 1))}
    };
  }

SelectStatement
  = SelectToken __ cases:SelectCaseBlock EOS {
    return {
      tag: "SelectStatement",
      cases: cases
    };
  }

// Breakpoints

BreakpointStatement
  = BreakpointToken EOS {
    return {
      tag: "BreakpointStatement"
    };
  }
