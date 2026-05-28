// static/map-points.js

let pointToPointMode = false;
let startPoint = null;
let endPoint = null;
let startPointMarker = null;
let endPointMarker = null;
let savedPoints = [];
let selectedStartId = null;
let selectedEndId = null;

function clearPointMarkers() {
    if (startPointMarker) {
        map.removeLayer(startPointMarker);
        startPointMarker = null;
    }
    if (endPointMarker) {
        map.removeLayer(endPointMarker);
        endPointMarker = null;
    }
}

function savePoint(name, lat, lng) {
    const point = { id: Date.now(), name, lat, lng };
    savedPoints = [point, ...savedPoints.filter(p => p.name !== name && p.id !== point.id)];
    if (savedPoints.length > 10) savedPoints = savedPoints.slice(0, 10);
    localStorage.setItem('saved_points', JSON.stringify(savedPoints));
    displaySavedPoints();
}

function loadSavedPoints() {
    const saved = localStorage.getItem('saved_points');
    if (saved) {
        savedPoints = JSON.parse(saved);
        displaySavedPoints();
    }
}

function displaySavedPoints() {
    const container = document.getElementById('savedPointsList');
    if (!container) return;
    if (savedPoints.length === 0) {
        container.innerHTML = '<div style="color: #888;">Пусто</div>';
        return;
    }
    container.innerHTML = savedPoints.map(point => `
        <div style="margin-bottom: 8px; padding: 6px; background: white; border-radius: 4px;" data-point-id="${point.id}">
            <div style="font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span class="point-name" data-id="${point.id}" style="cursor: pointer;">${point.name}</span>
                <button class="delete-point-btn" data-id="${point.id}" style="background:#e74c3c; color:white; border:none; border-radius:3px; cursor:pointer; padding:2px 6px;">🗑</button>
            </div>
            <div style="margin-top: 6px; display: flex; gap: 12px;">
                <label><input type="radio" name="startPoint" value="${point.id}" ${point.id === selectedStartId ? 'checked' : ''}> Старт</label>
                <label><input type="radio" name="endPoint" value="${point.id}" ${point.id === selectedEndId ? 'checked' : ''}> Финиш</label>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.point-name').forEach(span => {
        span.addEventListener('dblclick', (e) => {
            const id = parseInt(span.dataset.id);
            const point = savedPoints.find(p => p.id === id);
            const newName = prompt('Редактировать название:', point.name);
            if (newName && newName !== point.name) {
                point.name = newName;
                localStorage.setItem('saved_points', JSON.stringify(savedPoints));
                displaySavedPoints();
            }
        });
    });
    
    document.querySelectorAll('.delete-point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            savedPoints = savedPoints.filter(p => p.id !== id);
            if (selectedStartId === id) selectedStartId = null;
            if (selectedEndId === id) selectedEndId = null;
            localStorage.setItem('saved_points', JSON.stringify(savedPoints));
            displaySavedPoints();
            if (selectedStartId !== null && selectedEndId !== null && selectedStartId !== selectedEndId) {
                searchRoutes();
            }
        });
    });
    
    document.querySelectorAll('input[name="startPoint"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            const point = savedPoints.find(p => p.id === id);
            if (point) {
                if (selectedStartId === point.id) return;
                selectedStartId = point.id;
                setStartFromPointById(point.id);
                if (selectedStartId !== null && selectedEndId !== null && selectedStartId !== selectedEndId) {
                    searchRoutes();
                }
            }
        });
    });
    
    document.querySelectorAll('input[name="endPoint"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            const point = savedPoints.find(p => p.id === id);
            if (point) {
                if (selectedEndId === point.id) return;
                selectedEndId = point.id;
                setEndFromPointById(point.id);
                if (selectedStartId !== null && selectedEndId !== null && selectedStartId !== selectedEndId) {
                    searchRoutes();
                }
            }
        });
    });
}

function restoreLastPoints() {
    const savedStart = localStorage.getItem('last_start_point');
    const savedEnd = localStorage.getItem('last_end_point');
    if (savedStart && savedEnd) {
        const start = JSON.parse(savedStart);
        const end = JSON.parse(savedEnd);
        startPoint = L.latLng(start.lat, start.lng);
        endPoint = L.latLng(end.lat, end.lng);
        startPointMarker = L.marker([start.lat, start.lng], {
            icon: L.divIcon({ html: '<div style="background:#2ecc71; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
        }).addTo(map).bindPopup('Старт');
        endPointMarker = L.marker([end.lat, end.lng], {
            icon: L.divIcon({ html: '<div style="background:#e74c3c; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
        }).addTo(map).bindPopup('Финиш');
        
        const fromStop = findNearestStop(start.lat, start.lng);
        const toStop = findNearestStop(end.lat, end.lng);
        if (fromStop && toStop && fromStop.id !== toStop.id) {
            document.getElementById('fromSelect').value = fromStop.id;
            document.getElementById('toSelect').value = toStop.id;
            searchRoutes();
        }
    }
}

function initPointToPointHandlers() {
    map.on('click', async (e) => {
        if (!pointToPointMode) return;
        
        if (startPoint === null) {
            startPoint = e.latlng;
            if (startPointMarker) map.removeLayer(startPointMarker);
            startPointMarker = L.marker([startPoint.lat, startPoint.lng], {
                icon: L.divIcon({ html: '<div style="background:#2ecc71; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
            }).addTo(map).bindPopup('Старт').openPopup();
            alert('Старт выбран. Теперь выберите финиш');
        } else if (endPoint === null) {
            endPoint = e.latlng;
            if (endPointMarker) map.removeLayer(endPointMarker);
            endPointMarker = L.marker([endPoint.lat, endPoint.lng], {
                icon: L.divIcon({ html: '<div style="background:#e74c3c; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
            }).addTo(map).bindPopup('Финиш').openPopup();
            
            localStorage.setItem('last_start_point', JSON.stringify({ lat: startPoint.lat, lng: startPoint.lng }));
            localStorage.setItem('last_end_point', JSON.stringify({ lat: endPoint.lat, lng: endPoint.lng }));
            
            const fromStop = findNearestStop(startPoint.lat, startPoint.lng);
            const toStop = findNearestStop(endPoint.lat, endPoint.lng);
            
            if (fromStop && toStop) {
                savePoint(fromStop.name, startPoint.lat, startPoint.lng);
                savePoint(toStop.name, endPoint.lat, endPoint.lng);
                const startPointSaved = savedPoints.find(p => p.name === fromStop.name);
                const endPointSaved = savedPoints.find(p => p.name === toStop.name);
                if (startPointSaved) selectedStartId = startPointSaved.id;
                if (endPointSaved) selectedEndId = endPointSaved.id;
                if (fromStop.id !== toStop.id) {
                    document.getElementById('fromSelect').value = fromStop.id;
                    document.getElementById('toSelect').value = toStop.id;
                    await searchRoutes();
                } else {
                    alert('Старт и финиш не могут совпадать');
                }
            } else {
                alert('Не удалось найти ближайшие остановки');
            }
            
            pointToPointMode = false;
            const pointToPointBtn = document.getElementById('pointToPointBtn');
            if (pointToPointBtn) pointToPointBtn.style.background = '#9b59b6';
            map.getContainer().style.cursor = '';
            startPoint = null;
            endPoint = null;
        }
    });
}

function initAddPointHandler() {
    let addPointMode = false;
    const addPointBtn = document.getElementById('addPointBtn');
    
    if (addPointBtn) {
        addPointBtn.addEventListener('click', () => {
            addPointMode = true;
            map.getContainer().style.cursor = 'crosshair';
            alert('Кликните на карте, чтобы добавить точку');
        });
    }
    
    map.on('click', async (e) => {
        if (!addPointMode) return;
        addPointMode = false;
        map.getContainer().style.cursor = '';
        
        const { lat, lng } = e.latlng;
        const fromStop = findNearestStop(lat, lng);
        const defaultName = fromStop ? fromStop.name : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const name = prompt('Введите название точки (можно редактировать):', defaultName);
        if (name) {
            savePoint(name, lat, lng);
        }
    });
}

function setStartFromPointById(pointId) {
    const point = savedPoints.find(p => p.id === pointId);
    if (!point) return;
    if (startPointMarker) map.removeLayer(startPointMarker);
    startPoint = L.latLng(point.lat, point.lng);
    startPointMarker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({ html: '<div style="background:#2ecc71; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
    }).addTo(map).bindPopup(`Старт: ${point.name}`);
    const stop = stops.find(s => s.name === point.name);
    if (stop) {
        document.getElementById('fromSelect').value = stop.id;
    }
    selectedStartId = point.id;
    displaySavedPoints();
}

function setEndFromPointById(pointId) {
    const point = savedPoints.find(p => p.id === pointId);
    if (!point) return;
    if (endPointMarker) map.removeLayer(endPointMarker);
    endPoint = L.latLng(point.lat, point.lng);
    endPointMarker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({ html: '<div style="background:#e74c3c; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', iconSize: [12, 12] })
    }).addTo(map).bindPopup(`Финиш: ${point.name}`);
    const stop = stops.find(s => s.name === point.name);
    if (stop) {
        document.getElementById('toSelect').value = stop.id;
    }
    selectedEndId = point.id;
    displaySavedPoints();
}