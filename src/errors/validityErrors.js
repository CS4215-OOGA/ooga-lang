"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoAssignmentToForVariable = void 0;
var constants_1 = require("../constants");
var types_1 = require("../types");
var NoAssignmentToForVariable = /** @class */ (function () {
    function NoAssignmentToForVariable(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoAssignmentToForVariable.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoAssignmentToForVariable.prototype.explain = function () {
        return 'Assignment to a for loop variable in the for loop is not allowed.';
    };
    NoAssignmentToForVariable.prototype.elaborate = function () {
        return this.explain();
    };
    return NoAssignmentToForVariable;
}());
exports.NoAssignmentToForVariable = NoAssignmentToForVariable;
