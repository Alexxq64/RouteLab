// static/map-core.js

function saveMapPosition() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem('map_center', JSON.stringify({ lat: center.lat, lng: center.lng }));
    localStorage.setItem('map_zoom', zoom);
}

function restoreMapPosition() {
    const savedCenter = localStorage.getItem('map_center');
    const savedZoom = localStorage.getItem('map_zoom');
    if (savedCenter && savedZoom) {
        const center = JSON.parse(savedCenter);
        map.setView([center.lat, center.lng], parseInt(savedZoom));
    }
}

let map;
let stops = [];
let currentRoutes = [];
let currentSelectedRoute = null;
let markersLayer = null;
let routesLayer = null;
let allEdgesLayer = null;
let allEdges = [];

function initMap() {
    map = L.map('map').setView([55.751, 37.617], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    restoreMapPosition();
    map.on('moveend', saveMapPosition);
    
    initStopAddHandlers();
    initPointToPointHandlers();
    initAddPointHandler();
    loadSavedPoints();
    loadHistoryFromStorage();
}