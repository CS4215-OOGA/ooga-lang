import { Program } from 'estree'

import { Context } from '../../types'
import { AcornOptions, Parser } from '../types'
import { parse } from './ooga'

export class OogaParser implements Parser<AcornOptions> {
  constructor() {}
  parse(
    programStr: string,
    context: Context,
    options?: Partial<AcornOptions>,
    throwOnError?: boolean
  ): any {
    return parse(programStr)
  }

  validate(_ast: Program, _context: Context, _throwOnError: boolean): boolean {
    throw new Error('Not currently implemented')
  }

  toString(): string {
    return `OogaParser`
  }
}
