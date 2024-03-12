"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (!ArrayBuffer.transfer) {
    ArrayBuffer.transfer = function (source, length) {
        if (!(source instanceof ArrayBuffer))
            throw new TypeError('Source must be an instance of ArrayBuffer');
        if (length <= source.byteLength)
            return source.slice(0, length);
        var sourceView = new Uint8Array(source);
        var destView = new Uint8Array(new ArrayBuffer(length));
        destView.set(sourceView);
        return destView.buffer;
    };
}
/**
 * A little-endian byte buffer class.
 */
var Buffer = /** @class */ (function () {
    function Buffer() {
        this._capacity = 32;
        this.cursor = 0;
        this._written = 0;
        this._buffer = new ArrayBuffer(this._capacity);
        this._view = new DataView(this._buffer);
    }
    Buffer.prototype.maybeExpand = function (n) {
        if (this.cursor + n < this._capacity) {
            return;
        }
        while (this.cursor + n >= this._capacity) {
            this._capacity *= 2;
        }
        this._buffer = ArrayBuffer.transfer(this._buffer, this._capacity);
        this._view = new DataView(this._buffer);
    };
    Buffer.prototype.updateWritten = function () {
        this._written = Math.max(this._written, this.cursor);
    };
    Buffer.prototype.get = function (signed, s) {
        var r = this._view["get".concat(signed ? 'I' : 'Ui', "nt").concat(s)](this.cursor, true);
        this.cursor += s / 8;
        return r;
    };
    Buffer.prototype.getI = function (s) {
        return this.get(true, s);
    };
    Buffer.prototype.getU = function (s) {
        return this.get(false, s);
    };
    Buffer.prototype.getF = function (s) {
        var r = this._view["getFloat".concat(s)](this.cursor, true);
        this.cursor += s / 8;
        return r;
    };
    Buffer.prototype.put = function (n, signed, s) {
        this.maybeExpand(s / 8);
        this._view["set".concat(signed ? 'I' : 'Ui', "nt").concat(s)](this.cursor, n, true);
        this.cursor += s / 8;
        this.updateWritten();
    };
    Buffer.prototype.putI = function (s, n) {
        this.put(n, true, s);
    };
    Buffer.prototype.putU = function (s, n) {
        this.put(n, false, s);
    };
    Buffer.prototype.putF = function (s, n) {
        this.maybeExpand(s / 8);
        this._view["setFloat".concat(s)](this.cursor, n, true);
        this.cursor += s / 8;
        this.updateWritten();
    };
    Buffer.prototype.putA = function (a) {
        this.maybeExpand(a.byteLength);
        new Uint8Array(this._buffer, this.cursor, a.byteLength).set(a);
        this.cursor += a.byteLength;
        this.updateWritten();
    };
    Buffer.prototype.align = function (n) {
        var rem = this.cursor % n;
        if (rem === 0) {
            return;
        }
        this.cursor += n - rem;
    };
    Buffer.prototype.asArray = function () {
        return new Uint8Array(this._buffer.slice(0, this._written));
    };
    Object.defineProperty(Buffer.prototype, "written", {
        get: function () {
            return this._written;
        },
        enumerable: false,
        configurable: true
    });
    return Buffer;
}());
exports.default = Buffer;
