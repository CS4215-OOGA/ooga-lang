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
exports.timeoutPromise = exports.PromiseTimeoutError = void 0;
var runtimeSourceError_1 = require("../errors/runtimeSourceError");
var PromiseTimeoutError = /** @class */ (function (_super) {
    __extends(PromiseTimeoutError, _super);
    function PromiseTimeoutError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PromiseTimeoutError;
}(runtimeSourceError_1.RuntimeSourceError));
exports.PromiseTimeoutError = PromiseTimeoutError;
var timeoutPromise = function (promise, timeout) {
    return new Promise(function (resolve, reject) {
        var timeoutid = setTimeout(function () { return reject(new PromiseTimeoutError()); }, timeout);
        promise
            .then(function (res) {
            clearTimeout(timeoutid);
            resolve(res);
        })
            .catch(function (e) {
            clearTimeout(timeoutid);
            reject(e);
        });
    });
};
exports.timeoutPromise = timeoutPromise;
