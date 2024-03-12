"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracesAroundForError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var BracesAroundForError = /** @class */ (function () {
    function BracesAroundForError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(BracesAroundForError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    BracesAroundForError.prototype.explain = function () {
        return 'Missing curly braces around "for" block.';
    };
    BracesAroundForError.prototype.elaborate = function () {
        var initStr = (0, astring_1.generate)(this.node.init);
        var testStr = (0, astring_1.generate)(this.node.test);
        var updateStr = (0, astring_1.generate)(this.node.update);
        var forStr = "\tfor (".concat(initStr, " ").concat(testStr, "; ").concat(updateStr, ") {\n\t\t//code goes here\n\t}");
        return "Remember to enclose your \"for\" block with braces:\n\n ".concat(forStr);
    };
    return BracesAroundForError;
}());
exports.BracesAroundForError = BracesAroundForError;
var bracesAroundFor = {
    name: 'braces-around-for',
    checkers: {
        ForStatement: function (node, _ancestors) {
            if (node.body.type !== 'BlockStatement') {
                return [new BracesAroundForError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = bracesAroundFor;
