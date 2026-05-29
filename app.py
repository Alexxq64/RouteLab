# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from graph import load_graph
from pareto import pareto_search
from stochastic import enrich_routes_with_stochastic

import json

app = Flask(__name__)
CORS(app)

print("Загрузка графа...")
graph = load_graph("data/graph_real.json")
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

@app.route('/api/edges', methods=['GET'])
def get_edges():
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    return jsonify(graph_data['edges'])

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

    if enriched and len(enriched) > 0:
        max_time = max(r['time_avg'] for r in enriched)
        max_cost = max(r['cost'] for r in enriched)
        max_comfort = max(r['comfort'] for r in enriched)

        if max_time == 0 or max_cost == 0:
            return jsonify({'routes': enriched})

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

@app.route('/api/stop/add', methods=['POST'])
def add_stop():
    data = request.json
    name = data['name']
    lat = data['lat']
    lon = data['lng']
    
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    new_id = max(n['id'] for n in graph_data['nodes']) + 1
    
    graph_data['nodes'].append({
        'id': new_id,
        'name': name,
        'lat': lat,
        'lon': lon
    })
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok', 'id': new_id})

@app.route('/api/stop/<int:stop_id>', methods=['PUT'])
def update_stop(stop_id):
    data = request.json
    new_name = data.get('name')
    new_lat = data.get('lat')
    new_lon = data.get('lon')
    
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    for node in graph_data['nodes']:
        if node['id'] == stop_id:
            if new_name is not None:
                node['name'] = new_name
            if new_lat is not None:
                node['lat'] = new_lat
            if new_lon is not None:
                node['lon'] = new_lon
            break
    else:
        return jsonify({'status': 'error', 'message': 'Остановка не найдена'}), 404
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok'})

@app.route('/api/stop/<int:stop_id>', methods=['DELETE'])
def delete_stop(stop_id):
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    new_nodes = [n for n in graph_data['nodes'] if n['id'] != stop_id]
    new_edges = [e for e in graph_data['edges'] if e['from'] != stop_id and e['to'] != stop_id]
    
    if len(new_nodes) == len(graph_data['nodes']):
        return jsonify({'status': 'error', 'message': 'Остановка не найдена'}), 404
    
    graph_data['nodes'] = new_nodes
    graph_data['edges'] = new_edges
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok'})

@app.route('/api/edge/add', methods=['POST'])
def add_edge():
    data = request.json
    from_id = data['from']
    to_id = data['to']
    time_val = data['time']
    time_min = data['time_min']
    time_max = data['time_max']
    cost = data['cost']
    comfort = data['comfort']
    
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    new_edge = {
        'from': from_id,
        'to': to_id,
        'time': time_val,
        'time_min': time_min,
        'time_max': time_max,
        'cost': cost,
        'comfort': comfort
    }
    
    graph_data['edges'].append(new_edge)
    
    reverse_edge = {
        'from': to_id,
        'to': from_id,
        'time': time_val,
        'time_min': time_min,
        'time_max': time_max,
        'cost': cost,
        'comfort': comfort
    }
    
    graph_data['edges'].append(reverse_edge)
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok'})

@app.route('/api/edge/<int:from_id>/<int:to_id>', methods=['PUT'])
def update_edge(from_id, to_id):
    data = request.json
    new_time = data.get('time')
    new_cost = data.get('cost')
    new_comfort = data.get('comfort')
    
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    found = False
    for edge in graph_data['edges']:
        if edge['from'] == from_id and edge['to'] == to_id:
            if new_time is not None:
                edge['time'] = new_time
                edge['time_min'] = round(new_time * 0.7, 1)
                edge['time_max'] = round(new_time * 1.5, 1)
            if new_cost is not None:
                edge['cost'] = new_cost
            if new_comfort is not None:
                edge['comfort'] = new_comfort
            found = True
    
    if not found:
        return jsonify({'status': 'error', 'message': 'Маршрут не найден'}), 404
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok'})

@app.route('/api/edge/<int:from_id>/<int:to_id>', methods=['DELETE'])
def delete_edge(from_id, to_id):
    with open('data/graph_real.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    original_count = len(graph_data['edges'])
    
    graph_data['edges'] = [
        e for e in graph_data['edges']
        if not (e['from'] == from_id and e['to'] == to_id)
    ]
    
    if len(graph_data['edges']) == original_count:
        return jsonify({'status': 'error', 'message': 'Маршрут не найден'}), 404
    
    with open('data/graph_real.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    
    global graph
    graph = load_graph('data/graph_real.json')
    
    return jsonify({'status': 'ok'})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)