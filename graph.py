import os
import json
import folium
import osmnx as ox
import numpy as np
from scipy.spatial import ConvexHull

# ==========================================
# 1. DOWNLOAD MAP DATA
# ==========================================
place_name = "Klang, Selangor, Malaysia"
print(f"Downloading road network for {place_name}...")
G = ox.graph_from_place(place_name, network_type='drive')

# ==========================================
# 2. SERIALIZE GRAPH FOR CLIENT-SIDE A*
# ==========================================
print("Serializing graph for browser...")

# Nodes: id -> {lat, lng}
nodes_data = {}
for node_id, data in G.nodes(data=True):
    nodes_data[str(node_id)] = {"lat": data['y'], "lng": data['x']}

# Edges: id -> list of {to, length, coords}
# coords = list of [lat,lng] using full OSM geometry
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

# Build spatial index: grid buckets for fast nearest-node lookup
# Grid cell size ~100m at this latitude
CELL_SIZE = 0.001
grid = {}
for node_id, data in G.nodes(data=True):
    cell_x = int(data['x'] / CELL_SIZE)
    cell_y = int(data['y'] / CELL_SIZE)
    key = f"{cell_x},{cell_y}"
    if key not in grid:
        grid[key] = []
    grid[key].append({"id": str(node_id), "lat": data['y'], "lng": data['x']})

# Serialize to JSON strings
nodes_json = json.dumps(nodes_data)
edges_json = json.dumps(edges_data)
grid_json = json.dumps(grid)
cell_size_json = json.dumps(CELL_SIZE)

# Compute convex hull of all graph nodes for the coverage boundary
print("Computing network coverage boundary...")
node_coords = np.array([[data['y'], data['x']] for _, data in G.nodes(data=True)])
hull = ConvexHull(node_coords)
hull_points = node_coords[hull.vertices].tolist()
# Close the polygon by repeating the first point
hull_points.append(hull_points[0])
hull_json = json.dumps(hull_points)

center_lat = (G.graph['bbox'][0] + G.graph['bbox'][2]) / 2 if 'bbox' in G.graph else 3.05
center_lng = (G.graph['bbox'][1] + G.graph['bbox'][3]) / 2 if 'bbox' in G.graph else 101.45

# ==========================================
# 3. BUILD MAP
# ==========================================
print("Building interactive map...")
m = folium.Map(
    location=[center_lat, center_lng],
    zoom_start=14,
    tiles="CartoDB dark_matter"
)

# ==========================================
# 4. LOAD & ASSEMBLE UI FROM EXTERNAL FILES
# ==========================================
base_dir = os.path.dirname(os.path.abspath(__file__))

# Read external CSS, JS, and HTML template
with open(os.path.join(base_dir, "style.css"), "r", encoding="utf-8") as f:
    style_css = f.read()

with open(os.path.join(base_dir, "script.js"), "r", encoding="utf-8") as f:
    script_js = f.read()

with open(os.path.join(base_dir, "template.html"), "r", encoding="utf-8") as f:
    template_html = f.read()

# Inject graph data into JavaScript via placeholder replacement
script_js = script_js.replace("__NODES_JSON__", nodes_json)
script_js = script_js.replace("__EDGES_JSON__", edges_json)
script_js = script_js.replace("__GRID_JSON__", grid_json)
script_js = script_js.replace("__CELL_SIZE_JSON__", cell_size_json)
script_js = script_js.replace("__HULL_JSON__", hull_json)

# Assemble final HTML: fonts + style + HTML markup + script
final_html = template_html + "\n<style>\n" + style_css + "\n</style>\n" + "\n<script>\n" + script_js + "\n</script>"

# Attach to Folium map
m.get_root().html.add_child(folium.Element(final_html))

# ==========================================
# 5. SAVE OUTPUT
# ==========================================
output_path = "klang.html"
m.save(output_path)
print(f"\nDone! Saved to {output_path}")
print(f"  Graph nodes embedded: {len(nodes_data)}")
print(f"  Graph edges embedded: {sum(len(v) for v in edges_data.values())}")
print(f"\nOpen the HTML file — pick start/end by clicking or searching, then press RUN A*")