import { CONFIG } from "../config.js";
import { createRng } from "../rng.js";
import { weightedPick } from "../rng.js";
import { Graph } from "./Graph.js";
import { dijkstraMinFuel } from "./algorithms.js";
import { pickPlaceName } from "../content/names.js";

const IDS = ["entry", "a", "b", "c", "d", "exit"];
const MIDS = ["a", "b", "c", "d"];
const BASE = {
  entry: { x: 12, y: 50 },
  a: { x: 36, y: 28 },
  b: { x: 36, y: 72 },
  c: { x: 64, y: 28 },
  d: { x: 64, y: 72 },
  exit: { x: 88, y: 50 },
};

function columnOf(id) {
  if (id === "entry") return 0;
  if (id === "a" || id === "b") return 1;
  if (id === "c" || id === "d") return 2;
  return 3;
}

function canConnect(u, v) {
  return Math.abs(columnOf(u) - columnOf(v)) === 1 || (u !== v && columnOf(u) === columnOf(v));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function edgeCost(rng) {
  return rng.randInt(CONFIG.edgeCost[0], CONFIG.edgeCost[1]);
}

function rollEvent(rng, type) {
  if (type === "infected") return { kind: "infected", amount: rng.randInt(CONFIG.damage[0], CONFIG.damage[1]) };
  if (type === "meds") return { kind: "meds", amount: rng.randInt(CONFIG.meds[0], CONFIG.meds[1]) };
  if (type === "fuel") return { kind: "fuel", amount: rng.randInt(CONFIG.fuelReward[0], CONFIG.fuelReward[1]) };
  if (type === "food") return { kind: "food", amount: rng.randInt(CONFIG.food[0], CONFIG.food[1]) };
  return null;
}

function isBlocked(types) {
  return (id) => types[id] === "blocked";
}

function buildAttempt(rng, profile, fuel) {
  const graph = new Graph();
  for (const id of IDS) graph.addNode(id);

  const left = rng.pick(["a", "b"]);
  const right = rng.pick(["c", "d"]);
  let spine = ["entry", left, right, "exit"];
  if (rng.chance(0.3)) {
    const other = left === "a" ? "b" : "a";
    spine = ["entry", left, other, right, "exit"];
  }
  for (let i = 0; i < spine.length - 1; i += 1) graph.addEdge(spine[i], spine[i + 1], edgeCost(rng));

  const pairs = [];
  for (let i = 0; i < MIDS.length; i += 1) {
    for (let j = i + 1; j < MIDS.length; j += 1) {
      if (canConnect(MIDS[i], MIDS[j])) pairs.push([MIDS[i], MIDS[j]]);
    }
  }
  for (const id of ["a", "b"]) pairs.push(["entry", id]);
  for (const id of ["c", "d"]) pairs.push([id, "exit"]);

  for (const [u, v] of pairs) {
    if (graph.hasEdge(u, v)) continue;
    const crossing = (u === "a" && v === "d") || (u === "b" && v === "c") || (u === "d" && v === "a") || (u === "c" && v === "b");
    if (crossing && (graph.hasEdge("a", "d") || graph.hasEdge("b", "c"))) continue;
    if (rng.chance(crossing ? 0.35 : 0.62)) graph.addEdge(u, v, edgeCost(rng));
  }

  for (const id of MIDS) {
    if (graph.neighbors(id).length > 0) continue;
    const partners = [...MIDS, "entry", "exit"].filter((other) => other !== id && canConnect(id, other));
    graph.addEdge(id, rng.pick(partners), edgeCost(rng));
  }

  const types = { entry: "entry", exit: "exit" };
  const spineSet = new Set(spine);
  const open = MIDS.filter((id) => !spineSet.has(id));
  if (open.length && rng.chance(profile.blockedChance)) types[rng.pick(open)] = "blocked";
  for (const id of MIDS) {
    if (!types[id]) types[id] = weightedPick(rng, profile.weights);
  }
  if (fuel < CONFIG.lowFuelThreshold) {
    const host = spine.find((id) => id !== "entry" && id !== "exit");
    types[host] = "fuel";
  }
  for (const id of spine) {
    if (id === "entry" || id === "exit" || types[id] === "fuel") continue;
    types[id] = "meds";
  }

  const search = dijkstraMinFuel(graph, isBlocked(types), "entry", "exit");
  return { graph, spine, types, search };
}

function materialize(attempt, rng, options, profile) {
  const used = new Set();
  const nodes = {};
  for (const id of IDS) {
    const base = BASE[id];
    const jitter = id === "entry" || id === "exit" ? 0 : 3;
    const type = attempt.types[id];
    nodes[id] = {
      id,
      type,
      name: pickPlaceName(rng, type, used),
      x: clamp(base.x + (jitter ? rng.randInt(-jitter, jitter) : 0), 8, 92),
      y: clamp(base.y + (jitter ? rng.randInt(-jitter, jitter) : 0), 18, 82),
      event: rollEvent(rng, type),
    };
  }
  return {
    seed: options.seed >>> 0,
    seed: options.seed >>> 0,
    townId: options.townId,
    name: options.townName,
    profile: options.profile,
    profileLabel: profile.label,
    isFinal: Boolean(options.isFinal),
    entry: "entry",
    exit: "exit",
    nodes,
    graph: attempt.graph,
    spine: attempt.spine,
  };
}

export function generateCity(options) {
  const rng = createRng(options.seed >>> 0);
  const profile = CONFIG.profiles[options.profile] || CONFIG.profiles.colonial;
  const fuel = options.fuel;
  let last = null;
  for (let attempt = 0; attempt < CONFIG.cityAttempts; attempt += 1) {
    last = buildAttempt(rng, profile, fuel);
    if (last.search.cost <= fuel) return materialize(last, rng, options, profile);
  }
  for (let i = 0; i < last.spine.length - 1; i += 1) {
    last.graph.setWeight(last.spine[i], last.spine[i + 1], CONFIG.edgeCost[0]);
  }
  return materialize(last, rng, options, profile);
}
