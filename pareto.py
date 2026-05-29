# pareto.py

import heapq
from itertools import count

from graph import load_graph


# Проверка доминирования
def dominates(a, b):
    return (
        a[0] <= b[0] and
        a[1] <= b[1] and
        a[2] <= b[2] and
        (a[0] < b[0] or a[1] < b[1] or a[2] < b[2])
    )


# Добавление состояния в Pareto список вершины
def add_state(pareto_list, new_state):
    # удалить старые состояния, которые доминируются новым
    pareto_list[:] = [s for s in pareto_list if not dominates(new_state, s)]

    # если новое состояние доминируется хоть одним старым — отклоняем
    for s in pareto_list:
        if dominates(s, new_state):
            return False

    pareto_list.append(new_state)
    return True


# Pareto multi-label Dijkstra
def pareto_search(graph, start_node, end_node):
    # счётчик для однозначного сравнения в heapq
    counter = count()

    # очередь: (time, cost, comfort, counter, node, path)
    queue = []
    heapq.heappush(queue, (0, 0, 0, next(counter), start_node, [start_node]))

    # Pareto множества по вершинам: key = node, value = список состояний (time, cost, comfort)
    pareto = {}

    # результаты (только конечные пути)
    results = []

    while queue:
        time, cost, comfort, _, node, path = heapq.heappop(queue)

        state = (time, cost, comfort)

        if node not in pareto:
            pareto[node] = []

        if not add_state(pareto[node], state):
            continue

        if node == end_node:
            results.append((time, cost, comfort, path))

        for edge in graph.adjacency[node]:
            next_node = edge.to_node
            new_state = (
                time + edge.time,
                cost + edge.cost,
                comfort + edge.comfort,
                next(counter),
                next_node,
                path + [next_node]
            )
            heapq.heappush(queue, new_state)

    return results


# Точка входа
if __name__ == "__main__":
    graph = load_graph("data/graph_real.json")

    start = 0
    end = 19

    results = pareto_search(graph, start, end)

    print("PARETO ROUTES:")
    for r in results:
        time, cost, comfort, path = r
        print("PATH:", " -> ".join(map(str, path)))
        print("TIME:", time)
        print("COST:", cost)
        print("COMFORT:", comfort)
        print()