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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:max-classes-per-file */
var astring_1 = require("astring");
var lodash_1 = require("lodash");
var utils_1 = require("../cse-machine/utils");
var astCreator_1 = require("../utils/astCreator");
var interpreter_1 = require("./interpreter");
var closureToJS = function (value, context, klass) {
    function DummyClass() {
        var args = Array.prototype.slice.call(arguments);
        var gen = (0, interpreter_1.apply)(context, value, args, (0, astCreator_1.callExpression)((0, astCreator_1.identifier)(klass), args), this);
        var it = gen.next();
        while (!it.done) {
            it = gen.next();
        }
        return it.value;
    }
    Object.defineProperty(DummyClass, 'name', {
        value: klass
    });
    Object.setPrototypeOf(DummyClass, function () { return undefined; });
    Object.defineProperty(DummyClass, 'Inherits', {
        value: function (Parent) {
            DummyClass.prototype = Object.create(Parent.prototype);
            DummyClass.prototype.constructor = DummyClass;
        }
    });
    DummyClass.toString = function () { return (0, astring_1.generate)(value.originalNode); };
    DummyClass.call = function (thisArg) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return DummyClass.apply(thisArg, args);
    };
    return DummyClass;
};
var Callable = /** @class */ (function (_super) {
    __extends(Callable, _super);
    function Callable(f) {
        var _newTarget = this.constructor;
        var _this = _super.call(this) || this;
        return Object.setPrototypeOf(f, _newTarget.prototype);
    }
    return Callable;
}(Function));
/**
 * Models function value in the interpreter environment.
 */
var Closure = /** @class */ (function (_super) {
    __extends(Closure, _super);
    function Closure(node, environment, context, isPredefined) {
        var _this = _super.call(this, function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return funJS.apply(this, args);
        }) || this;
        _this.node = node;
        _this.environment = environment;
        _this.originalNode = node;
        _this.id = (0, lodash_1.uniqueId)();
        if (_this.node.type === 'FunctionDeclaration' && _this.node.id !== null) {
            _this.functionName = _this.node.id.name;
        }
        else {
            _this.functionName =
                (_this.node.params.length === 1 ? '' : '(') +
                    _this.node.params.map(function (o) { return o.name; }).join(', ') +
                    (_this.node.params.length === 1 ? '' : ')') +
                    ' => ...';
        }
        // TODO: Investigate how relevant this really is.
        // .fun seems to only be used in interpreter's NewExpression handler, which uses .fun.prototype.
        var funJS = closureToJS(_this, context, _this.functionName);
        _this.fun = funJS;
        _this.preDefined = isPredefined == undefined ? undefined : isPredefined;
        return _this;
    }
    Closure.makeFromArrowFunction = function (node, environment, context, dummyReturn, predefined) {
        var functionBody = !(0, utils_1.isBlockStatement)(node.body)
            ? (0, astCreator_1.blockStatement)([(0, astCreator_1.returnStatement)(node.body, node.body.loc)], node.body.loc)
            : dummyReturn && !(0, utils_1.hasReturnStatement)(node.body)
                ? (0, astCreator_1.blockStatement)(__spreadArray(__spreadArray([], node.body.body, true), [
                    (0, astCreator_1.returnStatement)((0, astCreator_1.identifier)('undefined', node.body.loc), node.body.loc)
                ], false), node.body.loc)
                : node.body;
        var closure = new Closure((0, astCreator_1.blockArrowFunction)(node.params, functionBody, node.loc), environment, context, predefined);
        // Set the closure's node to point back at the original one
        closure.originalNode = node;
        return closure;
    };
    Closure.prototype.toString = function () {
        return (0, astring_1.generate)(this.originalNode);
    };
    return Closure;
}(Callable));
exports.default = Closure;
