import { CONFIG } from "../config.js";
import { createRng, hashSeed } from "../rng.js";
import { Graph } from "../graph/Graph.js";
import { bfsReachable, dijkstraMinFuel } from "../graph/algorithms.js";
import { generateCity } from "../graph/generateCity.js";
import { forwardNeighbors, generateWorld } from "../graph/generateWorld.js";
import { createPlanner } from "../city/routePlanner.js";
import { evaluateRoute } from "../city/routeEvaluator.js";
import { PLACE_NAMES } from "../content/names.js";

const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

function node(id, type, event = null) {
  return { id, type, name: id, x: 0, y: 0, event };
}

function makeCity(nodes, edges, extra = {}) {
  const graph = new Graph();
  const map = {};
  for (const item of nodes) {
    graph.addNode(item.id);
    map[item.id] = item;
  }
  for (const edge of edges) graph.addEdge(edge[0], edge[1], edge[2]);
  return { graph, nodes: map, entry: "entry", exit: "exit", isFinal: false, ...extra };
}

function inRange(amount, range) {
  return amount >= range[0] && amount <= range[1];
}

test("mil pueblos tienen ruta y la gasolina alcanza", () => {
  const profiles = ["clinic", "station", "market", "colonial", "final"];
  const fuels = [20, 40, 80];
  for (let seed = 1; seed <= 1000; seed += 1) {
    const profile = profiles[seed % profiles.length];
    const fuel = fuels[seed % fuels.length];
    const city = generateCity({
      seed,
      profile,
      fuel,
      isFinal: profile === "final",
      townName: "Pueblo",
      townId: `t${seed}`,
    });
    assert(Object.keys(city.nodes).length === CONFIG.nodeCount, `nodos ${seed}`);
    const blockedCount = Object.values(city.nodes).filter((item) => item.type === "blocked").length;
    assert(blockedCount <= 1, `bloqueos ${seed}`);
    for (const id of city.spine) assert(city.nodes[id].type !== "blocked", `espina bloqueada ${seed}`);
    for (const edge of city.graph.edges()) {
      assert(edge.w >= CONFIG.edgeCost[0] && edge.w <= CONFIG.edgeCost[1], `peso ${edge.w} semilla ${seed}`);
    }
    for (const item of Object.values(city.nodes)) {
      assert(PLACE_NAMES[item.type].includes(item.name), `nombre ${item.name}`);
      if (!item.event) continue;
      const range = {
        infected: CONFIG.damage,
        meds: CONFIG.meds,
        fuel: CONFIG.fuelReward,
        food: CONFIG.food,
      }[item.event.kind];
      assert(inRange(item.event.amount, range), `evento ${item.event.kind} ${item.event.amount}`);
    }
    const found = dijkstraMinFuel(city.graph, (id) => city.nodes[id].type === "blocked", city.entry, city.exit);
    assert(found.path[0] === "entry" && found.path.at(-1) === "exit", `camino ${seed}`);
    assert(new Set(found.path).size === found.path.length, `simple ${seed}`);
    assert(found.path.every((id) => city.nodes[id].type !== "blocked"), `bloqueo en ruta ${seed}`);
    assert(found.cost <= fuel, `costo ${found.cost} > ${fuel} semilla ${seed}`);
    const again = generateCity({ seed, profile, fuel, isFinal: profile === "final", townName: "Pueblo", townId: `t${seed}` });
    const weights = city.graph.edges().map((edge) => edge.w).join(",");
    const weightsAgain = again.graph.edges().map((edge) => edge.w).join(",");
    assert(weights === weightsAgain, `inestable ${seed}`);
  }
});

test("el mundo conecta el mirador con la resistencia", () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const world = generateWorld(createRng(seed));
    assert(world.columns.length === 6, "columnas");
    assert(world.columns[0].length === 1 && world.columns[5].length === 1, "extremos");
    for (const column of world.columns.slice(1, 5)) {
      assert(column.length >= 2 && column.length <= 3, "capas");
    }
    const reached = bfsReachable(world.graph, world.startId);
    assert(reached.has(world.goalId), `meta ${seed}`);
    assert(reached.size === world.list.length, `alcance ${seed}`);
    const names = world.list.map((town) => town.name);
    assert(new Set(names).size === names.length, `nombres ${seed}`);
    for (const town of world.list) {
      if (town.id === world.goalId) continue;
      assert(forwardNeighbors(world, town.id).length >= 1, `avance ${town.id}`);
    }
  }
});

test("la ruta no repite, no salta y no entra a un deslave", () => {
  const city = makeCity(
    [
      node("entry", "entry"),
      node("a", "neutral"),
      node("b", "blocked"),
      node("exit", "exit"),
    ],
    [["entry", "a", 3], ["a", "b", 3], ["a", "exit", 4]],
  );
  const planner = createPlanner(city);
  assert(planner.tryAdd("exit").reason === "no-edge", "atajo");
  assert(planner.tryAdd("a").ok, "primer tramo");
  assert(planner.tryAdd("a").reason === "repeat", "repetir");
  assert(planner.tryAdd("b").reason === "blocked", "bloqueo");
  assert(planner.projectedFuel() === 3, "proyección");
  planner.undo();
  assert(planner.getRoute().join(",") === "entry", "deshacer");
  planner.tryAdd("a");
  planner.tryAdd("exit");
  assert(planner.isComplete(), "completa");
  assert(planner.tryAdd("b").reason === "done", "cerrada");
  planner.reset();
  assert(planner.getRoute().length === 1, "reinicio");
});

test("el evaluador respeta gasolina, salud y la meta", () => {
  const start = { hp: 100, fuel: 80, meds: 0 };
  const stranded = makeCity(
    [node("entry", "entry"), node("exit", "exit")],
    [["entry", "exit", 5]],
  );
  const dry = evaluateRoute(stranded, ["entry", "exit"], { hp: 100, fuel: 5, meds: 0 });
  assert(dry.ok && dry.snapshot.fuel === 0, "cero litros");
  const stuck = evaluateRoute(stranded, ["entry", "exit"], { hp: 100, fuel: 1, meds: 0 });
  assert(!stuck.ok && stuck.reason === "varado" && stuck.snapshot.fuel === 1, "un litro contra cinco");
  assert(start.fuel === 80, "no muta el origen");

  const bitten = makeCity(
    [node("entry", "entry"), node("a", "infected", { kind: "infected", amount: 10 }), node("exit", "exit")],
    [["entry", "a", 2], ["a", "exit", 2]],
  );
  const dead = evaluateRoute(bitten, ["entry", "a", "exit"], { hp: 10, fuel: 20, meds: 0 });
  assert(!dead.ok && dead.reason === "devorado" && dead.snapshot.hp === 0, "salud en cero");

  const fed = makeCity(
    [node("entry", "entry"), node("a", "food", { kind: "food", amount: 20 }), node("exit", "exit")],
    [["entry", "a", 2], ["a", "exit", 2]],
  );
  const capped = evaluateRoute(fed, ["entry", "a", "exit"], { hp: 95, fuel: 20, meds: 0 });
  assert(capped.ok && capped.snapshot.hp === CONFIG.hpMax, "tope de salud");
  const already = evaluateRoute(fed, ["entry", "a", "exit"], { hp: 100, fuel: 20, meds: 0 });
  assert(already.snapshot.hp === 100, "no pasa de 100");

  const open = makeCity(
    [node("entry", "entry"), node("a", "neutral"), node("exit", "exit")],
    [["entry", "a", 2], ["a", "exit", 2]],
  );
  const trapped = evaluateRoute(open, ["entry", "a"], { hp: 100, fuel: 20, meds: 0 });
  assert(!trapped.ok && trapped.reason === "atrapado", "ruta inconclusa");
  const early = evaluateRoute(open, ["entry"], { hp: 40, fuel: 10, meds: 3 });
  assert(early.reason === "atrapado" && early.snapshot.hp === 40 && early.snapshot.fuel === 10, "sin moverse");

  const goal = makeCity(
    [node("entry", "entry"), node("exit", "exit")],
    [["entry", "exit", 2]],
    { isFinal: true },
  );
  const short = evaluateRoute(goal, ["entry", "exit"], { hp: 20, fuel: 10, meds: 29 });
  assert(!short.ok && short.reason === "mision", "veintinueve frascos");
  const enough = evaluateRoute(goal, ["entry", "exit"], { hp: 20, fuel: 10, meds: 30 });
  assert(enough.ok, "treinta frascos");
  const practice = evaluateRoute(open, ["entry", "a", "exit"], { hp: 20, fuel: 10, meds: 0 });
  assert(practice.ok, "un pueblo intermedio no exige la meta");
});

function worstAmount(kind) {
  if (kind === "infected") return CONFIG.damage[1];
  if (kind === "fuel") return CONFIG.fuelReward[0];
  if (kind === "food") return CONFIG.food[0];
  return (CONFIG.meds[0] + CONFIG.meds[1]) / 2;
}

function planPath(city, start) {
  let best = null;
  const walk = (id, path, sim) => {
    if (id === city.exit) {
      const score = sim.meds * 1000 + sim.hp + sim.fuel;
      if (!best || score > best.score) best = { score, path: [...path] };
      return;
    }
    for (const next of city.graph.neighbors(id)) {
      if (path.includes(next) || city.nodes[next].type === "blocked") continue;
      const cost = city.graph.weight(id, next);
      if (sim.fuel < cost) continue;
      const copy = { hp: sim.hp, fuel: sim.fuel - cost, meds: sim.meds };
      const event = city.nodes[next].event;
      if (event?.kind === "infected") copy.hp -= worstAmount("infected");
      else if (event?.kind === "fuel") copy.fuel += worstAmount("fuel");
      else if (event?.kind === "food") copy.hp = Math.min(CONFIG.hpMax, copy.hp + worstAmount("food"));
      else if (event?.kind === "meds") copy.meds += worstAmount("meds");
      if (copy.hp <= 0) continue;
      path.push(next);
      walk(next, path, copy);
      path.pop();
    }
  };
  walk(city.entry, [city.entry], { hp: start.hp, fuel: start.fuel, meds: start.meds });
  return best?.path || null;
}

function chooseTown(world, state) {
  const options = forwardNeighbors(world, state.worldPos);
  const score = (town) => {
    if ((town.profile === "clinic" || town.profile === "final") && state.meds < CONFIG.medsGoal) return 80;
    if (town.profile === "station" && state.fuel < 45) return 90;
    if (town.profile === "market" && state.hp < 70) return 85;
    if (town.profile === "clinic") return 40;
    if (town.profile === "station") return 30;
    if (town.profile === "market") return 28;
    return 20;
  };
  return [...options].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1))[0];
}

function playSeed(seed) {
  const world = generateWorld(createRng(seed));
  let state = { hp: CONFIG.hpStart, fuel: CONFIG.fuelStart, meds: 0, worldPos: world.startId };
  for (let step = 0; step < 5; step += 1) {
    const town = chooseTown(world, state);
    if (!town) return false;
    const city = generateCity({
      seed: hashSeed(seed, town.id),
      profile: town.profile,
      fuel: state.fuel,
      isFinal: town.id === world.goalId,
      townName: town.name,
      townId: town.id,
    });
    const path = planPath(city, state);
    if (!path) return false;
    const result = evaluateRoute(city, path, state);
    if (!result.ok) return false;
    state = { ...result.snapshot, worldPos: town.id };
  }
  return state.worldPos === world.goalId && state.meds >= CONFIG.medsGoal;
}

test("un jugador que lee tipos y letreros junta 30 frascos en la mayoría de semillas", () => {
  let wins = 0;
  const total = 200;
  for (let seed = 1; seed <= total; seed += 1) if (playSeed(seed)) wins += 1;
  const rate = wins / total;
  assert(rate >= 0.7, `solo ${wins}/${total} semillas llegan a 30 frascos`);
});

export function runAll() {
  return results;
}
