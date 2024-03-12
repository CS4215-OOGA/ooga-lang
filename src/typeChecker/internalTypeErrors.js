"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypecheckError = exports.InternalCyclicReferenceError = exports.InternalDifferentNumberArgumentsError = exports.UnifyError = exports.InternalTypeError = exports.TypeError = void 0;
var constants_1 = require("../constants");
var types_1 = require("../types");
var stringify_1 = require("../utils/stringify");
// tslint:disable:max-classes-per-file
var TypeError = /** @class */ (function () {
    function TypeError(node, message) {
        this.node = node;
        this.message = message;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
        node.typability = 'Untypable';
    }
    Object.defineProperty(TypeError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypeError.prototype.explain = function () {
        return this.message;
    };
    TypeError.prototype.elaborate = function () {
        return this.message;
    };
    return TypeError;
}());
exports.TypeError = TypeError;
/**
 * Temporary error that will eventually be converted to TypeError as some errors are only thrown
 * where there is no handle to the node
 */
var InternalTypeError = /** @class */ (function (_super) {
    __extends(InternalTypeError, _super);
    // constructor(public message: string, ...params: any[]) {
    //   super(...params)
    // }
    function InternalTypeError(message) {
        var _this = _super.call(this) || this;
        _this.message = message;
        return _this;
    }
    return InternalTypeError;
}(Error));
exports.InternalTypeError = InternalTypeError;
var UnifyError = /** @class */ (function (_super) {
    __extends(UnifyError, _super);
    function UnifyError(LHS, RHS) {
        var _this = _super.call(this, "Failed to unify LHS: ".concat((0, stringify_1.typeToString)(LHS), ", RHS: ").concat((0, stringify_1.typeToString)(RHS))) || this;
        _this.LHS = LHS;
        _this.RHS = RHS;
        return _this;
    }
    return UnifyError;
}(InternalTypeError));
exports.UnifyError = UnifyError;
var InternalDifferentNumberArgumentsError = /** @class */ (function (_super) {
    __extends(InternalDifferentNumberArgumentsError, _super);
    function InternalDifferentNumberArgumentsError(numExpectedArgs, numReceived) {
        var _this = _super.call(this, "Expected ".concat(numExpectedArgs, " args, got ").concat(numReceived)) || this;
        _this.numExpectedArgs = numExpectedArgs;
        _this.numReceived = numReceived;
        return _this;
    }
    return InternalDifferentNumberArgumentsError;
}(InternalTypeError));
exports.InternalDifferentNumberArgumentsError = InternalDifferentNumberArgumentsError;
var InternalCyclicReferenceError = /** @class */ (function (_super) {
    __extends(InternalCyclicReferenceError, _super);
    function InternalCyclicReferenceError(name) {
        var _this = _super.call(this, "contains a cyclic reference to itself") || this;
        _this.name = name;
        return _this;
    }
    return InternalCyclicReferenceError;
}(InternalTypeError));
exports.InternalCyclicReferenceError = InternalCyclicReferenceError;
var TypecheckError = /** @class */ (function () {
    function TypecheckError(node, message) {
        this.node = node;
        this.message = message;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.WARNING;
    }
    Object.defineProperty(TypecheckError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    TypecheckError.prototype.explain = function () {
        return this.message;
    };
    TypecheckError.prototype.elaborate = function () {
        return this.message;
    };
    return TypecheckError;
}());
exports.TypecheckError = TypecheckError;
