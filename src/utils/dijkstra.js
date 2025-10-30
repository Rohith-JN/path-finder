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

export default function dijkstra(graph, startNode, endNode) {
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
