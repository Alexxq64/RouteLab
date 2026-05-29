// static/map/routes.js
window.s = window.state;

let currentRoutesLayer = null;

async function getOSRMGeometry(waypoints) {
    if (waypoints.length < 2) return [];
    
    const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        }
    } catch (e) {
        console.error('OSRM error:', e);
    }
    return [];
}

async function drawRoutesWithOSRM(routes, selectedIndex = 0) {
    if (currentRoutesLayer) {
        s.map.removeLayer(currentRoutesLayer);
    }
    
    currentRoutesLayer = L.layerGroup().addTo(s.map);
    
    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const pathCoords = [];
        
        for (let j = 0; j < route.path.length - 1; j++) {
            const fromStop = s.stops.find(s => s.id === route.path[j]);
            const toStop = s.stops.find(s => s.id === route.path[j + 1]);
            
            if (fromStop && toStop) {
                const geometry = await getOSRMGeometry([fromStop, toStop]);
                pathCoords.push(...geometry);
            }
        }
        
        const color = (i === selectedIndex) ? '#00cc00' : '#88cc88';
        const weight = (i === selectedIndex) ? 5 : 3;
        const opacity = (i === selectedIndex) ? 0.9 : 0.5;
        const dashArray = (i === selectedIndex) ? null : '5, 5';
        
        const polyline = L.polyline(pathCoords, {
            color: color,
            weight: weight,
            opacity: opacity,
            dashArray: dashArray
        }).addTo(currentRoutesLayer);
    }
}

window.drawRoutesWithOSRM = drawRoutesWithOSRM;