"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateTypeAliasError = exports.ConstNotAssignableTypeError = exports.InvalidArrayAccessTypeError = exports.InvalidIndexTypeError = exports.TypeParameterNameNotAllowedError = exports.TypeAliasNameNotAllowedError = exports.TypeNotGenericError = exports.InvalidNumberOfTypeArgumentsForGenericTypeError = exports.InvalidNumberOfArgumentsTypeError = exports.UndefinedVariableTypeError = exports.TypeNotAllowedError = exports.TypecastError = exports.TypeNotCallableError = exports.FunctionShouldHaveReturnValueError = exports.TypeNotFoundError = exports.TypeMismatchError = exports.InconsistentPredicateTestError = exports.CallingNonFunctionType = exports.ConsequentAlternateMismatchError = exports.UndefinedIdentifierError = exports.InvalidTestConditionError = exports.InvalidArgumentTypesError = exports.DifferentNumberArgumentsError = exports.CyclicReferenceError = exports.DifferentAssignmentError = exports.ReassignConstError = exports.ArrayAssignmentError = exports.InvalidArrayIndexType = void 0;
var astring_1 = require("astring");
var constants_1 = require("../constants");
var types_1 = require("../types");
var formatters_1 = require("../utils/formatters");
var stringify_1 = require("../utils/stringify");
// tslint:disable:max-classes-per-file
var InvalidArrayIndexType = /** @class */ (function () {
    function InvalidArrayIndexType(node, receivedType) {
        this.node = node;
        this.receivedType = receivedType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(InvalidArrayIndexType.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidArrayIndexType.prototype.explain = function () {
        return "Expected array index as number, got ".concat((0, stringify_1.typeToString)(this.receivedType), " instead");
    };
    InvalidArrayIndexType.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidArrayIndexType;
}());
exports.InvalidArrayIndexType = InvalidArrayIndexType;
var ArrayAssignmentError = /** @class */ (function () {
    function ArrayAssignmentError(node, arrayType, receivedType) {
        this.node = node;
        this.arrayType = arrayType;
        this.receivedType = receivedType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(ArrayAssignmentError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    ArrayAssignmentError.prototype.explain = function () {
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["Expected array type: ", "\n    but got: ", ""], ["Expected array type: ", "\n    but got: ", ""])), (0, stringify_1.typeToString)(this.arrayType), (0, stringify_1.typeToString)(this.receivedType));
    };
    ArrayAssignmentError.prototype.elaborate = function () {
        return this.explain();
    };
    return ArrayAssignmentError;
}());
exports.ArrayAssignmentError = ArrayAssignmentError;
var ReassignConstError = /** @class */ (function () {
    function ReassignConstError(node) {
        this.node = node;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(ReassignConstError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    ReassignConstError.prototype.explain = function () {
        var varName = formatAssignment(this.node)[0];
        return "Reassignment of constant ".concat(varName);
    };
    ReassignConstError.prototype.elaborate = function () {
        return this.explain();
    };
    return ReassignConstError;
}());
exports.ReassignConstError = ReassignConstError;
var DifferentAssignmentError = /** @class */ (function () {
    function DifferentAssignmentError(node, expectedType, receivedType) {
        this.node = node;
        this.expectedType = expectedType;
        this.receivedType = receivedType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(DifferentAssignmentError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    DifferentAssignmentError.prototype.explain = function () {
        var _a = formatAssignment(this.node), varName = _a[0], assignmentStr = _a[1];
        return (0, formatters_1.stripIndent)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    Expected assignment of ", ":\n      ", "\n    to get a value of type:\n      ", "\n    but got a value of type:\n      ", "\n    "], ["\n    Expected assignment of ", ":\n      ", "\n    to get a value of type:\n      ", "\n    but got a value of type:\n      ", "\n    "])), varName, assignmentStr, (0, stringify_1.typeToString)(this.expectedType), (0, stringify_1.typeToString)(this.receivedType));
    };
    DifferentAssignmentError.prototype.elaborate = function () {
        return this.explain();
    };
    return DifferentAssignmentError;
}());
exports.DifferentAssignmentError = DifferentAssignmentError;
function formatAssignment(node) {
    var leftNode = node.left;
    var assignmentStr = (0, formatters_1.simplify)((0, astring_1.generate)(node.right));
    return [leftNode.name, assignmentStr];
}
var CyclicReferenceError = /** @class */ (function () {
    function CyclicReferenceError(node) {
        this.node = node;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(CyclicReferenceError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    CyclicReferenceError.prototype.explain = function () {
        return "".concat(stringifyNode(this.node), " contains cyclic reference to itself");
    };
    CyclicReferenceError.prototype.elaborate = function () {
        return this.explain();
    };
    return CyclicReferenceError;
}());
exports.CyclicReferenceError = CyclicReferenceError;
function stringifyNode(node) {
    var _a;
    return ['VariableDeclaration', 'FunctionDeclaration'].includes(node.type)
        ? node.type === 'VariableDeclaration'
            ? node.declarations[0].id.name
            : (_a = node.id) === null || _a === void 0 ? void 0 : _a.name
        : node.type === 'Identifier'
            ? node.name
            : JSON.stringify(node); // might not be a good idea
}
var DifferentNumberArgumentsError = /** @class */ (function () {
    function DifferentNumberArgumentsError(node, numExpectedArgs, numReceived) {
        this.node = node;
        this.numExpectedArgs = numExpectedArgs;
        this.numReceived = numReceived;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(DifferentNumberArgumentsError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    DifferentNumberArgumentsError.prototype.explain = function () {
        return "Function expected ".concat(this.numExpectedArgs, " args, but got ").concat(this.numReceived);
    };
    DifferentNumberArgumentsError.prototype.elaborate = function () {
        return this.explain();
    };
    return DifferentNumberArgumentsError;
}());
exports.DifferentNumberArgumentsError = DifferentNumberArgumentsError;
var InvalidArgumentTypesError = /** @class */ (function () {
    function InvalidArgumentTypesError(node, args, expectedTypes, receivedTypes) {
        this.node = node;
        this.args = args;
        this.expectedTypes = expectedTypes;
        this.receivedTypes = receivedTypes;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(InvalidArgumentTypesError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidArgumentTypesError.prototype.explain = function () {
        var argStrings = this.args.map(function (arg) { return (0, formatters_1.simplify)((0, astring_1.generate)(arg)); });
        if ('operator' in this.node) {
            var op = this.node.operator;
            if (this.expectedTypes.length === 2) {
                // binary operator
                return (0, formatters_1.stripIndent)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        A type mismatch was detected in the binary expression:\n          ", " ", " ", "\n        The binary operator (", ") expected two operands with types:\n          ", " ", " ", "\n        but instead it received two operands of types:\n          ", " ", " ", "\n        "], ["\n        A type mismatch was detected in the binary expression:\n          ", " ", " ", "\n        The binary operator (", ") expected two operands with types:\n          ", " ", " ", "\n        but instead it received two operands of types:\n          ", " ", " ", "\n        "])), argStrings[0], op, argStrings[1], op, (0, stringify_1.typeToString)(this.expectedTypes[0]), op, (0, stringify_1.typeToString)(this.expectedTypes[1]), (0, stringify_1.typeToString)(this.receivedTypes[0]), op, (0, stringify_1.typeToString)(this.receivedTypes[1]));
            }
            else {
                // unary operator
                return (0, formatters_1.stripIndent)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n        A type mismatch was detected in the unary expression:\n          ", " ", "\n        The unary operator (", ") expected its operand to be of type:\n          ", "\n        but instead it received an operand of type:\n          ", "\n        "], ["\n        A type mismatch was detected in the unary expression:\n          ", " ", "\n        The unary operator (", ") expected its operand to be of type:\n          ", "\n        but instead it received an operand of type:\n          ", "\n        "])), op, argStrings[0], op, (0, stringify_1.typeToString)(this.expectedTypes[0]), (0, stringify_1.typeToString)(this.receivedTypes[0]));
            }
        }
        var functionString = (0, formatters_1.simplify)((0, astring_1.generate)(this.node));
        function formatPhrasing(types) {
            switch (types.length) {
                // there will at least be one argument
                case 1:
                    return "an argument of type:\n      ".concat((0, stringify_1.typeToString)(types[0]));
                default:
                    return "".concat(types.length, " arguments of types:\n      ").concat(types.map(stringify_1.typeToString).join(', '));
            }
        }
        return (0, formatters_1.stripIndent)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n    A type mismatch was detected in the function call:\n      ", "\n    The function expected ", "\n    but instead received ", "\n    "], ["\n    A type mismatch was detected in the function call:\n      ", "\n    The function expected ", "\n    but instead received ", "\n    "])), functionString, formatPhrasing(this.expectedTypes), formatPhrasing(this.receivedTypes));
    };
    InvalidArgumentTypesError.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidArgumentTypesError;
}());
exports.InvalidArgumentTypesError = InvalidArgumentTypesError;
function formatNodeWithTest(node) {
    var exprString = (0, formatters_1.simplify)((0, astring_1.generate)(node.test));
    var kind;
    switch (node.type) {
        case 'IfStatement': {
            exprString = "if (".concat(exprString, ") { ... } else { ... }");
            kind = 'if statement';
            break;
        }
        case 'ConditionalExpression': {
            exprString = "".concat(exprString, " ? ... : ...");
            kind = 'conditional expression';
            break;
        }
        case 'WhileStatement': {
            exprString = "while (".concat(exprString, ") { ... }");
            kind = 'while statement';
            break;
        }
        case 'ForStatement': {
            exprString = "for (...; ".concat(exprString, "; ...) { ... }");
            kind = 'for statement';
        }
    }
    return { exprString: exprString, kind: kind };
}
var InvalidTestConditionError = /** @class */ (function () {
    function InvalidTestConditionError(node, receivedType) {
        this.node = node;
        this.receivedType = receivedType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(InvalidTestConditionError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidTestConditionError.prototype.explain = function () {
        var _a = formatNodeWithTest(this.node), exprString = _a.exprString, kind = _a.kind;
        return (0, formatters_1.stripIndent)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n    Expected the test part of the ", ":\n      ", "\n    to have type boolean, but instead it is type:\n      ", "\n    "], ["\n    Expected the test part of the ", ":\n      ", "\n    to have type boolean, but instead it is type:\n      ", "\n    "])), kind, exprString, (0, stringify_1.typeToString)(this.receivedType));
    };
    InvalidTestConditionError.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidTestConditionError;
}());
exports.InvalidTestConditionError = InvalidTestConditionError;
var UndefinedIdentifierError = /** @class */ (function () {
    function UndefinedIdentifierError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(UndefinedIdentifierError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    UndefinedIdentifierError.prototype.explain = function () {
        return (0, formatters_1.stripIndent)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n    One or more undeclared names detected (e.g. '", "').\n    If there aren't actually any undeclared names, then is either a Source or misconfiguration bug.\n    Please report this to the administrators!\n    "], ["\n    One or more undeclared names detected (e.g. '", "').\n    If there aren't actually any undeclared names, then is either a Source or misconfiguration bug.\n    Please report this to the administrators!\n    "])), this.name);
    };
    UndefinedIdentifierError.prototype.elaborate = function () {
        return this.explain();
    };
    return UndefinedIdentifierError;
}());
exports.UndefinedIdentifierError = UndefinedIdentifierError;
var ConsequentAlternateMismatchError = /** @class */ (function () {
    function ConsequentAlternateMismatchError(node, consequentType, alternateType) {
        this.node = node;
        this.consequentType = consequentType;
        this.alternateType = alternateType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(ConsequentAlternateMismatchError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    ConsequentAlternateMismatchError.prototype.explain = function () {
        var _a = formatNodeWithTest(this.node), exprString = _a.exprString, kind = _a.kind;
        return (0, formatters_1.stripIndent)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n    The two branches of the ", ":\n      ", "\n    produce different types!\n    The true branch has type:\n      ", "\n    but the false branch has type:\n      ", "\n    "], ["\n    The two branches of the ", ":\n      ", "\n    produce different types!\n    The true branch has type:\n      ", "\n    but the false branch has type:\n      ", "\n    "])), kind, exprString, (0, stringify_1.typeToString)(this.consequentType), (0, stringify_1.typeToString)(this.alternateType));
    };
    ConsequentAlternateMismatchError.prototype.elaborate = function () {
        return this.explain();
    };
    return ConsequentAlternateMismatchError;
}());
exports.ConsequentAlternateMismatchError = ConsequentAlternateMismatchError;
var CallingNonFunctionType = /** @class */ (function () {
    function CallingNonFunctionType(node, callerType) {
        this.node = node;
        this.callerType = callerType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(CallingNonFunctionType.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    CallingNonFunctionType.prototype.explain = function () {
        return (0, formatters_1.stripIndent)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n    In\n      ", "\n    expected\n      ", "\n    to be a function type, but instead it is type:\n      ", "\n    "], ["\n    In\n      ", "\n    expected\n      ", "\n    to be a function type, but instead it is type:\n      ", "\n    "])), (0, formatters_1.simplify)((0, astring_1.generate)(this.node)), (0, formatters_1.simplify)((0, astring_1.generate)(this.node.callee)), (0, stringify_1.typeToString)(this.callerType));
    };
    CallingNonFunctionType.prototype.elaborate = function () {
        return this.explain();
    };
    return CallingNonFunctionType;
}());
exports.CallingNonFunctionType = CallingNonFunctionType;
var InconsistentPredicateTestError = /** @class */ (function () {
    function InconsistentPredicateTestError(node, argVarName, preUnifyType, predicateType) {
        this.node = node;
        this.argVarName = argVarName;
        this.preUnifyType = preUnifyType;
        this.predicateType = predicateType;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(InconsistentPredicateTestError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InconsistentPredicateTestError.prototype.explain = function () {
        var exprString = (0, astring_1.generate)(this.node);
        return (0, formatters_1.stripIndent)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n    Inconsistent type constraints when trying to apply the predicate test\n      ", "\n    It is inconsistent with the predicate tests applied before it.\n    The variable ", " has type\n      ", "\n    but could not unify with type\n      ", "\n    "], ["\n    Inconsistent type constraints when trying to apply the predicate test\n      ", "\n    It is inconsistent with the predicate tests applied before it.\n    The variable ", " has type\n      ", "\n    but could not unify with type\n      ", "\n    "])), exprString, this.argVarName, (0, stringify_1.typeToString)(this.preUnifyType), (0, stringify_1.typeToString)(this.predicateType));
    };
    InconsistentPredicateTestError.prototype.elaborate = function () {
        return this.explain();
    };
    return InconsistentPredicateTestError;
}());
exports.InconsistentPredicateTestError = InconsistentPredicateTestError;
// Errors for Source Typed error checker
var TypeMismatchError = /** @class */ (function () {
    function TypeMismatchError(node, actualTypeString, expectedTypeString) {
        this.node = node;
        this.actualTypeString = actualTypeString;
        this.expectedTypeString = expectedTypeString;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeMismatchError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeMismatchError.prototype.explain = function () {
        return "Type '".concat(this.actualTypeString, "' is not assignable to type '").concat(this.expectedTypeString, "'.");
    };
    TypeMismatchError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeMismatchError;
}());
exports.TypeMismatchError = TypeMismatchError;
var TypeNotFoundError = /** @class */ (function () {
    function TypeNotFoundError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeNotFoundError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeNotFoundError.prototype.explain = function () {
        return "Type '".concat(this.name, "' not declared.");
    };
    TypeNotFoundError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeNotFoundError;
}());
exports.TypeNotFoundError = TypeNotFoundError;
var FunctionShouldHaveReturnValueError = /** @class */ (function () {
    function FunctionShouldHaveReturnValueError(node) {
        this.node = node;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(FunctionShouldHaveReturnValueError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    FunctionShouldHaveReturnValueError.prototype.explain = function () {
        return "A function whose declared type is neither 'void' nor 'any' must return a value.";
    };
    FunctionShouldHaveReturnValueError.prototype.elaborate = function () {
        return this.explain();
    };
    return FunctionShouldHaveReturnValueError;
}());
exports.FunctionShouldHaveReturnValueError = FunctionShouldHaveReturnValueError;
var TypeNotCallableError = /** @class */ (function () {
    function TypeNotCallableError(node, typeName) {
        this.node = node;
        this.typeName = typeName;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeNotCallableError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeNotCallableError.prototype.explain = function () {
        return "Type '".concat(this.typeName, "' is not callable.");
    };
    TypeNotCallableError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeNotCallableError;
}());
exports.TypeNotCallableError = TypeNotCallableError;
var TypecastError = /** @class */ (function () {
    function TypecastError(node, originalType, typeToCastTo) {
        this.node = node;
        this.originalType = originalType;
        this.typeToCastTo = typeToCastTo;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypecastError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypecastError.prototype.explain = function () {
        return "Type '".concat(this.originalType, "' cannot be casted to type '").concat(this.typeToCastTo, "' as the two types do not intersect.");
    };
    TypecastError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypecastError;
}());
exports.TypecastError = TypecastError;
var TypeNotAllowedError = /** @class */ (function () {
    function TypeNotAllowedError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeNotAllowedError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeNotAllowedError.prototype.explain = function () {
        return "Type '".concat(this.name, "' is not allowed.");
    };
    TypeNotAllowedError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeNotAllowedError;
}());
exports.TypeNotAllowedError = TypeNotAllowedError;
var UndefinedVariableTypeError = /** @class */ (function () {
    function UndefinedVariableTypeError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(UndefinedVariableTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    UndefinedVariableTypeError.prototype.explain = function () {
        return "Name ".concat(this.name, " not declared.");
    };
    UndefinedVariableTypeError.prototype.elaborate = function () {
        return "Before you can read the value of ".concat(this.name, ", you need to declare it as a variable or a constant. You can do this using the let or const keywords.");
    };
    return UndefinedVariableTypeError;
}());
exports.UndefinedVariableTypeError = UndefinedVariableTypeError;
var InvalidNumberOfArgumentsTypeError = /** @class */ (function () {
    function InvalidNumberOfArgumentsTypeError(node, expected, got, hasVarArgs) {
        if (hasVarArgs === void 0) { hasVarArgs = false; }
        this.node = node;
        this.expected = expected;
        this.got = got;
        this.hasVarArgs = hasVarArgs;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.calleeStr = (0, astring_1.generate)(node.callee);
    }
    Object.defineProperty(InvalidNumberOfArgumentsTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidNumberOfArgumentsTypeError.prototype.explain = function () {
        return "Expected ".concat(this.expected, " ").concat(this.hasVarArgs ? 'or more ' : '', "arguments, but got ").concat(this.got, ".");
    };
    InvalidNumberOfArgumentsTypeError.prototype.elaborate = function () {
        var calleeStr = this.calleeStr;
        var pluralS = this.expected === 1 ? '' : 's';
        return "Try calling function ".concat(calleeStr, " again, but with ").concat(this.expected, " argument").concat(pluralS, " instead. Remember that arguments are separated by a ',' (comma).");
    };
    return InvalidNumberOfArgumentsTypeError;
}());
exports.InvalidNumberOfArgumentsTypeError = InvalidNumberOfArgumentsTypeError;
var InvalidNumberOfTypeArgumentsForGenericTypeError = /** @class */ (function () {
    function InvalidNumberOfTypeArgumentsForGenericTypeError(node, name, expected) {
        this.node = node;
        this.name = name;
        this.expected = expected;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(InvalidNumberOfTypeArgumentsForGenericTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidNumberOfTypeArgumentsForGenericTypeError.prototype.explain = function () {
        return "Generic type '".concat(this.name, "' requires ").concat(this.expected, " type argument(s).");
    };
    InvalidNumberOfTypeArgumentsForGenericTypeError.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidNumberOfTypeArgumentsForGenericTypeError;
}());
exports.InvalidNumberOfTypeArgumentsForGenericTypeError = InvalidNumberOfTypeArgumentsForGenericTypeError;
var TypeNotGenericError = /** @class */ (function () {
    function TypeNotGenericError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeNotGenericError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeNotGenericError.prototype.explain = function () {
        return "Type '".concat(this.name, "' is not generic.");
    };
    TypeNotGenericError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeNotGenericError;
}());
exports.TypeNotGenericError = TypeNotGenericError;
var TypeAliasNameNotAllowedError = /** @class */ (function () {
    function TypeAliasNameNotAllowedError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeAliasNameNotAllowedError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeAliasNameNotAllowedError.prototype.explain = function () {
        return "Type alias name cannot be '".concat(this.name, "'.");
    };
    TypeAliasNameNotAllowedError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeAliasNameNotAllowedError;
}());
exports.TypeAliasNameNotAllowedError = TypeAliasNameNotAllowedError;
var TypeParameterNameNotAllowedError = /** @class */ (function () {
    function TypeParameterNameNotAllowedError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(TypeParameterNameNotAllowedError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeParameterNameNotAllowedError.prototype.explain = function () {
        return "Type parameter name cannot be '".concat(this.name, "'.");
    };
    TypeParameterNameNotAllowedError.prototype.elaborate = function () {
        return this.explain();
    };
    return TypeParameterNameNotAllowedError;
}());
exports.TypeParameterNameNotAllowedError = TypeParameterNameNotAllowedError;
var InvalidIndexTypeError = /** @class */ (function () {
    function InvalidIndexTypeError(node, typeName) {
        this.node = node;
        this.typeName = typeName;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(InvalidIndexTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidIndexTypeError.prototype.explain = function () {
        return "Type '".concat(this.typeName, "' cannot be used as an index type.");
    };
    InvalidIndexTypeError.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidIndexTypeError;
}());
exports.InvalidIndexTypeError = InvalidIndexTypeError;
var InvalidArrayAccessTypeError = /** @class */ (function () {
    function InvalidArrayAccessTypeError(node, typeName) {
        this.node = node;
        this.typeName = typeName;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(InvalidArrayAccessTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    InvalidArrayAccessTypeError.prototype.explain = function () {
        return "Type '".concat(this.typeName, "' cannot be accessed as it is not an array.");
    };
    InvalidArrayAccessTypeError.prototype.elaborate = function () {
        return this.explain();
    };
    return InvalidArrayAccessTypeError;
}());
exports.InvalidArrayAccessTypeError = InvalidArrayAccessTypeError;
var ConstNotAssignableTypeError = /** @class */ (function () {
    function ConstNotAssignableTypeError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(ConstNotAssignableTypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    ConstNotAssignableTypeError.prototype.explain = function () {
        return "Cannot assign to '".concat(this.name, "' as it is a constant.");
    };
    ConstNotAssignableTypeError.prototype.elaborate = function () {
        return this.explain();
    };
    return ConstNotAssignableTypeError;
}());
exports.ConstNotAssignableTypeError = ConstNotAssignableTypeError;
var DuplicateTypeAliasError = /** @class */ (function () {
    function DuplicateTypeAliasError(node, name) {
        this.node = node;
        this.name = name;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(DuplicateTypeAliasError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    DuplicateTypeAliasError.prototype.explain = function () {
        return "Type alias '".concat(this.name, "' has already been declared.");
    };
    DuplicateTypeAliasError.prototype.elaborate = function () {
        return this.explain();
    };
    return DuplicateTypeAliasError;
}());
exports.DuplicateTypeAliasError = DuplicateTypeAliasError;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10;
