// static/script.js

let map;
let stops = [];
let currentRoutes = [];
let currentSelectedRoute = null;
let markersLayer = null;
let routesLayer = null;
let currentRoutingControls = [];

function initMap() {
    map = L.map('map').setView([55.751, 37.617], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

async function loadStops() {
    const response = await fetch('/api/stops');
    stops = await response.json();

    const fromSelect = document.getElementById('fromSelect');
    const toSelect = document.getElementById('toSelect');

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

function addMarkers() {
    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    markersLayer = L.layerGroup().addTo(map);

    stops.forEach(stop => {
        L.circleMarker([stop.lat, stop.lon], {
            radius: 6,
            fillColor: '#3498db',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`<b>${stop.name}</b><br>ID: ${stop.id}`)
          .addTo(markersLayer);
    });
}

function getCacheKey(waypoints) {
    const key = waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join(';');
    return `osrm_${key}`;
}

async function fetchOSRM(waypoints) {
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);
    const data = await response.json();
    if (data.code !== 'Ok') throw new Error('OSRM route not found');
    const coordsArray = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    return coordsArray;
}

async function fetchOpenRouteService(waypoints) {
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join('|');
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248b2b6c2fa8b3e4b3e9b3e4b3e9b3e4b3e9&start=${coords.split('|')[0]}&end=${coords.split('|')[1]}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ORS error: ${response.status}`);
    const data = await response.json();
    const coordsArray = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    return coordsArray;
}

function getStraightLine(waypoints) {
    return waypoints.map(w => [w.lat, w.lng]);
}

async function getRouteGeometry(waypoints) {
    const cacheKey = getCacheKey(waypoints);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    try {
        const coords = await fetchOSRM(waypoints);
        localStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
    } catch (e) {
        console.warn('OSRM failed, trying OpenRouteService', e);
        try {
            const coords = await fetchOpenRouteService(waypoints);
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        } catch (e2) {
            console.warn('OpenRouteService failed, using straight line', e2);
            const coords = getStraightLine(waypoints);
            localStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        }
    }
}

async function drawRoutesWithOSRM(routes, selectedIndex) {
    if (routesLayer) {
        map.removeLayer(routesLayer);
    }
    routesLayer = L.layerGroup().addTo(map);

    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const waypoints = route.path.map(nodeId => {
            const stop = stops.find(s => s.id === nodeId);
            return L.latLng(stop.lat, stop.lon);
        });
        const color = i === selectedIndex ? '#3498db' : '#95a5a6';
        const weight = i === selectedIndex ? 5 : 2;
        const dashArray = i === selectedIndex ? null : '5, 5';

        const coords = await getRouteGeometry(waypoints);
        L.polyline(coords, {
            color: color,
            weight: weight,
            opacity: 0.7,
            dashArray: dashArray
        }).addTo(routesLayer);
    }

    if (routes.length > 0 && routes[selectedIndex]) {
        const waypoints = routes[selectedIndex].path.map(nodeId => {
            const stop = stops.find(s => s.id === nodeId);
            return [stop.lat, stop.lon];
        });
        if (waypoints.length > 0) {
            map.fitBounds(L.latLngBounds(waypoints));
        }
    }
}

function displayRoutes(routes) {
    const container = document.getElementById('routesList');
    container.innerHTML = '';

    routes.forEach((route, idx) => {
        const card = document.createElement('div');
        card.className = 'route-card';
        if (idx === 0) card.classList.add('selected');
        card.onclick = () => {
            document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentSelectedRoute = idx;
            drawRoutesWithOSRM(routes, idx);
        };

        const pathStr = route.path.join(' → ');
        const timeRange = `${route.time_min}–${route.time_max}`;

        card.innerHTML = `
            <div class="route-path">${pathStr}</div>
            <div class="route-stats">
                <div class="stat"><div class="value">${route.time_avg} мин</div><div class="label">среднее</div></div>
                <div class="stat"><div class="value">${timeRange} мин</div><div class="label">диапазон</div></div>
                <div class="stat"><div class="value">${route.cost} ₽</div><div class="label">стоимость</div></div>
                <div class="stat"><div class="value">${route.comfort}</div><div class="label">комфорт</div></div>
            </div>
        `;

        container.appendChild(card);
    });

    if (routes.length > 0) {
        drawRoutesWithOSRM(routes, 0);
        currentSelectedRoute = 0;
    }
}

function getWeights() {
    const time = parseFloat(document.getElementById('weightTime').value);
    const cost = parseFloat(document.getElementById('weightCost').value);
    const comfort = parseFloat(document.getElementById('weightComfort').value);
    const sum = time + cost + comfort;
    return {
        time: time / sum,
        cost: cost / sum,
        comfort: comfort / sum
    };
}

async function searchRoutes() {
    const from = parseInt(document.getElementById('fromSelect').value);
    const to = parseInt(document.getElementById('toSelect').value);
    let weights = getWeights();

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
}

function updateSliderValues() {
    document.getElementById('timeVal').textContent = parseFloat(document.getElementById('weightTime').value).toFixed(2);
    document.getElementById('costVal').textContent = parseFloat(document.getElementById('weightCost').value).toFixed(2);
    document.getElementById('comfortVal').textContent = parseFloat(document.getElementById('weightComfort').value).toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadStops().then(() => {
        setTimeout(() => searchRoutes(), 500);
    });
    document.getElementById('searchBtn').addEventListener('click', searchRoutes);
    document.getElementById('weightTime').addEventListener('input', updateSliderValues);
    document.getElementById('weightCost').addEventListener('input', updateSliderValues);
    document.getElementById('weightComfort').addEventListener('input', updateSliderValues);
    updateSliderValues();
});