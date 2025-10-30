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
import { latLngToCell, gridDisk } from 'h3-js'; // Keep gridDisk
import styles from '@/styles/Home.module.css';
import LogBox from './logBox';

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

  const path = []; // This is the ordered path array
  let currentNode = endNode;
  while (currentNode !== null && previousNodes.get(currentNode) !== undefined) {
    path.unshift(currentNode);
    currentNode = previousNodes.get(currentNode);
  }
  if (
    (path.length > 0 && path[0] !== startNode) ||
    (path.length === 0 && startNode === endNode)
  ) {
    path.unshift(startNode);
  }

  const finalDistance = distances.get(endNode);

  return {
    pathSet: new Set(path), // Keep Set for compatibility
    pathArray: path, // <-- RETURN THE ORDERED ARRAY
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
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const [nodeToH3Map, setNodeToH3Map] = useState(new Map());
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [shortestPathNodes, setShortestPathNodes] = useState([]); // Use array
  const [drivers, setDrivers] = useState([]);
  const [riders, setRiders] = useState([]); // Array for multiple riders
  const [clickMode, setClickMode] = useState('none');
  const [candidateDrivers, setCandidateDrivers] = useState(new Set());
  const [destinationNode, setDestinationNode] = useState(null); // Shared destination
  const [tempPickup, setTempPickup] = useState(null); // For 2-step rider add

  // --- ADD THIS HELPER ---
  const [logMessages, setLogMessages] = useState([]);

  const { fitView } = useReactFlow();

  // --- ADD THIS HELPER ---
  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages((prevLogs) =>
      [`[${timestamp}] ${message}`, ...prevLogs].slice(0, 20)
    ); // Keep last 20
  }, []); // Empty dependency array, this function is stable

  // --- 1. Load Data and Build Adjacency List ---
  useEffect(() => {
    fetch('/valapattanam_graph.json') // Using small graph
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
  }, [setNodes, setEdges]); // Dependencies

  // --- 2. Handle User Clicks (Simplified Shared Destination Model) ---
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
      } else if (clickMode === 'addRider') {
        const newRider = {
          id: `r${riders.length + 1}`,
          pickup: key,
          pickupH3: h3Index,
        };
        setRiders((prev) => [...prev, newRider]);
        setClickMode('none');
        addLog(`Added Rider ${newRider.id} at node ${key}`);
      } else if (clickMode === 'setDestination') {
        if (riders.some((r) => r.pickup === key)) {
          alert('Destination cannot be the same as a rider pickup.');
          return;
        }
        setDestinationNode(key);
        setClickMode('none');
        addLog(`Shared destination set at node ${key}`);
      }
    },
    [clickMode, drivers, riders, nodeToH3Map, addLog]
  ); // Updated dependencies

  // --- 3. NEW HELPER: Find Closest Driver (uses Dijkstra) ---
  const findClosestDriver = (rider) => {
    let nearbyDrivers = [];
    let currentRadius = 0;
    const maxRadius = 10;
    while (nearbyDrivers.length === 0 && currentRadius <= maxRadius) {
      const searchHexagons = gridDisk(rider.pickupH3, currentRadius++);
      nearbyDrivers = drivers.filter(
        (d) => d.h3Index === searchHexagons.includes(d.h3Index)
      );
    }

    // Safety check: What if gridDisk fails?
    if (nearbyDrivers.length === 0) {
      // Fallback: just check all drivers if H3 fails to find any
      nearbyDrivers = drivers;
      addLog('H3 found no nearby drivers, checking all drivers...');
    }

    setCandidateDrivers(
      (prev) => new Set([...prev, ...nearbyDrivers.map((d) => d.location)])
    );

    let bestDriver = null;
    let minDistance = Infinity;
    let resultPath = null;

    for (const driver of nearbyDrivers) {
      // --- USE DIJKSTRA ---
      const result = dijkstra(adjacencyList, driver.location, rider.pickup);
      if (result.distance < minDistance && result.distance !== Infinity) {
        minDistance = result.distance;
        bestDriver = driver;
        resultPath = result;
      }
    }
    return { bestDriver, resultPath };
  };

  // --- 4. NEW Main Logic Function (uses Dijkstra) ---
  const handleFindPoolClick = useCallback(() => {
    // 1. Reset
    setStartNode(null);
    setEndNode(null);
    setVisitedNodes(new Set());
    setShortestPathNodes([]);
    setCandidateDrivers(new Set());

    // 2. Setup (Find pool)
    const pool = riders.slice(0, 2);
    if (pool.length < 2 || !destinationNode || drivers.length === 0) {
      alert('Please add at least 2 riders, 1 driver, and set a destination.');
      return;
    }
    const [riderA, riderB] = pool;
    addLog(
      `Found pool: Rider ${riderA.id} & ${riderB.id} to ${destinationNode}`
    );

    // 3. Find Best Drivers (closest to A, closest to B)
    const { bestDriver: driverA, resultPath: path_DA } =
      findClosestDriver(riderA);
    const { bestDriver: driverB, resultPath: path_DB } =
      findClosestDriver(riderB);

    if (!driverA || !driverB) {
      alert('No drivers found for one or both riders.');
      setCandidateDrivers(new Set());
      return;
    }

    addLog(`Candidate 1: Driver ${driverA.id} (closest to Rider ${riderA.id})`);
    addLog(`Candidate 2: Driver ${driverB.id} (closest to Rider ${riderB.id})`);

    // 4. Calculate all 6 segments using DIJKSTRA
    addLog('Calculating all path segments...');
    const path_AB = dijkstra(adjacencyList, riderA.pickup, riderB.pickup);
    const path_BA = dijkstra(adjacencyList, riderB.pickup, riderA.pickup);
    const path_ADest = dijkstra(adjacencyList, riderA.pickup, destinationNode);
    const path_BDest = dijkstra(adjacencyList, riderB.pickup, destinationNode);
    const path_DA_to_B = dijkstra(
      adjacencyList,
      driverA.location,
      riderB.pickup
    );
    const path_DB_to_A = dijkstra(
      adjacencyList,
      driverB.location,
      riderA.pickup
    );

    // Check for impossible routes
    const allPaths = [
      path_DA,
      path_DB,
      path_AB,
      path_BA,
      path_ADest,
      path_BDest,
      path_DA_to_B,
      path_DB_to_A,
    ];
    if (allPaths.some((p) => !p || p.distance === Infinity)) {
      alert('Cannot calculate all route permutations. Pool may be impossible.');
      setCandidateDrivers(new Set());
      return;
    }

    // 5. Calculate total cost for all 4 possible routes
    let bestRoute = {
      driver: null,
      pathArray: [],
      cost: Infinity,
      name: '',
      visited: [],
    };

    // --- Routes for Driver A ---
    const cost_ABD = path_AB.distance + path_BDest.distance; // A -> B -> Dest
    const cost_BAD = path_BA.distance + path_ADest.distance; // B -> A -> Dest

    const route_A1_cost = path_DA.distance + cost_ABD; // D_A -> A -> B -> Dest
    if (route_A1_cost < bestRoute.cost) {
      bestRoute = {
        driver: driverA,
        pathArray: [
          ...path_DA.pathArray,
          ...path_AB.pathArray.slice(1),
          ...path_BDest.pathArray.slice(1),
        ],
        cost: route_A1_cost,
        name: `D${driverA.id} -> R${riderA.id} -> R${
          riderB.id
        } -> Dest (Cost: ${Math.round(route_A1_cost)})`,
        visited: [
          ...path_DA.visitedNodesInOrder,
          ...path_AB.visitedNodesInOrder,
          ...path_BDest.visitedNodesInOrder,
        ],
      };
    }

    const route_A2_cost = path_DA_to_B.distance + cost_BAD; // D_A -> B -> A -> Dest
    if (route_A2_cost < bestRoute.cost) {
      bestRoute = {
        driver: driverA,
        pathArray: [
          ...path_DA_to_B.pathArray,
          ...path_BA.pathArray.slice(1),
          ...path_ADest.pathArray.slice(1),
        ],
        cost: route_A2_cost,
        name: `D${driverA.id} -> R${riderB.id} -> R${
          riderA.id
        } -> Dest (Cost: ${Math.round(route_A2_cost)})`,
        visited: [
          ...path_DA_to_B.visitedNodesInOrder,
          ...path_BA.visitedNodesInOrder,
          ...path_ADest.visitedNodesInOrder,
        ],
      };
    }

    // --- Routes for Driver B (if different) ---
    if (driverA.id !== driverB.id) {
      const route_B1_cost = path_DB_to_A.distance + cost_ABD; // D_B -> A -> B -> Dest
      if (route_B1_cost < bestRoute.cost) {
        bestRoute = {
          driver: driverB,
          pathArray: [
            ...path_DB_to_A.pathArray,
            ...path_AB.pathArray.slice(1),
            ...path_BDest.pathArray.slice(1),
          ],
          cost: route_B1_cost,
          name: `D${driverB.id} -> R${riderA.id} -> R${
            riderB.id
          } -> Dest (Cost: ${Math.round(route_B1_cost)})`,
          visited: [
            ...path_DB_to_A.visitedNodesInOrder,
            ...path_AB.visitedNodesInOrder,
            ...path_BDest.visitedNodesInOrder,
          ],
        };
      }

      const route_B2_cost = path_DB.distance + cost_BAD; // D_B -> B -> A -> Dest
      if (route_B2_cost < bestRoute.cost) {
        bestRoute = {
          driver: driverB,
          pathArray: [
            ...path_DB.pathArray,
            ...path_BA.pathArray.slice(1),
            ...path_ADest.pathArray.slice(1),
          ],
          cost: route_B2_cost,
          name: `D${driverB.id} -> R${riderB.id} -> R${
            riderA.id
          } -> Dest (Cost: ${Math.round(route_B2_cost)})`,
          visited: [
            ...path_DB.visitedNodesInOrder,
            ...path_BA.visitedNodesInOrder,
            ...path_ADest.visitedNodesInOrder,
          ],
        };
      }
    }

    // 6. Finalize and Animate
    addLog(`Optimal route found: ${bestRoute.name}`);
    setCandidateDrivers(new Set()); // Clear candidates

    // --- 7. Animate Visited Nodes (Yellow) ---
    const uniqueVisitedInOrder = Array.from(new Set(bestRoute.visited));
    const yellowAnimationDelay = 300; // Original speed
    const yellowAnimationTotalTime =
      uniqueVisitedInOrder.length * yellowAnimationDelay;
    uniqueVisitedInOrder.forEach((nodeId, index) => {
      setTimeout(() => {
        setVisitedNodes((prev) => new Set(prev).add(nodeId));
      }, index * yellowAnimationDelay);
    });

    // --- 8. Animate Red Path AFTER Yellow Animation ---
    const redAnimationDelay = 300;
    const delayBeforeRedStarts = 100;
    bestRoute.pathArray.forEach((nodeId, index) => {
      setTimeout(() => {
        setShortestPathNodes((prev) => [...prev, nodeId]);
        if (index === 0) {
          // Set green highlights when red starts
          setStartNode(bestRoute.driver.location);
          setEndNode(destinationNode);
        }
      }, yellowAnimationTotalTime + delayBeforeRedStarts + index * redAnimationDelay);
    });
  }, [
    riders,
    drivers,
    destinationNode,
    adjacencyList,
    nodeToH3Map,
    fitView,
    addLog,
  ]);

  // --- 5. Reset Button ---
  const handleReset = useCallback(() => {
    setStartNode(null);
    setEndNode(null);
    setVisitedNodes(new Set());
    setShortestPathNodes([]);
    setDrivers([]);
    setRiders([]);
    setCandidateDrivers(new Set());
    setDestinationNode(null);
    setClickMode('none');
    setLogMessages([]);
    fitView({ duration: 800 });
  }, [fitView, addLog]);

  // --- 6. Dynamic Styling ---
  const styledNodes = nodes.map((node) => {
    const isStart = node.id === startNode; // Final Driver
    const isEnd = node.id === endNode; // Final Destination
    const isPath = shortestPathNodes.includes(node.id);
    const isVisited = visitedNodes.has(node.id);
    const isDriver = drivers.some((d) => d.location === node.id);
    const isRiderPickup = riders.some((r) => r.pickup === node.id);
    const isDestination = node.id === destinationNode;
    const isCandidate = candidateDrivers.has(node.id);

    let style = { background: '#ffffff', opacity: 1, color: 'black' }; // Default

    if (isStart || isEnd) {
      style = { background: '#00ff00', zIndex: 10, color: 'black' }; // Green
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
      style = { background: '#00ff00', zIndex: 9, color: 'black' }; // Light Green
    } else if (isRiderPickup) {
      style = { background: '#00ff00', zIndex: 9, color: 'black' }; // Purple
    } else if (isDestination) {
      style = { background: '#00ff00', zIndex: 9, color: 'black' }; // Orange
    } else if (isDriver) {
      style = { background: '#7f827fff', zIndex: 9, color: 'white' }; // Grey
    }
    return { ...node, style: { ...node.style, ...style } };
  });

  const styledEdges = edges.map((edge) => {
    const isPath =
      shortestPathNodes.includes(edge.source) &&
      shortestPathNodes.includes(edge.target);
    let style = { stroke: '#ffffff', strokeWidth: 1, zIndex: 1 }; // Default
    if (isPath) {
      style = { stroke: '#ff0000', strokeWidth: 3, zIndex: 5 }; // Red
    }
    return { ...edge, style: { ...edge.style, ...style } };
  });

  // --- 7. Loading Check ---
  if (isLoading || nodeToH3Map.size === 0) {
    return (
      <div style={{ padding: '20px' }}>Loading and indexing graph data...</div>
    );
  }

  // --- 8. Render JSX ---
  return (
    <div
      style={{
        height: '800px',
        width: '100%',
        border: '1px solid black',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
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
          disabled={riders.length >= 2 || !!destinationNode}
          style={
            riders.length >= 2 || destinationNode
              ? { cursor: 'not-allowed', opacity: 0.5 }
              : {}
          }
        >
          Add Rider
        </button>
        <button
          onClick={() => setClickMode('addDriver')}
          className={styles.simButton}
          disabled={!!destinationNode}
          style={destinationNode ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
        >
          Add Driver
        </button>
        <button
          onClick={() => setClickMode('setDestination')}
          className={styles.simButton}
          disabled={riders.length === 0 || !!destinationNode}
          style={
            riders.length === 0 || !!destinationNode
              ? { cursor: 'not-allowed', opacity: 0.5 }
              : {}
          }
        >
          Set Destination
        </button>
        <button
          onClick={handleFindPoolClick}
          className={styles.simButton}
          disabled={
            riders.length < 2 || !destinationNode || drivers.length === 0
          }
          style={
            riders.length < 2 || !destinationNode || drivers.length === 0
              ? { cursor: 'not-allowed', opacity: 0.5 }
              : {}
          }
        >
          Find Pool & Route
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
