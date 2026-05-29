// static/map/points.js
window.s = window.state;

function drawAllPoints() {
    if (s.pointsLayer) {
        s.map.removeLayer(s.pointsLayer);
    }
    
    s.pointsLayer = L.layerGroup().addTo(s.map);
    
    const points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    s.points = points;
    
    points.forEach(point => {
        const marker = L.marker([point.lat, point.lng], {
            icon: L.divIcon({
                className: 'point-marker',
                html: '<div style="background: #9b59b6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #9b59b6;"></div>',
                iconSize: [14, 14],
                popupAnchor: [0, -7]
            })
        });
        marker.bindPopup(`<b>${point.name}</b>`);
        
        marker.on('mouseover', () => window.showPointTooltip(point, marker));
        marker.on('mouseout', () => marker.closeTooltip());
        marker.on('click', () => window.handlePointClick(point));
        marker.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e);
            window.handlePointEdit(point);
        });
        
        marker.addTo(s.pointsLayer);
    });
}

window.drawAllPoints = drawAllPoints;