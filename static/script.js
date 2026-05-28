// static/script.js

document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await loadStops();
    await loadAllEdges();
    await drawAllEdges();
    loadHistoryFromStorage();
    
    const savedFrom = localStorage.getItem('last_route_from');
    const savedTo = localStorage.getItem('last_route_to');
    const savedRoutes = localStorage.getItem('last_route_routes');
    
    if (savedFrom && savedTo && savedRoutes) {
        document.getElementById('fromSelect').value = savedFrom;
        document.getElementById('toSelect').value = savedTo;
        currentRoutes = JSON.parse(savedRoutes);
        displayRoutes(currentRoutes);
    } else {
        setTimeout(() => searchRoutes(), 500);
    }
    
    document.getElementById('searchBtn').addEventListener('click', searchRoutes);
    document.getElementById('weightTime').addEventListener('input', updateSliderValues);
    document.getElementById('weightCost').addEventListener('input', updateSliderValues);
    document.getElementById('weightComfort').addEventListener('input', updateSliderValues);
    updateSliderValues();
    initGraphEditor();
});

window.restoreRouteFromHistory = restoreRouteFromHistory;