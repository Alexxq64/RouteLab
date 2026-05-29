# dijkstra.py

import heapq

from graph import load_graph


# Алгоритм Дейкстры
def dijkstra(graph, start_node, end_node):

    # Бесконечность
    infinity = float("inf")

    # Словарь расстояний
    distances = {}

    # Предыдущие вершины
    previous = {}

    # Инициализация расстояний
    for node_id in graph.nodes:

        distances[node_id] = infinity
        previous[node_id] = None

    # Стартовая вершина
    distances[start_node] = 0

    # Очередь с приоритетом
    priority_queue = []

    # Добавление стартовой вершины
    heapq.heappush(priority_queue, (0, start_node))

    # Основной цикл
    while priority_queue:

        # Извлечение вершины
        current_distance, current_node = heapq.heappop(priority_queue)

        # Пропуск устаревших записей
        if current_distance > distances[current_node]:
            continue

        # Если достигли конечной вершины
        if current_node == end_node:
            break

        # Обход соседей
        for edge in graph.adjacency[current_node]:

            # Следующая вершина
            neighbor = edge.to_node

            # Новое расстояние
            new_distance = current_distance + edge.time

            # Проверка улучшения
            if new_distance < distances[neighbor]:

                # Обновление расстояния
                distances[neighbor] = new_distance

                # Сохранение предыдущей вершины
                previous[neighbor] = current_node

                # Добавление в очередь
                heapq.heappush(
                    priority_queue,
                    (new_distance, neighbor)
                )

    # Восстановление пути
    path = []

    current = end_node

    while current is not None:

        path.append(current)

        current = previous[current]

    # Разворот пути
    path.reverse()

    return path, distances[end_node]


# Точка входа
if __name__ == "__main__":

    # Загрузка графа
    graph = load_graph("data/graph_real.json")

    # Стартовая вершина
    start = 0

    # Конечная вершина
    end = 4

    # Поиск маршрута
    path, total_time = dijkstra(graph, start, end)

    # Вывод маршрута
    print("PATH:")

    print(" -> ".join(map(str, path)))

    print()

    # Вывод времени
    print("TOTAL TIME:")

    print(total_time)