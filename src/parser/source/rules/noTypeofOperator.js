"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../../../types");
var noUnspecifiedOperator_1 = require("./noUnspecifiedOperator");
var noTypeofOperator = {
    name: 'no-typeof-operator',
    disableForVariants: [types_1.Variant.TYPED],
    checkers: {
        UnaryExpression: function (node) {
            if (node.operator === 'typeof') {
                return [new noUnspecifiedOperator_1.NoUnspecifiedOperatorError(node)];
            }
            else {
                return [];
            }
        }
    }
};
exports.default = noTypeofOperator;
