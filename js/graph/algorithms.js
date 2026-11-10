export function bfsReachable(graph, start, isBlocked = () => false) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    for (const next of graph.neighbors(id)) {
      if (seen.has(next) || isBlocked(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

export function dijkstraMinFuel(graph, isBlocked, start, goal) {
  const dist = new Map();
  const prev = new Map();
  for (const id of graph.nodeIds()) dist.set(id, Infinity);
  dist.set(start, 0);
  const queue = [{ id: start, d: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.d - b.d);
    const current = queue.shift();
    if (current.d !== dist.get(current.id)) continue;
    if (current.id === goal) break;
    for (const next of graph.neighbors(current.id)) {
      if (isBlocked(next)) continue;
      const cost = current.d + graph.weight(current.id, next);
      if (cost < dist.get(next)) {
        dist.set(next, cost);
        prev.set(next, current.id);
        queue.push({ id: next, d: cost });
      }
    }
  }

  const path = [];
  if (dist.get(goal) < Infinity) {
    let cursor = goal;
    while (cursor != null) {
      path.push(cursor);
      cursor = prev.get(cursor);
    }
    path.reverse();
  }

  return { cost: dist.get(goal) ?? Infinity, path };
}
