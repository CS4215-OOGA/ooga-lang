import { stringify } from 'querystring';
import debug from 'debug';

const log = debug('ooga:assembler');

/**
 * Given a list of instrs, write them to string separated by newlines.
 * TODO: This is obviously just temporary!!!!!!!!!!!!
 * TBH, for our purposes, this should be as simple as serializing and deserializing to bytes
 * @param instrs
 */
export function assemble(instrs: string | any[]) {
    let s = '';
    for (let i = 0; i < instrs.length; i++) {
        s = s + JSON.stringify(instrs[i]) + '\n';
    }
    return s;
}
