"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplify = exports.stripIndent = exports.oneLine = void 0;
function templateToString(content, variables) {
    if (typeof content === 'string') {
        return content;
    }
    return variables.reduce(function (built, fragment, index) { return built + fragment + content[index + 1]; }, content[0]);
}
function oneLine(content) {
    var variables = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        variables[_i - 1] = arguments[_i];
    }
    return templateToString(content, variables)
        .replace(/(?:\n(?:\s*))+/g, ' ')
        .trim();
}
exports.oneLine = oneLine;
// Strips the "minimum indent" from every line in content,
// then trims whitespace at the beginning and end of the string.
//
// two spaces of "indent" removed from both lines:
//   stripIndent('  a\n  b') == 'a\nb'
// only one space of "indent" removed from both lines,
// because the first line only contains a single space of indent:
//   stripIndent(' a\n  b') == 'a\n b'
// first trims one space of indent from both lines,
// but later trims another space from the first line
// as it's at the beginning of the string:
//   stripIndent('  a\n b') == 'a\nb'
function stripIndent(content) {
    var variables = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        variables[_i - 1] = arguments[_i];
    }
    var result = templateToString(content, variables);
    var match = result.match(/^[^\S\n]*(?=\S)/gm);
    var indent = match && Math.min.apply(Math, match.map(function (el) { return el.length; }));
    if (indent) {
        return result.replace(new RegExp("^.{".concat(indent, "}"), 'gm'), '').trim();
    }
    return result.trim();
}
exports.stripIndent = stripIndent;
function simplify(content, maxLength, separator) {
    if (maxLength === void 0) { maxLength = 15; }
    if (separator === void 0) { separator = '...'; }
    if (content.length < maxLength) {
        return content;
    }
    var charsToTake = Math.ceil(maxLength - separator.length / 2);
    return content.slice(0, charsToTake) + ' ... ' + content.slice(charsToTake);
}
exports.simplify = simplify;
