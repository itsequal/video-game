export function createPlanner(city) {
  let route = [city.entry];

  function last() {
    return route[route.length - 1];
  }

  function previous() {
    return route.length >= 2 ? route[route.length - 2] : null;
  }

  function projectedFuel() {
    let total = 0;
    for (let i = 0; i < route.length - 1; i += 1) {
      total += city.graph.weight(route[i], route[i + 1]);
    }
    return total;
  }

  function canReturn(nodeId) {
    if (nodeId == null || nodeId !== previous()) return false;
    if (!city.graph.hasEdge(last(), nodeId)) return false;
    return city.nodes[nodeId].type !== "blocked";
  }

  function reachable() {
    const open = [];
    if (!isComplete()) {
      for (const id of city.graph.neighbors(last())) {
        if (route.includes(id) || city.nodes[id].type === "blocked") continue;
        open.push(id);
      }
    }
    const back = previous();
    if (canReturn(back)) open.push(back);
    return open;
  }

  function isComplete() {
    return last() === city.exit;
  }

  function append(nodeId) {
    route = [...route, nodeId];
    return { ok: true, route: [...route], complete: nodeId === city.exit };
  }

  return {
    getRoute() {
      return [...route];
    },
    projectedFuel,
    reachable,
    isComplete,
    tryAdd(nodeId) {
      if (canReturn(nodeId)) return append(nodeId);
      if (isComplete()) return { ok: false, reason: "done" };
      const hasEdge = city.graph.hasEdge(last(), nodeId);
      if (nodeId === previous()) {
        if (!hasEdge) return { ok: false, reason: "no-edge" };
        return { ok: false, reason: "blocked" };
      }
      const seen = route.includes(nodeId);
      if (seen && nodeId !== last() && !hasEdge) return { ok: false, reason: "no-edge" };
      if (seen) return { ok: false, reason: "repeat" };
      if (!hasEdge) return { ok: false, reason: "no-edge" };
      if (city.nodes[nodeId].type === "blocked") return { ok: false, reason: "blocked" };
      return append(nodeId);
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
