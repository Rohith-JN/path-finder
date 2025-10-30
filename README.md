# Optimal Ride-Pooling Simulation with H3 & Dijkstra's Algorithm

## 🗺️ Description

This project is a web-based simulation demonstrating a simplified ride-pooling assignment system. Users can place **multiple drivers**, **multiple riders** (at different pickup locations), and a **shared destination** onto a real-world road network graph derived from OpenStreetMap data. The simulation then uses the H3 geospatial index to find the best candidate drivers for the pool and **solves a small-scale routing problem** by comparing route permutations (e.g., Driver -\> Rider A -\> Rider B -\> Dest vs. Driver -\> Rider B -\> Rider A -\> Dest). It uses Dijkstra's algorithm to **calculate each path segment**, determining the true shortest route for the pool. The entire process is visualized using `@xyflow/react`.

<img width="1919" height="865" alt="{F9067360-FCA9-4691-81A7-EC040B979102}" src="https://github.com/user-attachments/assets/b242767c-4256-499b-be6e-e0621e645d6b" />

## ✨ Features

  * **Interactive Graph Visualization:** Uses `@xyflow/react` to display the road network (nodes = intersections, edges = roads).
  * **Entity Placement:** Add multiple drivers, multiple riders (pickups), and a shared destination by clicking nodes on the graph.
  * **H3-Based Driver Search:** Efficiently finds candidate drivers near the riders using the `h3-js` library (`gridDisk`).
  * **Dijkstra's Algorithm:** Calculates the shortest path for each segment of the route based on road network distances.
  * **Optimal Pool Routing:** Solves the 2-rider routing problem by calculating all permutations (e.g., comparing routes from `Driver A` vs. `Driver B`) to find the true shortest path for the pool.
  * **Step-by-Step Visualization:**
      * Highlights candidate drivers (green).
      * Animates the algorithm's search area (yellow).
      * Highlights the final assigned driver and shared destination (green).
      * Animates the final, combined shortest path (red).
  * **Event Log:** Displays real-time updates on the simulation process (driver added, rider added, optimal route found, etc.).

## 🛠️ Tech Stack

  * **Frontend:** React, Next.js
  * **Graph Visualization:** `@xyflow/react`
  * **Geospatial Indexing:** `h3-js`
  * **Pathfinding:** Custom Dijkstra's Algorithm implementation
  * **Data Preparation (Offline):** Python with `osmnx` (to generate the road network graph from OpenStreetMap)

## 🕹️ Usage

1.  **Add Drivers:** Click the "Add Driver" button. Then, click any node on the graph to place a driver. Repeat as needed.
2.  **Add Riders:** Click the "Add Rider" button. Click nodes on the graph to place *multiple* riders. The simulation is currently set to pool the **first two riders** added.
3.  **Set Destination:** Click the "Set Destination" button. Click a *different* node to set the **shared** destination for the pool.
4.  **Find Pool & Route:** Click the "Find Pool & Route" button.
      * The simulation finds the best driver *for each rider* in the pool (e.g., `Driver A` and `Driver B`).
      * It calculates all possible route combinations (e.g., `D_A->A->B->Dest` vs. `D_A->B->A->Dest` vs. `D_B->A->B->Dest` etc.) and selects the one with the minimum total cost.
      * The algorithm's search area will animate in yellow.
      * The final route (e.g., Driver -\> Rider B -\> Rider A -\> Destination) will animate in red, and the start/end nodes will turn bright green.
5.  **Reset:** Click the "Reset" button to clear all drivers, *riders*, the destination, and the path, allowing you to start a new simulation.
6.  **Event Log:** Check the log box in the top-right corner for messages about the simulation's progress.
