# graph.py

import json


# Класс остановки
class Node:

    # Инициализация остановки
    def __init__(self, node_id, name, lat, lon):
        self.id = node_id
        self.name = name
        self.lat = lat
        self.lon = lon

    # Строковое представление
    def __repr__(self):
        return f"Node(id={self.id}, name='{self.name}')"


# Класс ребра графа
class Edge:

    # Инициализация ребра
    def __init__(
        self,
        from_node,
        to_node,
        time,
        cost,
        comfort,
        time_min,
        time_max
    ):
        self.from_node = from_node
        self.to_node = to_node
        self.time = time
        self.cost = cost
        self.comfort = comfort
        self.time_min = time_min
        self.time_max = time_max

    # Строковое представление
    def __repr__(self):
        return (
            f"Edge(from={self.from_node}, "
            f"to={self.to_node}, "
            f"time={self.time})"
        )


# Класс графа
class Graph:

    # Инициализация графа
    def __init__(self):

        # Словарь вершин
        self.nodes = {}

        # Список рёбер
        self.edges = []

        # Список смежности
        self.adjacency = {}

    # Добавление вершины
    def add_node(self, node):

        self.nodes[node.id] = node

        # Создание пустого списка смежности
        if node.id not in self.adjacency:
            self.adjacency[node.id] = []

    # Добавление ребра
    def add_edge(self, edge):

        self.edges.append(edge)

        # Добавление ребра в список смежности
        self.adjacency[edge.from_node].append(edge)


# Загрузка графа из JSON
def load_graph(file_path):

    # Создание графа
    graph = Graph()

    # Открытие JSON файла
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Загрузка вершин
    for node_data in data["nodes"]:

        node = Node(
            node_id=node_data["id"],
            name=node_data["name"],
            lat=node_data["lat"],
            lon=node_data["lon"]
        )

        graph.add_node(node)

    # Загрузка рёбер
    for edge_data in data["edges"]:

        edge = Edge(
            from_node=edge_data["from"],
            to_node=edge_data["to"],
            time=edge_data["time"],
            cost=edge_data["cost"],
            comfort=edge_data["comfort"],
            time_min=edge_data["time_min"],
            time_max=edge_data["time_max"]
        )

        graph.add_edge(edge)

    return graph


# Точка входа
if __name__ == "__main__":

    # Загрузка графа
    graph = load_graph("data/graph.json")

    # Вывод вершин
    print("NODES:")

    for node in graph.nodes.values():
        print(node)

    print()

    # Вывод рёбер
    print("EDGES:")

    for edge in graph.edges:
        print(edge)

    print()

    # Вывод списка смежности
    print("ADJACENCY:")

    for node_id, edges in graph.adjacency.items():

        print(f"{node_id} -> {edges}")