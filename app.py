# app.py

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from graph import load_graph
from pareto import pareto_search
from stochastic import enrich_routes_with_stochastic


app = Flask(__name__)
CORS(app)

print("Загрузка графа...")
graph = load_graph("data/graph.json")
print(f"Граф загружен: {len(graph.nodes)} вершин, {len(graph.edges)} рёбер")


@app.route('/api/stops', methods=['GET'])
def get_stops():
    stops = []
    for node_id, node in graph.nodes.items():
        stops.append({
            'id': node_id,
            'name': node.name,
            'lat': node.lat,
            'lon': node.lon
        })
    return jsonify(stops)


@app.route('/api/route', methods=['POST'])
def get_route():
    data = request.json
    start = data.get('from')
    end = data.get('to')
    weights = data.get('weights', {'time': 0.5, 'cost': 0.3, 'comfort': 0.2})

    if start is None or end is None:
        return jsonify({'error': 'Не указаны начальная или конечная остановка'}), 400

    routes = pareto_search(graph, start, end)

    if not routes:
        return jsonify({'routes': [], 'message': 'Маршруты не найдены'})

    enriched = enrich_routes_with_stochastic(graph, routes, simulations=100)

    if enriched:
        max_time = max(r['time_avg'] for r in enriched)
        max_cost = max(r['cost'] for r in enriched)
        max_comfort = max(r['comfort'] for r in enriched)

        for r in enriched:
            score = (
                weights['time'] * (r['time_avg'] / max_time) +
                weights['cost'] * (r['cost'] / max_cost) +
                weights['comfort'] * (1 - r['comfort'] / max_comfort)
            )
            r['score'] = round(score, 4)

        enriched.sort(key=lambda x: x['score'])

    return jsonify({'routes': enriched})


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'nodes': len(graph.nodes), 'edges': len(graph.edges)})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)