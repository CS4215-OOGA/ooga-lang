"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWrapper = void 0;
// tslint:disable-next-line:ban-types
function makeWrapper(originalFunc, wrappedFunc) {
    for (var prop in originalFunc) {
        if (originalFunc.hasOwnProperty(prop)) {
            Object.defineProperty(wrappedFunc, prop, Object.getOwnPropertyDescriptor(originalFunc, prop));
        }
    }
    for (var _i = 0, _a = ['length', 'name']; _i < _a.length; _i++) {
        var prop = _a[_i];
        if (originalFunc.hasOwnProperty(prop)) {
            Object.defineProperty(wrappedFunc, prop, Object.getOwnPropertyDescriptor(originalFunc, prop));
        }
    }
}
exports.makeWrapper = makeWrapper;
