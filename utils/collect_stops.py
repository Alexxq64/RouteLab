import requests
import json
import time

def collect_stops(center_lat, center_lon, radius_m=600, max_retries=2):
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    query = f"""
    [out:json];
    (
      node["highway"="bus_stop"](around:{radius_m},{center_lat},{center_lon});
      node["public_transport"="platform"](around:{radius_m},{center_lat},{center_lon});
      node["amenity"="bus_station"](around:{radius_m},{center_lat},{center_lon});
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
                
                stops = []
                for idx, element in enumerate(elements):
                    tags = element.get('tags', {})
                    name = tags.get('name', '')
                    if not name:
                        name = f"Stop_{idx}"
                    
                    # Пропускаем дубликаты по координатам
                    lat, lon = element['lat'], element['lon']
                    if not any(s['lat'] == lat and s['lon'] == lon for s in stops):
                        stops.append({
                            'id': len(stops),
                            'name': name,
                            'lat': lat,
                            'lon': lon
                        })
                return stops
            else:
                print(f"Ошибка {response.status_code}, повтор через 2 сек...")
                time.sleep(2)
        except Exception as e:
            print(f"Исключение: {e}")
            time.sleep(2)
    
    return []

def save_stops_to_json(stops, filename="data/real_stops.json"):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(stops, f, ensure_ascii=False, indent=2)
    print(f"Сохранено {len(stops)} остановок в {filename}")

if __name__ == "__main__":
    center_lat = 55.538
    center_lon = 37.542
    radius = 1200
    
    print("Сбор остановок в центре Москвы...")
    stops = collect_stops(center_lat, center_lon, radius)
    
    if stops:
        save_stops_to_json(stops)
        print("\nНайденные остановки:")
        for stop in stops:
            print(f"{stop['id']}: {stop['name']} ({stop['lat']}, {stop['lon']})")
    else:
        print("Остановки не найдены. Попробуйте увеличить радиус.")