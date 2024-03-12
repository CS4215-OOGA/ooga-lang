"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxedEval = void 0;
var constants_1 = require("../constants");
/*
  We need to use new Function here to ensure that the parameter names do not get
  minified, as the transpiler uses NATIVE_STORAGE_ID for access
 */
exports.sandboxedEval = new Function('code', constants_1.REQUIRE_PROVIDER_ID, constants_1.NATIVE_STORAGE_ID, "\n  if (".concat(constants_1.NATIVE_STORAGE_ID, ".evaller === null) {\n    return eval(code);\n  } else {\n    return ").concat(constants_1.NATIVE_STORAGE_ID, ".evaller(code);\n  }\n"));
