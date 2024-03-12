"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localImportPrelude = exports.defaultExportLookupName = exports.accessExportFunctionName = void 0;
exports.accessExportFunctionName = '__access_export__';
// We can make use of 'default' to denote that the default export
// should be accessed because 'default' is a reserved keyword in
// Source. Specifically, the Acorn parser does not allow 'default'
// to be used as a name.
exports.defaultExportLookupName = 'default';
exports.localImportPrelude = "\nfunction __access_named_export__(named_exports, lookup_name) {\n  if (is_null(named_exports)) {\n    return undefined;\n  } else {\n    const name = head(head(named_exports));\n    const identifier = tail(head(named_exports));\n    if (name === lookup_name) {\n      return identifier;\n    } else {\n      return __access_named_export__(tail(named_exports), lookup_name);\n    }\n  }\n}\n\nfunction ".concat(exports.accessExportFunctionName, "(exports, lookup_name) {\n  if (lookup_name === \"").concat(exports.defaultExportLookupName, "\") {\n    return head(exports);\n  } else {\n    const named_exports = tail(exports);\n    return __access_named_export__(named_exports, lookup_name);\n  }\n}\n");
