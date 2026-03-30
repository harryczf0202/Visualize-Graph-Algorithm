import os
import json
import folium
import osmnx as ox
import numpy as np
from scipy.spatial import ConvexHull

# ==========================================
# 1. DOWNLOAD MAP DATA
# ==========================================
print("Downloading road network for Klang + Shah Alam area...")

# Use graph_from_bbox with a single bounding box that covers both cities.
# This ensures all roads between them are included (no disconnected components).
# osmnx 2.x bbox format: (west, south, east, north) = (min_lng, min_lat, max_lng, max_lat)
WEST, SOUTH, EAST, NORTH = 101.33, 2.95, 101.58, 3.18
print(f"  Bounding box: W={WEST} S={SOUTH} E={EAST} N={NORTH}")
G = ox.graph_from_bbox(bbox=(WEST, SOUTH, EAST, NORTH), network_type='drive')
print(f"  Nodes: {len(G.nodes)}, Edges: {len(G.edges)}")

# ==========================================
# 2. SERIALIZE GRAPH FOR CLIENT-SIDE A*
# ==========================================
print("Serializing graph for browser...")

# Nodes: id -> {lat, lng}
nodes_data = {}
for node_id, data in G.nodes(data=True):
    nodes_data[str(node_id)] = {"lat": data['y'], "lng": data['x']}

# Edges: id -> list of {to, length, coords}
edges_data = {}
for u, v, data in G.edges(data=True):
    su = str(u)
    if su not in edges_data:
        edges_data[su] = []
    if 'geometry' in data:
        coords = [[lat, lng] for lng, lat in data['geometry'].coords]
    else:
        coords = [
            [G.nodes[u]['y'], G.nodes[u]['x']],
            [G.nodes[v]['y'], G.nodes[v]['x']]
        ]
    edges_data[su].append({
        "to": str(v),
        "length": data.get('length', 1.0),
        "coords": coords
    })

# Build spatial index grid
CELL_SIZE = 0.001
grid = {}
for node_id, data in G.nodes(data=True):
    cell_x = int(data['x'] / CELL_SIZE)
    cell_y = int(data['y'] / CELL_SIZE)
    key = f"{cell_x},{cell_y}"
    if key not in grid:
        grid[key] = []
    grid[key].append({"id": str(node_id), "lat": data['y'], "lng": data['x']})

nodes_json    = json.dumps(nodes_data)
edges_json    = json.dumps(edges_data)
grid_json     = json.dumps(grid)
cell_size_json = json.dumps(CELL_SIZE)

# Convex hull for coverage boundary
print("Computing network coverage boundary...")
node_coords = np.array([[data['y'], data['x']] for _, data in G.nodes(data=True)])
hull = ConvexHull(node_coords)
hull_points = node_coords[hull.vertices].tolist()
hull_points.append(hull_points[0])
hull_json = json.dumps(hull_points)

# Center of the combined area
all_lats = [data['y'] for _, data in G.nodes(data=True)]
all_lngs = [data['x'] for _, data in G.nodes(data=True)]
center_lat = (max(all_lats) + min(all_lats)) / 2
center_lng = (max(all_lngs) + min(all_lngs)) / 2

# ==========================================
# 3. BUILD MAP (light tiles by default)
# ==========================================
print("Building interactive map...")
m = folium.Map(
    location=[center_lat, center_lng],
    zoom_start=13,
    tiles="CartoDB positron"
)

# ==========================================
# 4. LOAD & ASSEMBLE UI FROM EXTERNAL FILES
# ==========================================
base_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(base_dir, "style.css"), "r", encoding="utf-8") as f:
    style_css = f.read()

with open(os.path.join(base_dir, "script.js"), "r", encoding="utf-8") as f:
    script_js = f.read()

with open(os.path.join(base_dir, "template.html"), "r", encoding="utf-8") as f:
    template_html = f.read()

script_js = script_js.replace("__NODES_JSON__", nodes_json)
script_js = script_js.replace("__EDGES_JSON__", edges_json)
script_js = script_js.replace("__GRID_JSON__", grid_json)
script_js = script_js.replace("__CELL_SIZE_JSON__", cell_size_json)
script_js = script_js.replace("__HULL_JSON__", hull_json)

codemirror_cdn = """
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/monokai.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
"""

final_html = (
    codemirror_cdn + "\n"
    + template_html
    + "\n<style>\n" + style_css + "\n</style>\n"
    + "\n<script>\n" + script_js + "\n</script>"
)

safe_html = '{% raw %}' + final_html + '{% endraw %}'
m.get_root().html.add_child(folium.Element(safe_html))

# ==========================================
# 5. SAVE OUTPUT
# ==========================================
output_path = "klang.html"
m.save(output_path)
print(f"\nDone! Saved to {output_path}")
print(f"  Graph nodes embedded: {len(nodes_data)}")
print(f"  Graph edges embedded: {sum(len(v) for v in edges_data.values())}")
print(f"\nOpen the HTML file — pick start/end by clicking or searching, then press play")