"use strict";
/*
 * Why not use the nodejs builtin assert? It needs polyfills to work in the browser.
 * With this we have a lightweight assert that doesn't need any further packages.
 * Plus, we can customize our own assert messages and handling
 */
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
exports.AssertionError = void 0;
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var AssertionError = /** @class */ (function (_super) {
    __extends(AssertionError, _super);
    function AssertionError(message) {
        var _this = _super.call(this) || this;
        _this.message = message;
        return _this;
    }
    AssertionError.prototype.explain = function () {
        return this.message;
    };
    AssertionError.prototype.elaborate = function () {
        return 'Please contact the administrators to let them know that this error has occurred';
    };
    return AssertionError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.AssertionError = AssertionError;
function assert(condition, message) {
    if (!condition) {
        throw new AssertionError(message);
    }
}
exports.default = assert;
