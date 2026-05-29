// static/ui/ui.js
window.s = window.state;

let isRestoringFromHistory = false;

function populateStopSelects() {
    const fromSelect = document.getElementById('fromSelect');
    const toSelect = document.getElementById('toSelect');
    
    if (!fromSelect || !toSelect) return;
    
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    s.stops.forEach(stop => {
        const option1 = document.createElement('option');
        option1.value = stop.id;
        option1.textContent = `${stop.name} (${stop.id})`;
        fromSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = stop.id;
        option2.textContent = `${stop.name} (${stop.id})`;
        toSelect.appendChild(option2);
    });
}

function updateWeightValues() {
    const timeWeight = document.getElementById('weightTime');
    const costWeight = document.getElementById('weightCost');
    const comfortWeight = document.getElementById('weightComfort');
    const timeVal = document.getElementById('timeVal');
    const costVal = document.getElementById('costVal');
    const comfortVal = document.getElementById('comfortVal');
    
    if (timeWeight && timeVal) timeVal.textContent = parseFloat(timeWeight.value).toFixed(2);
    if (costWeight && costVal) costVal.textContent = parseFloat(costWeight.value).toFixed(2);
    if (comfortWeight && comfortVal) comfortVal.textContent = parseFloat(comfortWeight.value).toFixed(2);
}

function initWeightSliders() {
    const timeWeight = document.getElementById('weightTime');
    const costWeight = document.getElementById('weightCost');
    const comfortWeight = document.getElementById('weightComfort');
    
    if (timeWeight) timeWeight.addEventListener('input', updateWeightValues);
    if (costWeight) costWeight.addEventListener('input', updateWeightValues);
    if (comfortWeight) comfortWeight.addEventListener('input', updateWeightValues);
    
    updateWeightValues();
}

async function searchRoutes() {
    const fromSelect = document.getElementById('fromSelect');
    const toSelect = document.getElementById('toSelect');
    const weightTime = parseFloat(document.getElementById('weightTime').value);
    const weightCost = parseFloat(document.getElementById('weightCost').value);
    const weightComfort = parseFloat(document.getElementById('weightComfort').value);
    
    const from = parseInt(fromSelect.value);
    const to = parseInt(toSelect.value);
    
    if (isNaN(from) || isNaN(to)) {
        alert('Выберите начальную и конечную остановки');
        return;
    }
    
    const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: from,
            to: to,
            weights: { time: weightTime, cost: weightCost, comfort: weightComfort }
        })
    });
    
    const data = await response.json();
    const routes = data.routes || [];
    
    window.state.routes = routes;
    
    displayRoutes(routes);
    
    if (typeof drawRoutesWithOSRM === 'function') {
        drawRoutesWithOSRM(routes, 0);
    }
    
    if (!isRestoringFromHistory && typeof saveRouteToHistory === 'function') {
        saveRouteToHistory(from, to, routes, { time: weightTime, cost: weightCost, comfort: weightComfort });
    }
}

function displayRoutes(routes) {
    const container = document.getElementById('routesList');
    
    if (!container) return;
    
    if (!routes || routes.length === 0) {
        container.innerHTML = '<p>Маршрутов не найдено</p>';
        return;
    }
    
    let html = '';
    routes.forEach((route, idx) => {
        const pathStr = route.path.join(' → ');
        html += `
            <div class="route-card" data-idx="${idx}">
                <div class="route-header">
                    <strong>Маршрут ${idx + 1}</strong>
                    <span class="route-badge">${route.time_avg} мин</span>
                </div>
                <div class="route-details">
                    🕐 ${route.time_avg} мин (${route.time_min}-${route.time_max})<br>
                    💰 ${route.cost} руб<br>
                    ⭐ Комфорт: ${route.comfort}
                </div>
                <div class="route-path">${pathStr}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.route-card').forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.idx);
            if (typeof drawRoutesWithOSRM === 'function') {
                drawRoutesWithOSRM(routes, idx);
            }
        });
    });
}

function loadSavedPoints() {
    const container = document.getElementById('savedPointsList');
    if (!container) return;
    
    const points = JSON.parse(localStorage.getItem('saved_points') || '[]');
    
    if (points.length === 0) {
        container.innerHTML = '<div style="color: #999; text-align: center; padding: 10px;">Нет сохранённых точек</div>';
        return;
    }
    
    let html = '';
    points.forEach(point => {
        html += `
            <div class="saved-point-item" data-id="${point.id}" data-lat="${point.lat}" data-lng="${point.lng}" data-name="${point.name}" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #ddd;">
                <span style="flex: 1; cursor: pointer;">📍 ${point.name}</span>
                <label style="margin: 0 5px; width: 30px; text-align: center;">
                    <input type="radio" name="startPoint" value="${point.id}" data-lat="${point.lat}" data-lng="${point.lng}" data-name="${point.name}">
                </label>
                <label style="margin: 0 5px; width: 30px; text-align: center;">
                    <input type="radio" name="endPoint" value="${point.id}" data-lat="${point.lat}" data-lng="${point.lng}" data-name="${point.name}">
                </label>
                <button class="delete-point" data-id="${point.id}" style="background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 2px 8px; margin-left: 5px; cursor: pointer;">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('input[name="startPoint"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                const id = parseInt(radio.value);
                const name = radio.dataset.name;
                const lat = parseFloat(radio.dataset.lat);
                const lng = parseFloat(radio.dataset.lng);
                if (typeof window.setStartFromPoint === 'function') {
                    window.setStartFromPoint(id, name, lat, lng);
                }
            }
        });
    });
    
    document.querySelectorAll('input[name="endPoint"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                const id = parseInt(radio.value);
                const name = radio.dataset.name;
                const lat = parseFloat(radio.dataset.lat);
                const lng = parseFloat(radio.dataset.lng);
                if (typeof window.setEndFromPoint === 'function') {
                    window.setEndFromPoint(id, name, lat, lng);
                }
            }
        });
    });
    
    document.querySelectorAll('.saved-point-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-point')) return;
            const id = parseInt(item.dataset.id);
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const name = item.dataset.name;
            if (typeof window.highlightPointOnMap === 'function') {
                window.highlightPointOnMap(lat, lng, name);
            }
        });
    });
    
    document.querySelectorAll('.delete-point').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (confirm('Удалить точку?')) {
                window.deletePointFromStorage(id);
                loadSavedPoints();
            }
        });
    });
}

function saveRouteToHistory(fromId, toId, routes, weights) {
    if (!routes || routes.length === 0) return;
    
    let history = JSON.parse(localStorage.getItem('route_history') || '[]');
    
    const fromStop = s.stops.find(s => s.id === fromId);
    const toStop = s.stops.find(s => s.id === toId);
    
    const historyItem = {
        id: Date.now(),
        from: fromId,
        to: toId,
        fromName: fromStop ? fromStop.name : `ID ${fromId}`,
        toName: toStop ? toStop.name : `ID ${toId}`,
        timestamp: new Date().toLocaleString(),
        routes: routes,
        weights: weights
    };
    
    history.unshift(historyItem);
    if (history.length > 10) history = history.slice(0, 10);
    
    localStorage.setItem('route_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem('route_history') || '[]');
    
    if (history.length === 0) {
        container.innerHTML = '<div style="color: #999; text-align: center; padding: 10px;">Пусто</div>';
        return;
    }
    
    let html = '';
    history.forEach(item => {
        html += `
            <div class="history-item" data-id="${item.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #ddd;">
                <span style="flex: 1; cursor: pointer;" class="restore-history">${item.fromName} → ${item.toName}<br><small>${item.timestamp}</small></span>
                <button class="delete-history" data-id="${item.id}" style="background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 2px 8px; margin-left: 5px; cursor: pointer;">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.restore-history').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.closest('.history-item').dataset.id);
            restoreRouteFromHistory(id);
        });
    });
    
    document.querySelectorAll('.delete-history').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            let history = JSON.parse(localStorage.getItem('route_history') || '[]');
            history = history.filter(item => item.id !== id);
            localStorage.setItem('route_history', JSON.stringify(history));
            loadHistory();
        });
    });
}

function restoreRouteFromHistory(id) {
    const history = JSON.parse(localStorage.getItem('route_history') || '[]');
    const item = history.find(h => h.id === id);
    if (!item) return;
    
    document.getElementById('fromSelect').value = item.from;
    document.getElementById('toSelect').value = item.to;
    
    if (item.weights) {
        document.getElementById('weightTime').value = item.weights.time;
        document.getElementById('weightCost').value = item.weights.cost;
        document.getElementById('weightComfort').value = item.weights.comfort;
        if (typeof updateWeightValues === 'function') updateWeightValues();
    }
    
    isRestoringFromHistory = true;
    if (typeof searchRoutes === 'function') {
        searchRoutes().finally(() => {
            isRestoringFromHistory = false;
        });
    } else {
        isRestoringFromHistory = false;
    }
}

window.loadSavedPoints = loadSavedPoints;

window.populateStopSelects = populateStopSelects;
window.initWeightSliders = initWeightSliders;
window.searchRoutes = searchRoutes;
window.displayRoutes = displayRoutes;

window.saveRouteToHistory = saveRouteToHistory;
window.loadHistory = loadHistory;
window.restoreRouteFromHistory = restoreRouteFromHistory;