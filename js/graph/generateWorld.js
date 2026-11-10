import { Graph } from "./Graph.js";
import { TOWN_NAMES } from "../content/names.js";

function columnY(index, count) {
  if (count === 1) return 50;
  const top = 24;
  const bottom = 78;
  return top + (index * (bottom - top)) / (count - 1);
}

export function forwardNeighbors(world, townId) {
  const town = world.towns[townId];
  return world.graph
    .neighbors(townId)
    .map((id) => world.towns[id])
    .filter((next) => next.col === town.col + 1);
}

export function generateWorld(rng) {
  const counts = [1, rng.randInt(2, 3), rng.randInt(2, 3), rng.randInt(2, 3), rng.randInt(2, 3), 1];
  const names = rng.shuffle(TOWN_NAMES);
  const profileBag = rng.shuffle(["clinic", "station", "market", "colonial"]);
  let nameIndex = 0;
  let profileIndex = 0;
  const columns = counts.map((count, col) => {
    const towns = [];
    for (let row = 0; row < count; row += 1) {
      const id = `c${col}r${row}`;
      let name;
      let profile;
      if (col === 0) {
        name = "Asentamiento El Mirador";
        profile = "refuge";
      } else if (col === counts.length - 1) {
        name = "Ciudad de la Resistencia";
        profile = "final";
      } else {
        name = names[nameIndex % names.length];
        nameIndex += 1;
        profile = profileBag[profileIndex % profileBag.length];
        profileIndex += 1;
      }
      towns.push({
        id,
        name,
        profile,
        col,
        row,
        x: 9 + col * 16.4,
        y: columnY(row, count),
      });
    }
    return towns;
  });

  const graph = new Graph();
  const towns = {};
  for (const column of columns) {
    for (const town of column) {
      graph.addNode(town.id);
      towns[town.id] = town;
    }
  }

  const roads = [];
  const seen = new Set();
  function addRoad(from, to) {
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (seen.has(key)) return;
    seen.add(key);
    graph.addEdge(from, to, 1);
    roads.push({ from, to, bend: rng.randInt(-8, 8) });
  }

  for (let col = 0; col < columns.length - 1; col += 1) {
    const hasIn = new Set();
    for (const town of columns[col]) {
      const dest = rng.pick(columns[col + 1]);
      addRoad(town.id, dest.id);
      hasIn.add(dest.id);
    }
    for (const town of columns[col + 1]) {
      if (!hasIn.has(town.id)) {
        addRoad(rng.pick(columns[col]).id, town.id);
        hasIn.add(town.id);
      }
    }
    if (rng.chance(0.55)) addRoad(rng.pick(columns[col]).id, rng.pick(columns[col + 1]).id);
  }

  return {
    towns,
    list: Object.values(towns),
    roads,
    graph,
    columns,
    startId: columns[0][0].id,
    goalId: columns[columns.length - 1][0].id,
  };
}
