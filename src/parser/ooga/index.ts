import { Program } from 'estree'

import { Context } from '../../types'
import { AcornOptions, Parser } from '../types'

export class OogaParser implements Parser<AcornOptions> {
  constructor() {
  }
  parse(
    programStr: string,
    context: Context,
    options?: Partial<AcornOptions>,
    throwOnError?: boolean
  ): any {
    throw new Error('Not currently implemented')
  }

  validate(_ast: Program, _context: Context, _throwOnError: boolean): boolean {
    throw new Error('Not currently implemented')
  }

  toString(): string {
    return `OogaParser`
  }
}
