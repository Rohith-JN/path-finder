# Ride-Pooling Simulation with H3 & Dijkstra's Algorithm

## 🗺️ Description

This project is a web-based simulation demonstrating a simplified ride-pooling assignment system. Users can place drivers and a rider (with a pickup and destination) onto a real-world road network graph derived from OpenStreetMap data. The simulation then uses the H3 geospatial index to efficiently find nearby drivers and Dijkstra's algorithm to determine the shortest path for the assigned driver to pick up the rider and proceed to the destination. The process is visualized using `@xyflow/react`.

<img width="1600" height="732" alt="image" src="https://github.com/user-attachments/assets/abef3c56-3806-43a9-8d24-e64601412078" />

## ✨ Features

* **Interactive Graph Visualization:** Uses `@xyflow/react` to display the road network (nodes = intersections, edges = roads).
* **Entity Placement:** Add drivers, a rider (pickup), and a destination by clicking nodes on the graph.
* **H3-Based Driver Search:** Efficiently finds candidate drivers near the rider using the `h3-js` library (`gridDisk`).
* **Dijkstra's Algorithm:** Calculates the shortest path based on road network distances.
* **Route Calculation:** Determines the optimal path: **Driver -> Rider Pickup -> Destination**.
* **Step-by-Step Visualization:**
    * Highlights candidate drivers (light green).
    * Animates the algorithm's search area (yellow).
    * Highlights the final assigned driver and destination (bright green).
    * Animates the final shortest path (red).
* **Event Log:** Displays real-time updates on the simulation process (driver added, rider added, driver assigned, path found, etc.).

## 🛠️ Tech Stack

* **Frontend:** React, Next.js
* **Graph Visualization:** `@xyflow/react`
* **Geospatial Indexing:** `h3-js`
* **Pathfinding:** Custom Dijkstra's Algorithm implementation
* **Data Preparation (Offline):** Python with `osmnx` (to generate the road network graph from OpenStreetMap)

## 🕹️ Usage

1.  **Add Drivers:** Click the "Add Driver" button (it will highlight). Then, click any node on the graph to place a driver. Repeat as needed. 
2.  **Add Rider:** Click the "Add Rider" button. Click a node on the graph to set the rider's pickup location.
3.  **Set Destination:** Click the "Set Destination" button. Click a *different* node to set the destination. 
4.  **Find Match & Route:** Click the "Find Match & Route" button.
    * The simulation will find nearby drivers using H3.
    * It will calculate the shortest path from each candidate to the rider using Dijkstra's.
    * The closest driver and the destination will turn bright green.
    * The algorithm's search area will animate in yellow.
    * The final route (Driver -> Rider -> Destination) will animate in red.
5.  **Reset:** Click the "Reset" button to clear all drivers, the rider, the destination, and the path, allowing you to start a new simulation.
6.  **Event Log:** Check the log box in the top-right corner for messages about the simulation's progress.
