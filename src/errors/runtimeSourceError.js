"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeSourceError = void 0;
var constants_1 = require("../constants");
var types_1 = require("../types");
var RuntimeSourceError = /** @class */ (function () {
    function RuntimeSourceError(node) {
        var _a;
        this.type = types_1.ErrorType.RUNTIME;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.location = (_a = node === null || node === void 0 ? void 0 : node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
    }
    RuntimeSourceError.prototype.explain = function () {
        return '';
    };
    RuntimeSourceError.prototype.elaborate = function () {
        return this.explain();
    };
    return RuntimeSourceError;
}());
exports.RuntimeSourceError = RuntimeSourceError;
