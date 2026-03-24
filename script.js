(function () {
  // ── GRAPH DATA (injected by Python at build time) ──
  var NODES = __NODES_JSON__;
  var EDGES = __EDGES_JSON__;
  var GRID = __GRID_JSON__;
  var CELL_SIZE = __CELL_SIZE_JSON__;
  var HULL = __HULL_JSON__;

  // ── STARTER CODE TEMPLATES ──
  var TEMPLATES = {
    javascript: [
      '// BFS — Breadth-First Search',
      '// graph.nodes = {id: {lat, lng}}',
      '// graph.edges = {id: [{to, length, coords: [[lat,lng],...]}]}',
      '// Must return {exploredEdges, path}',
      '',
      'var queue = [startId];',
      'var visited = {}; visited[startId] = true;',
      'var cameFrom = {};',
      'var exploredEdges = [];',
      '',
      'while (queue.length > 0) {',
      '  var current = queue.shift();',
      '  if (current === endId) break;',
      '  var neighbors = graph.edges[current] || [];',
      '  for (var i = 0; i < neighbors.length; i++) {',
      '    var nb = neighbors[i];',
      '    exploredEdges.push(nb.coords);',
      '    if (!visited[nb.to]) {',
      '      visited[nb.to] = true;',
      '      cameFrom[nb.to] = { from: current, coords: nb.coords };',
      '      queue.push(nb.to);',
      '    }',
      '  }',
      '}',
      '',
      '// Reconstruct path',
      'var path = [];',
      'var c = endId;',
      'while (c && c !== startId) {',
      '  var info = cameFrom[c];',
      '  if (!info) return { exploredEdges: exploredEdges, path: [] };',
      '  path = info.coords.concat(path);',
      '  c = info.from;',
      '}',
      'return { exploredEdges: exploredEdges, path: path };'
    ].join('\n'),

    python: [
      '# Graph traversal algorithm \u2014 Python',
      '# graph["nodes"]: dict of {node_id: {lat: float, lng: float}}',
      '# graph["edges"]: dict of {node_id: [{to: str, length: float, coords: [[lat,lng],...]}]}',
      '# Return: {"explored_edges": [[[lat,lng],...], ...], "path": [[lat,lng],...]}',
      '',
      'import heapq',
      'import math',
      '',
      'def run_algorithm(graph, start_id, end_id):',
      '    nodes = graph["nodes"]',
      '    edges = graph["edges"]',
      '',
      '    def heuristic(a, b):',
      '        na, nb = nodes[a], nodes[b]',
      '        dlat = na["lat"] - nb["lat"]',
      '        dlng = na["lng"] - nb["lng"]',
      '        return math.sqrt(dlat**2 + dlng**2) * 111320',
      '',
      '    open_set = [(0, start_id)]',
      '    came_from = {}',
      '    g_score = {start_id: 0}',
      '    explored_edges = []',
      '',
      '    while open_set:',
      '        _, current = heapq.heappop(open_set)',
      '        if current == end_id:',
      '            path = [end_id]',
      '            while came_from.get(path[-1]):',
      '                path.append(came_from[path[-1]])',
      '            path.reverse()',
      '            path_coords = []',
      '            for i in range(len(path) - 1):',
      '                seg = next((e for e in edges.get(path[i], []) if e["to"] == path[i+1]), None)',
      '                if seg:',
      '                    path_coords.extend(seg["coords"])',
      '            return {"explored_edges": explored_edges, "path": path_coords}',
      '        for nb in edges.get(current, []):',
      '            tg = g_score.get(current, float("inf")) + nb["length"]',
      '            if tg < g_score.get(nb["to"], float("inf")):',
      '                came_from[nb["to"]] = current',
      '                g_score[nb["to"]] = tg',
      '                f = tg + heuristic(nb["to"], end_id)',
      '                heapq.heappush(open_set, (f, nb["to"]))',
      '                explored_edges.append(nb["coords"])',
      '    return None'
    ].join('\n'),

    cpp: [
      '// Graph traversal algorithm — C++',
      '// Input via stdin: JSON with nodes, edges, start_id, end_id',
      '//',
      '// OUTPUT FORMAT (compressed — coords reconstructed in browser):',
      '// {',
      '//   "explored": [["u1","v1"], ["u2","v2"], ...],',
      '//   "path": ["nodeId1", "nodeId2", ...]',
      '// }',
      '',
      '#include <iostream>',
      '#include <queue>',
      '#include <unordered_map>',
      '#include <vector>',
      '#include <cmath>',
      '#include <algorithm>',
      '#include <nlohmann/json.hpp>',
      '',
      'using json = nlohmann::json;',
      'using namespace std;',
      '',
      'int main() {',
      '    json input;',
      '    cin >> input;',
      '',
      '    auto& nodes = input["nodes"];',
      '    auto& edges = input["edges"];',
      '    string start_id = input["start_id"];',
      '    string end_id   = input["end_id"];',
      '',
      '    auto heuristic = [&](const string& a, const string& b) {',
      '        double dlat = (double)nodes[a]["lat"] - (double)nodes[b]["lat"];',
      '        double dlng = (double)nodes[a]["lng"] - (double)nodes[b]["lng"];',
      '        return sqrt(dlat*dlat + dlng*dlng) * 111320.0;',
      '    };',
      '',
      '    using psi = pair<double, string>;',
      '    priority_queue<psi, vector<psi>, greater<psi>> pq;',
      '    unordered_map<string, double> gScore;',
      '    unordered_map<string, string> cameFrom;',
      '',
      '    // Store explored as node ID pairs — much smaller than coords',
      '    vector<pair<string,string>> explored;',
      '',
      '    gScore[start_id] = 0.0;',
      '    pq.push({heuristic(start_id, end_id), start_id});',
      '',
      '    while (!pq.empty()) {',
      '        auto [f, current] = pq.top(); pq.pop();',
      '        if (current == end_id) {',
      '            // Reconstruct path as node ID list',
      '            vector<string> path;',
      '            string cur = end_id;',
      '            while (cameFrom.count(cur)) { path.push_back(cur); cur = cameFrom[cur]; }',
      '            path.push_back(start_id);',
      '            reverse(path.begin(), path.end());',
      '',
      '            // Build compact output: node ID pairs + path node IDs',
      '            json exploredJson = json::array();',
      '            for (auto& e : explored)',
      '                exploredJson.push_back({e.first, e.second});',
      '',
      '            json pathJson = json::array();',
      '            for (auto& n : path) pathJson.push_back(n);',
      '',
      '            cout << json{{"explored", exploredJson}, {"path", pathJson}}.dump() << endl;',
      '            return 0;',
      '        }',
      '        for (auto& nb : edges[current]) {',
      '            string to = nb["to"];',
      '            double tg = gScore[current] + (double)nb["length"];',
      '            if (!gScore.count(to) || tg < gScore[to]) {',
      '                cameFrom[to] = current;',
      '                gScore[to] = tg;',
      '                pq.push({tg + heuristic(to, end_id), to});',
      '                explored.push_back({current, to});',
      '            }',
      '        }',
      '    }',
      '    cout << "null" << endl;',
      '    return 0;',
      '}'
    ].join('\n')
  };

  // ── MAP STATE ──
  var map = null;
  var isDark = false;
  var pickMode = null;
  var playState = 'idle';
  var startCoord = null, endCoord = null;
  var startNodeId = null, endNodeId = null;
  var startMarker = null, endMarker = null;
  var bluePolylines = [], redPolyline = null;
  var currentIndex = 0, animTimer = null, isRunning = false, sessionId = 0;
  var edgeData = [], pathCoords = [];

  // ── IDE STATE ──
  var ideOpen = false;
  var editors = {};
  var activeLang = 'javascript';

  // ── TILE LAYERS ──
  var darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB', subdomains: 'abcd', maxZoom: 19
  });
  var lightTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CartoDB', subdomains: 'abcd', maxZoom: 19
  });

  // ── NEAREST NODE (spatial grid) ──
  function nearestNode(lat, lng) {
    var cx = Math.round(lng / CELL_SIZE);
    var cy = Math.round(lat / CELL_SIZE);
    var best = null, bestDist = Infinity;
    for (var dx = -2; dx <= 2; dx++) {
      for (var dy = -2; dy <= 2; dy++) {
        var key = (cx + dx) + ',' + (cy + dy);
        var bucket = GRID[key];
        if (!bucket) continue;
        for (var i = 0; i < bucket.length; i++) {
          var n = bucket[i];
          var d = Math.pow(n.lat - lat, 2) + Math.pow(n.lng - lng, 2);
          if (d < bestDist) { bestDist = d; best = n.id; }
        }
      }
    }
    return best;
  }

  // ══════════════════════════════════════════
  //  BUILT-IN A* (used for auto-compute)
  // ══════════════════════════════════════════
  function astar(startId, endId) {
    var endNode = NODES[endId];
    function heuristic(nid) {
      var n = NODES[nid];
      var dlat = n.lat - endNode.lat, dlng = n.lng - endNode.lng;
      return Math.sqrt(dlat * dlat + dlng * dlng) * 111320;
    }
    var openSet = [[heuristic(startId), startId]];
    var cameFrom = {};
    var gScore = {}; gScore[startId] = 0;
    var explorationEdges = [];

    while (openSet.length > 0) {
      openSet.sort(function (a, b) { return a[0] - b[0]; });
      var current = openSet.shift()[1];
      if (current === endId) {
        var path = [endId];
        while (cameFrom[current]) { current = cameFrom[current]; path.push(current); }
        path.reverse();
        return { path: path, edges: explorationEdges, cameFrom: cameFrom };
      }
      var neighbors = EDGES[current] || [];
      for (var i = 0; i < neighbors.length; i++) {
        var nb = neighbors[i];
        var tg = (gScore[current] || 0) + nb.length;
        explorationEdges.push([current, nb.to, nb.coords]);
        if (gScore[nb.to] === undefined || tg < gScore[nb.to]) {
          cameFrom[nb.to] = current;
          gScore[nb.to] = tg;
          openSet.push([tg + heuristic(nb.to), nb.to]);
        }
      }
    }
    return null;
  }

  // ── MARKERS ──
  function setMarker(type, lat, lng, label) {
    var isStart = type === 'start';
    if (isStart && startMarker) { map.removeLayer(startMarker); startMarker = null; }
    if (!isStart && endMarker) { map.removeLayer(endMarker); endMarker = null; }
    var mk = L.circleMarker([lat, lng], {
      radius: 10, color: '#fff', weight: 2.5,
      fillColor: isStart ? '#22c55e' : '#ef4444', fillOpacity: 1
    }).addTo(map).bindTooltip(label, {
      permanent: true, direction: 'right', className: 'leaflet-tooltip-custom'
    });
    if (isStart) startMarker = mk; else endMarker = mk;
    mk.bringToFront();
  }

  // ── GEOCODE (Nominatim) ──
  var geocodeTimers = {};
  function geocode(query, cb) {
    var bbox = '101.33,2.95,101.58,3.18';
    var searchQuery = query;
    if (!/klang|setia alam|shah alam|selangor/i.test(query)) searchQuery = query + ', Selangor';

    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=8'
      + '&countrycodes=my'
      + '&viewbox=' + bbox
      + '&bounded=1'
      + '&q=' + encodeURIComponent(searchQuery);
    fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AStarVisualizer/1.0' }
    }).then(function (r) { return r.json(); }).then(function (results) {
      var reachable = results.filter(function (r) {
        return nearestNode(parseFloat(r.lat), parseFloat(r.lon)) !== null;
      });
      cb(reachable);
    }).catch(function () { cb([]); });
  }

  function setupSearch(inputId, listId, type) {
    var input = document.getElementById(inputId);
    var list = document.getElementById(listId);
    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (!q || q.length < 3 || /^[\s]*$/.test(q)) { list.classList.remove('open'); return; }
      clearTimeout(geocodeTimers[type]);
      geocodeTimers[type] = setTimeout(function () {
        geocode(q, function (results) {
          list.innerHTML = '';
          if (!results.length) { list.classList.remove('open'); return; }
          results.forEach(function (r) {
            var item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = r.display_name;
            item.addEventListener('click', function () {
              var lat = parseFloat(r.lat), lng = parseFloat(r.lon);
              input.value = r.display_name.split(',').slice(0, 2).join(',');
              list.classList.remove('open');
              setPickedLocation(type, lat, lng, input.value.split(',')[0]);
            });
            list.appendChild(item);
          });
          list.classList.add('open');
        });
      }, 350);
    });
    document.addEventListener('click', function (e) {
      if (!list.contains(e.target) && e.target !== input) list.classList.remove('open');
    });
  }

  // ── COMPUTE ROUTE (built-in A*) ──
  function computeRoute() {
    if (!startNodeId || !endNodeId) return;
    reset();
    setStatus('COMPUTING A*...', 'var(--blue)');
    setTimeout(function () {
      var result = astar(startNodeId, endNodeId);
      if (!result) { setStatus('NO PATH FOUND', 'var(--red)'); return; }

      var seenEdges = {};
      edgeData = [];
      result.edges.forEach(function (e) {
        var u = e[0], v = e[1], coords = e[2];
        if (result.cameFrom[v] !== u) return;
        var key = u + '>' + v;
        if (seenEdges[key]) return;
        seenEdges[key] = true;
        edgeData.push(coords);
      });

      pathCoords = [];
      var path = result.path;
      for (var i = 0; i < path.length - 1; i++) {
        var u = path[i], v = path[i + 1];
        var edgeList = EDGES[u] || [];
        var seg = null;
        for (var j = 0; j < edgeList.length; j++) {
          if (edgeList[j].to === v) { seg = edgeList[j].coords; break; }
        }
        if (!seg) seg = [[NODES[u].lat, NODES[u].lng], [NODES[v].lat, NODES[v].lng]];
        if (pathCoords.length && seg.length) seg = seg.slice(1);
        pathCoords = pathCoords.concat(seg);
      }

      document.getElementById('astar-progress-bar').style.width = '0%';
      setPlayState('ready');
    }, 50);
  }

  function setPickedLocation(type, lat, lng, label) {
    var nodeId = nearestNode(lat, lng);
    if (!nodeId) { alert('No road node found near this location.'); return; }
    var n = NODES[nodeId];
    if (type === 'start') {
      startCoord = [n.lat, n.lng]; startNodeId = nodeId;
      setMarker('start', n.lat, n.lng, 'START');
    } else {
      endCoord = [n.lat, n.lng]; endNodeId = nodeId;
      setMarker('end', n.lat, n.lng, 'END');
    }
    map.panTo([n.lat, n.lng]);
    if (startNodeId && endNodeId) computeRoute();
  }

  function setPlayState(state) {
    playState = state;
    var btn = document.getElementById('btn-play');
    btn.classList.toggle('ready', state === 'ready');
    if (state === 'idle') setStatus('SET START & END, THEN PRESS \u25B6', 'var(--muted)');
    if (state === 'ready') setStatus('ROUTE READY \u2014 PRESS \u25B6 TO RUN', 'var(--blue)');
    if (state === 'done') setStatus('SHORTEST PATH FOUND \u2713', 'var(--green)');
  }

  // ── PICK MODE ──
  function setPickMode(type) {
    if (pickMode === type) {
      pickMode = null;
      document.getElementById('pick-' + type).classList.remove('active');
      document.getElementById(type + '-input').classList.remove('active-pick');
      document.body.classList.remove('map-pick-cursor');
      return;
    }
    if (pickMode) {
      document.getElementById('pick-' + pickMode).classList.remove('active');
      document.getElementById(pickMode + '-input').classList.remove('active-pick');
    }
    pickMode = type;
    document.getElementById('pick-' + type).classList.add('active');
    document.getElementById(type + '-input').classList.add('active-pick');
    document.getElementById(type + '-input').placeholder = 'Click anywhere on the map...';
    document.body.classList.add('map-pick-cursor');
    setStatus('CLICK MAP TO SET ' + type.toUpperCase(), 'var(--amber)');
  }

  // ── ANIMATION ──
  function clearRedPath() {
    if (redPolyline && map.hasLayer(redPolyline)) map.removeLayer(redPolyline);
    redPolyline = null;
  }

  function addBlueEdge(coords) {
    var pl = L.polyline(coords, {
      color: '#60a5fa', weight: 4, opacity: 0.8,
      smoothFactor: 0, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);
    bluePolylines.push(pl);
    if (startMarker) startMarker.bringToFront();
    if (endMarker) endMarker.bringToFront();
  }

  function drawRedPath(mySession) {
    if (mySession !== sessionId) return;
    clearRedPath();
    redPolyline = L.polyline(pathCoords, {
      color: '#ef4444', weight: 7, opacity: 1,
      smoothFactor: 1, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);
    redPolyline.bringToFront();
    if (startMarker) startMarker.bringToFront();
    if (endMarker) endMarker.bringToFront();
    document.getElementById('astar-progress-bar').style.width = '100%';
    isRunning = false;
    setPlayState('done');
  }

  function getSpeed() {
    return Math.max(1, 201 - parseInt(document.getElementById('astar-speed').value) * 2);
  }

  function tick(mySession) {
    if (!isRunning || mySession !== sessionId) return;
    if (currentIndex >= edgeData.length) { drawRedPath(mySession); return; }
    var batch = Math.max(1, Math.floor(parseInt(document.getElementById('astar-speed').value) / 8));
    for (var b = 0; b < batch && currentIndex < edgeData.length; b++) {
      addBlueEdge(edgeData[currentIndex]); currentIndex++;
    }
    var pct = (currentIndex / edgeData.length * 100).toFixed(1);
    setStatus('EXPLORING... ' + pct + '%', 'var(--blue)');
    document.getElementById('astar-progress-bar').style.width = pct + '%';
    animTimer = setTimeout(function () { tick(mySession); }, getSpeed());
  }

  function play() {
    if (playState === 'idle') {
      setStatus('SET START & END FIRST', 'var(--amber)');
      return;
    }
    if (playState === 'done') {
      reset();
      setTimeout(function () { isRunning = true; playState = 'playing'; tick(sessionId); }, 50);
      return;
    }
    if (playState === 'ready' || playState === 'paused') {
      if (isRunning) return;
      isRunning = true; playState = 'playing';
      document.getElementById('btn-play').classList.remove('ready');
      tick(sessionId);
    }
  }
  function pause() {
    if (!isRunning) return;
    isRunning = false; playState = 'paused';
    if (animTimer) clearTimeout(animTimer);
    setStatus('PAUSED \u2014 PRESS \u25B6 TO RESUME', 'var(--amber)');
  }
  function reset() {
    sessionId++; isRunning = false;
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    currentIndex = 0;
    bluePolylines.forEach(function (pl) { if (map.hasLayer(pl)) map.removeLayer(pl); });
    bluePolylines = [];
    clearRedPath();
    document.getElementById('astar-progress-bar').style.width = '0%';
    if (edgeData.length) setPlayState('ready');
    else setPlayState('idle');
  }

  function setStatus(txt, color) {
    var el = document.getElementById('astar-status');
    el.textContent = txt; el.style.color = color;
  }

  // ── THEME TOGGLE ──
  function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('dark-mode', isDark);
    document.getElementById('btn-theme').textContent = isDark ? '\uD83C\uDF19' : '\u2600\uFE0F';
    if (isDark) { lightTile.remove(); darkTile.addTo(map); }
    else { darkTile.remove(); lightTile.addTo(map); }
    // Switch CodeMirror themes
    var cmTheme = isDark ? 'monokai' : 'default';
    ['javascript', 'python', 'cpp'].forEach(function (lang) {
      if (editors[lang]) editors[lang].setOption('theme', cmTheme);
    });
  }

  // ══════════════════════════════════════════
  //  IDE PANEL
  // ══════════════════════════════════════════

  // ── TERMINAL LOGGING ──
  function termLog(msg, cls) {
    var term = document.getElementById('ide-terminal');
    var now = new Date();
    var ts = '[' + String(now.getHours()).padStart(2, '0')
      + ':' + String(now.getMinutes()).padStart(2, '0')
      + ':' + String(now.getSeconds()).padStart(2, '0') + '] ';
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = ts + msg;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
  }

  function termClear() {
    document.getElementById('ide-terminal').innerHTML = '';
  }

  // ── IDE TOGGLE ──
  function toggleIDE() {
    ideOpen = !ideOpen;
    document.getElementById('ide-panel').classList.toggle('open', ideOpen);
    document.getElementById('ide-toggle').classList.toggle('open', ideOpen);
    // Shift search panel and bottom controls left to avoid overlap
    document.getElementById('top-panel').classList.toggle('shifted', ideOpen);
    document.getElementById('astar-controls').classList.toggle('shifted', ideOpen);
    // Refresh CodeMirror when panel opens
    if (ideOpen && editors[activeLang]) {
      setTimeout(function () { editors[activeLang].refresh(); }, 50);
    }
  }

  // ── TAB SWITCHING ──
  function switchTab(lang) {
    activeLang = lang;
    var tabs = document.querySelectorAll('.ide-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-lang') === lang);
    });
    document.querySelectorAll('.ide-editor-pane').forEach(function (p) {
      p.classList.remove('active');
    });
    document.getElementById('editor-' + lang).classList.add('active');
    if (editors[lang]) {
      setTimeout(function () { editors[lang].refresh(); }, 10);
    }
  }

  // ── INIT CODEMIRROR (light theme by default) ──
  function initEditors() {
    var modeMap = {
      javascript: 'javascript',
      python: 'python',
      cpp: 'text/x-c++src'
    };
    ['javascript', 'python', 'cpp'].forEach(function (lang) {
      var container = document.getElementById('editor-' + lang);
      editors[lang] = CodeMirror(container, {
        value: TEMPLATES[lang],
        mode: modeMap[lang],
        theme: 'default',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        tabSize: 2,
        indentWithTabs: false,
        lineWrapping: false
      });
    });
  }

  // ── ALGORITHM EXECUTION BACKENDS ──
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function applyAlgorithmResult(result) {
    if (!result) { termLog('No result returned.', 'log-error'); return; }

    // ── Compact format from C++: {explored: [["u","v"],...], path: ["n1","n2",...]} ──
    if (result.explored && Array.isArray(result.explored) &&
      result.path && typeof result.path[0] === 'string') {

      // Reconstruct exploredEdges coords from EDGES lookup
      var seenEdges = {};
      edgeData = [];
      result.explored.forEach(function (pair) {
        var u = pair[0], v = pair[1];
        var key = u + '>' + v;
        if (seenEdges[key]) return;
        seenEdges[key] = true;
        var edgeList = EDGES[u] || [];
        for (var i = 0; i < edgeList.length; i++) {
          if (edgeList[i].to === v) {
            edgeData.push(edgeList[i].coords);
            break;
          }
        }
      });

      // Reconstruct path coords from node ID sequence
      pathCoords = [];
      var pathIds = result.path;
      for (var i = 0; i < pathIds.length - 1; i++) {
        var u = pathIds[i], v = pathIds[i + 1];
        var edgeList = EDGES[u] || [];
        var seg = null;
        for (var j = 0; j < edgeList.length; j++) {
          if (edgeList[j].to === v) { seg = edgeList[j].coords; break; }
        }
        if (!seg) seg = [[NODES[u].lat, NODES[u].lng], [NODES[v].lat, NODES[v].lng]];
        if (pathCoords.length && seg.length) seg = seg.slice(1);
        pathCoords = pathCoords.concat(seg);
      }

      termLog(
        'Done: ' + edgeData.length + ' explored edges, ' +
        pathCoords.length + ' path coords. (compact format)',
        'log-success'
      );

      // ── Full format from JS/Python: {exploredEdges: [...coords], path: [...coords]} ──
    } else {
      edgeData = result.exploredEdges || result.explored_edges || [];
      pathCoords = result.path || [];
      if (!edgeData.length && !pathCoords.length) {
        termLog('Result has no edges or path data.', 'log-error'); return;
      }
      termLog(
        'Done: ' + edgeData.length + ' explored edges, ' +
        pathCoords.length + ' path coords.',
        'log-success'
      );
    }

    document.getElementById('astar-progress-bar').style.width = '0%';
    setPlayState('ready');
  }

  async function ensurePyodide() {
    if (window.pyodideReady) return;
    termLog('Loading Python runtime (Pyodide)...', 'log-info');
    await loadScript('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');
    window.pyodide = await loadPyodide();
    window.pyodideReady = true;
    termLog('Python runtime ready.', 'log-success');
  }

  async function runPython(code) {
    var graphJson = JSON.stringify({ nodes: NODES, edges: EDGES });

    // IMPORTANT: exec(code) runs the user code first in a clean scope
    // so def run_algorithm(...) is defined before we call it below.
    // We do NOT concatenate with \n anymore to avoid indentation issues.
    var wrapper = [
      'import json, sys',
      '',
      '# Execute user code — defines run_algorithm',
      'exec(_user_code)',
      '',
      '# Injected runner',
      '_graph = json.loads(_graph_json)',
      '_result = run_algorithm(_graph, _start_id, _end_id)',
      '_result_json = json.dumps(_result) if _result is not None else "null"'
    ].join('\n');

    // Pass user code as a separate global string — avoids any
    // indentation or encoding issues from string concatenation
    window.pyodide.globals.set('_user_code', code);
    window.pyodide.globals.set('_graph_json', graphJson);
    window.pyodide.globals.set('_start_id', startNodeId);
    window.pyodide.globals.set('_end_id', endNodeId);

    await window.pyodide.runPythonAsync(wrapper);

    var resultJson = window.pyodide.globals.get('_result_json');

    if (!resultJson || resultJson === 'null') {
      termLog('No path found.', 'log-error');
      return;
    }

    var result = JSON.parse(resultJson);
    applyAlgorithmResult(result);
  }

  function buildSubgraph(startId, endId, maxNodes) {
    maxNodes = maxNodes || 2000;

    // Run built-in JS A* to find the rough path corridor
    var rough = astar(startId, endId);

    if (rough && rough.path.length > 1) {
      // Collect path waypoints as [lat, lng] array
      var waypoints = rough.path.map(function (id) {
        return [NODES[id].lat, NODES[id].lng];
      });

      // For each graph node, find its min distance to the path polyline
      // Then sort ascending and take the top maxNodes
      function distToSegment(px, py, ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        var lenSq = dx * dx + dy * dy;
        var t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)) : 0;
        var nearX = ax + t * dx, nearY = ay + t * dy;
        var ex = px - nearX, ey = py - nearY;
        return ex * ex + ey * ey;
      }

      function minDistToPath(lat, lng) {
        var minD = Infinity;
        for (var i = 0; i < waypoints.length - 1; i++) {
          var d = distToSegment(lat, lng,
            waypoints[i][0], waypoints[i][1],
            waypoints[i + 1][0], waypoints[i + 1][1]);
          if (d < minD) minD = d;
        }
        return minD;
      }

      // Score every node by distance to path
      var scored = Object.keys(NODES).map(function (id) {
        var n = NODES[id];
        return { id: id, dist: minDistToPath(n.lat, n.lng) };
      });

      // Sort by proximity to path, take closest maxNodes
      scored.sort(function (a, b) { return a.dist - b.dist; });
      var topNodes = scored.slice(0, maxNodes);

      var visited = new Set();
      topNodes.forEach(function (item) { visited.add(item.id); });
      visited.add(startId);
      visited.add(endId);

      var subNodes = {}, subEdges = {};
      visited.forEach(function (id) {
        if (!NODES[id]) return;
        subNodes[id] = NODES[id];
        subEdges[id] = (EDGES[id] || []).filter(function (e) {
          return visited.has(e.to);
        });
      });

      termLog(
        'Subgraph: ' + Object.keys(subNodes).length + ' nodes (corridor, capped at ' + maxNodes + ')',
        'log-info'
      );
      return { nodes: subNodes, edges: subEdges };
    }

    // Fallback: bidirectional BFS if A* found no path
    termLog('A* found no path, falling back to bidirectional BFS...', 'log-info');
    var half = Math.floor(maxNodes / 2);

    var fromStart = new Set([startId]);
    var qS = [startId];
    while (qS.length && fromStart.size < half) {
      var cur = qS.shift();
      (EDGES[cur] || []).forEach(function (e) {
        if (!fromStart.has(e.to)) { fromStart.add(e.to); qS.push(e.to); }
      });
    }

    if (!window._reverseEdges) {
      window._reverseEdges = {};
      Object.keys(EDGES).forEach(function (u) {
        (EDGES[u] || []).forEach(function (e) {
          if (!window._reverseEdges[e.to]) window._reverseEdges[e.to] = [];
          window._reverseEdges[e.to].push(u);
        });
      });
    }

    var fromEnd = new Set([endId]);
    var qE = [endId];
    while (qE.length && fromEnd.size < half) {
      var curE = qE.shift();
      (window._reverseEdges[curE] || []).forEach(function (src) {
        if (!fromEnd.has(src)) { fromEnd.add(src); qE.push(src); }
      });
    }

    var vis2 = new Set();
    fromStart.forEach(function (id) { vis2.add(id); });
    fromEnd.forEach(function (id) { vis2.add(id); });
    vis2.add(startId); vis2.add(endId);

    var subN2 = {}, subE2 = {};
    vis2.forEach(function (id) {
      if (!NODES[id]) return;
      subN2[id] = NODES[id];
      subE2[id] = (EDGES[id] || []).filter(function (e) { return vis2.has(e.to); });
    });

    termLog('Subgraph: ' + Object.keys(subN2).length + ' nodes (BFS fallback)', 'log-info');
    return { nodes: subN2, edges: subE2 };
  }

  async function runCpp(code) {
    var sub = buildSubgraph(startNodeId, endNodeId);

    var stdinPayload = JSON.stringify({
      nodes: sub.nodes,
      edges: sub.edges,
      start_id: startNodeId,
      end_id: endNodeId
    });

    // Warn if payload is getting large
    var payloadKB = Math.round(stdinPayload.length / 1024);
    termLog('Payload size: ' + payloadKB + ' KB — sending to Wandbox...', 'log-info');

    if (payloadKB > 1800) {
      termLog('WARNING: payload over 1.8MB, Wandbox may reject it.', 'log-error');
      termLog('Tip: reduce maxNodes in buildSubgraph() call inside runCpp().', 'log-error');
    }

    var response;
    try {
      response = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: 'gcc-head',
          code: code,
          options: 'warning',
          compiler_option_raw: '-std=c++17',
          stdin: stdinPayload
        })
      });
    } catch (e) {
      termLog('Network error: ' + e.message, 'log-error');
      return;
    }

    // Check content-type — if Wandbox returned HTML it rejected the request
    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('text/html') !== -1 || response.status !== 200) {
      termLog(
        'Wandbox rejected the request (HTTP ' + response.status + ').',
        'log-error'
      );
      termLog(
        'Payload was ' + payloadKB + 'KB — try reducing maxNodes below 3000.',
        'log-error'
      );
      return;
    }

    var wandResult;
    try {
      wandResult = await response.json();
    } catch (e) {
      termLog('Failed to parse Wandbox response: ' + e.message, 'log-error');
      return;
    }

    var compileErr = (wandResult.compiler_error || '').trim();
    if (compileErr.length > 0) {
      termLog('Compile error:', 'log-error');
      compileErr.split('\n').forEach(function (l) {
        if (l.trim()) termLog(l.trim(), 'log-error');
      });
      return;
    }

    var progErr = (wandResult.program_error || '').trim();
    if (progErr.length > 0) {
      termLog('Runtime error: ' + progErr, 'log-error');
      return;
    }

    var raw = (wandResult.program_output || '').trim();
    if (!raw || raw === 'null') {
      termLog('No path found — try picking closer start/end points.', 'log-error');
      return;
    }

    var jsonLine = raw.split('\n').find(function (l) {
      return l.trim().startsWith('{');
    });

    if (!jsonLine) {
      termLog('Output had no JSON. Got: ' + raw.slice(0, 200), 'log-error');
      return;
    }

    var result;
    try {
      result = JSON.parse(jsonLine.trim());
    } catch (e) {
      termLog('JSON parse error: ' + e.message, 'log-error');
      return;
    }

    applyAlgorithmResult(result);
  }

  async function runUserCode() {
    if (!startNodeId || !endNodeId) {
      termLog('Set start and end points on the map first.', 'log-error');
      return;
    }

    var runBtn = document.getElementById('ide-run');
    runBtn.classList.add('running');

    reset();
    edgeData = []; pathCoords = [];
    termLog('---', 'plain');

    try {
      var code = editors[activeLang].getValue();
      if (activeLang === 'javascript') {
        termLog('Running JavaScript...', 'log-info');
        var fn = new Function('graph', 'startId', 'endId', code);
        var result = fn({ nodes: NODES, edges: EDGES }, startNodeId, endNodeId);
        applyAlgorithmResult(result);
      } else if (activeLang === 'python') {
        termLog('Running Python...', 'log-info');
        await ensurePyodide();
        await runPython(code);
      } else if (activeLang === 'cpp') {
        termLog('Compiling C++ via Wandbox...', 'log-info');
        await runCpp(code);
      }
    } catch (e) {
      termLog('Error: ' + e.message, 'log-error');
    }
    runBtn.classList.remove('running');
  }

  // ══════════════════════════════════════════
  //  BOOTSTRAP
  // ══════════════════════════════════════════
  function waitForMap(cb) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      for (var key in window) {
        if (window[key] && window[key]._leaflet_id && key.startsWith('map_')) {
          map = window[key];
          clearInterval(iv); cb(); return;
        }
      }
      if (attempts > 150) clearInterval(iv);
    }, 100);
  }

  // ── INIT ──
  waitForMap(function () {
    // Replace default tile with managed layers — start in light mode
    map.eachLayer(function (l) { if (l._url) map.removeLayer(l); });
    lightTile.addTo(map);
    document.getElementById('btn-theme').textContent = '\u2600\uFE0F';
    setPlayState('idle');

    // Draw network coverage boundary (non-interactive, won't block clicks)
    L.polygon(HULL, {
      color: '#2563eb',
      weight: 1.5,
      opacity: 0.4,
      fillOpacity: 0.04,
      dashArray: '8, 6',
      interactive: false,
      bubblingMouseEvents: false
    }).addTo(map).bindTooltip('AVAILABLE ROUTE AREA', {
      permanent: false, direction: 'center', className: 'leaflet-tooltip-custom'
    });

    // Map click handler for pick mode
    map.on('click', function (e) {
      if (!pickMode) return;
      var lat = e.latlng.lat, lng = e.latlng.lng;
      var type = pickMode;
      var inputEl = document.getElementById(type + '-input');

      // Exit pick mode immediately so subsequent clicks go through normally
      document.getElementById('pick-' + type).classList.remove('active');
      inputEl.classList.remove('active-pick');
      document.body.classList.remove('map-pick-cursor');
      pickMode = null;

      // Reverse geocode for a nice label
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng, {
        headers: { 'User-Agent': 'AStarVisualizer/1.0' }
      }).then(function (r) { return r.json(); }).then(function (r) {
        var parts = (r.display_name || '').split(',');
        var label = parts.slice(0, 3).join(',').trim() || (lat.toFixed(5) + ', ' + lng.toFixed(5));
        inputEl.value = label;
        inputEl.placeholder = type === 'start'
          ? 'Start \u2014 search address or click map...'
          : 'End \u2014 search address or click map...';
        setPickedLocation(type, lat, lng, parts[0].trim() || label);
      }).catch(function () {
        inputEl.value = lat.toFixed(5) + ', ' + lng.toFixed(5);
        inputEl.placeholder = type === 'start'
          ? 'Start \u2014 search address or click map...'
          : 'End \u2014 search address or click map...';
        setPickedLocation(type, lat, lng, type.toUpperCase());
      });
    });

    // Search boxes
    setupSearch('start-input', 'start-list', 'start');
    setupSearch('end-input', 'end-list', 'end');

    // Pick buttons
    document.getElementById('pick-start').addEventListener('click', function () { setPickMode('start'); });
    document.getElementById('pick-end').addEventListener('click', function () { setPickMode('end'); });

    // Playback buttons
    document.getElementById('btn-play').addEventListener('click', play);
    document.getElementById('btn-pause').addEventListener('click', pause);
    document.getElementById('btn-reset').addEventListener('click', reset);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);

    // ── IDE INITIALIZATION ──
    initEditors();

    // IDE toggle
    document.getElementById('ide-toggle').addEventListener('click', toggleIDE);
    document.getElementById('ide-close').addEventListener('click', toggleIDE);

    // Tab switching
    document.querySelectorAll('.ide-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(this.getAttribute('data-lang'));
      });
    });

    // Run button
    document.getElementById('ide-run').addEventListener('click', runUserCode);

    // Terminal clear
    document.getElementById('ide-terminal-clear').addEventListener('click', termClear);

    // Welcome message
    termLog('Algorithm Editor ready. Write code, then click RUN.', 'log-info');
  });
})();
