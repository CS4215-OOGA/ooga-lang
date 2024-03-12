import { mockContext } from '../../mocks/context'
import { Chapter } from '../../types'
import { OogaParser } from '../ooga'

const parserOoga = new OogaParser()
let context = mockContext(Chapter.PYTHON_1)

const code = '1 + 1'
console.log(parserOoga.parse(code, context))

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
