# stochastic.py

import random
from graph import load_graph
from pareto import pareto_search


def estimate_route_time(graph, route, simulations=100):
    """
    Оценка времени маршрута методом стохастических симуляций.

    Параметры:
        graph: объект Graph
        route: список id вершин (путь)
        simulations: количество симуляций

    Возвращает:
        dict: {'avg': float, 'min': float, 'max': float}
    """
    # Получить список рёбер маршрута
    edges = []
    for i in range(len(route) - 1):
        from_id = route[i]
        to_id = route[i + 1]
        # найти ребро
        for edge in graph.adjacency[from_id]:
            if edge.to_node == to_id:
                edges.append(edge)
                break

    # Симуляции
    times = []
    for _ in range(simulations):
        total = 0
        for edge in edges:
            t = random.uniform(edge.time_min, edge.time_max)
            total += t
        times.append(total)

    return {
        'avg': round(sum(times) / simulations, 1),
        'min': round(min(times), 1),
        'max': round(max(times), 1)
    }


def enrich_routes_with_stochastic(graph, routes, simulations=100):
    """
    Обогащает маршруты стохастическими оценками времени.

    Параметры:
        graph: объект Graph
        routes: список маршрутов от pareto_search (time, cost, comfort, path)
        simulations: количество симуляций

    Возвращает:
        список словарей с маршрутами
    """
    enriched = []
    for time, cost, comfort, path in routes:
        stats = estimate_route_time(graph, path, simulations)
        enriched.append({
            'path': path,
            'time_det': time,
            'time_avg': stats['avg'],
            'time_min': stats['min'],
            'time_max': stats['max'],
            'cost': cost,
            'comfort': comfort
        })
    return enriched


# Точка входа для теста
if __name__ == "__main__":
    # Загрузка графа
    graph = load_graph("data/graph.json")

    # Парето-поиск от 0 до 19
    routes = pareto_search(graph, 0, 19)

    # Добавление стохастики
    enriched = enrich_routes_with_stochastic(graph, routes, simulations=100)

    # Вывод результатов
    print("МАРШРУТЫ СО СТОХАСТИЧЕСКОЙ ОЦЕНКОЙ ВРЕМЕНИ:\n")
    for i, r in enumerate(enriched, 1):
        print(f"{i}. {' -> '.join(map(str, r['path']))}")
        print(f"   Детерминированное время: {r['time_det']} мин")
        print(f"   Вероятностная оценка: {r['time_avg']} мин (от {r['time_min']} до {r['time_max']} мин)")
        print(f"   Стоимость: {r['cost']} руб")
        print(f"   Комфорт: {r['comfort']}")
        print()