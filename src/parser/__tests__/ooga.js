"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var context_1 = require("../../mocks/context");
var types_1 = require("../../types");
var ooga_1 = require("../ooga");
var parserOoga = new ooga_1.OogaParser();
var context = (0, context_1.mockContext)(types_1.Chapter.PYTHON_1);
var code = '1 + 1';
console.log(parserOoga.parse(code, context));
// beforeEach(() => {
//   context = mockContext(Chapter.PYTHON_1)
// })
// describe('Ooga parser', () => {
//   describe('Overall parser test', () => {
//     it('Generic parse function works', () => {
//       const code = 'x = 1'
//       console.log(parse(code, context))
//     })
//   })
// })
