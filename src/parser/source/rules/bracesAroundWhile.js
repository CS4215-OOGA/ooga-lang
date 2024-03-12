"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracesAroundWhileError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var BracesAroundWhileError = /** @class */ (function () {
    function BracesAroundWhileError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(BracesAroundWhileError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    BracesAroundWhileError.prototype.explain = function () {
        return 'Missing curly braces around "while" block.';
    };
    BracesAroundWhileError.prototype.elaborate = function () {
        var testStr = (0, astring_1.generate)(this.node.test);
        var whileStr = "\twhile (".concat(testStr, ") {\n\t\t//code goes here\n\t}");
        return "Remember to enclose your \"while\" block with braces:\n\n ".concat(whileStr);
    };
    return BracesAroundWhileError;
}());
exports.BracesAroundWhileError = BracesAroundWhileError;
var bracesAroundWhile = {
    name: 'braces-around-while',
    checkers: {
        WhileStatement: function (node, _ancestors) {
            if (node.body.type !== 'BlockStatement') {
                return [new BracesAroundWhileError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = bracesAroundWhile;
