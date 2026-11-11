import { CONFIG } from "../config.js";

export function applyEvent(state, event) {
  if (!event) return;
  if (event.kind === "infected") state.hp = Math.max(0, state.hp - event.amount);
  else if (event.kind === "meds") state.meds += event.amount;
  else if (event.kind === "fuel") state.fuel += event.amount;
  else if (event.kind === "food") state.hp = Math.min(CONFIG.hpMax, state.hp + event.amount);
}

function fail(reason, steps, snapshot, extra = {}) {
  return { ok: false, reason, steps, snapshot: { ...snapshot }, ...extra };
}

export function evaluateRoute(city, route, startState) {
  const state = {
    hp: startState.hp,
    fuel: startState.fuel,
    meds: startState.meds,
  };
  const steps = [];
  const arrived = new Set();

  for (let i = 0; i < route.length - 1; i += 1) {
    const from = route[i];
    const to = route[i + 1];
    const cost = city.graph.weight(from, to);
    if (state.fuel < cost) {
      return fail("varado", steps, state, { from, at: to, cost });
    }
    state.fuel -= cost;
    let event = null;
    if (!arrived.has(to)) {
      arrived.add(to);
      event = city.nodes[to].event;
      applyEvent(state, event);
    }
    steps.push({
      u: from,
      v: to,
      cost,
      event,
      snapshot: { ...state },
    });
    if (state.hp <= 0) return fail("devorado", steps, state, { at: to });
  }

  const last = route[route.length - 1];
  if (last !== city.exit) return fail("atrapado", steps, state);
  if (city.isFinal && state.meds < CONFIG.medsGoal) return fail("mision", steps, state);
  return { ok: true, reason: null, steps, snapshot: { ...state } };
}
