// static/script.js

let map;
let stops = [];
let currentRoutes = [];
let currentSelectedRoute = null;
let markersLayer = null;
let routesLayer = null;

function initMap() {
    map = L.map('map').setView([55.755, 37.617], 13);
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

function drawRoutes(routes, selectedIndex = 0) {
    if (routesLayer) {
        map.removeLayer(routesLayer);
    }
    routesLayer = L.layerGroup().addTo(map);

    routes.forEach((route, idx) => {
        const latlngs = route.path.map(nodeId => {
            const stop = stops.find(s => s.id === nodeId);
            return [stop.lat, stop.lon];
        });

        const color = idx === selectedIndex ? '#3498db' : '#95a5a6';
        const weight = idx === selectedIndex ? 5 : 2;

        L.polyline(latlngs, {
            color: color,
            weight: weight,
            opacity: 0.7,
            dashArray: idx === selectedIndex ? null : '5, 5'
        }).addTo(routesLayer);
    });

    if (routes.length > 0) {
        const allPoints = routes.flatMap(route =>
            route.path.map(nodeId => {
                const stop = stops.find(s => s.id === nodeId);
                return [stop.lat, stop.lon];
            })
        );
        if (allPoints.length > 0) {
            map.fitBounds(L.latLngBounds(allPoints));
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
            drawRoutes(routes, idx);
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

        // TODO: кнопка лайка (будет добавлена позже с адаптацией)
        // const likeBtn = document.createElement('button');
        // likeBtn.className = 'like-btn';
        // likeBtn.textContent = '❤️ Мне нравится';
        // likeBtn.onclick = (e) => {
        //     e.stopPropagation();
        //     likeRoute(idx);
        // };
        // card.appendChild(likeBtn);

        container.appendChild(card);
    });

    if (routes.length > 0) {
        drawRoutes(routes, 0);
        currentSelectedRoute = 0;
    }
}

// TODO: функция лайка (будет добавлена позже с адаптацией)
/*
function likeRoute(idx) {
    const route = currentRoutes[idx];
    let routeType = 'balanced';
    const avgTime = currentRoutes.map(r => r.time_avg);
    const avgCost = currentRoutes.map(r => r.cost);
    const avgComfort = currentRoutes.map(r => r.comfort);
    if (route.time_avg === Math.min(...avgTime)) routeType = 'fast';
    else if (route.cost === Math.min(...avgCost)) routeType = 'cheap';
    else if (route.comfort === Math.max(...avgComfort)) routeType = 'comfort';
    localStorage.setItem('last_like', routeType);
    alert(`Сохранено предпочтение: ${routeType} маршрут`);
}
*/

// TODO: функция сброса весов (будет добавлена позже)
/*
function resetWeights() {
    document.getElementById('weightTime').value = '0.5';
    document.getElementById('weightCost').value = '0.3';
    document.getElementById('weightComfort').value = '0.2';
    updateSliderValues();
}
*/

// TODO: функция экспорта маршрута (будет добавлена позже)
/*
function exportRoute(route) {
    const text = `Маршрут: ${route.path.join(' → ')}\nВремя: ${route.time_avg} мин (${route.time_min}–${route.time_max})\nСтоимость: ${route.cost} руб\nКомфорт: ${route.comfort}`;
    navigator.clipboard.writeText(text);
    alert('Маршрут скопирован в буфер обмена');
}
*/

// TODO: функция отрисовки графика Парето-фронта (будет добавлена позже)
/*
function drawParetoChart(routes) {
    // подготовка данных для графика
}
*/

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

    // TODO: адаптация на основе истории (будет добавлена позже)
    // const lastLike = localStorage.getItem('last_like');
    // if (lastLike === 'fast') weights.time += 0.2;
    // else if (lastLike === 'cheap') weights.cost += 0.2;
    // else if (lastLike === 'comfort') weights.comfort += 0.2;
    // const sum = weights.time + weights.cost + weights.comfort;
    // weights.time /= sum;
    // weights.cost /= sum;
    // weights.comfort /= sum;

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

    // TODO: отрисовать график Парето-фронта (будет добавлен позже)
    // if (currentRoutes.length > 0) drawParetoChart(currentRoutes);
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

    // TODO: кнопка сброса весов (будет добавлена позже)
    // document.getElementById('resetWeightsBtn').addEventListener('click', resetWeights);
});