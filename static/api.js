// static/api.js

let routeHistory = [];

async function loadStops() {
    const response = await fetch('/api/stops');
    stops = await response.json();
    const fromSelect = document.getElementById('fromSelect');
    const toSelect = document.getElementById('toSelect');
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    stops.forEach(stop => {
        const option1 = document.createElement('option');
        option1.value = stop.id;
        option1.textContent = `${stop.name} (${stop.id})`;
        fromSelect.appendChild(option1);
        const option2 = document.createElement('option');
        option2.value = stop.id;
        option2.textContent = `${stop.name} (${stop.id})`;
        toSelect.appendChild(option2);
    });
    fromSelect.value = '0';
    toSelect.value = '19';
    addMarkers();
}

async function loadAllEdges() {
    const response = await fetch('/api/edges');
    allEdges = await response.json();
    return allEdges;
}

function saveRouteToHistory(from, to, routes, weights) {
    if (!routes || routes.length === 0) return;
    const bestRoute = routes[0];
    const fromStop = stops.find(s => s.id === from);
    const toStop = stops.find(s => s.id === to);
    
    const fromPoint = savedPoints.find(p => p.name === fromStop?.name);
    const toPoint = savedPoints.find(p => p.name === toStop?.name);
    
    const historyItem = {
        id: Date.now(),
        from: from,
        to: to,
        fromPointId: fromPoint?.id || null,
        toPointId: toPoint?.id || null,
        fromName: fromStop?.name || from,
        toName: toStop?.name || to,
        time: bestRoute.time_avg,
        cost: bestRoute.cost,
        comfort: bestRoute.comfort,
        timestamp: new Date().toLocaleTimeString(),
        routes: routes,
        weights: weights
    };
    routeHistory = [historyItem, ...routeHistory.filter(item => item.id !== historyItem.id)];
    if (routeHistory.length > 10) routeHistory = routeHistory.slice(0, 10);
    localStorage.setItem('route_history', JSON.stringify(routeHistory));
    displayRouteHistory();
}

function loadHistoryFromStorage() {
    const saved = localStorage.getItem('route_history');
    if (saved) {
        routeHistory = JSON.parse(saved);
        displayRouteHistory();
    }
}

function displayRouteHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    if (routeHistory.length === 0) {
        container.innerHTML = '<div style="color: #888;">Пусто</div>';
        return;
    }
    container.innerHTML = routeHistory.map(item => `
        <div style="margin-bottom: 8px; padding: 6px; background: white; border-radius: 4px; cursor: pointer;" onclick="restoreRouteFromHistory(${item.id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: bold;">${item.fromName} → ${item.toName}</div>
                <button class="delete-history-btn" data-id="${item.id}" style="background:#e74c3c; color:white; border:none; border-radius:3px; cursor:pointer; padding:2px 6px;">🗑</button>
            </div>
            <div style="font-size: 10px; color: #666;">${item.time} мин | ${item.cost} ₽ | комфорт ${item.comfort}</div>
            <div style="font-size: 9px; color: #999;">${item.timestamp}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.delete-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            routeHistory = routeHistory.filter(item => item.id !== id);
            localStorage.setItem('route_history', JSON.stringify(routeHistory));
            displayRouteHistory();
        });
    });
}

async function restoreRouteFromHistory(id) {
    const item = routeHistory.find(i => i.id === id);
    if (!item) return;
    document.getElementById('fromSelect').value = item.from;
    document.getElementById('toSelect').value = item.to;
    const weights = item.weights || { time: 0.5, cost: 0.3, comfort: 0.2 };
    document.getElementById('weightTime').value = weights.time;
    document.getElementById('weightCost').value = weights.cost;
    document.getElementById('weightComfort').value = weights.comfort;
    updateSliderValues();
    currentRoutes = item.routes;
    displayRoutes(currentRoutes);
    
    if (item.fromPointId) {
        setStartFromPointById(item.fromPointId);
    }
    if (item.toPointId) {
        setEndFromPointById(item.toPointId);
    }
    displaySavedPoints();
}

async function searchRoutes() {
    const from = parseInt(document.getElementById('fromSelect').value);
    const to = parseInt(document.getElementById('toSelect').value);
    
    if (from === to) {
        alert('Начальная и конечная остановки не могут совпадать');
        return;
    }
    
    const weights = getWeights();
    document.getElementById('results').style.opacity = '0.5';
    const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, weights })
    });
    const data = await response.json();
    currentRoutes = data.routes;
    displayRoutes(currentRoutes);
    document.getElementById('results').style.opacity = '1';
    
    localStorage.setItem('last_route_from', from);
    localStorage.setItem('last_route_to', to);
    localStorage.setItem('last_route_routes', JSON.stringify(data.routes));
    localStorage.setItem('last_route_weights', JSON.stringify(weights));
    
    saveRouteToHistory(from, to, data.routes, weights);
}

function getCacheKey(waypoints) {
    const key = waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join(';');
    return `osrm_${key}`;
}

async function fetchOSRM(waypoints) {
    if (waypoints.length < 2) {
        return [[waypoints[0].lat, waypoints[0].lng]];
    }
    const rounded = waypoints.map(w => ({
        lat: Math.round(w.lat * 1e6) / 1e6,
        lng: Math.round(w.lng * 1e6) / 1e6
    }));
    const coords = rounded.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);
    const data = await response.json();
    if (data.code !== 'Ok') throw new Error('OSRM route not found');
    return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

async function fetchOpenRouteService(waypoints) {
    const coords = waypoints.map(w => `${w.lng},${w.lat}`);
    const start = coords[0];
    const end = coords[coords.length - 1];
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248b2b6c2fa8b3e4b3e9b3e4b3e9b3e4b3e9&start=${start}&end=${end}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ORS error: ${response.status}`);
    const data = await response.json();
    return data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

function getStraightLine(waypoints) {
    return waypoints.map(w => [w.lat, w.lng]);
}

async function getRouteGeometry(waypoints) {
    if (waypoints.length < 2) {
        return [[waypoints[0].lat, waypoints[0].lng]];
    }
    const cacheKey = getCacheKey(waypoints);
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    try {
        const coords = await fetchOSRM(waypoints);
        localStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
    } catch (e) {
        console.warn('OSRM failed, trying ORS', e);
        try {
            const coords = await fetchOpenRouteService(waypoints);
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        } catch (e2) {
            console.warn('ORS failed, using straight line', e2);
            const coords = getStraightLine(waypoints);
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        }
    }
}

function findNearestStop(lat, lon) {
    let minDist = Infinity;
    let nearest = null;
    stops.forEach(stop => {
        const dist = Math.hypot(stop.lat - lat, stop.lon - lon);
        if (dist < minDist) {
            minDist = dist;
            nearest = stop;
        }
    });
    return nearest;
}