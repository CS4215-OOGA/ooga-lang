"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalRawTab = void 0;
/**
 * For tabs that are export default declarations, we need to remove
 * the `export default` bit from the front before they can be loaded
 * by js-slang
 */
function evalRawTab(text) {
    if (text.startsWith('export default')) {
        text = text.substring(14);
    }
    return eval(text);
}
exports.evalRawTab = evalRawTab;
