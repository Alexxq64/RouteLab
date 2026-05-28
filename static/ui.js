// static/ui.js

function displayRoutes(routes) {
    const container = document.getElementById('routesList');
    container.innerHTML = '';
    routes.forEach((route, idx) => {
        const card = document.createElement('div');
        card.className = 'route-card';
        if (idx === 0) card.classList.add('selected');
        card.onclick = () => {
            document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentSelectedRoute = idx;
            drawRoutesWithOSRM(routes, idx);
        };
        const pathStr = route.path.join(' → ');
        const timeRange = `${route.time_min}–${route.time_max}`;
        card.innerHTML = `
            <div class="route-path">${pathStr}</div>
            <div class="route-stats">
                <div class="stat"><div class="value">${route.time_avg} мин</div><div class="label">среднее</div></div>
                <div class="stat"><div class="value">${timeRange} мин</div><div class="label">диапазон</div></div>
                <div class="stat"><div class="value">${route.cost} ₽</div><div class="label">стоимость</div></div>
                <div class="stat"><div class="value">${route.comfort}</div><div class="label">комфорт</div></div>
            </div>
        `;
        container.appendChild(card);
    });
    if (routes.length > 0) drawRoutesWithOSRM(routes, 0);
}

function getWeights() {
    const time = parseFloat(document.getElementById('weightTime').value);
    const cost = parseFloat(document.getElementById('weightCost').value);
    const comfort = parseFloat(document.getElementById('weightComfort').value);
    const sum = time + cost + comfort;
    return { time: time / sum, cost: cost / sum, comfort: comfort / sum };
}

function updateSliderValues() {
    document.getElementById('timeVal').textContent = parseFloat(document.getElementById('weightTime').value).toFixed(2);
    document.getElementById('costVal').textContent = parseFloat(document.getElementById('weightCost').value).toFixed(2);
    document.getElementById('comfortVal').textContent = parseFloat(document.getElementById('weightComfort').value).toFixed(2);
}