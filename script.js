(function () {
  // ── GRAPH DATA (injected by Python at build time) ──
  var NODES = __NODES_JSON__;
  var EDGES = __EDGES_JSON__;
  var GRID = __GRID_JSON__;
  var CELL_SIZE = __CELL_SIZE_JSON__;
  var HULL = __HULL_JSON__;

  // ── STATE ──
  var map = null;
  var isDark = false;
  var pickMode = null;   // 'start' | 'end' | null
  // playState: 'idle' (no route) | 'ready' (route computed, not started) | 'playing' | 'paused' | 'done'
  var playState = 'idle';
  var startCoord = null, endCoord = null;
  var startNodeId = null, endNodeId = null;
  var startMarker = null, endMarker = null;
  var bluePolylines = [], redPolyline = null;
  var currentIndex = 0, animTimer = null, isRunning = false, sessionId = 0;
  var edgeData = [], pathCoords = [];

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

  // ── CLIENT-SIDE A* ──
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
    var m = L.circleMarker([lat, lng], {
      radius: 10, color: '#fff', weight: 2.5,
      fillColor: isStart ? '#22c55e' : '#ef4444', fillOpacity: 1
    }).addTo(map).bindTooltip(label, {
      permanent: true, direction: 'right', className: 'leaflet-tooltip-custom'
    });
    if (isStart) startMarker = m; else endMarker = m;
    m.bringToFront();
  }

  // ── GEOCODE (Nominatim) ──
  var geocodeTimers = {};
  function geocode(query, cb) {
    // Bounding box covering the Klang road network
    var bbox = '101.35,2.95,101.55,3.12';  // minLng,minLat,maxLng,maxLat

    // Search for places, POIs, and addresses within Klang
    // Append "Klang" to help Nominatim find local landmarks by name
    var searchQuery = query;
    if (!/klang/i.test(query)) searchQuery = query + ', Klang';

    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=8'
      + '&countrycodes=my'
      + '&viewbox=' + bbox
      + '&bounded=1'
      + '&q=' + encodeURIComponent(searchQuery);
    fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AStarVisualizer/1.0' }
    }).then(function (r) { return r.json(); }).then(function (results) {
      // Filter out results that have no nearby road node (unreachable on graph)
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
      // Ignore empty, whitespace-only, or too-short queries
      if (!q || q.length < 3 || /^\s*$/.test(q)) { list.classList.remove('open'); return; }
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

  // computeRoute: outer scope so setPickedLocation can call it
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
    // If both points set, compute route immediately and wait for play
    if (startNodeId && endNodeId) computeRoute();
  }

  function setPlayState(state) {
    playState = state;
    var btn = document.getElementById('btn-play');
    btn.classList.toggle('ready', state === 'ready');
    if (state === 'idle') setStatus('SET START & END, THEN PRESS ▶', 'var(--muted)');
    if (state === 'ready') setStatus('ROUTE READY — PRESS ▶ TO RUN', 'var(--blue)');
    if (state === 'done') setStatus('SHORTEST PATH FOUND ✓', 'var(--green)');
  }

  // ── PICK MODE ──
  function setPickMode(type) {
    if (pickMode === type) {
      pickMode = null;
      document.getElementById('pick-' + type).classList.remove('active');
      document.getElementById(type + '-input').classList.remove('active-pick');
      map.getContainer().parentElement.classList.remove('map-pick-cursor');
      return;
    }
    // Deactivate previous
    if (pickMode) {
      document.getElementById('pick-' + pickMode).classList.remove('active');
      document.getElementById(pickMode + '-input').classList.remove('active-pick');
    }
    pickMode = type;
    document.getElementById('pick-' + type).classList.add('active');
    document.getElementById(type + '-input').classList.add('active-pick');
    document.getElementById(type + '-input').placeholder = 'Click anywhere on the map...';
    map.getContainer().parentElement.classList.add('map-pick-cursor');
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
    // Keep markers always on top
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
    // Keep start/end markers always above everything
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
      // Both points not set yet
      setStatus('SET START & END FIRST', 'var(--amber)');
      return;
    }
    if (playState === 'done') {
      // Replay: reset then play
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
    setStatus('PAUSED — PRESS ▶ TO RESUME', 'var(--amber)');
  }
  function reset() {
    sessionId++; isRunning = false;
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    currentIndex = 0;
    bluePolylines.forEach(function (pl) { if (map.hasLayer(pl)) map.removeLayer(pl); });
    bluePolylines = [];
    clearRedPath();
    document.getElementById('astar-progress-bar').style.width = '0%';
    // Only go back to 'ready' if we have a computed route, else 'idle'
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
    document.getElementById('btn-theme').textContent = isDark ? '🌙' : '☀️';
    if (isDark) { lightTile.remove(); darkTile.addTo(map); }
    else { darkTile.remove(); lightTile.addTo(map); }
  }

  // ── WAIT FOR MAP ──
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
    document.getElementById('btn-theme').textContent = '☀️';
    setPlayState('idle');

    // Draw network coverage boundary on the map
    L.polygon(HULL, {
      color: isDark ? '#60a5fa' : '#2563eb',
      weight: 1.5,
      opacity: 0.4,
      fillOpacity: 0.04,
      dashArray: '8, 6',
      interactive: false
    }).addTo(map).bindTooltip('AVAILABLE ROUTE AREA', {
      permanent: false, direction: 'center', className: 'leaflet-tooltip-custom'
    });

    // Map click handler
    map.on('click', function (e) {
      if (!pickMode) return;
      var lat = e.latlng.lat, lng = e.latlng.lng;
      var type = pickMode;
      var inputEl = document.getElementById(type + '-input');
      // Reverse geocode for label
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng, {
        headers: { 'User-Agent': 'AStarVisualizer/1.0' }
      }).then(function (r) { return r.json(); }).then(function (r) {
        var parts = (r.display_name || '').split(',');
        var label = parts.slice(0, 3).join(',').trim() || (lat.toFixed(5) + ', ' + lng.toFixed(5));
        inputEl.value = label;
        setPickedLocation(type, lat, lng, parts[0].trim() || label);
      }).catch(function () {
        inputEl.value = lat.toFixed(5) + ', ' + lng.toFixed(5);
        setPickedLocation(type, lat, lng, type.toUpperCase());
      });
      // Reset pick mode
      document.getElementById('pick-' + type).classList.remove('active');
      inputEl.classList.remove('active-pick');
      inputEl.placeholder = type === 'start'
        ? 'Start — search address or click map...'
        : 'End — search address or click map...';
      map.getContainer().parentElement.classList.remove('map-pick-cursor');
      pickMode = null;
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
  });
})();
