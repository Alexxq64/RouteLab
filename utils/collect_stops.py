# utils/collect_stops.py

import requests
import json
import time
import hashlib

def make_id(lat, lon):
    key = f"{lat:.6f},{lon:.6f}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]

def collect_nodes(center_lat, center_lon, radius_m=600, max_retries=2):
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    query = f"""
    [out:json];
    (
      // Остановки
      node["highway"="bus_stop"](around:{radius_m},{center_lat},{center_lon});
      node["public_transport"="platform"](around:{radius_m},{center_lat},{center_lon});
      node["amenity"="bus_station"](around:{radius_m},{center_lat},{center_lon});
      
      // Перекрёстки и развилки
      node["highway"="motorway_junction"](around:{radius_m},{center_lat},{center_lon});
      node["junction"="roundabout"](around:{radius_m},{center_lat},{center_lon});
    );
    out body;
    """
    
    headers = {'User-Agent': 'RouteLab/1.0 (educational)'}
    
    for attempt in range(max_retries):
        print(f"Попытка {attempt+1}, радиус {radius_m} м...")
        try:
            response = requests.post(overpass_url, data=query, headers=headers, timeout=30)
            print(f"Статус: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get('elements', [])
                print(f"Найдено элементов: {len(elements)}")
                
                nodes = []
                seen = set()
                for idx, element in enumerate(elements):
                    tags = element.get('tags', {})
                    name = tags.get('name', '')
                    
                    lat, lon = element['lat'], element['lon']
                    
                    # Определяем тип узла
                    if tags.get('highway') == 'bus_stop' or tags.get('public_transport') == 'platform' or tags.get('amenity') == 'bus_station':
                        node_type = 'stop'
                        if not name:
                            name = f"Остановка_{idx}"
                    elif tags.get('junction') == 'roundabout':
                        node_type = 'roundabout'
                        if not name:
                            name = f"Кольцо_{idx}"
                    elif tags.get('highway') == 'motorway_junction':
                        node_type = 'junction'
                        if not name:
                            name = f"Развязка_{idx}"
                    else:
                        node_type = 'junction'
                        if not name:
                            name = f"Узел_{idx}"
                    
                    key = (round(lat, 6), round(lon, 6))
                    if key not in seen:
                        seen.add(key)
                        node_id = make_id(lat, lon)
                        nodes.append({
                            'id': node_id,
                            'name': name,
                            'lat': lat,
                            'lon': lon,
                            'type': node_type
                        })
                return nodes
            else:
                print(f"Ошибка {response.status_code}, повтор через 2 сек...")
                time.sleep(2)
        except Exception as e:
            print(f"Исключение: {e}")
            time.sleep(2)
    
    return []

def save_nodes_to_json(nodes, filename="data/nodes.json"):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
    print(f"Сохранено {len(nodes)} узлов в {filename}")

if __name__ == "__main__":
    center_lat = 55.538
    center_lon = 37.542
    radius = 1200
    
    print("Сбор узлов (остановки + перекрёстки) в Южном Бутово...")
    nodes = collect_nodes(center_lat, center_lon, radius)
    
    if nodes:
        save_nodes_to_json(nodes)
        print("\nНайденные узлы:")
        for node in nodes:
            print(f"{node['id']}: {node['name']} ({node['type']}) - {node['lat']}, {node['lon']}")
    else:
        print("Узлы не найдены. Попробуйте увеличить радиус.")