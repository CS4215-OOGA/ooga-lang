"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Loop Detector helps to verify if a for loop can be parallelized with a GPU
 * Updates ok, counter and end upon termination
 * @ok: false if not valid, true of valid
 * @end: if valid, stores the end of the loop
 * @counter: stores the string representation of the counter
 */
var GPULoopVerifier = /** @class */ (function () {
    function GPULoopVerifier(node) {
        var _this = this;
        this.forLoopTransform = function (node) {
            if (!node.init || !node.update || !node.test) {
                return;
            }
            _this.ok =
                _this.hasCounter(node.init) && _this.hasCondition(node.test) && _this.hasUpdate(node.update);
        };
        /*
         * Checks if the loop counter is valid
         * it has to be "let <identifier> = 0;"
         */
        this.hasCounter = function (node) {
            if (!node || node.type !== 'VariableDeclaration') {
                return false;
            }
            if (node.kind !== 'let') {
                return false;
            }
            var declaration = node.declarations;
            if (declaration.length > 1) {
                return false;
            }
            var initializer = declaration[0];
            if (initializer.id.type !== 'Identifier' || !initializer.init) {
                return false;
            }
            _this.counter = initializer.id.name;
            var set = initializer.init;
            if (!set || set.type !== 'Literal' || set.value !== 0) {
                return false;
            }
            return true;
        };
        /*
         * Checks if the loop condition is valid
         * it has to be "<identifier> < <number>;"
         * identifier is the same as the one initialized above
         */
        this.hasCondition = function (node) {
            if (node.type !== 'BinaryExpression') {
                return false;
            }
            if (!(node.operator === '<' || node.operator === '<=')) {
                return false;
            }
            var lv = node.left;
            if (lv.type !== 'Identifier' || lv.name !== _this.counter) {
                return false;
            }
            var rv = node.right;
            if (!(rv.type === 'Identifier' || rv.type === 'Literal')) {
                return false;
            }
            _this.end = rv;
            return true;
        };
        /*
         * Checks if the loop update is valid
         * it has to be "<identifier> = <identifier> + 1;"
         * identifier is the same as the one initialized above
         */
        this.hasUpdate = function (node) {
            if (node.type !== 'AssignmentExpression') {
                return false;
            }
            if (node.operator !== '=') {
                return false;
            }
            if (node.left.type !== 'Identifier' || node.left.name !== _this.counter) {
                return false;
            }
            if (node.right.type !== 'BinaryExpression') {
                return false;
            }
            var rv = node.right;
            if (rv.operator !== '+') {
                return false;
            }
            var identifierLeft = rv.left.type === 'Identifier' && rv.left.name === _this.counter;
            var identifierRight = rv.right.type === 'Identifier' && rv.right.name === _this.counter;
            var literalLeft = rv.left.type === 'Literal' && rv.left.value === 1;
            var literalRight = rv.right.type === 'Literal' && rv.right.value === 1;
            // we allow both i = i + 1 and i = 1 + i
            return (identifierLeft && literalRight) || (identifierRight && literalLeft);
        };
        this.node = node;
        this.forLoopTransform(this.node);
    }
    return GPULoopVerifier;
}());
exports.default = GPULoopVerifier;
