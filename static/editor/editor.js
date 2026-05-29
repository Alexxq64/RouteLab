// static/editor/editor.js
window.s = window.state;

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dphi = toRad(lat2 - lat1);
    const dlambda = toRad(lon2 - lon1);
    const a = Math.sin(dphi/2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function deleteEdge(fromId, toId) {
    const response = await fetch('/api/edge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromId, to: toId })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Ребро ${fromId}→${toId} удалено`);
        await loadAllEdges();
        await drawAllEdges();
        if (s.routes && s.routes.length > 0) {
            if (typeof searchRoutes === 'function') {
                await searchRoutes();
            }
        }
    }
    return data.status === 'ok';
}

async function updateEdge(fromId, toId, params) {
    const response = await fetch('/api/edge/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromId, to: toId, ...params })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Ребро ${fromId}→${toId} обновлено`);
        await loadAllEdges();
        await drawAllEdges();
        if (s.routes && s.routes.length > 0) {
            if (typeof searchRoutes === 'function') {
                await searchRoutes();
            }
        }
    }
    return data.status === 'ok';
}

function showEdgeDeletePopup(edgeFrom, edgeTo, fromStop, toStop) {
    const isBidirectional = window.getCurrentBidirectionalStatus(edgeFrom, edgeTo);
    
    let buttonsHtml = '';
    if (isBidirectional) {
        buttonsHtml = `
            <div class="edge-popup-buttons">
                <button class="edge-popup-btn" data-from="${edgeFrom}" data-to="${edgeTo}">Удалить (${edgeFrom} → ${edgeTo})</button>
                <button class="edge-popup-btn" data-from="${edgeTo}" data-to="${edgeFrom}">Удалить (${edgeTo} → ${edgeFrom})</button>
                <button class="edge-popup-btn edge-popup-btn-both" data-both="true">Удалить оба направления</button>
                <button class="edge-popup-btn edge-popup-btn-cancel" data-cancel="true">Отмена</button>
            </div>
        `;
    } else {
        buttonsHtml = `
            <div class="edge-popup-buttons">
                <button class="edge-popup-btn" data-from="${edgeFrom}" data-to="${edgeTo}">Удалить (${edgeFrom} → ${edgeTo})</button>
                <button class="edge-popup-btn edge-popup-btn-cancel" data-cancel="true">Отмена</button>
            </div>
        `;
    }
    
    const popupContent = `
        <div style="min-width: 220px; padding: 5px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Ребро ${edgeFrom} → ${edgeTo}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${fromStop.name} → ${toStop.name}</div>
            ${buttonsHtml}
        </div>
    `;
    
    const centerLat = (fromStop.lat + toStop.lat) / 2;
    const centerLon = (fromStop.lon + toStop.lon) / 2;
    
    const popup = L.popup()
        .setLatLng([centerLat, centerLon])
        .setContent(popupContent)
        .openOn(s.map);
    
    setTimeout(() => {
        document.querySelectorAll('.edge-popup-btn').forEach(btn => {
            btn.onclick = async () => {
                if (btn.dataset.cancel === 'true') {
                    s.map.closePopup();
                    return;
                }
                
                if (btn.dataset.both === 'true') {
                    await deleteEdge(edgeFrom, edgeTo);
                    await deleteEdge(edgeTo, edgeFrom);
                } else {
                    const fromId = parseInt(btn.dataset.from);
                    const toId = parseInt(btn.dataset.to);
                    await deleteEdge(fromId, toId);
                }
                
                s.map.closePopup();
            };
        });
    }, 100);
}

function showEdgeEditPopup(edgeFrom, edgeTo, fromStop, toStop) {
    const isBidirectional = window.getCurrentBidirectionalStatus(edgeFrom, edgeTo);
    
    if (isBidirectional) {
        const choiceHtml = `
            <div style="min-width: 250px; padding: 10px;">
                <div style="font-weight: bold; margin-bottom: 10px;">Выберите направление для редактирования:</div>
                <div class="edge-choice-buttons">
                    <button class="edge-choice-btn" id="editDir1">${edgeFrom} → ${edgeTo} (${fromStop.name} → ${toStop.name})</button>
                    <button class="edge-choice-btn" id="editDir2">${edgeTo} → ${edgeFrom} (${toStop.name} → ${fromStop.name})</button>
                    <button class="edge-choice-btn edge-choice-btn-cancel" id="editCancel">Отмена</button>
                </div>
            </div>
        `;
        
        const popup = L.popup()
            .setLatLng([(fromStop.lat + toStop.lat) / 2, (fromStop.lon + toStop.lon) / 2])
            .setContent(choiceHtml)
            .openOn(s.map);
        
        setTimeout(() => {
            document.getElementById('editDir1')?.addEventListener('click', () => {
                s.map.closePopup();
                openEditModal(edgeFrom, edgeTo, fromStop, toStop);
            });
            document.getElementById('editDir2')?.addEventListener('click', () => {
                s.map.closePopup();
                openEditModal(edgeTo, edgeFrom, toStop, fromStop);
            });
            document.getElementById('editCancel')?.addEventListener('click', () => {
                s.map.closePopup();
            });
        }, 100);
    } else {
        openEditModal(edgeFrom, edgeTo, fromStop, toStop);
    }
}

function openEditModal(edgeFrom, edgeTo, fromStop, toStop) {
    const edge = s.edges.find(e => e.from === edgeFrom && e.to === edgeTo);
    if (!edge) {
        alert('Ребро не найдено');
        return;
    }
    
    const modalHtml = `
        <div id="edgeEditModal" class="edge-edit-modal-overlay">
            <div class="edge-edit-modal">
                <h3>Редактирование ребра</h3>
                <div class="edge-edit-modal-subtitle">${fromStop.name} (${edgeFrom}) → ${toStop.name} (${edgeTo})</div>
                <table class="edge-edit-table">
                    <tr><td>Время (мин):</td><td><input type="number" id="editTime" value="${edge.time}" step="0.1"></td></tr>
                    <tr><td>Время мин (мин):</td><td><input type="number" id="editTimeMin" value="${edge.time_min}" step="0.1"></td></tr>
                    <tr><td>Время макс (мин):</td><td><input type="number" id="editTimeMax" value="${edge.time_max}" step="0.1"></td></tr>
                    <tr><td>Стоимость (руб):</td><td><input type="number" id="editCost" value="${edge.cost}" step="1"></td></tr>
                    <tr><td>Комфорт (1-10):</td><td><input type="number" id="editComfort" value="${edge.comfort}" min="1" max="10" step="1"></td></tr>
                </table>
                <div class="edge-edit-buttons">
                    <button id="saveEditBtn" class="edge-edit-btn-save">Сохранить</button>
                    <button id="cancelEditBtn" class="edge-edit-btn-cancel">Отмена</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('saveEditBtn').onclick = async () => {
        const newTime = parseFloat(document.getElementById('editTime').value);
        const newTimeMin = parseFloat(document.getElementById('editTimeMin').value);
        const newTimeMax = parseFloat(document.getElementById('editTimeMax').value);
        const newCost = parseInt(document.getElementById('editCost').value);
        const newComfort = parseInt(document.getElementById('editComfort').value);
        
        if (isNaN(newTime) || isNaN(newTimeMin) || isNaN(newTimeMax) || isNaN(newCost) || isNaN(newComfort)) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        await updateEdge(edgeFrom, edgeTo, {
            time: newTime,
            time_min: newTimeMin,
            time_max: newTimeMax,
            cost: newCost,
            comfort: newComfort
        });
        
        document.getElementById('edgeEditModal').remove();
    };
    
    document.getElementById('cancelEditBtn').onclick = () => {
        document.getElementById('edgeEditModal').remove();
    };
}

async function addEdgeToServer(fromId, toId, isReverse = false) {
    const fromStop = s.stops.find(s => s.id === fromId);
    const toStop = s.stops.find(s => s.id === toId);
    
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromStop.lon},${fromStop.lat};${toStop.lon},${toStop.lat}?overview=full&geometries=geojson`;
    let geometry = null;
    let time = null;
    
    try {
        const response = await fetch(osrmUrl);
        const data = await response.json();
        if (data.code === 'Ok' && data.routes.length > 0) {
            const route = data.routes[0];
            time = route.duration / 60;
            geometry = route.geometry.coordinates.map(coord => ({ lat: coord[1], lon: coord[0] }));
        }
    } catch (e) {
        console.error('OSRM error:', e);
        const distance = haversine(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon);
        time = Math.max(0.5, distance / 500);
    }
    
    const edgeData = {
        from: fromId,
        to: toId,
        time: Math.round(time * 10) / 10,
        time_min: Math.round(time * 0.7 * 10) / 10,
        time_max: Math.round(time * 1.5 * 10) / 10,
        cost: Math.max(1, Math.floor(time)),
        comfort: 5,
        geometry: geometry
    };
    
    const response = await fetch('/api/edge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edgeData)
    });
    const data = await response.json();
    if (data.status === 'ok') {
        console.log(`Ребро ${fromId}→${toId} добавлено`);
        await loadAllEdges();
        await drawAllEdges();
        if (s.routes && s.routes.length > 0) {
            if (typeof searchRoutes === 'function') {
                await searchRoutes();
            }
        }
        return true;
    }
    return false;
}

// Режим добавления ребра (свободный выбор старта и финиша)
function startAddEdgeMode() {
    alert('Кликните на карте для выбора начальной остановки');
    s.map.getContainer().style.cursor = 'crosshair';
    
    s.map.once('click', async (e) => {
        const startStop = findNearestStop(e.latlng.lat, e.latlng.lng);
        if (!startStop) {
            s.map.getContainer().style.cursor = '';
            alert('Не найдена остановка рядом');
            return;
        }
        
        alert(`Старт: ${startStop.name}. Теперь выберите конечную остановку`);
        
        s.map.once('click', async (e2) => {
            s.map.getContainer().style.cursor = '';
            const endStop = findNearestStop(e2.latlng.lat, e2.latlng.lng);
            if (!endStop || endStop.id === startStop.id) {
                alert('Не найдена конечная остановка или она совпадает со стартом');
                return;
            }
            
            const success = await addEdgeToServer(startStop.id, endStop.id);
            if (success) {
                const addReverse = confirm('Добавить обратное ребро?');
                if (addReverse) {
                    await addEdgeToServer(endStop.id, startStop.id, true);
                }
            }
        });
    });
}

// Вспомогательная функция: найти ближайшую остановку
function findNearestStop(lat, lon) {
    let nearest = null;
    let minDist = Infinity;
    for (const stop of s.stops) {
        const dist = Math.hypot(stop.lat - lat, stop.lon - lon);
        if (dist < minDist) {
            minDist = dist;
            nearest = stop;
        }
    }
    return minDist < 0.01 ? nearest : null;
}

// Экспорт
window.addEdgeToServer = addEdgeToServer;
window.startAddEdgeMode = startAddEdgeMode;

window.showEdgeDeletePopup = showEdgeDeletePopup;
window.showEdgeEditPopup = showEdgeEditPopup;
window.deleteEdge = deleteEdge;
window.updateEdge = updateEdge;