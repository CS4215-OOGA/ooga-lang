"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDeclaration = exports.isStatement = exports.isModuleDeclaration = exports.isDirective = exports.isImportDeclaration = void 0;
var isImportDeclaration = function (node) {
    return node.type === 'ImportDeclaration';
};
exports.isImportDeclaration = isImportDeclaration;
// It is necessary to write this type guard like this as the 'type' of both
// 'Directive' & 'ExpressionStatement' is 'ExpressionStatement'.
//
// export interface Directive extends BaseNode {
//   type: "ExpressionStatement";
//   expression: Literal;
//   directive: string;
// }
//
// export interface ExpressionStatement extends BaseStatement {
//   type: "ExpressionStatement";
//   expression: Expression;
// }
//
// As such, we check whether the 'directive' property exists on the object
// instead in order to differentiate between the two.
var isDirective = function (node) {
    return 'directive' in node;
};
exports.isDirective = isDirective;
var isModuleDeclaration = function (node) {
    return [
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportDefaultDeclaration',
        'ExportAllDeclaration'
    ].includes(node.type);
};
exports.isModuleDeclaration = isModuleDeclaration;
var isStatement = function (node) {
    return !(0, exports.isDirective)(node) && !(0, exports.isModuleDeclaration)(node);
};
exports.isStatement = isStatement;
function isDeclaration(node) {
    // export type Declaration =
    //       FunctionDeclaration | VariableDeclaration | ClassDeclaration;
    return (node.type === 'VariableDeclaration' ||
        node.type === 'FunctionDeclaration' ||
        node.type === 'ClassDeclaration');
}
exports.isDeclaration = isDeclaration;
