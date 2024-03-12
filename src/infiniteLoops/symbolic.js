"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateHybridUnary = exports.evaluateHybridBinary = exports.shallowConcretize = exports.deepConcretizeInplace = exports.hybridArrayConstructor = exports.getBooleanResult = exports.makeDummyHybrid = exports.hybridValueConstructor = exports.isHybrid = exports.hybridizeNamed = exports.Validity = void 0;
var create = require("../utils/astCreator");
var operators_1 = require("../utils/operators");
// data structure for symbolic + hybrid values
var Validity;
(function (Validity) {
    Validity[Validity["Valid"] = 0] = "Valid";
    Validity[Validity["NoSmt"] = 1] = "NoSmt";
    Validity[Validity["NoCycle"] = 2] = "NoCycle";
})(Validity || (exports.Validity = Validity = {}));
function isInvalid(status) {
    return status !== Validity.Valid;
}
function hybridizeNamed(name, value) {
    if (isHybrid(value) || value === undefined || typeof value === 'function') {
        return value;
    }
    else if (Array.isArray(value)) {
        return makeHybridArray(name, value);
    }
    else {
        return (0, exports.hybridValueConstructor)(value, create.identifier(name));
    }
}
exports.hybridizeNamed = hybridizeNamed;
function isHybrid(value) {
    return typeof value === 'object' && value !== null && value.hasOwnProperty('symbolic');
}
exports.isHybrid = isHybrid;
function isConcreteValue(value) {
    return !(isHybrid(value) || Array.isArray(value));
}
var hybridValueConstructor = function (concrete, symbolic, validity) {
    if (validity === void 0) { validity = Validity.Valid; }
    return ({
        type: 'value',
        concrete: concrete,
        symbolic: symbolic,
        validity: validity
    });
};
exports.hybridValueConstructor = hybridValueConstructor;
function makeDummyHybrid(concrete) {
    if (!isConcreteValue(concrete)) {
        return concrete;
    }
    var val = {
        type: 'value',
        concrete: concrete,
        symbolic: create.literal(concrete),
        validity: Validity.Valid
    };
    return val;
}
exports.makeDummyHybrid = makeDummyHybrid;
function getBooleanResult(value) {
    if (value.concrete) {
        return value.symbolic;
    }
    if (value.negation !== undefined) {
        return value.negation;
    }
    else {
        return create.unaryExpression('!', value.symbolic);
    }
}
exports.getBooleanResult = getBooleanResult;
var hybridArrayConstructor = function (concrete, symbolic, listHeads) {
    if (listHeads === void 0) { listHeads = []; }
    return ({
        type: 'array',
        concrete: concrete,
        symbolic: symbolic,
        listHeads: listHeads,
        validity: Validity.Valid
    });
};
exports.hybridArrayConstructor = hybridArrayConstructor;
function makeHybridArray(name, concrete) {
    // note single quotes used in generated indentifiers: quick hack to avoid name clashes
    var count = 0;
    var visited = [];
    function innerInplace(x) {
        visited.push(x);
        for (var i = 0; i < x.length; i++) {
            if (Array.isArray(x[i])) {
                var skip = false;
                for (var _i = 0, visited_1 = visited; _i < visited_1.length; _i++) {
                    var v = visited_1[_i];
                    if (x[i] === v)
                        skip = true;
                }
                if (!skip)
                    innerInplace(x[i]);
            }
            else if (x[i] !== null &&
                x[i] !== undefined &&
                x[i].symbolic === undefined &&
                typeof x[i] === 'number') {
                x[i] = (0, exports.hybridValueConstructor)(x[i], create.identifier("".concat(name, "'").concat(count++)));
            }
        }
    }
    innerInplace(concrete);
    // NOTE: below symbolic value won't be used in SMT
    return (0, exports.hybridArrayConstructor)(concrete, create.identifier("".concat(name, "'array")));
}
function deepConcretizeInplace(value) {
    var seen = new WeakSet();
    function innerInplace(x) {
        seen.add(x);
        for (var i = 0; i < x.length; i++) {
            if (Array.isArray(x[i])) {
                if (!seen.has(x[i])) {
                    innerInplace(x[i]);
                }
            }
            else {
                x[i] = shallowConcretize(x[i]);
            }
        }
    }
    if (Array.isArray(value)) {
        innerInplace(value);
        return value;
    }
    else {
        return shallowConcretize(value);
    }
}
exports.deepConcretizeInplace = deepConcretizeInplace;
function shallowConcretize(value) {
    if (isHybrid(value)) {
        return value.concrete;
    }
    else {
        return value;
    }
}
exports.shallowConcretize = shallowConcretize;
function getAST(v) {
    if (isHybrid(v)) {
        return v.symbolic;
    }
    else {
        return create.literal(v);
    }
}
function evaluateHybridBinary(op, lhs, rhs) {
    if (Array.isArray(shallowConcretize(lhs)) || Array.isArray(shallowConcretize(rhs))) {
        return (0, exports.hybridValueConstructor)((0, operators_1.evaluateBinaryExpression)(op, shallowConcretize(lhs), shallowConcretize(rhs)), create.literal(false));
    }
    else if (isHybrid(lhs) || isHybrid(rhs)) {
        var val = (0, operators_1.evaluateBinaryExpression)(op, shallowConcretize(lhs), shallowConcretize(rhs));
        if (isInvalid(lhs.validity) || isInvalid(rhs.validity)) {
            var result = makeDummyHybrid(val);
            result.validity = Math.max(lhs.validity, rhs.validity);
            return result;
        }
        var res = void 0;
        if (op === '!==') {
            res = (0, exports.hybridValueConstructor)(val, neqRefine(lhs, rhs));
        }
        else {
            res = (0, exports.hybridValueConstructor)(val, create.binaryExpression(op, getAST(lhs), getAST(rhs)));
        }
        var neg = getNegation(op, lhs, rhs);
        if (neg !== undefined) {
            res.negation = neg;
        }
        if (op === '!==' || op === '===') {
            var concIsNumber = function (x) { return typeof shallowConcretize(x) === 'number'; };
            if (!(concIsNumber(lhs) && concIsNumber(rhs))) {
                res.validity = Validity.NoSmt;
            }
        }
        return res;
    }
    else {
        return (0, operators_1.evaluateBinaryExpression)(op, lhs, rhs);
    }
}
exports.evaluateHybridBinary = evaluateHybridBinary;
/**
 * To provide more information to the SMT solver, whenever '!==' is encountered
 * comparing 2 numbers, we replace it with '>' or '<' accordingly.
 */
function neqRefine(lhs, rhs) {
    var op = shallowConcretize(lhs) < shallowConcretize(rhs) ? '<' : '>';
    return create.binaryExpression(op, getAST(lhs), getAST(rhs));
}
function getNegation(op, lhs, rhs) {
    var fromOp = ['>', '>=', '<', '<=', '!=='];
    var toOp = ['<=', '<', '>=', '>', '==='];
    var ix = fromOp.indexOf(op);
    if (ix > -1) {
        return create.binaryExpression(toOp[ix], getAST(lhs), getAST(rhs));
    }
    if (op === '===') {
        return neqRefine(lhs, rhs);
    }
    return undefined;
}
function evaluateHybridUnary(op, val) {
    if (isHybrid(val)) {
        var conc = (0, operators_1.evaluateUnaryExpression)(op, shallowConcretize(val));
        if (isInvalid(val.validity)) {
            var result = makeDummyHybrid(val);
            result.validity = val.validity;
            return result;
        }
        if (val.symbolic.type === 'Literal') {
            var newSym = __assign(__assign({}, val.symbolic), { val: conc });
            return (0, exports.hybridValueConstructor)(conc, newSym);
        }
        else if (op === '!' && val.type === 'value' && val.negation !== undefined) {
            var result = (0, exports.hybridValueConstructor)(conc, val.negation);
            result.negation = val.symbolic;
            return result;
        }
        else {
            return (0, exports.hybridValueConstructor)(conc, create.unaryExpression(op, getAST(val)));
        }
    }
    else {
        return (0, operators_1.evaluateUnaryExpression)(op, val);
    }
}
exports.evaluateHybridUnary = evaluateHybridUnary;
