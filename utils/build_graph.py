# utils/build_graph.py
import json
import requests
import time
import math

def load_stops():
    with open("data/nodes.json", "r", encoding="utf-8") as f:
        return json.load(f)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def get_osrm_route(lat1, lon1, lat2, lon2):
    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data['code'] == 'Ok' and data['routes']:
                route = data['routes'][0]
                duration = route['duration']
                geometry = []
                for coord in route['geometry']['coordinates']:
                    geometry.append({"lat": coord[1], "lon": coord[0]})
                return duration / 60, geometry
    except:
        pass
    return None, None

def build_graph():
    stops = load_stops()
    print(f"Загружено остановок: {len(stops)}")
    
    nodes = []
    for i, s in enumerate(stops):
        nodes.append({
            "id": i,
            "name": s["name"],
            "lat": s["lat"],
            "lon": s["lon"]
        })
    
    edges = []
    edge_set = set()
    
    for i in range(len(stops)):
        dists = []
        for j in range(len(stops)):
            if i == j:
                continue
            d = haversine(stops[i]["lat"], stops[i]["lon"], stops[j]["lat"], stops[j]["lon"])
            dists.append((j, d))
        dists.sort(key=lambda x: x[1])
        
        found = 0
        for j, d in dists:
            if found >= 3:
                break
            
            key = tuple(sorted((i, j)))
            if key in edge_set:
                continue
            
            print(f"{stops[i]['name'][:20]} → {stops[j]['name'][:20]}")
            
            time_min, geometry = get_osrm_route(stops[i]["lat"], stops[i]["lon"], stops[j]["lat"], stops[j]["lon"])
            
            if time_min:
                edge_set.add(key)
                edges.append({
                    "from": i, "to": j,
                    "time": round(time_min, 1),
                    "time_min": round(time_min * 0.7, 1),
                    "time_max": round(time_min * 1.5, 1),
                    "cost": max(1, int(time_min)),
                    "comfort": 5,
                    "geometry": geometry
                })
                edges.append({
                    "from": j, "to": i,
                    "time": round(time_min, 1),
                    "time_min": round(time_min * 0.7, 1),
                    "time_max": round(time_min * 1.5, 1),
                    "cost": max(1, int(time_min)),
                    "comfort": 5,
                    "geometry": list(reversed(geometry))
                })
                print(f"  ✅ добавлено ({round(time_min,1)} мин)")
                found += 1
            else:
                print(f"  ❌ нет маршрута, ищем дальше")
            
            time.sleep(0.2)
    
    graph = {"nodes": nodes, "edges": edges}
    
    with open("data/graph_real.json", "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Сохранено: {len(nodes)} узлов, {len(edges)} рёбер")

if __name__ == "__main__":
    build_graph()