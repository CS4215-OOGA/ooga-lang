"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoDeclareMutableError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var mutableDeclarators = ['let', 'var'];
var NoDeclareMutableError = /** @class */ (function () {
    function NoDeclareMutableError(node) {
        this.node = node;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(NoDeclareMutableError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    NoDeclareMutableError.prototype.explain = function () {
        return ('Mutable variable declaration using keyword ' + "'".concat(this.node.kind, "'") + ' is not allowed.');
    };
    NoDeclareMutableError.prototype.elaborate = function () {
        var name = this.node.declarations[0].id.name;
        var value = (0, astring_1.generate)(this.node.declarations[0].init);
        return "Use keyword \"const\" instead, to declare a constant:\n\n\tconst ".concat(name, " = ").concat(value, ";");
    };
    return NoDeclareMutableError;
}());
exports.NoDeclareMutableError = NoDeclareMutableError;
var noDeclareMutable = {
    name: 'no-declare-mutable',
    disableFromChapter: types_1.Chapter.SOURCE_3,
    checkers: {
        VariableDeclaration: function (node, _ancestors) {
            if (mutableDeclarators.includes(node.kind)) {
                return [new NoDeclareMutableError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noDeclareMutable;
