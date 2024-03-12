"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bracesAroundFor_1 = require("./bracesAroundFor");
var bracesAroundIfElse_1 = require("./bracesAroundIfElse");
var bracesAroundWhile_1 = require("./bracesAroundWhile");
var forStatementMustHaveAllParts_1 = require("./forStatementMustHaveAllParts");
var noDeclareMutable_1 = require("./noDeclareMutable");
var noDotAbbreviation_1 = require("./noDotAbbreviation");
var noEval_1 = require("./noEval");
var noExportNamedDeclarationWithDefault_1 = require("./noExportNamedDeclarationWithDefault");
var noFunctionDeclarationWithoutIdentifier_1 = require("./noFunctionDeclarationWithoutIdentifier");
var noHolesInArrays_1 = require("./noHolesInArrays");
var noIfWithoutElse_1 = require("./noIfWithoutElse");
var noImplicitDeclareUndefined_1 = require("./noImplicitDeclareUndefined");
var noImplicitReturnUndefined_1 = require("./noImplicitReturnUndefined");
var noImportSpecifierWithDefault_1 = require("./noImportSpecifierWithDefault");
var noNull_1 = require("./noNull");
var noSpreadInArray_1 = require("./noSpreadInArray");
var noTemplateExpression_1 = require("./noTemplateExpression");
var noTypeofOperator_1 = require("./noTypeofOperator");
var noUnspecifiedLiteral_1 = require("./noUnspecifiedLiteral");
var noUnspecifiedOperator_1 = require("./noUnspecifiedOperator");
var noUpdateAssignment_1 = require("./noUpdateAssignment");
var noVar_1 = require("./noVar");
var singleVariableDeclaration_1 = require("./singleVariableDeclaration");
var rules = [
    bracesAroundFor_1.default,
    bracesAroundIfElse_1.default,
    bracesAroundWhile_1.default,
    forStatementMustHaveAllParts_1.default,
    noDeclareMutable_1.default,
    noDotAbbreviation_1.default,
    noExportNamedDeclarationWithDefault_1.default,
    noFunctionDeclarationWithoutIdentifier_1.default,
    noIfWithoutElse_1.default,
    noImportSpecifierWithDefault_1.default,
    noImplicitDeclareUndefined_1.default,
    noImplicitReturnUndefined_1.default,
    noNull_1.default,
    noUnspecifiedLiteral_1.default,
    noUnspecifiedOperator_1.default,
    noTypeofOperator_1.default,
    noUpdateAssignment_1.default,
    noVar_1.default,
    singleVariableDeclaration_1.default,
    noEval_1.default,
    noHolesInArrays_1.default,
    noTemplateExpression_1.default,
    noSpreadInArray_1.default
];
exports.default = rules;
