import { CONFIG } from "./config.js";

function initial(world) {
  return {
    hp: CONFIG.hpStart,
    fuel: CONFIG.fuelStart,
    meds: 0,
    worldPos: world.startId,
    visitedCities: [world.startId],
    loreIndex: 0,
  };
}

export function createGameState(world) {
  let state = initial(world);
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(state);
  }

  return {
    get() {
      return state;
    },
    set(patch) {
      state = { ...state, ...patch };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset(nextWorld) {
      state = initial(nextWorld);
      emit();
    },
  };
}
