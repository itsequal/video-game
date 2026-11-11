import { CONFIG, NODE_META } from "../config.js";
import { createRng } from "../rng.js";
import { el } from "../art/svg.js";
import { buildSkyline } from "../art/skyline.js";
import { REJECT, eventDelta, rangeLine } from "../content/narrative.js";
import { createPlanner } from "../city/routePlanner.js";
import { createHud } from "./hud.js";
import { createTooltip } from "./tooltip.js";
import { EASE_IN_OUT, announce, reducedMotion } from "./motion.js";

function keyOf(u, v) {
  return u < v ? `${u}|${v}` : `${v}|${u}`;
}

function hexPoints(radius) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${(radius * Math.cos(angle)).toFixed(1)},${(radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
}

function drawShape(parent, type) {
  const group = el("g", { class: "node-shape" }, parent);
  el("circle", { class: "hit", r: "34" }, group);
  if (type === "infected") el("polygon", { class: "body", points: "0,-26 24,20 -24,20" }, group);
  else if (type === "fuel") el("polygon", { class: "body", points: hexPoints(22) }, group);
  else if (type === "food") el("ellipse", { class: "body", cx: "0", cy: "2", rx: "24", ry: "16" }, group);
  else if (type === "neutral" || type === "exit") el("polygon", { class: "body", points: "0,-24 24,0 0,24 -24,0" }, group);
  else if (type === "blocked") el("polygon", { class: "body", points: "-22,16 -8,-10 2,8 14,-16 24,16" }, group);
  else if (type === "entry") el("rect", { class: "body", x: "-22", y: "-22", width: "44", height: "44", rx: "4" }, group);
  else el("circle", { class: "body", r: "22" }, group);
  el("use", { href: `#icon-${NODE_META[type].icon}`, x: "-9", y: "-9", width: "18", height: "18" }, group);
  return group;
}

function backdrop(container, seed) {
  const svg = el("svg", { viewBox: "0 0 1000 640", preserveAspectRatio: "none", "aria-hidden": "true" }, container);
  const defs = el("defs", {}, svg);
  const grad = el("linearGradient", { id: "city-sky", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
  el("stop", { offset: "0%", "stop-color": "#2a0d0c" }, grad);
  el("stop", { offset: "55%", "stop-color": "#7a1e14" }, grad);
  el("stop", { offset: "100%", "stop-color": "#c4501f" }, grad);
  el("rect", { width: "1000", height: "640", fill: "url(#city-sky)" }, svg);
  el("polygon", { points: "0,300 160,190 280,260 430,150 600,250 820,160 1000,280 1000,640 0,640", fill: "#1a1214" }, svg);
  const skyline = el("g", { transform: "translate(0 250)" }, svg);
  buildSkyline(skyline, createRng(seed ^ 0x9e3779b9), { width: 1000, height: 230, night: true });
}

export function renderCity(container, city, startStats, { onExecute, modalOpen }) {
  container.replaceChildren();
  const planner = createPlanner(city);
  let stats = { ...startStats };
  let locked = false;
  let daylight = null;

  const root = document.createElement("div");
  root.className = "city-root";
  const head = document.createElement("header");
  head.className = "city-head";
  const titles = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "kicker";
  kicker.textContent = city.profileLabel;
  const heading = document.createElement("h2");
  heading.textContent = city.name;
  titles.append(kicker, heading);
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Traza un camino simple de la entrada a la salida antes de que anochezca. Cada tramo gasta la gasolina del letrero.";
  head.append(titles, hint);

  const hudHost = document.createElement("div");
  const hud = createHud(hudHost, { showTime: true });
  const stage = document.createElement("div");
  stage.className = "stage";
  const art = document.createElement("div");
  art.className = "city-art";
  const wash = document.createElement("div");
  wash.className = "night-wash";
  stage.append(art, wash);
  backdrop(art, city.seed ?? 1);

  const svg = el("svg", {
    class: "city-graph",
    viewBox: "0 0 1000 640",
    preserveAspectRatio: "none",
    role: "application",
    "aria-label": `Mapa de ${city.name}`,
  });
  stage.appendChild(svg);

  const token = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  token.setAttribute("class", "convoy-token");
  token.setAttribute("viewBox", "0 0 24 24");
  token.setAttribute("aria-hidden", "true");
  token.innerHTML = `<use href="#icon-pickup" width="24" height="24"></use>`;
  stage.appendChild(token);

  const controls = document.createElement("footer");
  controls.className = "city-controls";
  const messages = document.createElement("div");
  const routeMsg = document.createElement("p");
  routeMsg.className = "route-msg";
  routeMsg.setAttribute("aria-live", "polite");
  const keys = document.createElement("p");
  keys.className = "keys";
  keys.textContent = "Retroceso deshace · R reinicia · Enter ejecuta";
  messages.append(routeMsg, keys);
  const buttons = document.createElement("div");
  buttons.className = "btn-row";
  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "btn btn-ghost";
  undoBtn.textContent = "Deshacer tramo";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn-ghost";
  resetBtn.textContent = "Reiniciar ruta";
  const executeBtn = document.createElement("button");
  executeBtn.type = "button";
  executeBtn.className = "btn btn-primary";
  executeBtn.textContent = "Ejecutar ruta";
  executeBtn.disabled = true;
  buttons.append(undoBtn, resetBtn, executeBtn);
  controls.append(messages, buttons);
  root.append(head, hudHost, stage, controls);
  container.appendChild(root);
  hud.setStats(stats);

  const X = (value) => (value / 100) * 1000;
  const Y = (value) => (value / 100) * 640;
  const edges = el("g", {}, svg);
  const nodes = el("g", {}, svg);

  for (const edge of city.graph.edges()) {
    const a = city.nodes[edge.u];
    const b = city.nodes[edge.v];
    const x1 = X(a.x);
    const y1 = Y(a.y);
    const x2 = X(b.x);
    const y2 = Y(b.y);
    const group = el("g", {
      class: `edge${a.type === "blocked" || b.type === "blocked" ? " is-blocked" : ""}`,
      "data-key": keyOf(edge.u, edge.v),
    }, edges);
    el("line", { x1, y1, x2, y2 }, group);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const mx = (x1 + x2) / 2 + (-dy / length) * 18;
    const my = (y1 + y2) / 2 + (dx / length) * 18;
    const sign = el("g", { transform: `translate(${mx} ${my})` }, group);
    el("rect", { class: "sign-bg", x: "-20", y: "-11", width: "40", height: "18", rx: "3" }, sign);
    const label = el("text", { class: "sign-text", y: "2", "text-anchor": "middle" }, sign);
    label.textContent = `${edge.w} L`;
  }

  const nodeGroups = {};
  for (const node of Object.values(city.nodes)) {
    const group = el("g", {
      class: "node",
      "data-id": node.id,
      "data-type": node.type,
      role: "button",
      tabindex: "0",
      transform: `translate(${X(node.x)} ${Y(node.y)})`,
    }, nodes);
    const meta = NODE_META[node.type];
    group.setAttribute("aria-label", `${node.name}. ${meta.label}. ${rangeLine(node.type)}`);
    drawShape(group, node.type);
    const name = el("text", { class: "node-label", y: "50", "text-anchor": "middle" }, group);
    name.textContent = node.name;
    el("text", { class: "node-value", y: "68", "text-anchor": "middle" }, group);
    nodeGroups[node.id] = group;
    group.addEventListener("click", () => select(node.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        select(node.id);
      }
    });
    group.addEventListener("pointerenter", () => {
      if (locked) return;
      tooltip.show(group, (tip) => {
        tip.replaceChildren();
        const strong = document.createElement("strong");
        strong.textContent = node.name;
        const type = document.createElement("span");
        type.textContent = meta.label;
        const range = document.createElement("span");
        range.textContent = rangeLine(node.type);
        tip.append(strong, type, range);
      });
    });
    group.addEventListener("pointerleave", () => tooltip.hide());
    group.addEventListener("focus", () => {
      if (locked) return;
      tooltip.show(group, (tip) => {
        tip.replaceChildren();
        const strong = document.createElement("strong");
        strong.textContent = node.name;
        const type = document.createElement("span");
        type.textContent = `${meta.label}. ${rangeLine(node.type)}`;
        tip.append(strong, type);
      });
    });
    group.addEventListener("blur", () => tooltip.hide());
  }

  const tooltip = createTooltip(document.getElementById("tooltip"));

  function pointOf(node) {
    const rect = stage.getBoundingClientRect();
    return { x: (node.x / 100) * rect.width, y: (node.y / 100) * rect.height };
  }

  function placeToken(node) {
    const point = pointOf(node);
    token.style.transform = `translate(${point.x}px, ${point.y}px)`;
  }

  function reject(nodeId, reason) {
    const group = nodeGroups[nodeId];
    routeMsg.textContent = REJECT[reason];
    announce(REJECT[reason]);
    if (!group) return;
    const shape = group.querySelector(".node-shape");
    if (reducedMotion()) {
      group.classList.add("is-flash");
      window.setTimeout(() => group.classList.remove("is-flash"), 220);
      return;
    }
    shape.classList.remove("is-shaking");
    void shape.offsetWidth;
    shape.classList.add("is-shaking");
  }

  function paintRoute(animateLast) {
    const route = planner.getRoute();
    const chosen = new Set();
    for (let i = 0; i < route.length - 1; i += 1) chosen.add(keyOf(route[i], route[i + 1]));
    const reach = new Set(planner.reachable());
    const onRoute = new Set(route);
    for (const edge of svg.querySelectorAll(".edge")) {
      const on = chosen.has(edge.dataset.key);
      const was = edge.classList.contains("is-chosen");
      edge.classList.toggle("is-chosen", on);
      const line = edge.querySelector("line");
      if (on && !was && animateLast && !reducedMotion()) {
        const length = line.getTotalLength();
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;
        line.getBoundingClientRect();
        line.style.strokeDashoffset = "0";
      } else if (!on) {
        line.style.strokeDasharray = "";
        line.style.strokeDashoffset = "";
      }
    }
    for (const group of Object.values(nodeGroups)) {
      const id = group.dataset.id;
      const wayBack = reach.has(id) && onRoute.has(id);
      group.classList.toggle("is-selected", onRoute.has(id));
      group.classList.toggle("is-return", wayBack);
      group.classList.toggle("is-reachable", reach.has(id) && !wayBack);
      group.setAttribute("aria-pressed", onRoute.has(id) ? "true" : "false");
    }
    hud.setProjected(planner.projectedFuel(), stats.fuel);
    executeBtn.disabled = !planner.isComplete();
  }

  function select(nodeId) {
    if (locked) return;
    const result = planner.tryAdd(nodeId);
    if (!result.ok) {
      reject(nodeId, result.reason);
      return;
    }
    routeMsg.textContent = result.complete ? "Ruta lista. Puedes ejecutarla." : "";
    paintRoute(true);
  }

  function onKey(event) {
    if (event.key === "Backspace") event.preventDefault();
    if (locked || modalOpen()) return;
    if (event.key === "Backspace") {
      planner.undo();
      routeMsg.textContent = "";
      paintRoute(false);
    } else if ((event.key === "r" || event.key === "R") && !event.metaKey && !event.ctrlKey) {
      planner.reset();
      routeMsg.textContent = "";
      paintRoute(false);
    } else if (event.key === "Enter" && event.target?.classList?.contains("node")) {
      return;
    } else if (event.key === "Enter" && planner.isComplete()) {
      onExecute();
    }
  }

  undoBtn.addEventListener("click", () => {
    if (locked) return;
    planner.undo();
    routeMsg.textContent = "";
    paintRoute(false);
  });
  resetBtn.addEventListener("click", () => {
    if (locked) return;
    planner.reset();
    routeMsg.textContent = "";
    paintRoute(false);
  });
  executeBtn.addEventListener("click", () => {
    if (!locked && planner.isComplete()) onExecute();
  });
  document.addEventListener("keydown", onKey);
  paintRoute(false);

  return {
    stage,
    getRoute: () => planner.getRoute(),
    setStats(next) {
      stats = { ...stats, ...next };
      hud.setStats(stats);
    },
    setTime(seconds) {
      const mark = hud.setTime(seconds);
      if (mark === "thirty") announce("Quedan treinta segundos de luz.");
      if (mark === "ten") announce("Quedan diez segundos de luz.");
    },
    startDaylight() {
      daylight = wash.animate(
        [{ opacity: 0.08 }, { opacity: 0.82 }],
        { duration: CONFIG.timerSeconds * 1000, easing: "linear", fill: "forwards" },
      );
      daylight.pause();
      return {
        pause: () => daylight.pause(),
        play: () => daylight.play(),
        cancel: () => daylight.cancel(),
      };
    },
    placeToken() {
      placeToken(city.nodes[city.entry]);
    },
    moveToken(fromId, toId) {
      const from = pointOf(city.nodes[fromId]);
      const to = pointOf(city.nodes[toId]);
      if (reducedMotion()) {
        token.style.transform = `translate(${to.x}px, ${to.y}px)`;
        return token.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 160, fill: "forwards" });
      }
      return token.animate(
        [
          { transform: `translate(${from.x}px, ${from.y}px)` },
          { transform: `translate(${to.x}px, ${to.y}px)` },
        ],
        { duration: 620, easing: EASE_IN_OUT, fill: "forwards" },
      );
    },
    revealStep(step) {
      const group = nodeGroups[step.v];
      const value = group.querySelector(".node-value");
      const text = eventDelta(step.event);
      if (!text && group.classList.contains("is-revealed")) return;
      value.textContent = text;
      group.classList.add("is-revealed");
      const node = city.nodes[step.v];
      if (text) group.setAttribute("aria-label", `${node.name}. ${text}`);
    },
    spawnDelta(step) {
      const fuelPoint = pointOf(city.nodes[step.v]);
      const fuel = document.createElement("span");
      fuel.className = "delta";
      fuel.textContent = `−${step.cost} L`;
      fuel.style.left = `${fuelPoint.x + 18}px`;
      fuel.style.top = `${fuelPoint.y - 36}px`;
      stage.appendChild(fuel);
      fuel.addEventListener("animationend", () => fuel.remove());
      const text = eventDelta(step.event);
      if (!text) return;
      const badge = document.createElement("span");
      const good = step.event.kind !== "infected";
      badge.className = `delta ${good ? "is-good" : "is-bad"}`;
      badge.textContent = text;
      badge.style.left = `${fuelPoint.x - 10}px`;
      badge.style.top = `${fuelPoint.y - 18}px`;
      stage.appendChild(badge);
      badge.addEventListener("animationend", () => badge.remove());
    },
    react(event) {
      if (event?.kind) hud.react(event.kind);
    },
    settlePortrait(result) {
      const low = result.snapshot.hp <= 25;
      hud.settle(!result.ok || low ? "down" : "calm");
    },
    lock() {
      locked = true;
      tooltip.hide();
      executeBtn.disabled = true;
      undoBtn.disabled = true;
      resetBtn.disabled = true;
      hud.setProjected(0, stats.fuel);
    },
    destroy() {
      locked = true;
      document.removeEventListener("keydown", onKey);
      daylight?.cancel();
      tooltip.hide();
      hud.destroy();
    },
  };
}
