"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceDocumentation = void 0;
var ext_lib = require("./External libraries.json");
var source_1 = require("./source_1.json");
var source_1_typed = require("./source_1_typed.json");
var source_2 = require("./source_2.json");
var source_2_typed = require("./source_2_typed.json");
var source_3 = require("./source_3.json");
var source_3_concurrent = require("./source_3_concurrent.json");
var source_3_non_det = require("./source_3_non-det.json");
var source_3_typed = require("./source_3_typed.json");
var source_4 = require("./source_4.json");
var source_4_typed = require("./source_4_typed.json");
// (18 March 2022)
// Problem to be fixed in the future:
//
// There seems to be an inconsistency between how jest and how typescript
// behaves when encountering imports of the form `import * as x from 'x.json'`
// jest will set x = jsonobject,
// but typescript will instead set x = { default: jsonobject }
//
// This means that under typescript, we want `import x from 'x.json'`,
// while under jest, we want `import * as x from 'x.json'`
//
// This problem was hidden when transpiling to CommonJS modules before, which
// behaves similarly to jest. But now that we are transpiling to es6,
// typescript projects that depend on js-slang may now be exposed to this
// inconsistency.
//
// For now, we use brute force until the landscape changes or someone thinks of
// a proper solution.
function resolveImportInconsistency(json) {
    // `json` doesn't inherit from `Object`?
    // Can't use hasOwnProperty for some reason.
    if ('default' in json) {
        return json.default;
    }
    else {
        return json;
    }
}
exports.SourceDocumentation = {
    builtins: {
        '1': resolveImportInconsistency(source_1),
        '1_lazy': resolveImportInconsistency(source_1),
        '1_typed': resolveImportInconsistency(source_1_typed),
        '2': resolveImportInconsistency(source_2),
        '2_lazy': resolveImportInconsistency(source_2),
        '2_typed': resolveImportInconsistency(source_2_typed),
        '3': resolveImportInconsistency(source_3),
        '3_concurrent': resolveImportInconsistency(source_3_concurrent),
        '3_non-det': resolveImportInconsistency(source_3_non_det),
        '3_typed': resolveImportInconsistency(source_3_typed),
        '4': resolveImportInconsistency(source_4),
        '4_typed': resolveImportInconsistency(source_4_typed)
    },
    ext_lib: ext_lib
};
