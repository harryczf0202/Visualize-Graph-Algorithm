# Real-World Graph Pathfinding Algorithm Visualizer

> Vibecoded with Gemini and Claude.

An interactive web-based visualization tool for graph pathfinding algorithms (like A*) using real-world road networks from **Klang and Shah Alam, Malaysia** (queried from OpenStreetMap).

The visualizer includes an **Algorithm Editor** that lets you write, compile, and execute pathfinding algorithms in **JavaScript**, **Python**, or **C++**, and see the search exploration and shortest path rendered dynamically on the map.


---

## Features

- **Real-World Graph Data**: Road network nodes, edges, and coordinates downloaded directly from OpenStreetMap.
- **Embedded IDE**: Code editor (using CodeMirror) featuring syntax highlighting, matching brackets, and basic autocompletion.
- **Multi-Language Support**:
  - **JavaScript**: Executed directly in the browser for instant results.
  - **Python / C++**: Compiled and run via API integration (Wandbox).
- **Interactive Map Controls**:
  - Search location address or click on the map to set **Start** and **End** points.
  - Play, pause, speed adjustment, and reset controls for the exploration path animation.
- **Sleek UX**: Responsive light/dark theme toggle, modern glassmorphism panels, and smooth micro-animations.

---

## Directory Structure

```
Visualize Graph Algorithm/
├── archive/                     # Archived older standalone HTML builds
│   ├── klang_astar_starter.html
│   ├── klang_astar_v1.html
│   ├── klang_astar_v2.html
│   └── klang_astar_v3.html
├── src/                         # Source files for compiling the visualizer
│   ├── script.js                # Core JS logic for visualizer, editor and pathfinding animation
│   ├── style.css                # Visualizer interface styling and themes
│   └── template.html            # Core layout skeleton for the Leaflet map and UI panels
├── build.py                     # Python compiler script to fetch OSM data and bundle source files
├── index.html                   # Compiled product (the standalone interactive application)
├── README.md                    # Project documentation
└── requirements.txt             # Python package dependencies
```

---

## Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd "Visualize Graph Algorithm"
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   - **Windows (Command Prompt)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## How to Build the App

The visualizer runs as a single, compiled, self-contained HTML page (`index.html`) containing the road network dataset and application logic. To rebuild or update the map and code:

```bash
python build.py
```

This script will:
1. Download/load from cache the road network covering Klang & Shah Alam (bbox W=101.33, S=2.95, E=101.58, N=3.18).
2. Compute the convex hull boundary of the road network.
3. Bundle the CSS, JavaScript, and template HTML together.
4. Embed the serialized nodes, edges, grid, and boundary coordinates.
5. Save the final compiled app to `index.html`.

---

## How to Use the Visualizer

1. Double-click or open `index.html` in any web browser.
2. Select your **Start** and **End** locations:
   - Use the text boxes to search for addresses.
   - Or click the **Marker Icon** next to the inputs and click directly on the map.
3. Click the `</>` toggle button on the right to open the **Algorithm Editor**.
4. Choose your preferred language tab (JavaScript, Python, or C++), write your implementation, and click **RUN**.
5. The visualizer will show the compilation terminal, animate the explored edges (blue), and render the final computed shortest path (red).
6. Adjust the animation speed using the **SPD** slider at the bottom.
