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
exports.ModuleInternalError = exports.ModuleNotFoundError = exports.ModuleConnectionError = void 0;
var runtimeSourceError_1 = require("./runtimeSourceError");
var ModuleConnectionError = /** @class */ (function (_super) {
    __extends(ModuleConnectionError, _super);
    function ModuleConnectionError(node) {
        return _super.call(this, node) || this;
    }
    ModuleConnectionError.prototype.explain = function () {
        return ModuleConnectionError.message;
    };
    ModuleConnectionError.prototype.elaborate = function () {
        return ModuleConnectionError.elaboration;
    };
    ModuleConnectionError.message = "Unable to get modules.";
    ModuleConnectionError.elaboration = "You should check your Internet connection, and ensure you have used the correct module path.";
    return ModuleConnectionError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.ModuleConnectionError = ModuleConnectionError;
var ModuleNotFoundError = /** @class */ (function (_super) {
    __extends(ModuleNotFoundError, _super);
    function ModuleNotFoundError(moduleName, node) {
        var _this = _super.call(this, node) || this;
        _this.moduleName = moduleName;
        return _this;
    }
    ModuleNotFoundError.prototype.explain = function () {
        return "Module \"".concat(this.moduleName, "\" not found.");
    };
    ModuleNotFoundError.prototype.elaborate = function () {
        return "\n      You should check your import declarations, and ensure that all are valid modules.\n    ";
    };
    return ModuleNotFoundError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.ModuleNotFoundError = ModuleNotFoundError;
var ModuleInternalError = /** @class */ (function (_super) {
    __extends(ModuleInternalError, _super);
    function ModuleInternalError(moduleName, error, node) {
        var _this = _super.call(this, node) || this;
        _this.moduleName = moduleName;
        _this.error = error;
        return _this;
    }
    ModuleInternalError.prototype.explain = function () {
        return "Error(s) occured when executing the module \"".concat(this.moduleName, "\".");
    };
    ModuleInternalError.prototype.elaborate = function () {
        return "\n      You may need to contact with the author for this module to fix this error.\n    ";
    };
    return ModuleInternalError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.ModuleInternalError = ModuleInternalError;
