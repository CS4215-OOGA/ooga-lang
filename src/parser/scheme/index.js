"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeError = exports.decodeValue = exports.encodeTree = exports.SchemeParser = void 0;
var src_1 = require("../../scm-slang/src");
var source_scheme_library_1 = require("../../scm-slang/src/stdlib/source-scheme-library");
var types_1 = require("../../types");
var errors_1 = require("../errors");
var utils_1 = require("../utils");
var walk = require('acorn-walk');
var SchemeParser = /** @class */ (function () {
    function SchemeParser(chapter) {
        this.chapter = getSchemeChapter(chapter);
    }
    SchemeParser.prototype.parse = function (programStr, context, options, throwOnError) {
        try {
            // parse the scheme code
            var estree = (0, src_1.schemeParse)(programStr, this.chapter);
            // walk the estree and encode all identifiers
            encodeTree(estree);
            return estree;
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
    SchemeParser.prototype.validate = function (_ast, _context, _throwOnError) {
        return true;
    };
    SchemeParser.prototype.toString = function () {
        return "SchemeParser{chapter: ".concat(this.chapter, "}");
    };
    return SchemeParser;
}());
exports.SchemeParser = SchemeParser;
function getSchemeChapter(chapter) {
    switch (chapter) {
        case types_1.Chapter.SCHEME_1:
            return 1;
        case types_1.Chapter.SCHEME_2:
            return 2;
        case types_1.Chapter.SCHEME_3:
            return 3;
        case types_1.Chapter.SCHEME_4:
            return 4;
        case types_1.Chapter.FULL_SCHEME:
            return Infinity;
        default:
            // Should never happen
            throw new Error("SchemeParser was not given a valid chapter!");
    }
}
function encodeTree(tree) {
    walk.full(tree, function (node) {
        if (node.type === 'Identifier') {
            node.name = (0, src_1.encode)(node.name);
        }
    });
    return tree;
}
exports.encodeTree = encodeTree;
function decodeString(str) {
    return str.replace(/\$scheme_[\w$]+|\$\d+\$/g, function (match) {
        return (0, src_1.decode)(match);
    });
}
// Given any value, decode it if and
// only if an encoded value may exist in it.
function decodeValue(x) {
    // In future: add support for decoding vectors.
    if (x instanceof source_scheme_library_1.Pair) {
        // May contain encoded strings.
        return new source_scheme_library_1.Pair(decodeValue(x.car), decodeValue(x.cdr));
    }
    else if (x instanceof Array) {
        // May contain encoded strings.
        return x.map(decodeValue);
    }
    else if (x instanceof Function) {
        var newString_1 = decodeString(x.toString());
        x.toString = function () { return newString_1; };
        return x;
    }
    else {
        // string, number, boolean, null, undefined
        // no need to decode.
        return x;
    }
}
exports.decodeValue = decodeValue;
// Given an error, decode its message if and
// only if an encoded value may exist in it.
function decodeError(error) {
    if (error.type === types_1.ErrorType.SYNTAX) {
        // Syntax errors are not encoded.
        return error;
    }
    var newExplain = decodeString(error.explain());
    var newElaborate = decodeString(error.elaborate());
    return __assign(__assign({}, error), { explain: function () { return newExplain; }, elaborate: function () { return newElaborate; } });
}
exports.decodeError = decodeError;
