
import {stringify} from "querystring";

/**
 * Given a list of instrs, write them to string separated by newlines.
 * TODO: This is obviously just temporary!!!!!!!!!!!!
 * @param instrs
 */
export function assemble(instrs) {
  let s = "";
  for (let i = 0; i < instrs.length; i++) {
    s = s + JSON.stringify(instrs[i]) + "\n";
  }
  return s;
}
