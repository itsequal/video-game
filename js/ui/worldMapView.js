import { CONFIG } from "../config.js";
import { forwardNeighbors } from "../graph/generateWorld.js";
import { el } from "../art/svg.js";
import { reducedMotion } from "./motion.js";

function px(town) {
  return { x: town.x * 10, y: town.y * 6.4 };
}

function roadPath(world, fromId, toId) {
  const a = px(world.towns[fromId]);
  const b = px(world.towns[toId]);
  const road = world.roads.find((item) => (
    (item.from === fromId && item.to === toId) || (item.from === toId && item.to === fromId)
  ));
  const bend = road ? road.bend : 0;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 + bend * 4.2;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

function splitLabel(name) {
  if (name.length <= 18) return [name];
  const words = name.split(" ");
  let line = "";
  let index = 0;
  while (index < words.length && `${line} ${words[index]}`.trim().length <= 18) {
    line = `${line} ${words[index]}`.trim();
    index += 1;
  }
  if (!line) return [words[0], words.slice(1).join(" ")];
  const rest = words.slice(index).join(" ");
  return rest ? [line, rest] : [line];
}

function animateDraw(path) {
  if (reducedMotion()) return Promise.resolve();
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  path.getBoundingClientRect();
  path.style.strokeDashoffset = "0";
  return new Promise((resolve) => {
    window.setTimeout(resolve, 640);
  });
}

export function renderWorld(container, { world, state, onChoose }) {
  container.replaceChildren();
  const root = document.createElement("div");
  root.className = "world-root";
  const header = document.createElement("header");
  header.className = "topbar";
  const titles = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = "Ruta Cero";
  const title = document.createElement("h2");
  title.className = "display";
  title.textContent = "Cordillera del Humo";
  titles.append(kicker, title);
  const stats = document.createElement("div");
  stats.className = "hud";
  stats.id = "world-hud";
  header.append(titles, stats);

  const frame = document.createElement("div");
  frame.className = "map-frame";
  const svg = el("svg", { viewBox: "0 0 1000 640", role: "img", "aria-label": "Mapa de carreteras de la región" });
  frame.appendChild(svg);

  const hint = document.createElement("p");
  hint.className = "foot-hint";
  hint.textContent = "Elige el siguiente pueblo. La clínica tiene más medicina y más perdidos. La estación de servicio tiene combustible. El mercado tiene comida. El pueblo colonial equilibra los tres, con más derrumbes.";

  root.append(header, frame, hint);
  container.appendChild(root);

  const defs = el("defs", {}, svg);
  const paper = el("pattern", { id: "paper-stain", width: "220", height: "160", patternUnits: "userSpaceOnUse" }, defs);
  el("rect", { width: "220", height: "160", fill: "#e7d3b1" }, paper);
  el("ellipse", { cx: "40", cy: "30", rx: "36", ry: "18", fill: "#d9c09a", opacity: "0.45" }, paper);
  el("ellipse", { cx: "160", cy: "120", rx: "48", ry: "22", fill: "#c9b08a", opacity: "0.28" }, paper);
  const hatch = el("pattern", { id: "jungle-hatch", width: "8", height: "8", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: "0", y1: "0", x2: "0", y2: "8", stroke: "#6e8a62", "stroke-width": "2" }, hatch);

  el("rect", { width: "1000", height: "640", fill: "url(#paper-stain)" }, svg);
  el("path", { d: "M 80 120 C 180 80 260 160 340 110", fill: "none", stroke: "#c4b08a", "stroke-width": "1.2" }, svg);
  el("path", { d: "M 120 200 C 240 150 300 230 420 180", fill: "none", stroke: "#c4b08a", "stroke-width": "1.2" }, svg);
  el("path", { d: "M 480 90 C 560 140 640 70 760 120", fill: "none", stroke: "#c4b08a", "stroke-width": "1.2" }, svg);
  el("path", { d: "M 60 520 C 220 470 300 560 460 500 C 640 430 760 540 960 470", fill: "none", stroke: "#7f8f92", "stroke-width": "6", "stroke-linecap": "round", opacity: "0.55" }, svg);
  el("ellipse", { cx: "820", cy: "500", rx: "120", ry: "70", fill: "url(#jungle-hatch)", opacity: "0.35" }, svg);
  el("polygon", { points: "700,70 736,150 664,150", fill: "#8d7158" }, svg);
  el("ellipse", { cx: "724", cy: "62", rx: "8", ry: "4", fill: "#a33b24", opacity: "0.7" }, svg);

  const titleText = el("text", { class: "map-title", x: "36", y: "40" }, svg);
  titleText.textContent = "Cordillera del Humo";
  const caption = el("text", { class: "map-caption", x: "36", y: "58" }, svg);
  caption.textContent = "CARRETERAS QUE TODAVÍA AGUANTAN";
  const west = el("text", { class: "compass", x: "36", y: "610" }, svg);
  west.textContent = "OESTE";
  const east = el("text", { class: "compass", x: "900", y: "610" }, svg);
  east.textContent = "ESTE";

  const roadLayer = el("g", {}, svg);
  for (const road of world.roads) {
    el("path", { class: "road", d: roadPath(world, road.from, road.to) }, roadLayer);
  }
  const markerLayer = el("g", {}, svg);
  const visited = state.visitedCities;
  for (let i = 0; i < visited.length - 1; i += 1) {
    el("path", { class: "marker", d: roadPath(world, visited[i], visited[i + 1]) }, markerLayer);
  }

  const open = new Set(forwardNeighbors(world, state.worldPos).map((town) => town.id));
  const townLayer = el("g", {}, svg);

  for (const town of world.list) {
    const point = px(town);
    const profile = CONFIG.profiles[town.profile];
    const here = town.id === state.worldPos;
    const been = state.visitedCities.includes(town.id);
    const canGo = open.has(town.id);
    const group = el("g", {
      class: `town${canGo ? " is-open" : ""}`,
      transform: `translate(${point.x} ${point.y})`,
      role: "button",
      tabindex: canGo ? "0" : "-1",
      "aria-disabled": canGo ? "false" : "true",
    }, townLayer);
    let status = "Fuera de alcance";
    if (here) status = "Estás aquí";
    else if (town.id === world.goalId) status = been ? "Ya la cruzaste" : "Destino";
    else if (been) status = "Ya la cruzaste";
    else if (canGo) status = "Puedes viajar";
    group.setAttribute("aria-label", `${town.name}, ${profile.label}. ${status}`);
    group.style.color = "#3a2a22";
    el("rect", { x: "-78", y: "-42", width: "156", height: "160", fill: "transparent" }, group);

    if (canGo) el("circle", { class: "pencil", r: "30" }, group);
    if (town.id === world.goalId) el("circle", { r: "22", fill: "none", stroke: "#8a3b1c", "stroke-width": "1.4" }, group);
    el("circle", { class: "town-ring", r: "15", fill: "#f4e7d2", stroke: "#3a2a22", "stroke-width": "1.6" }, group);
    el("use", { href: `#icon-${profile.icon}`, x: "-8", y: "-8", width: "16", height: "16", color: "#3a2a22" }, group);
    if (here) el("circle", { class: "you-are-here", cx: "18", cy: "-16", r: "5" }, group);

    const lines = splitLabel(town.name);
    lines.forEach((line, index) => {
      const text = el("text", { class: "town-label", y: 34 + index * 14, "text-anchor": "middle" }, group);
      text.textContent = line;
    });
    const sub = el("text", { class: "town-sub", y: 36 + lines.length * 14, "text-anchor": "middle" }, group);
    sub.textContent = profile.label;
    if (here) el("use", { href: "#icon-pickup", x: "-12", y: 44 + lines.length * 14, width: "24", height: "14", color: "#c23b2e" }, group);

    if (!canGo) continue;
    const go = (event) => {
      const origin = event.clientX
        ? { x: event.clientX, y: event.clientY }
        : (() => {
          const rect = group.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })();
      choose(town, origin);
    };
    group.addEventListener("click", go);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go(event);
      }
    });
  }

  let busy = false;
  async function choose(town, origin) {
    if (busy) return;
    busy = true;
    const path = el("path", { class: "marker is-drawing", d: roadPath(world, state.worldPos, town.id) }, markerLayer);
    await animateDraw(path);
    onChoose(town, origin);
  }

  return { stats };
}
