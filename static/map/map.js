// static/map/map.js

window.s = window.state;

function initMap() {
    s.map = L.map('map').setView([55.751, 37.617], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(s.map);

    window.map = s.map;

    // восстановление позиции карты
    function restoreMapPosition() {
        const savedCenter = localStorage.getItem('map_center');
        const savedZoom = localStorage.getItem('map_zoom');
        if (savedCenter && savedZoom) {
            const center = JSON.parse(savedCenter);
            s.map.setView([center.lat, center.lng], parseInt(savedZoom));
        }
    }

    // сохранение позиции карты
    function saveMapPosition() {
        const center = s.map.getCenter();
        const zoom = s.map.getZoom();
        localStorage.setItem('map_center', JSON.stringify({lat: center.lat, lng: center.lng}));
        localStorage.setItem('map_zoom', zoom);
    }

    restoreMapPosition();
    s.map.on('moveend', saveMapPosition);
}

function drawStops() {
    if (s.markersLayer) {
        s.map.removeLayer(s.markersLayer);
    }

    s.markersLayer = L.layerGroup().addTo(s.map);

    s.stops.forEach(stop => {
        L.marker([stop.lat, stop.lon])
            .bindPopup(stop.name)
            .addTo(s.markersLayer);
    });
}

window.initMap = initMap;
window.drawStops = drawStops;