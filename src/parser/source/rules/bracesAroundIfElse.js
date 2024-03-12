"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracesAroundIfElseError = void 0;
var astring_1 = require("astring");
var constants_1 = require("../../../constants");
var types_1 = require("../../../types");
var formatters_1 = require("../../../utils/formatters");
var BracesAroundIfElseError = /** @class */ (function () {
    function BracesAroundIfElseError(node, branch) {
        this.node = node;
        this.branch = branch;
        this.type = types_1.ErrorType.SYNTAX;
        this.severity = types_1.ErrorSeverity.ERROR;
    }
    Object.defineProperty(BracesAroundIfElseError.prototype, "location", {
        get: function () {
            var _a;
            return (_a = this.node.loc) !== null && _a !== void 0 ? _a : constants_1.UNKNOWN_LOCATION;
        },
        enumerable: false,
        configurable: true
    });
    BracesAroundIfElseError.prototype.explain = function () {
        if (this.branch === 'consequent') {
            return 'Missing curly braces around "if" block.';
        }
        else {
            return 'Missing curly braces around "else" block.';
        }
    };
    BracesAroundIfElseError.prototype.elaborate = function () {
        var ifOrElse;
        var header;
        var body;
        if (this.branch === 'consequent') {
            ifOrElse = 'if';
            header = "if (".concat((0, astring_1.generate)(this.node.test), ")");
            body = this.node.consequent;
        }
        else {
            ifOrElse = header = 'else';
            body = this.node.alternate;
        }
        return (0, formatters_1.stripIndent)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      ", " block need to be enclosed with a pair of curly braces.\n\n      ", " {\n        ", "\n      }\n\n      An exception is when you have an \"if\" followed by \"else if\", in this case\n      \"else if\" block does not need to be surrounded by curly braces.\n\n      if (someCondition) {\n        // ...\n      } else /* notice missing { here */ if (someCondition) {\n        // ...\n      } else {\n        // ...\n      }\n\n      Rationale: Readability in dense packed code.\n\n      In the snippet below, for instance, with poor indentation it is easy to\n      mistaken hello() and world() to belong to the same branch of logic.\n\n      if (someCondition) {\n        2;\n      } else\n        hello();\n      world();\n\n    "], ["\n      ", " block need to be enclosed with a pair of curly braces.\n\n      ", " {\n        ", "\n      }\n\n      An exception is when you have an \"if\" followed by \"else if\", in this case\n      \"else if\" block does not need to be surrounded by curly braces.\n\n      if (someCondition) {\n        // ...\n      } else /* notice missing { here */ if (someCondition) {\n        // ...\n      } else {\n        // ...\n      }\n\n      Rationale: Readability in dense packed code.\n\n      In the snippet below, for instance, with poor indentation it is easy to\n      mistaken hello() and world() to belong to the same branch of logic.\n\n      if (someCondition) {\n        2;\n      } else\n        hello();\n      world();\n\n    "])), ifOrElse, header, (0, astring_1.generate)(body));
    };
    return BracesAroundIfElseError;
}());
exports.BracesAroundIfElseError = BracesAroundIfElseError;
var bracesAroundIfElse = {
    name: 'braces-around-if-else',
    checkers: {
        IfStatement: function (node, _ancestors) {
            var errors = [];
            if (node.consequent && node.consequent.type !== 'BlockStatement') {
                errors.push(new BracesAroundIfElseError(node, 'consequent'));
            }
            if (node.alternate) {
                var notBlock = node.alternate.type !== 'BlockStatement';
                var notIf = node.alternate.type !== 'IfStatement';
                if (notBlock && notIf) {
                    errors.push(new BracesAroundIfElseError(node, 'alternate'));
                }
            }
            return errors;
        }
    }
};
exports.default = bracesAroundIfElse;
var templateObject_1;
