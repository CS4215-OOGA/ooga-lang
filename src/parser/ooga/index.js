"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OogaParser = void 0;
var ooga_1 = require("./ooga");
var OogaParser = /** @class */ (function () {
    function OogaParser() {
    }
    OogaParser.prototype.parse = function (programStr, context, options, throwOnError) {
        return (0, ooga_1.parse)(programStr);
    };
    OogaParser.prototype.validate = function (_ast, _context, _throwOnError) {
        throw new Error('Not currently implemented');
    };
    OogaParser.prototype.toString = function () {
        return "OogaParser";
    };
    return OogaParser;
}());
exports.OogaParser = OogaParser;
