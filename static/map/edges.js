// static/map/edges.js
window.s = window.state;

let highlightedEdgeMarkers = null;

function clearHighlightedMarkers() {
    if (highlightedEdgeMarkers) {
        s.map.removeLayer(highlightedEdgeMarkers);
        highlightedEdgeMarkers = null;
    }
}

function getCurrentBidirectionalStatus(edgeFrom, edgeTo) {
    return s.edges.some(e => e.from === edgeTo && e.to === edgeFrom);
}

function drawAllEdges() {
    if (s.allEdgesLayer) {
        s.map.removeLayer(s.allEdgesLayer);
    }

    s.allEdgesLayer = L.layerGroup().addTo(s.map);

    const uniqueEdges = new Map();
    for (const edge of s.edges) {
        const key = Math.min(edge.from, edge.to) + '-' + Math.max(edge.from, edge.to);
        if (!uniqueEdges.has(key)) {
            uniqueEdges.set(key, edge);
        }
    }

    for (const edge of uniqueEdges.values()) {
        let polyline;
        let fromStop = null;
        let toStop = null;
        
        if (edge.geometry && edge.geometry.length > 0) {
            polyline = L.polyline(
                edge.geometry.map(p => [p.lat, p.lon]),
                { color: '#999', weight: 6, opacity: 0.3, dashArray: '5, 5' }
            );
            fromStop = s.stops.find(stop => stop.id === edge.from);
            toStop = s.stops.find(stop => stop.id === edge.to);
        } else {
            fromStop = s.stops.find(stop => stop.id === edge.from);
            toStop = s.stops.find(stop => stop.id === edge.to);
            if (fromStop && toStop) {
                polyline = L.polyline(
                    [[fromStop.lat, fromStop.lon], [toStop.lat, toStop.lon]],
                    { color: '#999', weight: 6, opacity: 0.3, dashArray: '5, 5' }
                );
            }
        }
        
        if (polyline) {
            polyline.on('mouseover', function() {
                clearHighlightedMarkers();
                const isBi = getCurrentBidirectionalStatus(edge.from, edge.to);
                if (isBi) {
                    this.setStyle({ color: '#ff8800', weight: 6, opacity: 0.9 });
                } else {
                    this.setStyle({ color: '#ffcc00', weight: 6, opacity: 0.9 });
                }
                highlightedEdgeMarkers = L.layerGroup().addTo(s.map);
                if (fromStop) {
                    let iconHtml;
                    const isBiNow = getCurrentBidirectionalStatus(edge.from, edge.to);
                    if (isBiNow) {
                        iconHtml = `<div style="background:#ff8800; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${fromStop.id}</div>`;
                    } else {
                        iconHtml = `<div style="background:green; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${fromStop.id}</div>`;
                    }
                    L.marker([fromStop.lat, fromStop.lon], {
                        icon: L.divIcon({ className: 'edge-start-marker', html: iconHtml, iconSize: [24, 24] })
                    }).addTo(highlightedEdgeMarkers);
                }
                if (toStop) {
                    let iconHtml;
                    const isBiNow = getCurrentBidirectionalStatus(edge.from, edge.to);
                    if (isBiNow) {
                        iconHtml = `<div style="background:#ff8800; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${toStop.id}</div>`;
                    } else {
                        iconHtml = `<div style="background:red; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${toStop.id}</div>`;
                    }
                    L.marker([toStop.lat, toStop.lon], {
                        icon: L.divIcon({ className: 'edge-end-marker', html: iconHtml, iconSize: [24, 24] })
                    }).addTo(highlightedEdgeMarkers);
                }
            });
            polyline.on('mouseout', function() {
                clearHighlightedMarkers();
                this.setStyle({ color: '#999', weight: 6, opacity: 0.3 });
            });
            polyline.on('click', function(e) {
                if (typeof window.showEdgeDeletePopup === 'function') {
                    window.showEdgeDeletePopup(edge.from, edge.to, fromStop, toStop);
                }
            });
            polyline.on('contextmenu', function(e) {
                L.DomEvent.preventDefault(e);
                if (typeof window.showEdgeEditPopup === 'function') {
                    window.showEdgeEditPopup(edge.from, edge.to, fromStop, toStop);
                }
            });
            polyline.addTo(s.allEdgesLayer);
        }
    }
}

window.drawAllEdges = drawAllEdges;
window.clearHighlightedMarkers = clearHighlightedMarkers;
window.getCurrentBidirectionalStatus = getCurrentBidirectionalStatus;