"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUpdateAssignment = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var NoUpdateAssignment = /** @class */ (function () {
    function NoUpdateAssignment(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoUpdateAssignment.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoUpdateAssignment.prototype.explain = function () {
        return 'The assignment operator ' + this.node.operator + ' is not allowed. Use = instead.';
    };
    NoUpdateAssignment.prototype.elaborate = function () {
        var leftStr = (0, astring_1.generate)(this.node.left);
        var rightStr = (0, astring_1.generate)(this.node.right);
        var newOpStr = this.node.operator.slice(0, -1);
        if (newOpStr === '+' || newOpStr === '-' || newOpStr === '/' || newOpStr === '*') {
            var elabStr = "\n\t".concat(leftStr, " = ").concat(leftStr, " ").concat(newOpStr, " ").concat(rightStr, ";");
            return elabStr;
        }
        else {
            return '';
        }
    };
    return NoUpdateAssignment;
}());
exports.NoUpdateAssignment = NoUpdateAssignment;
var noUpdateAssignment = {
    name: 'no-update-assignment',
    checkers: {
        AssignmentExpression: function (node, _ancestors) {
            if (node.operator !== '=') {
                return [new NoUpdateAssignment(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noUpdateAssignment;
