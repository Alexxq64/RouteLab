// static/editor/placeEditor.js
window.s = window.state;

let isAddModeActive = false;

function getNearestStopName(lat, lng) {
    let nearestStop = null;
    let minDist = Infinity;
    
    for (const stop of s.stops) {
        const dist = Math.hypot(stop.lat - lat, stop.lon - lng);
        if (dist < minDist) {
            minDist = dist;
            nearestStop = stop;
        }
    }
    
    if (nearestStop && minDist < 0.01) {
        return nearestStop.name;
    }
    return null;
}

async function deleteStopFromServer(stopId) {
    const response = await fetch('/api/stop/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stopId })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Остановка ${stopId} удалена`);
        await loadStops();
        await loadAllEdges();
        await drawStops();
        await drawAllEdges();
        if (s.routes && s.routes.length > 0) {
            if (typeof searchRoutes === 'function') {
                await searchRoutes();
            }
        }
    }
    return data.status === 'ok';
}

async function updateStopOnServer(stopId, name, lat, lon) {
    const response = await fetch('/api/stop/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stopId, name: name, lat: lat, lon: lon })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Остановка ${stopId} обновлена`);
        await loadStops();
        await loadAllEdges();
        await drawStops();
        await drawAllEdges();
        if (s.routes && s.routes.length > 0) {
            if (typeof searchRoutes === 'function') {
                await searchRoutes();
            }
        }
    }
    return data.status === 'ok';
}

function deletePointFromStorage(pointId) {
    let points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    points = points.filter(p => p.id !== pointId);
    localStorage.setItem('saved_points', JSON.stringify(points));
    s.points = points;
    if (typeof loadSavedPoints === 'function') {
        loadSavedPoints();
    }
    if (typeof drawAllPoints === 'function') {
        drawAllPoints();
    }
    console.log(`Точка ${pointId} удалена`);
}

function updatePointInStorage(pointId, name, lat, lng) {
    let points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    const index = points.findIndex(p => p.id === pointId);
    if (index !== -1) {
        points[index] = { ...points[index], name: name, lat: lat, lng: lng };
        localStorage.setItem('saved_points', JSON.stringify(points));
        s.points = points;
        if (typeof loadSavedPoints === 'function') {
            loadSavedPoints();
        }
        if (typeof drawAllPoints === 'function') {
            drawAllPoints();
        }
    }
}

function showStopTooltip(stop, marker) {
    const tooltipContent = `<div style="background: white; border: 1px solid #3498db; border-radius: 4px; padding: 4px 8px; font-size: 12px;">
        <strong>ID: ${stop.id}</strong><br>${stop.name}
    </div>`;
    marker.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: [0, -20] }).openTooltip();
    setTimeout(() => {
        marker.closeTooltip();
    }, 2000);
}

function showPointTooltip(point, marker) {
    const tooltipContent = `<div style="background: white; border: 1px solid #f39c12; border-radius: 4px; padding: 4px 8px; font-size: 12px;">
        <strong>📍 ${point.name}</strong>
    </div>`;
    marker.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: [0, -20] }).openTooltip();
    setTimeout(() => {
        marker.closeTooltip();
    }, 2000);
}

function handleStopClick(stop) {
    if (confirm(`Удалить остановку "${stop.name}" (ID: ${stop.id})?\nВнимание! Все связанные рёбра также будут удалены.`)) {
        deleteStopFromServer(stop.id);
    }
}

function handlePointClick(point) {
    if (confirm(`Удалить точку "${point.name}"?`)) {
        deletePointFromStorage(point.id);
    }
}

function handleStopEdit(stop) {
    const newName = prompt('Введите новое название остановки:', stop.name);
    if (newName && newName !== stop.name) {
        updateStopOnServer(stop.id, newName, stop.lat, stop.lon);
    }
    
    const moveConfirm = confirm('Переместить остановку?');
    if (moveConfirm) {
        s.map.getContainer().style.cursor = 'crosshair';
        const tooltip = L.tooltip()
            .setContent('Кликните на карте в новое место для остановки')
            .setLatLng(s.map.getCenter())
            .openOn(s.map);
        
        s.map.once('click', async (e) => {
            s.map.getContainer().style.cursor = '';
            tooltip.remove();
            await updateStopOnServer(stop.id, stop.name, e.latlng.lat, e.latlng.lng);
        });
    }
}

function handlePointEdit(point) {
    const newName = prompt('Введите новое название точки:', point.name);
    if (newName && newName !== point.name) {
        updatePointInStorage(point.id, newName, point.lat, point.lng);
    }
    
    const moveConfirm = confirm('Переместить точку?');
    if (moveConfirm) {
        s.map.getContainer().style.cursor = 'crosshair';
        const tooltip = L.tooltip()
            .setContent('Кликните на карте в новое место для точки')
            .setLatLng(s.map.getCenter())
            .openOn(s.map);
        
        s.map.once('click', (e) => {
            s.map.getContainer().style.cursor = '';
            tooltip.remove();
            updatePointInStorage(point.id, point.name, e.latlng.lat, e.latlng.lng);
            drawAllPoints();
        });
    }
}

async function addStop(lat, lon, name) {
    const response = await fetch('/api/stop/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, lat: lat, lon: lon })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Остановка добавлена, id: ${data.id}`);
        await loadStops();
        await drawStops();
        await loadAllEdges();
        await drawAllEdges();
        return true;
    }
    return false;
}

function startAddStopMode() {
    if (isAddModeActive) {
        alert('Уже в режиме добавления');
        return;
    }
    isAddModeActive = true;
    alert('Кликните на карте в место для новой остановки');
    s.map.getContainer().style.cursor = 'crosshair';
    
    s.map.once('click', async (e) => {
        s.map.getContainer().style.cursor = '';
        const name = prompt('Введите название остановки:');
        if (name && name.trim()) {
            await addStop(e.latlng.lat, e.latlng.lng, name.trim());
        } else {
            alert('Название не введено');
        }
        isAddModeActive = false;
    });
}

function addPointToStorage(name, lat, lng) {
    let points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    const newId = Date.now();
    points.push({
        id: newId,
        name: name,
        lat: lat,
        lng: lng
    });
    localStorage.setItem('saved_points', JSON.stringify(points));
    s.points = points;
    if (typeof drawAllPoints === 'function') {
        drawAllPoints();
    }
    if (typeof loadSavedPoints === 'function') {
        loadSavedPoints();
    }
    console.log(`Точка "${name}" добавлена`);
}

function deletePointFromStorage(pointId) {
    let points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    points = points.filter(p => p.id !== pointId);
    localStorage.setItem('saved_points', JSON.stringify(points));
    s.points = points;
    if (typeof loadSavedPoints === 'function') {
        loadSavedPoints();
    }
    if (typeof drawAllPoints === 'function') {
        drawAllPoints();
    }
    console.log(`Точка ${pointId} удалена`);
}

function startAddPointMode() {
    if (isAddModeActive) {
        alert('Уже в режиме добавления');
        return;
    }
    isAddModeActive = true;
    alert('Кликните на карте в место для новой точки');
    s.map.getContainer().style.cursor = 'crosshair';
    
    s.map.once('click', (e) => {
        s.map.getContainer().style.cursor = '';
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const nearestStopName = getNearestStopName(lat, lng);
        const defaultName = nearestStopName ? `Рядом с ${nearestStopName}` : `Точка ${new Date().toLocaleTimeString()}`;
        const name = prompt('Введите название точки:', defaultName);
        if (name && name.trim()) {
            addPointToStorage(name.trim(), lat, lng);
        } else {
            alert('Название не введено');
        }
        isAddModeActive = false;
    });
}

let pointToPointStartMarker = null;
let pointToPointEndMarker = null;
let pointToPointMode = false;

function clearPointToPointMarkers() {
    if (pointToPointStartMarker) {
        s.map.removeLayer(pointToPointStartMarker);
        pointToPointStartMarker = null;
    }
    if (pointToPointEndMarker) {
        s.map.removeLayer(pointToPointEndMarker);
        pointToPointEndMarker = null;
    }
}

function setStartPoint(lat, lng) {
    clearPointToPointMarkers();
    pointToPointStartMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'point-to-point-marker',
            html: '🟢',
            iconSize: [24, 24]
        })
    }).addTo(s.map);
    pointToPointStartMarker.bindPopup('Старт').openPopup();
}

function setEndPoint(lat, lng) {
    if (pointToPointEndMarker) {
        s.map.removeLayer(pointToPointEndMarker);
    }
    pointToPointEndMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'point-to-point-marker',
            html: '🔴',
            iconSize: [24, 24]
        })
    }).addTo(s.map);
    pointToPointEndMarker.bindPopup('Финиш').openPopup();
}

function findNearestStopId(lat, lng) {
    let nearestId = null;
    let minDist = Infinity;
    for (const stop of s.stops) {
        const dist = Math.hypot(stop.lat - lat, stop.lon - lng);
        if (dist < minDist) {
            minDist = dist;
            nearestId = stop.id;
        }
    }
    return nearestId;
}

function startPointToPointMode() {
    if (isAddModeActive) {
        alert('Сначала завершите текущий режим добавления');
        return;
    }
    pointToPointMode = true;
    clearPointToPointMarkers();
    alert('Режим "Точка → Точка": кликните на карте для выбора СТАРТА');
    s.map.getContainer().style.cursor = 'crosshair';
    
    let startPoint = null;
    
    s.map.once('click', (e1) => {
        startPoint = e1.latlng;
        setStartPoint(startPoint.lat, startPoint.lng);
        alert('Теперь кликните для выбора ФИНИША');
        
        s.map.once('click', async (e2) => {
            s.map.getContainer().style.cursor = '';
            pointToPointMode = false;
            const endPoint = e2.latlng;
            setEndPoint(endPoint.lat, endPoint.lng);
            
            const startStopId = findNearestStopId(startPoint.lat, startPoint.lng);
            const endStopId = findNearestStopId(endPoint.lat, endPoint.lng);
            
            if (startStopId === null || endStopId === null) {
                alert('Не удалось найти ближайшие остановки');
                return;
            }
            
            document.getElementById('fromSelect').value = startStopId;
            document.getElementById('toSelect').value = endStopId;
            
            if (typeof window.searchRoutes === 'function') {
                await window.searchRoutes();
            }
        });
    });
}

let currentStartMarker = null;
let currentEndMarker = null;

function clearStartEndMarkers() {
    if (currentStartMarker) {
        s.map.removeLayer(currentStartMarker);
        currentStartMarker = null;
    }
    if (currentEndMarker) {
        s.map.removeLayer(currentEndMarker);
        currentEndMarker = null;
    }
}

function setStartFromPoint(id, name, lat, lng) {
    const nearestStopId = findNearestStopId(lat, lng);
    if (nearestStopId !== null) {
        document.getElementById('fromSelect').value = nearestStopId;
    }
    
    const toVal = document.getElementById('toSelect').value;
    const fromVal = document.getElementById('fromSelect').value;
    if (fromVal && toVal && fromVal !== toVal && typeof searchRoutes === 'function') {
        searchRoutes();
    }
}

function setEndFromPoint(id, name, lat, lng) {
    const nearestStopId = findNearestStopId(lat, lng);
    if (nearestStopId !== null) {
        document.getElementById('toSelect').value = nearestStopId;
    }
    
    const fromVal = document.getElementById('fromSelect').value;
    const toVal = document.getElementById('toSelect').value;
    if (fromVal && toVal && fromVal !== toVal && typeof searchRoutes === 'function') {
        searchRoutes();
    }
}

function clearStartEndMarkers() {
    if (currentStartMarker) {
        s.map.removeLayer(currentStartMarker);
        currentStartMarker = null;
    }
    if (currentEndMarker) {
        s.map.removeLayer(currentEndMarker);
        currentEndMarker = null;
    }
    // сброс радиобаттонов
    const startRadio = document.querySelector('input[name="startPoint"]:checked');
    if (startRadio) startRadio.checked = false;
    const endRadio = document.querySelector('input[name="endPoint"]:checked');
    if (endRadio) endRadio.checked = false;
}

let currentHighlightedPointMarker = null;

function highlightPointOnMap(lat, lng, name) {
    if (currentHighlightedPointMarker) {
        s.map.removeLayer(currentHighlightedPointMarker);
    }
    currentHighlightedPointMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'highlighted-point-marker',
            html: '🔵',
            iconSize: [20, 20]
        })
    }).addTo(s.map);
    currentHighlightedPointMarker.bindPopup(name).openPopup();
    setTimeout(() => {
        if (currentHighlightedPointMarker) {
            s.map.removeLayer(currentHighlightedPointMarker);
            currentHighlightedPointMarker = null;
        }
    }, 3000);
}

function setStartFromPoint(id, name, lat, lng) {
    const nearestStopId = findNearestStopId(lat, lng);
    if (nearestStopId !== null) {
        document.getElementById('fromSelect').value = nearestStopId;
    }
    
    const toVal = document.getElementById('toSelect').value;
    const fromVal = document.getElementById('fromSelect').value;
    if (fromVal && toVal && fromVal !== toVal && typeof searchRoutes === 'function') {
        searchRoutes();
    }
}

function setEndFromPoint(id, name, lat, lng) {
    const nearestStopId = findNearestStopId(lat, lng);
    if (nearestStopId !== null) {
        document.getElementById('toSelect').value = nearestStopId;
    }
    
    const fromVal = document.getElementById('fromSelect').value;
    const toVal = document.getElementById('toSelect').value;
    if (fromVal && toVal && fromVal !== toVal && typeof searchRoutes === 'function') {
        searchRoutes();
    }
}

window.highlightPointOnMap = highlightPointOnMap;
window.setStartFromPoint = setStartFromPoint;
window.setEndFromPoint = setEndFromPoint;

window.setStartFromPoint = setStartFromPoint;
window.setEndFromPoint = setEndFromPoint;
window.clearStartEndMarkers = clearStartEndMarkers;

window.startPointToPointMode = startPointToPointMode;
window.setStartPoint = setStartPoint;
window.setEndPoint = setEndPoint;
window.clearPointToPointMarkers = clearPointToPointMarkers;
window.findNearestStopId = findNearestStopId;

window.addPointToStorage = addPointToStorage;
window.startAddPointMode = startAddPointMode;

window.addStop = addStop;
window.startAddStopMode = startAddStopMode;

window.showStopTooltip = showStopTooltip;
window.showPointTooltip = showPointTooltip;
window.handleStopClick = handleStopClick;
window.handlePointClick = handlePointClick;
window.handleStopEdit = handleStopEdit;
window.handlePointEdit = handlePointEdit;
window.deleteStopFromServer = deleteStopFromServer;
window.updateStopOnServer = updateStopOnServer;
window.deletePointFromStorage = deletePointFromStorage;
window.updatePointInStorage = updatePointInStorage;