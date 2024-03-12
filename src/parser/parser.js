"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
var types_1 = require("../types");
var fullJS_1 = require("./fullJS");
var fullTS_1 = require("./fullTS");
var ooga_1 = require("./ooga");
var python_1 = require("./python");
var scheme_1 = require("./scheme");
var source_1 = require("./source");
var typed_1 = require("./source/typed");
function parse(programStr, context, options, throwOnError) {
    var parser;
    switch (context.chapter) {
        case types_1.Chapter.SCHEME_1:
        case types_1.Chapter.SCHEME_2:
        case types_1.Chapter.SCHEME_3:
        case types_1.Chapter.SCHEME_4:
        case types_1.Chapter.FULL_SCHEME:
            parser = new scheme_1.SchemeParser(context.chapter);
            break;
        case types_1.Chapter.PYTHON_1:
            parser = new python_1.PythonParser(context.chapter);
            break;
        case types_1.Chapter.FULL_JS:
            parser = new fullJS_1.FullJSParser();
            break;
        case types_1.Chapter.FULL_TS:
            parser = new fullTS_1.FullTSParser();
            break;
        case types_1.Chapter.OOGA:
            parser = new ooga_1.OogaParser();
            break;
        default:
            switch (context.variant) {
                case types_1.Variant.TYPED:
                    parser = new typed_1.SourceTypedParser(context.chapter, context.variant);
                    break;
                default:
                    parser = new source_1.SourceParser(context.chapter, context.variant);
            }
    }
    var ast = parser.parse(programStr, context, options, throwOnError);
    var validAst = !!ast && parser.validate(ast, context, throwOnError);
    return validAst ? ast : null;
}
exports.parse = parse;
