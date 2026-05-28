// static/map-edges.js

async function drawAllEdges() {
    if (allEdgesLayer) {
        map.removeLayer(allEdgesLayer);
    }
    allEdgesLayer = L.layerGroup().addTo(map);
    
    for (const edge of allEdges) {
        const fromStop = stops.find(s => s.id === edge.from);
        const toStop = stops.find(s => s.id === edge.to);
        if (fromStop && toStop) {
            const waypoints = [L.latLng(fromStop.lat, fromStop.lon), L.latLng(toStop.lat, toStop.lon)];
            try {
                const coords = await getRouteGeometry(waypoints);
                const polyline = L.polyline(coords, {
                    color: '#aaa',
                    weight: 2,
                    opacity: 0.5,
                    dashArray: '5, 5'
                });
                polyline.on('contextmenu', (e) => {
                    L.DomEvent.stopPropagation(e);
                    const fromStopName = stops.find(s => s.id === edge.from)?.name;
                    const toStopName = stops.find(s => s.id === edge.to)?.name;
                    if (confirm(`Удалить маршрут от "${fromStopName}" до "${toStopName}"?`)) {
                        deleteEdge(edge.from, edge.to);
                    }
                });
                polyline.on('dblclick', async () => {
                    const fromStopName = stops.find(s => s.id === edge.from)?.name;
                    const toStopName = stops.find(s => s.id === edge.to)?.name;
                    const newTime = parseFloat(prompt(`Введите новое время (мин) от ${fromStopName} до ${toStopName}:`, edge.time));
                    const newCost = parseInt(prompt(`Введите новую стоимость (руб):`, edge.cost));
                    const newComfort = parseInt(prompt(`Введите новый комфорт (1-10):`, edge.comfort));
                    if (!isNaN(newTime) && !isNaN(newCost) && !isNaN(newComfort)) {
                        await editEdge(edge.from, edge.to, newTime, newCost, newComfort);
                    }
                });
                polyline.addTo(allEdgesLayer);
            } catch (e) {
                console.warn('Не удалось построить ребро', edge);
            }
        }
    }
}