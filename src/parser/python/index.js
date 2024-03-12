"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonParser = void 0;
var src_1 = require("../../py-slang/src");
var types_1 = require("../../types");
var errors_1 = require("../errors");
var utils_1 = require("../utils");
var PythonParser = /** @class */ (function () {
    function PythonParser(chapter) {
        this.chapter = chapter;
    }
    PythonParser.prototype.parse = function (programStr, context, options, throwOnError) {
        var _this = this;
        try {
            // parse the Python code
            var chapterNum = (function () {
                switch (_this.chapter) {
                    case types_1.Chapter.PYTHON_1:
                        return 1;
                    // Future additions:
                    //   case Chapter.PYTHON_2:
                    //     return 2
                    //   case Chapter.PYTHON_3:
                    //     return 3
                    //   case Chapter.PYTHON_4:
                    //     return 4
                    default:
                        throw new Error('Unreachable path');
                }
            })();
            return (0, src_1.parsePythonToEstreeAst)(programStr, chapterNum, false);
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                error = new errors_1.FatalSyntaxError((0, utils_1.positionToSourceLocation)(error.loc), error.toString());
            }
            if (throwOnError)
                throw error;
            context.errors.push(error);
        }
        return null;
    };
    PythonParser.prototype.validate = function (_ast, _context, _throwOnError) {
        return true;
    };
    PythonParser.prototype.toString = function () {
        return "PythonParser{chapter: ".concat(this.chapter, "}");
    };
    return PythonParser;
}());
exports.PythonParser = PythonParser;
