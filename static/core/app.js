// static/core/app.js

window.s = window.state;

document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await loadStops();
    await loadAllEdges();
    drawStops();
    drawAllEdges();
    populateStopSelects();
    drawAllPoints();
    loadSavedPoints();
    if (typeof loadHistory === 'function') {
        loadHistory();
    }
});