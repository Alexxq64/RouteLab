// static/core/api.js

window.s = window.state;

async function loadStops() {
    const response = await fetch('/api/stops');
    s.stops = await response.json();
}

async function loadAllEdges() {
    const response = await fetch('/api/edges');
    s.edges = await response.json();
}

window.loadStops = loadStops;
window.loadAllEdges = loadAllEdges;