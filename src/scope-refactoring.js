"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockFramesInCurrentBlockFrame = exports.getNodeLocsInCurrentBlockFrame = exports.getAllIdentifiers = exports.getBlockFromLoc = exports.getAllOccurrencesInScopeHelper = exports.getScopeHelper = exports.scopeVariableDeclaration = exports.scopeVariables = void 0;
var finder_1 = require("./finder");
var walkers_1 = require("./utils/walkers");
/**
 * This file parses the original AST Tree into another tree with a similar structure
 * This new scope tree is far simplified and contains only two types of nodes
 * The first is called a DefinitionNode, which represents any form of const, let or function definition
 * The second is a BlockFrame. For normal blocks, it is everything within the curly braces
 * However, for conditionals, loops and functions and the like, it includes the related stuff outside of the curly braces
 * For example, for the arguments in the function definition, it will be part of the function's BlockFrame and not the parents.
 * BlockFrames can be seen as a rough approximation of scope and is largely based of estree's BlockStatement.
 */
/**
 * scopeVariables help to transform the AST tree from acorn into the scope tree.
 * It returns the new root of the scope tree.
 * Although it is a long function, the work done is fairly simple.
 * First, we get the estree nodes that are in the current es.BlockStatement/es.Program
 * We transform the current Program/BlockStatement into a BlockFrame and all its relevant children into
 * DefinitionNodes where applicable.
 * Then recursively call this on the child BlockStatements to generate the tree.
 */
function scopeVariables(program, enclosingLoc) {
    // If program is undefined due to parsing error, throw an error
    if (program === undefined) {
        throw new Error('Program to scope was undefined');
    }
    var block = {
        type: 'BlockFrame',
        loc: program.loc,
        // By default, set enclosingLoc to be the same as loc
        enclosingLoc: enclosingLoc === undefined ? program.loc : enclosingLoc,
        children: []
    };
    if (program.body == null) {
        return block;
    }
    var definitionStatements = getDefinitionStatements(program.body);
    var blockStatements = getBlockStatements(program.body);
    var forStatements = getForStatements(program.body);
    var ifStatements = getIfStatements(program.body);
    var whileStatements = getWhileStatements(program.body);
    var variableStatements = definitionStatements.filter(function (statement) {
        return isVariableDeclaration(statement);
    });
    var arrowFunctions = [];
    (0, walkers_1.simple)(program, {
        ArrowFunctionExpression: function (node) {
            if (node.loc != null) {
                arrowFunctions.push(node);
            }
        }
    });
    var ifStatementNodes = scopeIfStatements(ifStatements);
    var whileStatementNodes = scopeWhileStatements(whileStatements);
    var forStatementNodes = forStatements.map(function (statement) { return scopeForStatement(statement); });
    var functionDeclarations = definitionStatements
        .filter(function (statement) { return !isVariableDeclaration(statement); })
        .map(function (statement) { return scopeFunctionDeclaration(statement); });
    var functionDefinitionNodes = functionDeclarations.map(function (declaration) { return declaration.definition; });
    var functionBodyNodes = functionDeclarations.map(function (declaration) { return declaration.body; });
    var variableDefinitionNodes = variableStatements.map(function (statement) {
        return scopeVariableDeclaration(statement);
    });
    var blockNodes = blockStatements.map(function (statement) { return scopeVariables(statement); });
    var arrowFunctionNodes = arrowFunctions.map(function (statement) { return scopeArrowFunction(statement); });
    // Arrow functions are found via parsing the global ast tree. However, we only want
    // the arrow functions which are not part of any child block at any point in time
    // Hence, the arrowFunctionNodes are the arrow functions which are declared in this block's scope
    arrowFunctionNodes = getBlockFramesInCurrentBlockFrame(arrowFunctionNodes, block.enclosingLoc, __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], blockNodes, true), forStatementNodes, true), whileStatementNodes, true), ifStatementNodes, true), functionBodyNodes, true), arrowFunctionNodes, true));
    block.children = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], variableDefinitionNodes, true), functionDefinitionNodes, true), functionBodyNodes, true), arrowFunctionNodes, true), ifStatementNodes, true), whileStatementNodes, true), forStatementNodes, true), blockNodes, true);
    block.children.sort(sortByLoc);
    return block;
}
exports.scopeVariables = scopeVariables;
function scopeVariableDeclaration(node) {
    return {
        name: node.declarations[0].id.name,
        type: 'DefinitionNode',
        // Assume that only one variable can be declared per line
        loc: node.declarations[0].id.loc
    };
}
exports.scopeVariableDeclaration = scopeVariableDeclaration;
/**
 * Scoping function declarations is a bit unlike the way we deal with the rest of the block scopes.
 * Normally, if there are any definitions locally scoped to the block, we put those DefinitionNodes
 * within the block frame. However, for function definition names (not parameters), we do not put them
 * inside the BlockFrame of the function, as function definition names should be visible in the parent scope
 * Thus, despite the node's loc property being within the BlockFrame's enclosingLoc, ]
 * we treat it as if it is not in there.
 */
function scopeFunctionDeclaration(node) {
    if (node.id === null) {
        throw new Error('Encountered a FunctionDeclaration node without an identifier. This should have been caught when parsing.');
    }
    var definition = {
        name: node.id.name,
        type: 'DefinitionNode',
        loc: node.id.loc
    };
    var parameters = node.params.map(function (param) { return ({
        name: param.name,
        type: 'DefinitionNode',
        loc: param.loc
    }); });
    // node.loc refers to the loc of the entire function definition, not just its body
    var body = scopeVariables(node.body, node.loc);
    body.children = __spreadArray(__spreadArray([], parameters, true), body.children, true);
    // Treat function parameters as definitions in the function body, since their scope is limited to the body.
    return { definition: definition, body: body };
}
function scopeArrowFunction(node) {
    var params = node.params.map(function (param) { return ({
        name: param.name,
        type: 'DefinitionNode',
        loc: param.loc
    }); });
    // arrowFunctionBodies may not contain curly braces on the RHS of the arrow
    // For ease of processing, we treat the code on the RHS as a single expression being enclosed in {}
    // eg. map(x => x + 1) becomes map(x => {x + 1}) in the scopedVariableTree
    var body = node.body.type === 'BlockStatement'
        ? scopeVariables(node.body, node.loc)
        : scopeVariables({
            type: 'BlockStatement',
            loc: node.body.loc,
            body: [{ type: 'ExpressionStatement', expression: node.body }]
        }, node.loc);
    // Treat function parameters as definitions in the function body, since their scope is limited to the body.
    body.children = __spreadArray(__spreadArray([], params, true), body.children, true);
    return body;
}
function scopeIfStatements(nodes) {
    var nestedBlocks = nodes.map(function (node) { return scopeIfStatement(node); });
    return nestedBlocks.reduce(function (x, y) { return __spreadArray(__spreadArray([], x, true), y, true); }, []);
}
function scopeIfStatement(node) {
    var block = node.consequent;
    if (node.alternate == null) {
        return [scopeVariables(block)];
    }
    else {
        return node.alternate.type === 'BlockStatement'
            ? [scopeVariables(block), scopeVariables(node.alternate)]
            : __spreadArray([scopeVariables(block)], scopeIfStatement(node.alternate), true);
    }
}
function scopeWhileStatements(nodes) {
    return nodes.map(function (node) { return scopeVariables(node.body); });
}
// For statements may declare new variables whose scope is limited to the loop body
function scopeForStatement(node) {
    var _a;
    var declarations = ((_a = node.init) === null || _a === void 0 ? void 0 : _a.declarations) || [];
    var variables = declarations.map(function (dec) { return ({
        type: 'DefinitionNode',
        name: dec.id.name,
        loc: dec.id.loc
    }); });
    var block = scopeVariables(node.body, node.loc);
    // Any variable declared at the start of the for loop is inserted into the body
    // since its scope is limited to the body
    block.children = __spreadArray(__spreadArray([], variables, true), block.children, true);
    return block;
}
/*
This function finds the list of location ranges
where a given identifier is in scope.
 */
function getScopeHelper(definitionLocation, program, target) {
    var lookupTree = scopeVariables(program);
    // Find closest ancestor of node.
    var block = getBlockFromLoc(definitionLocation, lookupTree);
    var parentRange = block.loc;
    // Recurse on the children to find other
    // definitions of the same identifier
    var childBlocks = block.children.filter(isBlockFrame);
    var childBlocksWithDefinitions = childBlocks
        .map(function (child) { return getChildBlocksWithDefinitions(child, target); })
        .reduce(function (x, y) { return __spreadArray(__spreadArray([], x, true), y, true); }, []);
    var rangesToExclude = childBlocksWithDefinitions.map(function (b) { return b.enclosingLoc; });
    if (parentRange && rangesToExclude.length === 0) {
        return [parentRange];
    }
    var ranges = [];
    var prevRange = rangesToExclude.shift();
    ranges.push({ start: parentRange.start, end: prevRange.start });
    rangesToExclude.map(function (range) {
        ranges.push({ start: prevRange.end, end: range.start });
        prevRange = range;
    });
    ranges.push({ start: prevRange.end, end: parentRange.end });
    return ranges;
}
exports.getScopeHelper = getScopeHelper;
// Returns a list of the definitions of the
// given identifier in block
function getChildBlocksWithDefinitions(block, target) {
    var definitionNodes = block.children
        .filter(isDefinitionNode)
        .filter(function (node) { return node.name === target; });
    if (definitionNodes.length !== 0) {
        return [block];
    }
    var childBlocks = block.children.filter(isBlockFrame);
    var childBlocksWithDefinitions = childBlocks.map(function (child) {
        return getChildBlocksWithDefinitions(child, target);
    });
    return childBlocksWithDefinitions.reduce(function (x, y) { return __spreadArray(__spreadArray([], x, true), y, true); }, []);
}
/**
 * Gets all instances of a variable being used in the child scope.
 * Given the definition location on the variable, get the BlockFrame it resides in.
 * Then, run depth first search from that BlockFrame.
 * This DFS terminates when there are no child blocks within that block,
 * or if the variable name has been redeclared. This means that is of a different scope
 * and the function will terminate there.
 */
function getAllOccurrencesInScopeHelper(definitionLocation, program, target) {
    var lookupTree = scopeVariables(program);
    // Find closest declaration of node.
    var block = getBlockFromLoc(definitionLocation, lookupTree);
    var identifiers = getAllIdentifiers(program, target);
    // Recurse on the children
    var nestedBlocks = block.children.filter(isBlockFrame);
    var occurences = getNodeLocsInCurrentBlockFrame(identifiers, block.enclosingLoc, nestedBlocks);
    var occurencesInChildScopes = nestedBlocks.map(function (child) {
        return getAllOccurencesInChildScopes(target, child, identifiers);
    });
    return __spreadArray(__spreadArray([], occurences, true), occurencesInChildScopes.reduce(function (x, y) { return __spreadArray(__spreadArray([], x, true), y, true); }, []), true);
}
exports.getAllOccurrencesInScopeHelper = getAllOccurrencesInScopeHelper;
function getAllOccurencesInChildScopes(target, block, identifiers) {
    // First we check if there's a redeclaration of the target in the current scope
    // If there is, return empty array because there's a new scope for the name in this node
    // and all subsequent child nodes
    var definitionNodes = block.children
        .filter(isDefinitionNode)
        .filter(function (node) { return node.name === target; });
    if (definitionNodes.length !== 0) {
        return [];
    }
    // Only get identifiers that are not in another nested block
    var nestedBlocks = block.children.filter(isBlockFrame);
    var occurences = getNodeLocsInCurrentBlockFrame(identifiers, block.enclosingLoc, nestedBlocks);
    var occurencesInChildScopes = nestedBlocks.map(function (child) {
        return getAllOccurencesInChildScopes(target, child, identifiers);
    });
    return __spreadArray(__spreadArray([], occurences, true), occurencesInChildScopes.reduce(function (x, y) { return __spreadArray(__spreadArray([], x, true), y, true); }, []), true);
}
// Gets the enclosing block of a node.
function getBlockFromLoc(loc, block) {
    var parent = null;
    var childBlocks = block.children.filter(isBlockFrame);
    var isPartOfChildBlock = childBlocks.some(function (node) {
        return isPartOf(loc, node.enclosingLoc);
    });
    while (isPartOfChildBlock) {
        // A block containing the loc must necessarily exist by the earlier check
        parent = block;
        block = childBlocks.filter(function (node) { return isPartOf(loc, node.enclosingLoc); })[0];
        childBlocks = block.children.filter(isBlockFrame);
        isPartOfChildBlock = childBlocks.some(function (node) {
            return isPartOf(loc, node.enclosingLoc);
        });
    }
    // We check if the parent block contains the target loc.
    // This deals with the edge case of function definitions, as it is within the enclosing loc of the function
    // But has scope outside of it, as its definition belongs to the outer scope
    if (parent != null &&
        parent.children
            .filter(isDefinitionNode)
            .filter(function (node) { return notEmpty(node.loc); })
            .filter(function (node) { return areLocsEqual(node.loc, loc); }).length !== 0) {
        return parent;
    }
    return block;
}
exports.getBlockFromLoc = getBlockFromLoc;
// Adapted from src/transpiler.ts L345
// acorn-walk does not return all identifiers, so this is a workaround
function getAllIdentifiers(program, target) {
    var identifiers = [];
    (0, walkers_1.simple)(program, {
        Identifier: function (node) {
            if (notEmpty(node.loc) && node.name === target) {
                identifiers.push(node);
            }
        },
        Pattern: function (node) {
            if (node.type === 'Identifier') {
                if (node.name === target) {
                    identifiers.push(node);
                }
            }
            else if (node.type === 'MemberExpression') {
                if (node.object.type === 'Identifier') {
                    if (node.object.name === target) {
                        identifiers.push(node.object);
                    }
                }
            }
        }
    });
    return identifiers;
}
exports.getAllIdentifiers = getAllIdentifiers;
// Helper functions to filter nodes
function getBlockStatements(nodes) {
    return nodes.filter(function (statement) { return statement.type === 'BlockStatement'; });
}
function getDefinitionStatements(nodes) {
    return nodes.filter(function (statement) {
        return statement.type === 'FunctionDeclaration' || statement.type === 'VariableDeclaration';
    });
}
function getIfStatements(nodes) {
    return nodes.filter(function (statement) { return statement.type === 'IfStatement'; });
}
function getForStatements(nodes) {
    return nodes.filter(function (statement) { return statement.type === 'ForStatement'; });
}
function getWhileStatements(nodes) {
    return nodes.filter(function (statement) { return statement.type === 'WhileStatement'; });
}
// Type Guards
function isVariableDeclaration(statement) {
    return statement.type === 'VariableDeclaration';
}
function isBlockFrame(node) {
    return node.type === 'BlockFrame';
}
function isDefinitionNode(node) {
    return node.type === 'DefinitionNode';
}
function notEmpty(value) {
    return value !== null && value !== undefined;
}
// Helper functions
// sortByLoc is a comparator function that sorts the nodes by their row and column.
function sortByLoc(x, y) {
    if (x.loc == null && y.loc == null) {
        return 0;
    }
    else if (x.loc == null) {
        return -1;
    }
    else if (y.loc == null) {
        return 1;
    }
    if (x.loc.start.line > y.loc.start.line) {
        return 1;
    }
    else if (x.loc.start.line < y.loc.start.line) {
        return -1;
    }
    else {
        return x.loc.start.column - y.loc.start.column;
    }
}
// This checks if a node is part of another node via its loc/enclosingLoc property.
function isPartOf(curr, enclosing) {
    return ((0, finder_1.isInLoc)(curr.start.line, curr.start.column, enclosing) &&
        (0, finder_1.isInLoc)(curr.end.line, curr.end.column, enclosing));
}
// Returns all nodes that are not part of any child BlockFrame.
// ie direct children of the current BlockFrame
function getNodeLocsInCurrentBlockFrame(nodes, currentLoc, blocks) {
    var filteredLocs = nodes
        .map(function (node) { return node.loc; })
        .filter(notEmpty)
        .filter(function (loc) { return isPartOf(loc, currentLoc); });
    return filteredLocs.filter(function (loc) {
        return !blocks
            .map(function (block) { return block.enclosingLoc; })
            .filter(notEmpty)
            .map(function (blockLoc) { return isPartOf(loc, blockLoc); })
            .some(function (el) { return el === true; });
    });
}
exports.getNodeLocsInCurrentBlockFrame = getNodeLocsInCurrentBlockFrame;
/**
 * Returns all BlockFrames that are a direct child of the parent BlockFrame
 * This helps us weed out the nested BlockFrames, which would affect the accuracy of the
 * refactoring.
 */
function getBlockFramesInCurrentBlockFrame(nodes, currentLoc, blocks) {
    var filteredNodes = nodes
        .filter(function (node) { return notEmpty(node.enclosingLoc); })
        .filter(function (node) { return isPartOf(node.enclosingLoc, currentLoc); });
    return filteredNodes.filter(function (node) {
        return !blocks
            .map(function (block) { return block.enclosingLoc; })
            .filter(notEmpty)
            .map(function (blockLoc) {
            return isPartOf(node.enclosingLoc, blockLoc) &&
                !areLocsEqual(node.enclosingLoc, blockLoc);
        })
            .some(function (el) { return el === true; });
    });
}
exports.getBlockFramesInCurrentBlockFrame = getBlockFramesInCurrentBlockFrame;
function areLocsEqual(loc1, loc2) {
    return (loc1.start.line === loc2.start.line &&
        loc1.start.column === loc2.start.column &&
        loc1.end.line === loc2.end.line &&
        loc1.end.column === loc2.end.column);
}
