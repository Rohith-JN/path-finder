import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { latLngToCell, gridDisk } from 'h3-js';
import styles from '@/styles/Home.module.css'; // Assuming you have button styles here

// Simple LogBox component (can be in the same file or separate)
function LogBox({ messages }) {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        backgroundColor: '#222',
        color: '#eee',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderLeft: '1px solid #444',
        borderRadius: '10px',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          borderBottom: '1px solid #444',
          paddingBottom: '5px',
        }}
      >
        Event Log
      </h4>
      {messages.length === 0 ? (
        <p>No events yet...</p>
      ) : (
        // Display messages, newest first
        messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px', marginTop: '5px' }}>
            {msg}
          </div>
        ))
      )}
    </div>
  );
}

// --- Dijkstra's Algorithm and Priority Queue ---
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

function dijkstra(graph, startNode, endNode) {
  const distances = new Map();
  const previousNodes = new Map();
  const pq = new SimplePriorityQueue();
  const visitedNodesInOrder = [];

  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    previousNodes.set(node, null);
  }

  distances.set(startNode, 0);
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const { node: currentNode } = pq.dequeue();
    if (visitedNodesInOrder.includes(currentNode)) continue;
    visitedNodesInOrder.push(currentNode);
    if (currentNode === endNode) break;

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

  const path = [];
  let currentNode = endNode;
  while (currentNode !== null && previousNodes.get(currentNode) !== undefined) {
    path.unshift(currentNode);
    currentNode = previousNodes.get(currentNode);
  }
  if (path.length > 0 || startNode === endNode) {
    path.unshift(startNode);
  }

  const finalDistance = distances.get(endNode);

  return {
    // Return BOTH the Set (for quick lookup) and Array (for order)
    pathSet: new Set(path), // Changed key name for clarity
    pathArray: path, // Added ordered path array
    visitedNodesInOrder,
    distance: finalDistance,
  };
}
// --- End Algorithm ---

function GraphVisualizer() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- State ---
  const [adjacencyList, setAdjacencyList] = useState(new Map());
  const [nodeToH3Map, setNodeToH3Map] = useState(new Map());
  // No need for h3ToNodesMap currently

  // Simulation State
  const [drivers, setDrivers] = useState([]);
  const [rider, setRider] = useState(null);
  const [destinationNode, setDestinationNode] = useState(null);
  const [candidateDrivers, setCandidateDrivers] = useState(new Set());

  // Visualization State
  const [startNode, setStartNode] = useState(null); // Final assigned driver
  const [endNode, setEndNode] = useState(null); // Final destination
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [shortestPathNodes, setShortestPathNodes] = useState([]); // Use array for final path
  const [clickMode, setClickMode] = useState('none');

  const [logMessages, setLogMessages] = useState([]);

  const { fitView } = useReactFlow();

  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prevLogs) => [`[${timestamp}] ${message}`, ...prevLogs]); // Add new message to the top
  }, []); // useCallback ensures this function doesn't change unnecessarily

  // --- Load Data and Build Indexes ---
  useEffect(() => {
    fetch('/sperryville_graph.json')
      .then((res) => res.json())
      .then((data) => {
        const h3Resolution = 9;
        const nodeMap = new Map();
        const adjList = new Map();

        // Build H3 Map and Adjacency List
        data.nodes.forEach((node) => {
          const h3Index = latLngToCell(node.y, node.x, h3Resolution);
          nodeMap.set(String(node.id), h3Index);
        });
        data.links.forEach((edge) => {
          const { source, target, length } = edge;
          const sourceStr = String(source);
          const targetStr = String(target);
          if (!adjList.has(sourceStr)) adjList.set(sourceStr, []);
          if (!adjList.has(targetStr)) adjList.set(targetStr, []);
          adjList.get(sourceStr).push({ node: targetStr, weight: length });
          adjList.get(targetStr).push({ node: sourceStr, weight: length });
        });
        setNodeToH3Map(nodeMap);
        setAdjacencyList(adjList);

        // Normalize Positions
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
      })
      .catch((err) => {
        console.error('Failed to fetch graph data:', err);
        setIsLoading(false);
      });
  }, [setNodes, setEdges]);

  // --- Handle Node Clicks ---
  const handleNodeClick = useCallback(
    (event, node) => {
      if (nodeToH3Map.size === 0) return;
      const key = String(node.id);
      const h3Index = nodeToH3Map.get(key);
      if (!h3Index) {
        console.error(`Could not find H3 index for node: ${key}`);
        return;
      }

      if (clickMode === 'addDriver') {
        const newDriver = {
          id: `d${drivers.length + 1}`,
          location: key,
          h3Index: h3Index,
        };
        setDrivers((prev) => [...prev, newDriver]);
        setClickMode('none');
        addLog(`Added Driver ${newDriver.id} at node ${key}`);
        console.log('Added Driver at:', key);
      } else if (clickMode === 'addRider') {
        if (rider) return;
        const newRider = { id: 'r1', pickup: key, pickupH3: h3Index };
        setRider(newRider);
        setClickMode('none');
        addLog(`Added Rider ${newRider.id} at node ${key}`);
        console.log('Added Rider at:', key);
      } else if (clickMode === 'setDestination') {
        if (!rider || destinationNode) return;
        if (key === rider.pickup) {
          alert('Destination cannot be the same as pickup.');
          return;
        }
        setDestinationNode(key);
        setClickMode('none');
        addLog(`Set Destionation at node ${key}`);

        console.log('Set Destination at:', key);
      }
    },
    [clickMode, drivers, rider, destinationNode, nodeToH3Map]
  ); // Dependencies

  // --- Find Match and Route Logic ---
  // Inside GraphVisualizer component

  const handleFindMatchAndRouteClick = useCallback(() => {
    // Use useCallback
    // --- Reset previous visualization state ---
    setStartNode(null);
    setEndNode(null);
    setVisitedNodes(new Set());
    setShortestPathNodes([]); // Reset to empty array
    setCandidateDrivers(new Set());

    // --- Initial Checks ---
    if (!rider || !destinationNode) {
      alert('Please set a rider and destination first.');
      return;
    }
    if (drivers.length === 0) {
      alert('Please add at least one driver first.');
      return;
    }

    // --- 1. Find Best Driver (Driver -> Pickup) ---
    addLog(`Finding closest driver for rider at: ${rider.pickup}`);

    console.log('Finding closest driver for rider at:', rider.pickup);
    let nearbyDrivers = [];
    let currentRadius = 1;
    const maxRadius = 10;
    while (nearbyDrivers.length === 0 && currentRadius <= maxRadius) {
      const searchHexagons = gridDisk(rider.pickupH3, currentRadius);
      nearbyDrivers = drivers.filter((d) => searchHexagons.includes(d.h3Index));
      if (nearbyDrivers.length === 0) {
        currentRadius++;
      } else {
        addLog(`Searching H3 gridDisk with radius ${currentRadius}...`);
        console.log(`Searching H3 gridDisk with radius ${currentRadius}...`);
      }
    }

    if (nearbyDrivers.length === 0) {
      alert(`No drivers found within H3 radius ${maxRadius}.`);
      return;
    }

    const candidateNodeIds = new Set(
      nearbyDrivers.map((driver) => driver.location)
    );
    setCandidateDrivers(candidateNodeIds); // Highlight candidates
    addLog(
      `H3 Filter (Radius ${currentRadius}): Found ${nearbyDrivers.length} drivers to check.`
    );
    console.log(
      `H3 Filter (Radius ${currentRadius}): Found ${nearbyDrivers.length} drivers to check.`
    );

    let bestDriver = null;
    let minDistanceToRider = Infinity;
    let pathDriverToRiderResult = null;
    addLog(`Checking ${nearbyDrivers.length} drivers with Dijkstra...`);

    console.log(`Checking ${nearbyDrivers.length} drivers with Dijkstra...`);
    for (const driver of nearbyDrivers) {
      const result = dijkstra(adjacencyList, driver.location, rider.pickup);
      addLog(
        `Checked driver ${driver.id} distance: ${Math.round(result.distance)}`
      );

      console.log(`Checked driver ${driver.id}: Distance = ${result.distance}`);
      if (
        result.distance < minDistanceToRider &&
        result.distance !== Infinity
      ) {
        minDistanceToRider = result.distance;
        bestDriver = driver;
        pathDriverToRiderResult = result;
      }
    }

    setCandidateDrivers(new Set()); // Clear candidate highlights

    if (!bestDriver) {
      alert('Could not find a valid path for any nearby driver.');
      return;
    }
    addLog(`Best driver found: ${bestDriver.id}`);

    console.log(`Best driver found: ${bestDriver.id}`);

    // --- 2. Find Path (Pickup -> Destination) ---
    addLog('Finding path from rider pickup to destination...');

    console.log('Finding path from rider pickup to destination...');
    const resultRiderToDest = dijkstra(
      adjacencyList,
      rider.pickup,
      destinationNode
    );

    if (resultRiderToDest.distance === Infinity) {
      alert('Could not find a path from rider pickup to destination.');
      return;
    }
    addLog(
      `Path found from rider to destination, distance: ${Math.round(
        resultRiderToDest.distance
      )}`
    );
    console.log(
      `Path found from rider to destination, distance: ${Math.round(
        resultRiderToDest.distance
      )}`
    );

    // --- 3. Prepare Paths ---
    const arrPath1 = pathDriverToRiderResult.pathArray; // Use ordered array
    const arrPath2 = resultRiderToDest.pathArray; // Use ordered array

    if (arrPath1.length === 0 || arrPath2.length === 0) {
      alert('Error: One path segment is empty.');
      return;
    }
    const fullPathArray = [...arrPath1, ...arrPath2.slice(1)];
    console.log('Full Path Array:', fullPathArray);

    // --- 4. Animate Visited Nodes (Yellow) ---
    const combinedVisited = [
      ...(pathDriverToRiderResult?.visitedNodesInOrder || []),
      ...(resultRiderToDest?.visitedNodesInOrder || []),
    ];
    const uniqueVisitedInOrder = Array.from(new Set(combinedVisited));

    const yellowAnimationDelay = 300; // Speed for yellow nodes (ms per node)
    const yellowAnimationTotalTime =
      uniqueVisitedInOrder.length * yellowAnimationDelay;

    uniqueVisitedInOrder.forEach((nodeId, index) => {
      setTimeout(() => {
        setVisitedNodes((prev) => new Set(prev).add(nodeId));
      }, index * yellowAnimationDelay);
    });

    // --- 5. Animate Red Path AFTER Yellow Animation ---
    const redAnimationDelay = 300; // Speed for red nodes (ms per node)
    const delayBeforeRedStarts = 100; // Extra pause (ms) after yellow finishes

    fullPathArray.forEach((nodeId, index) => {
      setTimeout(() => {
        // Add the current node to the path state array
        setShortestPathNodes((prev) => [...prev, nodeId]);

        // Set start/end green highlights when the red path starts drawing
        if (index === 0) {
          setStartNode(bestDriver.location);
          setEndNode(destinationNode);
        }
      }, yellowAnimationTotalTime + delayBeforeRedStarts + index * redAnimationDelay); // Calculate delay
    });
  }, [rider, destinationNode, drivers, adjacencyList, nodeToH3Map, fitView]); // Dependencies

  // --- Reset Function ---
  const handleReset = useCallback(() => {
    // Use useCallback
    setStartNode(null);
    setEndNode(null);
    setVisitedNodes(new Set());
    setShortestPathNodes([]);
    setDrivers([]);
    setRider(null);
    setCandidateDrivers(new Set());
    setDestinationNode(null);
    setClickMode('none');
    setLogMessages([]);
  }, [fitView]); // Dependency

  // --- Dynamic Styling ---
  const styledNodes = nodes.map((node) => {
    const isStart = node.id === startNode;
    const isEnd = node.id === endNode;
    const isPath = shortestPathNodes.includes(node.id); // Check array
    const isVisited = visitedNodes.has(node.id); // Check Set
    const isDriver = drivers.some((d) => d.location === node.id);
    const isRiderPickup = rider?.pickup === node.id;
    const isDestination = node.id === destinationNode;
    const isCandidate = candidateDrivers.has(node.id);

    let style = { background: '#ffffff', opacity: 1, color: 'black' }; // Default

    if (isStart || isEnd) {
      style = { background: '#00ff00', zIndex: 10, color: 'black  ' }; // Green
    } else if (isPath) {
      style = { background: '#ff0000', zIndex: 10, color: 'white' }; // Red
    } else if (isVisited) {
      style = {
        background: '#ffff00',
        opacity: 0.8,
        zIndex: 8,
        color: 'black',
      }; // Yellow
    } else if (isCandidate) {
      style = { background: '#00ff00', zIndex: 9, color: 'white' }; // Green
    } else if (isRiderPickup) {
      style = { background: '#00ff00', zIndex: 9, color: 'white' }; // Green
    } else if (isDestination) {
      style = { background: '#00ff00', zIndex: 9, color: 'white' }; // Green
    } else if (isDriver) {
      style = { background: '#7f827fff', zIndex: 9, color: 'white' }; // Grey
    }
    return { ...node, style: { ...node.style, ...style } };
  });

  const styledEdges = edges.map((edge) => {
    const isPath =
      shortestPathNodes.includes(edge.source) &&
      shortestPathNodes.includes(edge.target); // Check array
    let style = { stroke: '#ffffff', strokeWidth: 1, zIndex: 1 }; // Default
    if (isPath) {
      style = { stroke: '#ff0000', strokeWidth: 3, zIndex: 5 }; // Red
    }
    return { ...edge, style: { ...edge.style, ...style } };
  });

  // --- Loading Check ---
  if (isLoading || nodeToH3Map.size === 0) {
    return (
      <div style={{ padding: '20px' }}>Loading and indexing graph data...</div>
    );
  }

  // --- Render JSX ---
  return (
    <div style={{ height: '100vh', width: '100%', border: '1px solid black' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          display: 'flex',
          gap: '5px',
        }}
      >
        <button onClick={handleReset} className={styles.simButton}>
          Reset
        </button>
        <button
          onClick={() => setClickMode('addRider')}
          className={styles.simButton}
          disabled={!!rider}
          style={rider ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
        >
          Add Rider
        </button>
        <button
          onClick={() => setClickMode('addDriver')}
          className={styles.simButton}
          // 👇 Add this disabled condition
          disabled={!!destinationNode}
          // 👇 Add corresponding style
          style={destinationNode ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
        >
          Add Driver
        </button>
        <button
          onClick={() => setClickMode('setDestination')}
          className={styles.simButton}
          disabled={!rider || !!destinationNode}
          style={
            !rider || destinationNode
              ? { cursor: 'not-allowed', opacity: 0.5 }
              : {}
          }
        >
          Set Destination
        </button>
        <button
          onClick={handleFindMatchAndRouteClick}
          className={styles.simButton}
          disabled={!rider || !destinationNode || drivers.length === 0}
          style={
            !rider || !destinationNode || drivers.length === 0
              ? { cursor: 'not-allowed', opacity: 0.5 }
              : {}
          }
        >
          Find Match & Route
        </button>
      </div>

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
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
        }}
      >
        <LogBox messages={logMessages} />
      </div>
    </div>
  );
}

export default GraphVisualizer;
