import { CONFIG } from "./config.js";
import { createRng, hashSeed } from "./rng.js";
import { generateWorld } from "./graph/generateWorld.js";
import { generateCity } from "./graph/generateCity.js";
import { createGameState } from "./state.js";
import { evaluateRoute } from "./city/routeEvaluator.js";
import { createCityTimer } from "./city/cityTimer.js";
import { CHOICE, FAILURES, LORE, VICTORY } from "./content/narrative.js";
import { createScreens } from "./ui/screens.js";
import { renderIntro } from "./ui/introScreen.js";
import { renderWorld } from "./ui/worldMapView.js";
import { createHud } from "./ui/hud.js";
import { renderCity } from "./ui/cityView.js";
import { playRoute } from "./ui/playback.js";
import { createModals } from "./ui/modal.js";

function readFixedSeed() {
  const raw = new URLSearchParams(location.search).get("seed");
  if (raw == null || raw === "" || !Number.isFinite(Number(raw))) return null;
  return Number(raw) >>> 0;
}

const screens = createScreens();
const modals = createModals(document.getElementById("modal-root"));
const fixedSeed = readFixedSeed();
let seed = fixedSeed ?? (Math.floor(Math.random() * 1e9) >>> 0);
let world = generateWorld(createRng(seed));
const store = createGameState(world);
let introCleanup = () => {};
let cityView = null;
let mode = "intro";

function paintMeta() {
  const meta = document.getElementById("run-meta");
  const state = store.get();
  meta.hidden = mode === "intro";
  meta.textContent = `Semilla ${seed} · HP ${state.hp} · ${state.fuel} L · Maletín ${state.meds}/${CONFIG.medsGoal}`;
}

store.subscribe(() => paintMeta());

function bootIntro() {
  introCleanup();
  mode = "intro";
  paintMeta();
  introCleanup = renderIntro(screens.nodes.intro, { onStart: () => { enterWorld(); } });
}

async function enterWorld() {
  mode = "world";
  paintMeta();
  const view = renderWorld(screens.nodes.world, {
    world,
    state: store.get(),
    onChoose: (town, origin) => { enterCity(town, origin); },
  });
  createHud(view.stats, { showTime: false }).setStats(store.get());
  await screens.show("world");
}

async function enterCity(town, origin) {
  const beforeEnter = store.get();
  const city = generateCity({
    seed: hashSeed(seed, town.id),
    profile: town.profile,
    fuel: beforeEnter.fuel,
    isFinal: town.id === world.goalId,
    townName: town.name,
    townId: town.id,
  });
  mode = "city";
  paintMeta();
  cityView?.destroy();
  let settled = false;
  let timer = null;
  let daylight = null;

  cityView = renderCity(screens.nodes.city, city, beforeEnter, {
    onExecute: () => { finish(); },
    modalOpen: () => modals.isOpen(),
  });
  await screens.show("city", { origin });
  cityView.placeToken();
  daylight = cityView.startDaylight();
  timer = createCityTimer({
    seconds: CONFIG.timerSeconds,
    onTick: (seconds) => cityView.setTime(seconds),
    onEnd: () => { finish(); },
    onPause: () => daylight.pause(),
    onResume: () => daylight.play(),
  });
  timer.start();

  async function finish() {
    if (settled) return;
    settled = true;
    const before = { ...store.get() };
    const route = cityView.getRoute();
    timer.stop();
    daylight.cancel();
    cityView.lock();
    const result = evaluateRoute(city, route, before);
    await playRoute({ view: cityView, city, result });
    if (!result.ok) {
      await showFailure(city, result);
      restart();
      return;
    }
    const loreIndex = before.visitedCities.length - 1;
    store.set({
      hp: result.snapshot.hp,
      fuel: result.snapshot.fuel,
      meds: result.snapshot.meds,
      worldPos: city.townId,
      visitedCities: [...before.visitedCities, city.townId],
      loreIndex: loreIndex + 1,
    });
    if (city.isFinal) {
      await showVictory(result, LORE[loreIndex]);
      restart();
      return;
    }
    await showSummary(city, before, result, LORE[loreIndex]);
    cityView.destroy();
    cityView = null;
    await enterWorld();
  }
}

function showFailure(city, result) {
  const copy = FAILURES[result.reason];
  const paragraphs = [copy.text];
  if (result.reason === "varado") {
    paragraphs.push(`Quedaban ${result.snapshot.fuel} L y ese tramo pedía ${result.cost} L.`);
  } else if (result.reason === "devorado") {
    paragraphs.push(`Fue en ${city.nodes[result.at].name}.`);
  } else if (result.reason === "mision") {
    paragraphs.push(`El maletín lleva ${result.snapshot.meds} de ${CONFIG.medsGoal} frascos.`);
  }
  return modals.open({
    kicker: city.name,
    title: copy.title,
    paragraphs,
    actions: [{ id: "back", label: "Volver al inicio", primary: true }],
  });
}

function showSummary(city, before, result, lore) {
  return modals.open({
    kicker: city.name,
    title: "Saliste del pueblo",
    paragraphs: [
      `Salud ${before.hp} → ${result.snapshot.hp}. Gasolina ${before.fuel} → ${result.snapshot.fuel} L. Maletín ${before.meds} → ${result.snapshot.meds}.`,
    ],
    lore,
    actions: [{ id: "next", label: "Seguir hacia el este", primary: true }],
  });
}

async function showVictory(result, lore) {
  await modals.open({
    kicker: VICTORY.kicker,
    title: VICTORY.title,
    paragraphs: [VICTORY.text, `El maletín cierra con ${result.snapshot.meds} frascos.`],
    lore,
    actions: [{ id: "next", label: "Seguir", primary: true }],
  });
  const choice = await modals.open({
    kicker: "Después de la ruta",
    title: "Qué hacer con lo que queda",
    paragraphs: [CHOICE.question],
    actions: [
      { id: "rebuild", label: CHOICE.rebuild.label, primary: true },
      { id: "anew", label: CHOICE.anew.label },
    ],
  });
  const ending = choice === "rebuild" ? CHOICE.rebuild : CHOICE.anew;
  await modals.open({
    kicker: "El convoy",
    title: choice === "rebuild" ? "Volver a nombrar las calles" : "Sin bandera",
    paragraphs: [ending.line],
    actions: [{ id: "back", label: "Volver al inicio", primary: true }],
  });
}

function restart() {
  cityView?.destroy();
  cityView = null;
  modals.close();
  seed = fixedSeed ?? (Math.floor(Math.random() * 1e9) >>> 0);
  world = generateWorld(createRng(seed));
  store.reset(world);
  bootIntro();
  screens.show("intro");
}

bootIntro();
