"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceParser = void 0;
var acorn_1 = require("acorn");
var constants_1 = require("../../constants");
var walkers_1 = require("../../utils/walkers");
var errors_1 = require("../errors");
var utils_1 = require("../utils");
var rules_1 = require("./rules");
var syntax_1 = require("./syntax");
var combineAncestorWalkers = function (w1, w2) {
    return function (node, state, ancestors) {
        w1(node, state, ancestors);
        w2(node, state, ancestors);
    };
};
var mapToObj = function (map) {
    return Array.from(map).reduce(function (obj, _a) {
        var _b;
        var k = _a[0], v = _a[1];
        return Object.assign(obj, (_b = {}, _b[k] = v, _b));
    }, {});
};
var SourceParser = /** @class */ (function () {
    function SourceParser(chapter, variant) {
        this.chapter = chapter;
        this.variant = variant;
    }
    SourceParser.tokenize = function (programStr, context) {
        return __spreadArray([], (0, acorn_1.tokenizer)(programStr, (0, utils_1.createAcornParserOptions)(constants_1.DEFAULT_ECMA_VERSION, context.errors)), true);
    };
    SourceParser.prototype.parse = function (programStr, context, options, throwOnError) {
        try {
            return (0, acorn_1.parse)(programStr, (0, utils_1.createAcornParserOptions)(constants_1.DEFAULT_ECMA_VERSION, context.errors, options));
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                error = new errors_1.FatalSyntaxError((0, utils_1.positionToSourceLocation)(error.loc, options === null || options === void 0 ? void 0 : options.sourceFile), error.toString());
            }
            if (throwOnError)
                throw error;
            context.errors.push(error);
        }
        return null;
    };
    SourceParser.prototype.validate = function (ast, context, throwOnError) {
        var validationWalkers = new Map();
        this.getDisallowedSyntaxes().forEach(function (syntaxNodeName) {
            validationWalkers.set(syntaxNodeName, function (node, _state, _ancestors) {
                if (node.type != syntaxNodeName)
                    return;
                var error = new errors_1.DisallowedConstructError(node);
                if (throwOnError)
                    throw error;
                context.errors.push(error);
            });
        });
        this.getLangRules()
            .map(function (rule) { return Object.entries(rule.checkers); })
            .flat()
            .forEach(function (_a) {
            var syntaxNodeName = _a[0], checker = _a[1];
            var langWalker = function (node, _state, ancestors) {
                var errors = checker(node, ancestors);
                if (throwOnError && errors.length > 0)
                    throw errors[0];
                errors.forEach(function (e) { return context.errors.push(e); });
            };
            if (validationWalkers.has(syntaxNodeName)) {
                validationWalkers.set(syntaxNodeName, combineAncestorWalkers(validationWalkers.get(syntaxNodeName), langWalker));
            }
            else {
                validationWalkers.set(syntaxNodeName, langWalker);
            }
        });
        (0, walkers_1.ancestor)(ast, mapToObj(validationWalkers), undefined, undefined);
        return context.errors.length == 0;
    };
    SourceParser.prototype.toString = function () {
        return "SourceParser{chapter: ".concat(this.chapter, ", variant: ").concat(this.variant, "}");
    };
    SourceParser.prototype.getDisallowedSyntaxes = function () {
        var _this = this;
        return Object.entries(syntax_1.default).reduce(function (acc, _a) {
            var nodeName = _a[0], chapterAllowed = _a[1];
            return _this.chapter < chapterAllowed ? __spreadArray(__spreadArray([], acc, true), [nodeName], false) : acc;
        }, []);
    };
    SourceParser.prototype.getLangRules = function () {
        var _this = this;
        return rules_1.default.filter(function (rule) {
            return !((rule.disableFromChapter && _this.chapter >= rule.disableFromChapter) ||
                (rule.disableForVariants && rule.disableForVariants.includes(_this.variant)));
        });
    };
    return SourceParser;
}());
exports.SourceParser = SourceParser;
