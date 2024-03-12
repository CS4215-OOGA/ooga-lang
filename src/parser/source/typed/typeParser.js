"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Code taken from https://github.com/patternfly/patternfly-org/blob/main/packages/ast-helpers/acorn-typescript.js
// Some cases such as arrow function expressions are not properly handled
var acorn_1 = require("acorn");
// Taken from https://github.com/acornjs/acorn/blob/6770c2ecbf8e01470f6c9a2f59c786f014045baf/acorn/src/whitespace.js#L4C1-L5C1
var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var DestructuringErrors = /** @class */ (function () {
    function DestructuringErrors() {
        this.shorthandAssign =
            this.trailingComma =
                this.parenthesizedAssign =
                    this.parenthesizedBind =
                        this.doubleProto =
                            -1;
    }
    return DestructuringErrors;
}());
var tsPredefinedType = {
    any: 'TSAnyKeyword',
    bigint: 'TSBigIntKeyword',
    boolean: 'TSBooleanKeyword',
    never: 'TSNeverKeyword',
    null: 'TSNullKeyword',
    number: 'TSNumberKeyword',
    object: 'TSObjectKeyword',
    string: 'TSStringKeyword',
    symbol: 'TSSymbolKeyword',
    undefined: 'TSUndefinedKeyword',
    unknown: 'TSUnknownKeyword',
    void: 'TSVoidKeyword'
};
var tsDeclaration = {
    interface: 1,
    type: 2,
    enum: 4,
    declare: 8
};
var tsTypeOperator = {
    typeof: 1,
    keyof: 2,
    infer: 4
};
var tsExprMarkup = {
    as: 1,
    '!': 2
};
var tsPlugin = function (BaseParser) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _this_1 = _super.apply(this, args) || this;
            // Allow 'interface'
            _this_1.reservedWords = /^(?:enum)$/;
            _this_1.reservedWordsStrict = _this_1.reservedWords;
            return _this_1;
        }
        class_1.prototype.finishNode = function (node, type) {
            if (type.startsWith('TS')) {
                // Hack to not need acorn-walk to detect TS
                this.options.sourceType = 'ts';
            }
            return this.finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
        };
        class_1.prototype.computeLocByOffset = function (offset) {
            // If `locations` option is off, do nothing for saving performance.
            if (this.options.locations) {
                return (0, acorn_1.getLineInfo)(this.input, offset);
            }
            else {
                return;
            }
        };
        class_1.prototype.startNodeAtNode = function (node) {
            return this.startNodeAt(node.start, this.computeLocByOffset(node.start));
        };
        class_1.prototype.tsPreparePreview = function () {
            var _this_1 = this;
            var _a = this, pos = _a.pos, curLine = _a.curLine, type = _a.type, value = _a.value, end = _a.end, start = _a.start, endLoc = _a.endLoc, startLoc = _a.startLoc, scopeStack = _a.scopeStack, lastTokStartLoc = _a.lastTokStartLoc, lastTokEndLoc = _a.lastTokEndLoc, lastTokEnd = _a.lastTokEnd, lastTokStart = _a.lastTokStart, context = _a.context;
            return function () {
                _this_1.pos = pos;
                _this_1.curLine = curLine;
                _this_1.type = type;
                _this_1.value = value;
                _this_1.end = end;
                _this_1.start = start;
                _this_1.endLoc = endLoc;
                _this_1.startLoc = startLoc;
                _this_1.scopeStack = scopeStack;
                _this_1.lastTokStartLoc = lastTokStartLoc;
                _this_1.lastTokEndLoc = lastTokEndLoc;
                _this_1.lastTokEnd = lastTokEnd;
                _this_1.lastTokStart = lastTokStart;
                _this_1.context = context;
            };
        };
        class_1.prototype._isStartOfTypeParameters = function () {
            return this.value && this.value.charCodeAt(0) === 60; // <
        };
        class_1.prototype._isEndOfTypeParameters = function () {
            return this.value && this.value.charCodeAt(0) === 62; // >
        };
        class_1.prototype._hasPrecedingLineBreak = function () {
            return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
        };
        // Studied from Babel
        class_1.prototype.parseExpressionStatement = function (node, expr) {
            return expr.type === 'Identifier'
                ? this._parseTSDeclaration(node, expr)
                : _super.prototype.parseExpressionStatement.call(this, node, expr);
        };
        class_1.prototype.parseBindingAtom = function () {
            var node = _super.prototype.parseBindingAtom.call(this);
            if (this.eat(acorn_1.tokTypes.colon)) {
                node.typeAnnotation = this.parseTSTypeAnnotation(false);
                node.end = node.typeAnnotation.end;
                if (this.options.locations) {
                    node.loc.end = node.typeAnnotation.loc.end;
                }
            }
            return node;
        };
        class_1.prototype.parseMaybeDefault = function (startPos, startLoc, left) {
            if (!left) {
                left = this.parseBindingAtom();
                if (this.eat(acorn_1.tokTypes.question)) {
                    left.optional = true;
                }
                // `parseBindingAtom` is executed,
                // so we need to check type annotation again.
                if (this.eat(acorn_1.tokTypes.colon)) {
                    left.typeAnnotation = this.parseTSTypeAnnotation(false);
                    left.end = left.typeAnnotation.end;
                    if (this.options.locations) {
                        left.loc.end = left.typeAnnotation.loc.end;
                    }
                }
            }
            return _super.prototype.parseMaybeDefault.call(this, startPos, startLoc, left);
        };
        class_1.prototype.parseMaybeAssign = function (noIn, refDestructuringErrors, afterLeftParse) {
            var node = _super.prototype.parseMaybeAssign.call(this, noIn, refDestructuringErrors, afterLeftParse);
            node = this._parseMaybeTSExpression(node);
            return node;
        };
        class_1.prototype.parseFunctionParams = function (node) {
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            return _super.prototype.parseFunctionParams.call(this, node);
        };
        class_1.prototype.parseFunctionBody = function (node, isArrowFunction) {
            // I know, return type doesn't belong to function body,
            // but this will be less hacky.
            if (this.eat(acorn_1.tokTypes.colon)) {
                node.returnType = this.parseTSTypeAnnotation(false);
            }
            _super.prototype.parseFunctionBody.call(this, node, isArrowFunction);
        };
        class_1.prototype.parseParenAndDistinguishExpression = function (canBeArrow) {
            var startPos = this.start;
            var startLoc = this.startLoc;
            var allowTrailingComma = this.options.ecmaVersion >= 8;
            var val;
            if (this.options.ecmaVersion >= 6) {
                this.next();
                var innerStartPos = this.start, innerStartLoc = this.startLoc;
                var exprList = [];
                var first = true, lastIsComma = false;
                var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos;
                var spreadStart = void 0;
                this.yieldPos = 0;
                this.awaitPos = 0;
                // Do not save awaitIdentPos to allow checking awaits nested in parameters
                while (this.type !== acorn_1.tokTypes.parenR) {
                    first ? (first = false) : this.expect(acorn_1.tokTypes.comma);
                    if (allowTrailingComma && this.afterTrailingComma(acorn_1.tokTypes.parenR, true)) {
                        lastIsComma = true;
                        break;
                    }
                    else if (this.type === acorn_1.tokTypes.ellipsis) {
                        spreadStart = this.start;
                        exprList.push(this.parseParenItem(this.parseRestBinding()));
                        if (this.type === acorn_1.tokTypes.comma)
                            this.raise(this.start, 'Comma is not permitted after the rest element');
                        break;
                    }
                    else {
                        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
                    }
                    if (this.type === acorn_1.tokTypes.colon) {
                        this.parseTSTypeAnnotation(); // Part I added
                    }
                }
                var innerEndPos = this.start;
                var innerEndLoc = this.startLoc;
                this.expect(acorn_1.tokTypes.parenR);
                if (canBeArrow && !this.canInsertSemicolon()) {
                    var branch = this._branch();
                    try {
                        if (branch.parseTSTypeAnnotation() && branch.eat(acorn_1.tokTypes.arrow)) {
                            this.parseTSTypeAnnotation(); // throw away type
                        }
                    }
                    catch (_a) { }
                    if (this.eat(acorn_1.tokTypes.arrow)) {
                        this.checkPatternErrors(refDestructuringErrors, false);
                        this.checkYieldAwaitInDefaultParams();
                        this.yieldPos = oldYieldPos;
                        this.awaitPos = oldAwaitPos;
                        return this.parseParenArrowList(startPos, startLoc, exprList);
                    }
                }
                if (!exprList.length || lastIsComma)
                    this.unexpected(this.lastTokStart);
                if (spreadStart)
                    this.unexpected(spreadStart);
                this.checkExpressionErrors(refDestructuringErrors, true);
                this.yieldPos = oldYieldPos || this.yieldPos;
                this.awaitPos = oldAwaitPos || this.awaitPos;
                if (exprList.length > 1) {
                    val = this.startNodeAt(innerStartPos, innerStartLoc);
                    val.expressions = exprList;
                    this.finishNodeAt(val, 'SequenceExpression', innerEndPos, innerEndLoc);
                }
                else {
                    val = exprList[0];
                }
            }
            else {
                val = this.parseParenExpression();
            }
            if (this.options.preserveParens) {
                var par = this.startNodeAt(startPos, startLoc);
                par.expression = val;
                return this.finishNode(par, 'ParenthesizedExpression');
            }
            else {
                return val;
            }
        };
        // Fix ambiguity between BinaryExpressions and TSCallExpressions
        class_1.prototype.parseSubscript = function (base) {
            var branch = this._branch();
            if (this._isStartOfTypeParameters()) {
                // <
                try {
                    // will throw if no matching >
                    var typeParameters = branch.parseTSTypeParameterInstantiation();
                    if (typeParameters && branch.eat(acorn_1.tokTypes.parenL)) {
                        // Update parser to match branch
                        base.typeParameters = this.parseTSTypeParameterInstantiation();
                    }
                }
                catch (_a) { }
            }
            return _super.prototype.parseSubscript.apply(this, arguments);
        };
        class_1.prototype.parseExpression = function () {
            var parenthesized = this.type === acorn_1.tokTypes.parenL, parenStart = parenthesized ? this.start : -1;
            var expr = _super.prototype.parseExpression.call(this);
            if (parenthesized) {
                expr.extra = { parenthesized: parenthesized, parenStart: parenStart };
                return expr;
            }
            expr = this._parseMaybeTSExpression(expr);
            return expr;
        };
        class_1.prototype.parseParenItem = function (item) {
            item = _super.prototype.parseParenItem.call(this, item);
            item = this._parseMaybeTSExpression(item);
            return item;
        };
        class_1.prototype.parseTSTypeAnnotation = function (eatColon) {
            if (eatColon === void 0) { eatColon = true; }
            eatColon && this.expect(acorn_1.tokTypes.colon);
            var node = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
            this._parseTSTypeAnnotation(node);
            return this.finishNode(node, 'TSTypeAnnotation');
        };
        class_1.prototype._parseTSType = function () {
            var node = this._parseNonConditionalType();
            if (this.type === acorn_1.tokTypes._extends && !this._hasPrecedingLineBreak()) {
                return this.parseTSConditionalType(node);
            }
            return node;
        };
        class_1.prototype._parseTSTypeAnnotation = function (node) {
            node.typeAnnotation = this._parseTSType();
        };
        class_1.prototype._parsePrimaryType = function () {
            var node;
            switch (this.type) {
                case acorn_1.tokTypes.name:
                    node =
                        this.value in tsPredefinedType
                            ? this.parseTSPredefinedType()
                            : this.parseTSTypeReference();
                    break;
                case acorn_1.tokTypes.braceL:
                    node = this.parseTSTypeLiteral();
                    break;
                case acorn_1.tokTypes._void:
                case acorn_1.tokTypes._null:
                    node = this.parseTSPredefinedType();
                    break;
                case acorn_1.tokTypes.parenL:
                    node = this.parseTSParenthesizedType();
                    break;
                case acorn_1.tokTypes.bracketL:
                    node = this.parseTSTupleType();
                    break;
                case acorn_1.tokTypes.num:
                case acorn_1.tokTypes.string:
                case acorn_1.tokTypes._true:
                case acorn_1.tokTypes._false:
                    node = this.parseTSLiteralType(this.type);
                    break;
                case acorn_1.tokTypes._import:
                    node = this.parseTSImportType(false);
                    break;
                default:
                    return;
            }
            while (this.type === acorn_1.tokTypes.bracketL) {
                node = this._parseMaybeTSArrayType(node);
            }
            return node;
        };
        class_1.prototype._parseNonConditionalType = function () {
            var node;
            switch (this.type) {
                case acorn_1.tokTypes.name:
                    switch (tsTypeOperator[this.value]) {
                        case tsTypeOperator.infer:
                            node = this.parseTSInferType();
                            break;
                        case tsTypeOperator.keyof:
                            node = this.parseTSKeyofType();
                            break;
                        default:
                            node = this._parseTSUnionTypeOrIntersectionType();
                    }
                    break;
                case acorn_1.tokTypes._new:
                    node = this.parseTSConstructorType();
                    break;
                case acorn_1.tokTypes.parenL:
                    var recover = this.tsPreparePreview();
                    var isStartOfTSFunctionType = this._isStartOfTSFunctionType();
                    recover();
                    node = isStartOfTSFunctionType
                        ? this.parseTSFunctionType()
                        : this.parseTSParenthesizedType();
                    break;
                case acorn_1.tokTypes.relational:
                    node = this._isStartOfTypeParameters() ? this.parseTSFunctionType() : this.unexpected();
                    break;
                case acorn_1.tokTypes._typeof:
                    node = this.parseTSTypeofType();
                    break;
                default:
                    node = this._parseTSUnionTypeOrIntersectionType();
                    break;
            }
            return node || this.unexpected();
        };
        class_1.prototype._parseTSDeclaration = function (node, expr) {
            var val = tsDeclaration[expr.name];
            switch (val) {
                case tsDeclaration.interface:
                    if (this.type === acorn_1.tokTypes.name) {
                        return this.parseTSInterfaceDeclaration();
                    }
                    break;
                case tsDeclaration.type:
                    if (this.type === acorn_1.tokTypes.name) {
                        return this.parseTSTypeAliasDeclaration();
                    }
                    break;
                default:
                    break;
            }
            return _super.prototype.parseExpressionStatement.call(this, node, expr);
        };
        class_1.prototype.parseTSTypeReference = function () {
            var node = this.startNode();
            var typeName = this.parseIdent();
            if (this.type === acorn_1.tokTypes.dot) {
                typeName = this.parseTSQualifiedName(typeName);
            }
            node.typeName = typeName;
            if (this._isStartOfTypeParameters()) {
                node.typeParameters = this.parseTSTypeParameterInstantiation();
            }
            this.finishNode(node, 'TSTypeReference');
            return node;
        };
        class_1.prototype.parseTSPredefinedType = function () {
            var node = this.startNode();
            var keyword = this.value;
            this.next();
            this.finishNode(node, tsPredefinedType[keyword]);
            return node;
        };
        class_1.prototype.parseTSLiteralType = function (tokType) {
            var node = this.startNode();
            var literal = this.parseLiteral(this.value);
            if (tokType === acorn_1.tokTypes._true || tokType === acorn_1.tokTypes._false) {
                literal.value = tokType === acorn_1.tokTypes._true;
            }
            node.literal = literal;
            return this.finishNode(node, 'TSLiteralType');
        };
        class_1.prototype.parseTSTupleType = function () {
            var node = this.startNode();
            var elementTypes = [];
            this.eat(acorn_1.tokTypes.bracketL);
            var first = true;
            while (!this.eat(acorn_1.tokTypes.bracketR)) {
                first ? (first = false) : this.expect(acorn_1.tokTypes.comma);
                switch (this.type) {
                    case acorn_1.tokTypes.name:
                        var elem = this.parseTSTypeReference();
                        if (this.type === acorn_1.tokTypes.question) {
                            elementTypes.push(this.parseTSOptionalType(elem));
                        }
                        else {
                            elementTypes.push(elem);
                        }
                        break;
                    case acorn_1.tokTypes.ellipsis:
                        elementTypes.push(this.parseTSRestType());
                        break;
                    case acorn_1.tokTypes.bracketR:
                        break;
                    default:
                        this.unexpected();
                }
            }
            node.elementTypes = elementTypes;
            return this.finishNode(node, 'TSTupleType');
        };
        class_1.prototype.parseTSOptionalType = function (typeRef) {
            var node = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
            this.expect(acorn_1.tokTypes.question);
            node.typeAnnotation = typeRef;
            return this.finishNode(node, 'TSOptionalType');
        };
        class_1.prototype.parseTSRestType = function () {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes.ellipsis);
            this._parseTSTypeAnnotation(node);
            return this.finishNode(node, 'TSRestType');
        };
        class_1.prototype._parseMaybeTSArrayType = function (prev) {
            var node = this.startNodeAtNode(prev);
            this.expect(acorn_1.tokTypes.bracketL);
            if (this.eat(acorn_1.tokTypes.bracketR)) {
                return this.parseTSArrayType(node, prev);
            }
            return this.parseTSIndexedAccessType(node, prev);
        };
        class_1.prototype.parseTSArrayType = function (node, elementType) {
            node.elementType = elementType;
            return this.finishNode(node, 'TSArrayType');
        };
        class_1.prototype.parseTSIndexedAccessType = function (node, objectType) {
            node.objectType = objectType;
            node.indexType = this._parseTSType();
            this.expect(acorn_1.tokTypes.bracketR);
            if (this.type === acorn_1.tokTypes.bracketL) {
                return this._parseMaybeTSArrayType(node);
            }
            return this.finishNode(node, 'TSIndexedAccessType');
        };
        class_1.prototype._isStartOfTSFunctionType = function () {
            this.nextToken();
            switch (this.type) {
                case acorn_1.tokTypes.parenR:
                case acorn_1.tokTypes.ellipsis:
                    return true;
                case acorn_1.tokTypes.name:
                case acorn_1.tokTypes._this:
                    this.nextToken();
                    switch (this.type) {
                        case acorn_1.tokTypes.colon:
                        case acorn_1.tokTypes.comma:
                        case acorn_1.tokTypes.question:
                            return true;
                        case acorn_1.tokTypes.parenR:
                            this.nextToken();
                            return this.type === acorn_1.tokTypes.arrow;
                        default:
                            return false;
                    }
                case acorn_1.tokTypes.braceL:
                case acorn_1.tokTypes.bracketL:
                    this.type === acorn_1.tokTypes.braceL
                        ? this.parseObj(/* isPattern */ true)
                        : this.parseBindingAtom();
                    switch (this.type) {
                        case acorn_1.tokTypes.colon:
                        case acorn_1.tokTypes.comma:
                        case acorn_1.tokTypes.question:
                            return true;
                        case acorn_1.tokTypes.parenR:
                            this.nextToken();
                            return this.type === acorn_1.tokTypes.arrow;
                        default:
                            return false;
                    }
                default:
                    return false;
            }
        };
        class_1.prototype.parseTSFunctionType = function () {
            var node = this.startNode();
            var temp = Object.create(null);
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            this.parseFunctionParams(temp);
            node.parameters = temp.params;
            this.expect(acorn_1.tokTypes.arrow);
            node.typeAnnotation = this.parseTSTypeAnnotation(false);
            return this.finishNode(node, 'TSFunctionType');
        };
        class_1.prototype.parseTSParenthesizedType = function () {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes.parenL);
            this._parseTSTypeAnnotation(node);
            this.expect(acorn_1.tokTypes.parenR);
            while (this.eat(acorn_1.tokTypes.bracketL)) {
                this.expect(acorn_1.tokTypes.bracketR);
            }
            return this.finishNode(node, 'TSParenthesizedType');
        };
        class_1.prototype.parseTSUnionType = function (first) {
            var node = first ? this.startNodeAtNode(first) : this.startNode();
            var types = [];
            first && types.push(first);
            while (this.eat(acorn_1.tokTypes.bitwiseOR)) {
                types.push(this._parseTSIntersectionTypeOrPrimaryType());
            }
            if (types.length === 1) {
                return first;
            }
            node.types = types;
            return this.finishNode(node, 'TSUnionType');
        };
        class_1.prototype.parseTSIntersectionType = function (first) {
            var node = first ? this.startNodeAtNode(first) : this.startNode();
            var types = [];
            first && types.push(first);
            while (this.eat(acorn_1.tokTypes.bitwiseAND)) {
                types.push(this._parsePrimaryType());
            }
            if (types.length === 1) {
                return first;
            }
            node.types = types;
            return this.finishNode(node, 'TSIntersectionType');
        };
        class_1.prototype._parseTSIntersectionTypeOrPrimaryType = function () {
            this.eat(acorn_1.tokTypes.bitwiseAND);
            var node = this._parsePrimaryType();
            if (this.type === acorn_1.tokTypes.bitwiseAND) {
                return this.parseTSIntersectionType(node);
            }
            return node;
        };
        class_1.prototype._parseTSUnionTypeOrIntersectionType = function () {
            this.eat(acorn_1.tokTypes.bitwiseOR);
            var node = this._parseTSIntersectionTypeOrPrimaryType();
            if (this.type === acorn_1.tokTypes.bitwiseOR) {
                return this.parseTSUnionType(node);
            }
            return node;
        };
        class_1.prototype.parseTSConditionalType = function (checkType) {
            var node = this.startNodeAtNode(checkType);
            node.checkType = checkType;
            this.expect(acorn_1.tokTypes._extends);
            node.extendsType = this._parseNonConditionalType();
            this.expect(acorn_1.tokTypes.question);
            node.trueType = this._parseNonConditionalType();
            this.expect(acorn_1.tokTypes.colon);
            node.falseType = this._parseNonConditionalType();
            return this.finishNode(node, 'TSConditionalType');
        };
        class_1.prototype.parseTSInferType = function () {
            var node = this.startNode();
            this.next();
            node.typeParameter = this.parseTSTypeParameter();
            return this.finishNode(node, 'TSInferType');
        };
        class_1.prototype.parseTSKeyofType = function () {
            var node = this.startNode();
            this.next();
            node.typeAnnotation = this.parseTSTypeAnnotation(false);
            return this.finishNode(node, 'TSTypeOperator');
        };
        class_1.prototype.parseTSTypeQuery = function () {
            var node = this.startNode();
            this.next();
            node.exprName = this.parseIdent();
            return this.finishNode(node, 'TSTypeQuery');
        };
        class_1.prototype.parseTSTypeofType = function () {
            var typeQuery = this.parseTSTypeQuery();
            if (this.eat(acorn_1.tokTypes.bracketL)) {
                var node = this.startNode();
                return this.parseTSIndexedAccessType(node, typeQuery);
            }
            return typeQuery;
        };
        class_1.prototype.parseTSImportType = function (isTypeOf) {
            var node = this.startNode();
            node.isTypeOf = isTypeOf;
            this.expect(acorn_1.tokTypes._import);
            this.expect(acorn_1.tokTypes.parenL);
            node.parameter = this.parseTSLiteralType(this.type);
            this.expect(acorn_1.tokTypes.parenR);
            if (this.eat(acorn_1.tokTypes.dot)) {
                var qualifier = this.parseIdent();
                if (this.type === acorn_1.tokTypes.dot) {
                    qualifier = this.parseTSQualifiedName(qualifier);
                }
                node.qualifier = qualifier;
            }
            return this.finishNode(node, 'TSImportType');
        };
        class_1.prototype.parseTSQualifiedName = function (left) {
            var node = this.startNodeAtNode(left);
            node.left = left;
            this.expect(acorn_1.tokTypes.dot);
            node.right = this.parseIdent();
            node = this.finishNode(node, 'TSQualifiedName');
            if (this.type === acorn_1.tokTypes.dot) {
                node = this.parseTSQualifiedName(node);
            }
            return node;
        };
        class_1.prototype.parseTSConstructorType = function () {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes._new);
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            this.expect(acorn_1.tokTypes.parenL);
            node.parameters = this.parseBindingList(acorn_1.tokTypes.parenR, false, this.options.ecmaVersion >= 8);
            this.expect(acorn_1.tokTypes.arrow);
            node.typeAnnotation = this.parseTSTypeAnnotation(false);
            return this.finishNode(node, 'TSConstructorType');
        };
        class_1.prototype.parseTSConstructSignatureDeclaration = function () {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes._new);
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            this.expect(acorn_1.tokTypes.parenL);
            node.parameters = this.parseBindingList(acorn_1.tokTypes.parenR, false, this.options.ecmaVersion >= 8);
            if (this.eat(acorn_1.tokTypes.colon)) {
                node.typeAnnotation = this.parseTSTypeAnnotation(false);
            }
            return this.finishNode(node, 'TSConstructSignatureDeclaration');
        };
        class_1.prototype.parseTSTypeLiteral = function () {
            return this._parseObjectLikeType('TSTypeLiteral', 'members');
        };
        class_1.prototype.parseTSTypeAliasDeclaration = function () {
            var node = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
            node.id = this.parseIdent();
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            this.expect(acorn_1.tokTypes.eq);
            this._parseTSTypeAnnotation(node);
            this.semicolon();
            return this.finishNode(node, 'TSTypeAliasDeclaration');
        };
        class_1.prototype.parseTSInterfaceDeclaration = function () {
            var node = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
            node.id = this.parseIdent();
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            if (this.eat(acorn_1.tokTypes._extends)) {
                var heritage = [];
                do {
                    heritage.push(this.parseTSExpressionWithTypeArguments());
                } while (this.eat(acorn_1.tokTypes.comma));
                node.heritage = heritage;
            }
            node.body = this._parseObjectLikeType('TSInterfaceBody', 'body');
            this.semicolon();
            return this.finishNode(node, 'TSInterfaceDeclaration');
        };
        class_1.prototype.parseTSExpressionWithTypeArguments = function () {
            var node = this.startNode();
            var expr = this.parseIdent();
            if (this.eat(acorn_1.tokTypes.dot)) {
                expr = this.parseTSQualifiedName(expr);
            }
            node.expr = expr;
            if (this._isStartOfTypeParameters()) {
                var typeParameters = this.parseTSTypeParameterInstantiation();
                node.typeParameters = typeParameters;
                node.end = typeParameters.end;
                if (this.options.locations) {
                    node.loc.end = typeParameters.loc.end;
                }
            }
            return this.finishNode(node, 'TSExpressionWithTypeArguments');
        };
        class_1.prototype.parseTSTypeParameter = function () {
            var node = this.startNode();
            if (this.type === acorn_1.tokTypes.name) {
                node.name = this.value;
                this.next();
            }
            else {
                this.unexpected();
            }
            if (this.eat(acorn_1.tokTypes._extends)) {
                node.constraint = this._parseTSType();
            }
            if (this.eat(acorn_1.tokTypes.eq)) {
                node.default = this._parseTSType();
            }
            return this.finishNode(node, 'TSTypeParameter');
        };
        class_1.prototype.parseMaybeTSTypeParameterDeclaration = function () {
            if (this._isStartOfTypeParameters()) {
                var node = this.startNode();
                var params = [];
                var first = true;
                this.next();
                while (!this.eat(acorn_1.tokTypes.relational)) {
                    first ? (first = false) : this.expect(acorn_1.tokTypes.comma);
                    if (this._isEndOfTypeParameters()) {
                        break;
                    }
                    params.push(this.parseTSTypeParameter());
                }
                node.params = params;
                return this.finishNode(node, 'TSTypeParameterDeclaration');
            }
        };
        class_1.prototype.parseTSTypeParameterInstantiation = function () {
            var node = this.startNode();
            var params = [];
            this.next(); // <
            var first = true;
            while ((this.value && !this._isEndOfTypeParameters()) || this.type === acorn_1.tokTypes.comma) {
                first ? (first = false) : this.expect(acorn_1.tokTypes.comma);
                params.push(this._parseTSType());
            }
            if (this._isEndOfTypeParameters()) {
                if (this.value.length > 1) {
                    this.value = this.value.slice(1); // Fix to allow chaining of type parameters
                }
                else {
                    this.next(); // >
                }
            }
            node.params = params;
            return this.finishNode(node, 'TSTypeParameterInstantiation');
        };
        class_1.prototype.parseMaybeTSTypeParameterInstantiation = function () {
            if (this._isStartOfTypeParameters()) {
                return this.parseTSTypeParameterInstantiation();
            }
        };
        class_1.prototype._parseObjectLikeType = function (kind, prop) {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes.braceL);
            var list = [];
            while (!this.eat(acorn_1.tokTypes.braceR)) {
                switch (this.type) {
                    case acorn_1.tokTypes.name:
                        var key = this.parseIdent();
                        switch (this.type) {
                            case acorn_1.tokTypes.parenL:
                            case acorn_1.tokTypes.relational:
                                list.push(this.parseTSMethodSignature(key));
                                break;
                            case acorn_1.tokTypes.colon:
                            case acorn_1.tokTypes.semi:
                            case acorn_1.tokTypes.comma:
                            case acorn_1.tokTypes.braceR:
                            case acorn_1.tokTypes.question:
                                list.push(this.parseTSPropertySignature(key));
                                break;
                            default:
                                if (this._hasPrecedingLineBreak()) {
                                    list.push(this.parseTSPropertySignature(key));
                                    continue;
                                }
                                this.unexpected();
                        }
                        break;
                    case acorn_1.tokTypes.bracketL:
                        var recover = this.tsPreparePreview();
                        this.nextToken();
                        if (this.type === acorn_1.tokTypes.name) {
                            this.nextToken();
                            switch (this.type) {
                                case acorn_1.tokTypes.colon:
                                    recover();
                                    list.push(this.parseTSIndexSignature());
                                    break;
                                case acorn_1.tokTypes._in:
                                    if (list.length === 0) {
                                        recover();
                                        return this.parseTSMappedType();
                                    }
                                    else {
                                        recover();
                                        list.push(this.parseTSPropertySignature(null, true));
                                    }
                                    break;
                                default:
                                    recover();
                                    list.push(this.parseTSPropertySignature(null, true));
                            }
                        }
                        else {
                            recover();
                            list.push(this.parseTSPropertySignature(null, true));
                        }
                        break;
                    case acorn_1.tokTypes._new:
                        list.push(this.parseTSConstructSignatureDeclaration());
                        break;
                    default:
                        this.unexpected();
                }
            }
            node[prop] = list;
            return this.finishNode(node, kind);
        };
        class_1.prototype.parseTSMethodSignature = function (key) {
            var node = this.startNodeAtNode(key);
            node.key = key;
            if (this.eat(acorn_1.tokTypes.question)) {
                node.optional = true;
            }
            node.typeParameters = this.parseMaybeTSTypeParameterDeclaration();
            this.expect(acorn_1.tokTypes.parenL);
            node.parameters = this.parseBindingList(acorn_1.tokTypes.parenR, false, this.options.ecmaVersion >= 8);
            if (this.type === acorn_1.tokTypes.colon) {
                node.typeAnnotation = this.parseTSTypeAnnotation(true);
            }
            this.eat(acorn_1.tokTypes.comma) || this.eat(acorn_1.tokTypes.semi);
            return this.finishNode(node, 'TSMethodSignature');
        };
        class_1.prototype.parseTSPropertySignature = function (key, computed) {
            if (computed === void 0) { computed = false; }
            var node;
            if (computed) {
                node = this.startNode();
                this.expect(acorn_1.tokTypes.bracketL);
                node.key = this.parseExpression();
                this.expect(acorn_1.tokTypes.bracketR);
            }
            else {
                node = this.startNodeAtNode(key);
                node.key = key;
            }
            node.computed = computed;
            if (this.eat(acorn_1.tokTypes.question)) {
                node.optional = true;
            }
            if (this.type === acorn_1.tokTypes.colon) {
                node.typeAnnotation = this.parseTSTypeAnnotation(true);
            }
            this.eat(acorn_1.tokTypes.comma) || this.eat(acorn_1.tokTypes.semi);
            return this.finishNode(node, 'TSPropertySignature');
        };
        class_1.prototype.parseTSIndexSignature = function () {
            var node = this.startNode();
            this.expect(acorn_1.tokTypes.bracketL);
            var index = this.parseIdent();
            index.typeAnnotation = this.parseTSTypeAnnotation(true);
            index.end = index.typeAnnotation.end;
            if (this.options.locations) {
                index.loc.end = index.typeAnnotation.loc.end;
            }
            node.index = index;
            this.expect(acorn_1.tokTypes.bracketR);
            node.typeAnnotation = this.parseTSTypeAnnotation(true);
            this.eat(acorn_1.tokTypes.comma) || this.eat(acorn_1.tokTypes.semi);
            return this.finishNode(node, 'TSIndexSignature');
        };
        class_1.prototype.parseTSMappedType = function () {
            var node = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
            this.expect(acorn_1.tokTypes.bracketL);
            node.typeParameter = this._parseTSTypeParameterInTSMappedType();
            this.expect(acorn_1.tokTypes.bracketR);
            if (this.eat(acorn_1.tokTypes.question)) {
                node.optional = true;
            }
            if (this.type === acorn_1.tokTypes.colon) {
                node.typeAnnotation = this.parseTSTypeAnnotation(true);
            }
            this.semicolon();
            this.expect(acorn_1.tokTypes.braceR);
            return this.finishNode(node, 'TSMappedType');
        };
        class_1.prototype._parseTSTypeParameterInTSMappedType = function () {
            var node = this.startNode();
            if (this.type === acorn_1.tokTypes.name) {
                node.name = this.value;
                this.next();
            }
            else {
                this.unexpected();
            }
            this.expect(acorn_1.tokTypes._in);
            node.constraint = this._parseNonConditionalType();
            return this.finishNode(node, 'TSTypeParameter');
        };
        class_1.prototype._parseMaybeTSExpression = function (node) {
            if (this.type === acorn_1.tokTypes.prefix && tsExprMarkup[this.value] === tsExprMarkup['!']) {
                node = this.parseTSNonNullExpression(node);
            }
            if (this.type === acorn_1.tokTypes.name && tsExprMarkup[this.value] === tsExprMarkup.as) {
                node = this.parseTSAsExpression(node);
            }
            return node;
        };
        class_1.prototype.parseTSAsExpression = function (expression) {
            var node = expression;
            while (this.type === acorn_1.tokTypes.name && tsExprMarkup[this.value] === tsExprMarkup.as) {
                var _node = this.startNodeAtNode(node);
                this.next();
                _node.expression = node;
                this._parseTSTypeAnnotation(_node);
                node = this.finishNode(_node, 'TSAsExpression');
            }
            return expression;
        };
        class_1.prototype.parseTSNonNullExpression = function (expression) {
            var node = expression;
            while (this.type === acorn_1.tokTypes.prefix && tsExprMarkup[this.value] === tsExprMarkup['!']) {
                var _node = this.startNodeAtNode(node);
                _node.expression = node;
                this.next();
                node = this.finishNode(_node, 'TSNonNullExpression');
            }
            return node;
        };
        return class_1;
    }(BaseParser));
};
// acorn-class-fields plugin is needed, else parsing of some function types will not work
var TypeParser = acorn_1.Parser.extend(tsPlugin, require('acorn-class-fields'));
exports.default = TypeParser;
