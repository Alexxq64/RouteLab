// static/map-markers.js

function addMarkers() {
    if (markersLayer) {
        map.removeLayer(markersLayer);
    }
    markersLayer = L.layerGroup().addTo(map);
    stops.forEach(stop => {
        const marker = L.marker([stop.lat, stop.lon], {
            icon: L.divIcon({
                html: `<div style="background:#3498db; width:16px; height:16px; border-radius:50%; border:2px solid white; cursor:pointer;"></div>`,
                iconSize: [16, 16],
                className: 'stop-marker'
            })
        });
        marker.bindPopup(`<b>${stop.name}</b><br>ID: ${stop.id}`);
        marker.on('click', () => onMarkerClick(stop));
        marker.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            if (confirm(`Удалить остановку "${stop.name}"? Все связанные маршруты также будут удалены.`)) {
                deleteStop(stop.id, stop.name);
            }
        });
        marker.on('dblclick', async () => {
            const newName = prompt('Введите новое название остановки:', stop.name);
            if (newName && newName !== stop.name) {
                await fetch(`/api/stop/${stop.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
                stop.name = newName;
                alert('Название обновлено');
            }
            const move = confirm('Переместить остановку?');
            if (move) {
                alert(`Кликните на карте в новое место для остановки "${stop.name}"`);
                map.once('click', async (e) => {
                    const { lat, lng } = e.latlng;
                    await fetch(`/api/stop/${stop.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lat: lat, lon: lng })
                    });
                    alert(`Остановка "${stop.name}" перемещена`);
                    await loadStops();
                    await loadAllEdges();
                    await drawAllEdges();
                    addMarkers();
                    if (currentRoutes.length > 0) {
                        await searchRoutes();
                    }
                });
            }
        });
        marker.addTo(markersLayer);
    });
}

function resetMarkerColors() {
    markersLayer.eachLayer(layer => {
        if (layer.setStyle) {
            layer.setStyle({ fillColor: '#3498db' });
        }
    });
}