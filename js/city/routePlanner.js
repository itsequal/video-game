export function createPlanner(city) {
  let route = [city.entry];

  function last() {
    return route[route.length - 1];
  }

  function projectedFuel() {
    let total = 0;
    for (let i = 0; i < route.length - 1; i += 1) {
      total += city.graph.weight(route[i], route[i + 1]);
    }
    return total;
  }

  function reachable() {
    if (isComplete()) return [];
    return city.graph.neighbors(last()).filter((id) => {
      return !route.includes(id) && city.nodes[id].type !== "blocked";
    });
  }

  function isComplete() {
    return last() === city.exit;
  }

  return {
    getRoute() {
      return [...route];
    },
    projectedFuel,
    reachable,
    isComplete,
    tryAdd(nodeId) {
      if (isComplete()) return { ok: false, reason: "done" };
      if (route.includes(nodeId)) return { ok: false, reason: "repeat" };
      if (!city.graph.hasEdge(last(), nodeId)) return { ok: false, reason: "no-edge" };
      if (city.nodes[nodeId].type === "blocked") return { ok: false, reason: "blocked" };
      route = [...route, nodeId];
      return { ok: true, route: [...route], complete: nodeId === city.exit };
    },
    undo() {
      if (route.length > 1) route = route.slice(0, -1);
      return [...route];
    },
    reset() {
      route = [city.entry];
      return [...route];
    },
  };
}
