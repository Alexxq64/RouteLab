// static/map-stop-add.js

function initStopAddHandlers() {
    map.on('click', async (e) => {
        if (typeof addStopMode !== 'undefined' && addStopMode) {
            const name = prompt('Введите название остановки:');
            if (!name) return;
            const { lat, lng } = e.latlng;
            await fetch('/api/stop/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lat, lng })
            });
            alert('Остановка добавлена!');
            await loadStops();
            await loadAllEdges();
            await drawAllEdges();
            addMarkers();
            if (currentRoutes.length > 0) {
                await searchRoutes();
            }
        }
    });
}