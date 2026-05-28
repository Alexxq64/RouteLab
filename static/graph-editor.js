// static/graph-editor.js

let addStopMode = false;
let addEdgeMode = false;
let selectedFromStop = null;

function initGraphEditor() {
    const addStopBtn = document.getElementById('addStopBtn');
    const addEdgeBtn = document.getElementById('addEdgeBtn');
    const pointToPointBtn = document.getElementById('pointToPointBtn');
    const repeatLastRouteBtn = document.getElementById('repeatLastRouteBtn');
    
    if (addStopBtn) {
        addStopBtn.addEventListener('click', () => {
            addStopMode = !addStopMode;
            addStopBtn.style.background = addStopMode ? '#2ecc71' : '#e67e22';
            map.getContainer().style.cursor = addStopMode ? 'crosshair' : '';
            if (addStopMode) alert('Режим добавления остановки. Кликните на карту');
        });
    }
    
    if (addEdgeBtn) {
        addEdgeBtn.addEventListener('click', () => {
            addEdgeMode = !addEdgeMode;
            addEdgeBtn.style.background = addEdgeMode ? '#2ecc71' : '#27ae60';
            map.getContainer().style.cursor = addEdgeMode ? 'crosshair' : '';
            selectedFromStop = null;
            if (addEdgeMode) alert('Режим добавления маршрута. Кликните на остановку А');
        });
    }
    
    if (pointToPointBtn) {
        pointToPointBtn.addEventListener('click', () => {
            pointToPointMode = !pointToPointMode;
            pointToPointBtn.style.background = pointToPointMode ? '#2ecc71' : '#9b59b6';
            map.getContainer().style.cursor = pointToPointMode ? 'crosshair' : '';
            startPoint = null;
            endPoint = null;
            if (pointToPointMode) alert('Режим выбора точек. Кликните на карте: точка А (отправление), затем точка Б (назначение)');
        });
    }
    
    if (repeatLastRouteBtn) {
        repeatLastRouteBtn.addEventListener('click', () => {
            const savedFrom = localStorage.getItem('last_route_from');
            const savedTo = localStorage.getItem('last_route_to');
            if (savedFrom && savedTo) {
                document.getElementById('fromSelect').value = savedFrom;
                document.getElementById('toSelect').value = savedTo;
                searchRoutes();
            } else {
                alert('Нет сохранённого маршрута');
            }
        });
    }
}

async function deleteStop(stopId, stopName) {
    const response = await fetch(`/api/stop/${stopId}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    if (data.status === 'ok') {
        alert(`Остановка "${stopName}" удалена`);
        await loadStops();
        await loadAllEdges();
        await drawAllEdges();
        addMarkers();
        if (currentRoutes.length > 0) {
            await searchRoutes();
        }
    } else {
        alert('Ошибка при удалении');
    }
}

async function deleteEdge(fromId, toId) {
    const response = await fetch(`/api/edge/${fromId}/${toId}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    if (data.status === 'ok') {
        alert('Маршрут удалён');
        await loadAllEdges();
        await drawAllEdges();
        if (currentRoutes.length > 0) {
            await searchRoutes();
        }
    } else {
        alert('Ошибка при удалении маршрута');
    }
}

async function editEdge(fromId, toId, newTime, newCost, newComfort) {
    const response = await fetch(`/api/edge/${fromId}/${toId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTime, cost: newCost, comfort: newComfort })
    });
    const data = await response.json();
    if (data.status === 'ok') {
        alert('Маршрут обновлён');
        await loadAllEdges();
        await drawAllEdges();
        if (currentRoutes.length > 0) {
            await searchRoutes();
        }
    } else {
        alert('Ошибка при обновлении');
    }
}

async function onMarkerClick(stop) {
    if (addEdgeMode) {
        if (selectedFromStop === null) {
            selectedFromStop = stop;
            alert(`Выбрано от: ${stop.name}. Теперь кликните на остановку Б`);
        } else {
            const toStop = stop;
            const time = parseFloat(prompt(`Введите время (мин) от ${selectedFromStop.name} до ${toStop.name}:`, '2'));
            const cost = parseInt(prompt(`Введите стоимость (руб):`, '50'));
            const comfort = parseInt(prompt(`Введите комфорт (1-10):`, '8'));
            if (!isNaN(time) && !isNaN(cost) && !isNaN(comfort)) {
                const response = await fetch('/api/edge/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: selectedFromStop.id,
                        to: toStop.id,
                        time: time,
                        time_min: time * 0.7,
                        time_max: time * 1.5,
                        cost: cost,
                        comfort: comfort
                    })
                });
                const data = await response.json();
                if (data.status === 'ok') {
                    alert('Маршрут добавлен!');
                    await loadStops();
                    await loadAllEdges();
                    await drawAllEdges();
                    addMarkers();
                    if (currentRoutes.length > 0) {
                        await searchRoutes();
                    }
                } else {
                    alert('Ошибка');
                }
            }
            addEdgeMode = false;
            const addEdgeBtn = document.getElementById('addEdgeBtn');
            if (addEdgeBtn) addEdgeBtn.style.background = '#27ae60';
            map.getContainer().style.cursor = '';
            selectedFromStop = null;
        }
    }
}