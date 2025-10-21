import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Inside your GraphVisualizer component

/**
 * A simple (but slow) "Priority Queue" for Dijkstra's
 * It's just an array that we sort every time.
 * For a few hundred nodes, this is fine for visualization.
 */
class SimplePriorityQueue {
  constructor() {
    this._queue = [];
  }

  enqueue(node, priority) {
    this._queue.push({ node, priority });
    this.sort();
  }

  dequeue() {
    return this._queue.shift();
  }

  isEmpty() {
    return this._queue.length === 0;
  }

  sort() {
    this._queue.sort((a, b) => a.priority - b.priority);
  }
}

/**
 * Runs Dijkstra's algorithm
 * @param {Map} graph - Your Adjacency List
 * @param {string} startNode - The starting node ID
 * @param {string} endNode - The ending node ID
 * @returns {object} - { path, visitedNodesInOrder }
 */
function dijkstra(graph, startNode, endNode) {
  const distances = new Map();
  const previousNodes = new Map();
  const pq = new SimplePriorityQueue();
  const visitedNodesInOrder = []; // For animation

  // Initialize distances
  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    previousNodes.set(node, null);
  }

  distances.set(startNode, 0);
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const { node: currentNode } = pq.dequeue();

    // We've already processed this node, skip
    if (visitedNodesInOrder.includes(currentNode)) {
      continue;
    }

    visitedNodesInOrder.push(currentNode);

    // If we found the end, we're done
    if (currentNode === endNode) {
      break;
    }

    const neighbors = graph.get(currentNode) || [];
    for (const neighbor of neighbors) {
      const { node: neighborNode, weight } = neighbor;
      const newDist = distances.get(currentNode) + weight;

      if (newDist < distances.get(neighborNode)) {
        distances.set(neighborNode, newDist);
        previousNodes.set(neighborNode, currentNode);
        pq.enqueue(neighborNode, newDist);
      }
    }
  }

  // Reconstruct the path
  const path = [];
  let currentNode = endNode;
  while (currentNode !== null && previousNodes.get(currentNode) !== undefined) {
    path.unshift(currentNode);
    currentNode = previousNodes.get(currentNode);
  }

  // Add the start node if a path was found
  if (path.length > 0 || startNode === endNode) {
    path.unshift(startNode);
  }

  return { path: new Set(path), visitedNodesInOrder };
}

// --- (Add the SimplePriorityQueue and dijkstra functions from above) ---
// (Copy/paste them here)

function GraphVisualizer({ data }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- State ---
  const [adjacencyList, setAdjacencyList] = useState(new Map());
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);

  // --- Visualization State ---
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [shortestPath, setShortestPath] = useState(new Set());

  const { fitView } = useReactFlow();

  // --- 1. Load Data and Build Adjacency List ---
  useEffect(() => {
    if (data) {
      // Build Adjacency List
      const adjList = new Map();
      data.links.forEach((edge) => {
        const { source, target, length } = edge;

        // Use string IDs
        const sourceStr = String(source);
        const targetStr = String(target);

        if (!adjList.has(sourceStr)) adjList.set(sourceStr, []);
        if (!adjList.has(targetStr)) adjList.set(targetStr, []);

        adjList.get(sourceStr).push({ node: targetStr, weight: length });
        adjList.get(targetStr).push({ node: sourceStr, weight: length }); // Assuming undirected
      });
      setAdjacencyList(adjList);

      // --- Normalize and Scale Node Positions ---
      let minX = Infinity,
        minY = Infinity;
      data.nodes.forEach((node) => {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
      });

      const SCALE = 50000;
      const initialNodes = data.nodes.map((node) => ({
        id: String(node.id),
        position: {
          x: (node.x - minX) * SCALE,
          y: (node.y - minY) * SCALE * -1,
        },
        data: { label: String(node.id) },
      }));

      const initialEdges = data.links.map((edge, i) => ({
        id: `e-${i}-${String(edge.source)}-${String(edge.target)}`,
        source: String(edge.source),
        target: String(edge.target),
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
      setIsLoading(false);
    }
  }, [data, setNodes, setEdges]); // Add setters as dependencies

  // --- 2. Handle User Clicks ---
  const handleNodeClick = useCallback(
    (event, node) => {
      if (!startNode) {
        setStartNode(node.id);
      } else if (!endNode) {
        setEndNode(node.id);
      }
    },
    [startNode, endNode]
  ); // Dependencies for the click handler

  // --- 3. Run and Animate the Algorithm ---
  // --- 3. Run and Animate the Algorithm ---
  useEffect(() => {
    if (!startNode || !endNode || adjacencyList.size === 0) return;

    // Reset visualization state
    setVisitedNodes(new Set());
    setShortestPath(new Set());

    // --- ADD THIS CONSOLE LOG ---
    console.log("Running Dijkstra's with:", {
      start: startNode,
      end: endNode,
      adjListSize: adjacencyList.size,
    });

    // Run Dijkstra's
    const { path, visitedNodesInOrder } = dijkstra(
      adjacencyList,
      startNode,
      endNode
    );

    // --- ADD THESE CONSOLE LOGS ---
    console.log("Dijkstra's finished:");
    console.log('Visited nodes count:', visitedNodesInOrder.length);
    console.log('Path found:', path);

    // Animate the visited nodes
    visitedNodesInOrder.forEach((nodeId, index) => {
      setTimeout(() => {
        setVisitedNodes((prev) => new Set(prev).add(nodeId));
      }, index * 300);
    });

    // Show the final path after the animation
    setTimeout(() => {
      setShortestPath(path);
    }, visitedNodesInOrder.length * 300 + 500);
  }, [startNode, endNode, adjacencyList, fitView]); // Re-run when selection changes

  // --- 4. Reset Button ---
  const handleReset = () => {
    setStartNode(null);
    setEndNode(null);
    setVisitedNodes(new Set());
    setShortestPath(new Set());
    fitView({ duration: 800 }); // Zoom back out
  };

  // --- 5. Dynamically Style Nodes and Edges ---
  // --- 5. Dynamically Style Nodes and Edges (CORRECTED) ---
  const styledNodes = nodes.map((node) => {
    const isStart = node.id === startNode;
    const isEnd = node.id === endNode;
    const isPath = shortestPath.has(node.id);
    const isVisited = visitedNodes.has(node.id);

    let style = { background: '#ffffff', opacity: 1, color: 'black' }; // Default

    if (isStart || isEnd) {
      style = { background: '#00ff00', zIndex: 10, color: 'black' }; // Green
    } else if (isPath) {
      // <--- Path should be checked FIRST
      style = { background: '#ff0000', zIndex: 10, color: 'white' }; // Red
    } else if (isVisited) {
      // <--- Visited is checked SECOND
      style = { background: '#ffff00', color: 'black' }; // Yellow
    }

    // Return a NEW node object with the new style
    return {
      ...node,
      style: { ...node.style, ...style },
    };
  });

  const styledEdges = edges.map((edge) => {
    // An edge is part of the path if BOTH its source and target are in the path
    const isPath =
      shortestPath.has(edge.source) && shortestPath.has(edge.target);

    let style = { stroke: '#ffffff', strokeWidth: 1, zIndex: 1 }; // Default

    if (isPath) {
      style = { stroke: '#ff0000', strokeWidth: 3, zIndex: 5 }; // Red
    }

    // Return a NEW edge object with the new style
    return {
      ...edge,
      style: { ...edge.style, ...style },
    };
  });

  if (isLoading) {
    return <div>Loading Graph...</div>;
  }

  return (
    <div
      style={{
        height: '800px',
        width: '100%',
        border: '1px solid black',
      }}
    >
      <button
        onClick={handleReset}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          backgroundColor: 'white',
          outline: 'none',
          border: 'none',
          color: 'black',
          paddingRight: 10,
          paddingLeft: 10,
          paddingTop: 5,
          paddingBottom: 5,
          borderRadius: '5px',
        }}
      >
        Reset
      </button>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

// You must wrap your component in a <ReactFlowProvider> in App.js
// to use the `useReactFlow` hook.

export default GraphVisualizer;
