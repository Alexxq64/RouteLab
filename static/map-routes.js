// static/map-routes.js

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
        L.polyline(coords, { color, weight, opacity: 0.7, dashArray }).addTo(routesLayer);
    }
}