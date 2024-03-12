"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectedGraph = void 0;
var assert_1 = require("../utils/assert");
/**
 * Represents a directed graph which disallows self-loops.
 */
var DirectedGraph = /** @class */ (function () {
    function DirectedGraph() {
        this.differentKeysError = new Error('The keys of the adjacency list & the in-degree maps are not the same. This should never occur.');
        this.adjacencyList = new Map();
    }
    /**
     * Adds a directed edge to the graph from the source node to
     * the destination node. Self-loops are not allowed.
     *
     * @param sourceNode      The name of the source node.
     * @param destinationNode The name of the destination node.
     */
    DirectedGraph.prototype.addEdge = function (sourceNode, destinationNode) {
        var _a;
        if (sourceNode === destinationNode) {
            throw new Error('Edges that connect a node to itself are not allowed.');
        }
        var neighbours = (_a = this.adjacencyList.get(sourceNode)) !== null && _a !== void 0 ? _a : new Set();
        neighbours.add(destinationNode);
        this.adjacencyList.set(sourceNode, neighbours);
        // Create an entry for the destination node if it does not exist
        // in the adjacency list. This is so that the set of keys of the
        // adjacency list is the same as the set of nodes in the graph.
        if (!this.adjacencyList.has(destinationNode)) {
            this.adjacencyList.set(destinationNode, new Set());
        }
    };
    /**
     * Returns whether the directed edge from the source node to the
     * destination node exists in the graph.
     *
     * @param sourceNode      The name of the source node.
     * @param destinationNode The name of the destination node.
     */
    DirectedGraph.prototype.hasEdge = function (sourceNode, destinationNode) {
        var _a;
        if (sourceNode === destinationNode) {
            throw new Error('Edges that connect a node to itself are not allowed.');
        }
        var neighbours = (_a = this.adjacencyList.get(sourceNode)) !== null && _a !== void 0 ? _a : new Set();
        return neighbours.has(destinationNode);
    };
    /**
     * Calculates the in-degree of every node in the directed graph.
     *
     * The in-degree of a node is the number of edges coming into
     * the node.
     */
    DirectedGraph.prototype.calculateInDegrees = function () {
        var _a;
        var inDegrees = new Map();
        for (var _i = 0, _b = this.adjacencyList.values(); _i < _b.length; _i++) {
            var neighbours = _b[_i];
            for (var _c = 0, neighbours_1 = neighbours; _c < neighbours_1.length; _c++) {
                var neighbour = neighbours_1[_c];
                var inDegree = (_a = inDegrees.get(neighbour)) !== null && _a !== void 0 ? _a : 0;
                inDegrees.set(neighbour, inDegree + 1);
            }
        }
        // Handle nodes which have an in-degree of 0.
        for (var _d = 0, _e = this.adjacencyList.keys(); _d < _e.length; _d++) {
            var node = _e[_d];
            if (!inDegrees.has(node)) {
                inDegrees.set(node, 0);
            }
        }
        return inDegrees;
    };
    /**
     * Finds a cycle of nodes in the directed graph. This operates on the
     * invariant that any nodes left over with a non-zero in-degree after
     * Kahn's algorithm has been run is part of a cycle.
     *
     * @param inDegrees The number of edges coming into each node after
     *                  running Kahn's algorithm.
     */
    DirectedGraph.prototype.findCycle = function (inDegrees) {
        // First, we pick any arbitrary node that is part of a cycle as our
        // starting node.
        var startingNodeInCycle = null;
        for (var _i = 0, inDegrees_1 = inDegrees; _i < inDegrees_1.length; _i++) {
            var _a = inDegrees_1[_i], node = _a[0], inDegree = _a[1];
            if (inDegree !== 0) {
                startingNodeInCycle = node;
                break;
            }
        }
        // By the invariant stated above, it is impossible that the starting
        // node cannot be found. The lack of a starting node implies that
        // all nodes have an in-degree of 0 after running Kahn's algorithm.
        // This in turn implies that Kahn's algorithm was able to find a
        // valid topological ordering & that the graph contains no cycles.
        (0, assert_1.default)(startingNodeInCycle !== null, 'There are no cycles in this graph. This should never happen.');
        var cycle = [startingNodeInCycle];
        // Then, we keep picking arbitrary nodes with non-zero in-degrees until
        // we pick a node that has already been picked.
        while (true) {
            var currentNode = cycle[cycle.length - 1];
            var neighbours = this.adjacencyList.get(currentNode);
            if (neighbours === undefined) {
                throw this.differentKeysError;
            }
            // By the invariant stated above, it is impossible that any node
            // on the cycle has an in-degree of 0 after running Kahn's algorithm.
            // An in-degree of 0 implies that the node is not part of a cycle,
            // which is a contradiction since the current node was picked because
            // it is part of a cycle.
            (0, assert_1.default)(neighbours.size > 0, "Node '".concat(currentNode, "' has no incoming edges. This should never happen."));
            var nextNodeInCycle = null;
            for (var _b = 0, neighbours_2 = neighbours; _b < neighbours_2.length; _b++) {
                var neighbour = neighbours_2[_b];
                if (inDegrees.get(neighbour) !== 0) {
                    nextNodeInCycle = neighbour;
                    break;
                }
            }
            // By the invariant stated above, if the current node is part of a cycle,
            // then one of its neighbours must also be part of the same cycle. This
            // is because a cycle contains at least 2 nodes.
            (0, assert_1.default)(nextNodeInCycle !== null, "None of the neighbours of node '".concat(currentNode, "' are part of the same cycle. This should never happen."));
            // If the next node we pick is already part of the cycle,
            // we drop all elements before the first instance of the
            // next node and return the cycle.
            var nextNodeIndex = cycle.indexOf(nextNodeInCycle);
            var isNodeAlreadyInCycle = nextNodeIndex !== -1;
            cycle.push(nextNodeInCycle);
            if (isNodeAlreadyInCycle) {
                return cycle.slice(nextNodeIndex);
            }
        }
    };
    /**
     * Returns a topological ordering of the nodes in the directed
     * graph if the graph is acyclic. Otherwise, returns null.
     *
     * To get the topological ordering, Kahn's algorithm is used.
     */
    DirectedGraph.prototype.getTopologicalOrder = function () {
        var numOfVisitedNodes = 0;
        var inDegrees = this.calculateInDegrees();
        var topologicalOrder = [];
        var queue = [];
        for (var _i = 0, inDegrees_2 = inDegrees; _i < inDegrees_2.length; _i++) {
            var _a = inDegrees_2[_i], node = _a[0], inDegree = _a[1];
            if (inDegree === 0) {
                queue.push(node);
            }
        }
        while (true) {
            var node = queue.shift();
            // 'node' is 'undefined' when the queue is empty.
            if (node === undefined) {
                break;
            }
            numOfVisitedNodes++;
            topologicalOrder.push(node);
            var neighbours = this.adjacencyList.get(node);
            if (neighbours === undefined) {
                throw this.differentKeysError;
            }
            for (var _b = 0, neighbours_3 = neighbours; _b < neighbours_3.length; _b++) {
                var neighbour = neighbours_3[_b];
                var inDegree = inDegrees.get(neighbour);
                if (inDegree === undefined) {
                    throw this.differentKeysError;
                }
                inDegrees.set(neighbour, inDegree - 1);
                if (inDegrees.get(neighbour) === 0) {
                    queue.push(neighbour);
                }
            }
        }
        // If not all nodes are visited, then at least one
        // cycle exists in the graph and a topological ordering
        // cannot be found.
        if (numOfVisitedNodes !== this.adjacencyList.size) {
            var firstCycleFound = this.findCycle(inDegrees);
            return {
                isValidTopologicalOrderFound: false,
                topologicalOrder: null,
                firstCycleFound: firstCycleFound
            };
        }
        return {
            isValidTopologicalOrderFound: true,
            topologicalOrder: topologicalOrder,
            firstCycleFound: null
        };
    };
    return DirectedGraph;
}());
exports.DirectedGraph = DirectedGraph;
