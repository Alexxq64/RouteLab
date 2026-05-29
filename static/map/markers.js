// static/map/markers.js
window.s = window.state;

function drawStops() {
    if (s.markersLayer) {
        s.map.removeLayer(s.markersLayer);
    }

    s.markersLayer = L.layerGroup().addTo(s.map);

    s.stops.forEach(stop => {
        const marker = L.marker([stop.lat, stop.lon], {
            icon: L.divIcon({
                className: 'stop-marker',
                html: '<div style="background: #3498db; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #3498db;"></div>',
                iconSize: [16, 16],
                popupAnchor: [0, -8]
            })
        });
        marker.bindPopup(`<b>${stop.name}</b><br>ID: ${stop.id}`);
        
        marker.on('mouseover', () => window.showStopTooltip(stop, marker));
        marker.on('mouseout', () => marker.closeTooltip());
        marker.on('click', () => window.handleStopClick(stop));
        marker.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e);
            window.handleStopEdit(stop);
        });
        
        marker.addTo(s.markersLayer);
    });
}

window.drawStops = drawStops;