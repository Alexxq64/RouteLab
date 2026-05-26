# utils/build_graph.py

import json
import requests
import math
import time
import random

def load_stops(filename="data/real_stops.json"):
    with open(filename, 'r', encoding='utf-8') as f:
        stops = json.load(f)
    print(f"Загружено остановок: {len(stops)}")
    return stops

def group_by_name_and_average_coords(stops):
    groups = {}
    for stop in stops:
        name = stop['name']
        if name not in groups:
            groups[name] = []
        groups[name].append((stop['lat'], stop['lon']))
    
    unique_stops = []
    for idx, (name, coords) in enumerate(groups.items()):
        avg_lat = sum(lat for lat, _ in coords) / len(coords)
        avg_lon = sum(lon for _, lon in coords) / len(coords)
        unique_stops.append({
            'id': idx,
            'name': name,
            'lat': avg_lat,
            'lon': avg_lon
        })
    
    print(f"После группировки по названиям: {len(unique_stops)} остановок")
    return unique_stops

def find_all_edges_within_radius(stops, max_distance_m=800):
    edges = []
    n = len(stops)
    for i in range(n):
        for j in range(i + 1, n):
            lat1, lon1 = stops[i]['lat'], stops[i]['lon']
            lat2, lon2 = stops[j]['lat'], stops[j]['lon']
            dist = math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111000
            if dist < max_distance_m:
                edges.append((i, j, dist))
    print(f"Сформировано рёбер (все в радиусе): {len(edges)}")
    return edges

def get_osrm_time(lon1, lat1, lon2, lat2, retries=2):
    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 'Ok':
                    duration = data['routes'][0]['duration'] / 60
                    return round(duration, 1)
            time.sleep(1)
        except Exception as e:
            print(f"  OSRM ошибка: {e}")
            time.sleep(1)
    return None

def enrich_edges_with_osrm(stops, edges):
    enriched = []
    total = len(edges)
    random.seed(42)
    for idx, (from_id, to_id, dist) in enumerate(edges):
        name_from = stops[from_id]['name']
        name_to = stops[to_id]['name']
        lon1, lat1 = stops[from_id]['lon'], stops[from_id]['lat']
        lon2, lat2 = stops[to_id]['lon'], stops[to_id]['lat']
        
        print(f"[{idx+1}/{total}] {name_from} -> {name_to}")
        time_val = get_osrm_time(lon1, lat1, lon2, lat2)
        
        if time_val is None:
            time_val = round(dist / 500 * 2, 1)
            print(f"  → OSRM не ответил, заглушка: {time_val} мин")
        else:
            print(f"  → OSRM: {time_val} мин")
        
        cost = random.randint(30, 70)
        comfort = random.randint(5, 10)
        
        enriched.append({
            'from': from_id,
            'to': to_id,
            'time': time_val,
            'time_min': round(time_val * 0.7, 1),
            'time_max': round(time_val * 1.5, 1),
            'cost': cost,
            'comfort': comfort
        })
    return enriched

def save_graph(stops, edges, filename="data/graph_real.json"):
    nodes = []
    for stop in stops:
        nodes.append({
            'id': stop['id'],
            'name': stop['name'],
            'lat': stop['lat'],
            'lon': stop['lon']
        })
    
    graph = {
        'nodes': nodes,
        'edges': edges
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    
    print(f"Граф сохранён в {filename} (вершин: {len(nodes)}, рёбер: {len(edges)})")

def main():
    print("1. Загрузка остановок...")
    stops = load_stops()
    
    print("2. Группировка по названиям и усреднение координат...")
    stops_grouped = group_by_name_and_average_coords(stops)
    
    print("3. Построение всех связей в радиусе 800 м...")
    edges = find_all_edges_within_radius(stops_grouped, max_distance_m=800)
    
    print("4. Получение времени через OSRM...")
    edges_with_time = enrich_edges_with_osrm(stops_grouped, edges)
    
    print("5. Добавление обратных рёбер...")
    edges_with_both = edges_with_time.copy()
    for edge in edges_with_time:
        edges_with_both.append({
            'from': edge['to'],
            'to': edge['from'],
            'time': edge['time'],
            'time_min': edge['time_min'],
            'time_max': edge['time_max'],
            'cost': edge['cost'],
            'comfort': edge['comfort']
        })
    
    print("6. Сохранение графа...")
    save_graph(stops_grouped, edges_with_both)

if __name__ == "__main__":
    main()