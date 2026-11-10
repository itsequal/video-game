import { createRng } from "../rng.js";
import { el } from "./svg.js";
import { buildSkyline } from "./skyline.js";
import { addPalm, addBanana, addVines } from "./foliage.js";
import { attachParallax } from "./parallax.js";

function car(parent, x, y, scale, rust) {
  const g = el("g", { transform: `translate(${x} ${y}) scale(${scale})` }, parent);
  el("path", { d: "M4 28 L10 16 H38 L48 28 H58 V40 H2 V28 Z", fill: rust }, g);
  el("path", { d: "M16 16 L20 6 H36 L40 16 Z", fill: "#1a120e" }, g);
  el("circle", { cx: 16, cy: 40, r: 6, fill: "#14100e" }, g);
  el("circle", { cx: 44, cy: 40, r: 6, fill: "#14100e" }, g);
  el("rect", { x: 22, y: 22, width: 10, height: 6, fill: "#3a2418" }, g);
  return g;
}

function figure(parent, x, y, scale) {
  const g = el("g", { class: "lost-walk", transform: `translate(${x} ${y}) scale(${scale})` }, parent);
  el("circle", { cx: 0, cy: -28, r: 4, fill: "#1a1010" }, g);
  el("path", { d: "M-5 -22 L0 -8 L6 -22 M0 -16 L0 -2 M-6 8 L0 -2 L5 10", fill: "none", stroke: "#1a1010", "stroke-width": 2.4, "stroke-linecap": "round" }, g);
  return g;
}

function protagonist(parent) {
  const g = el("g", { transform: "translate(1160 610)" }, parent);
  el("g", { transform: "translate(-3 -4)", fill: "#e89a3c", opacity: "0.9" }, g);
  const rim = g.lastChild;
  const draw = (target, fill) => {
    el("path", { d: "M28 150 L40 78 H78 L92 150 Z", fill }, target);
    el("path", { d: "M46 78 L52 46 H74 L80 78 Z", fill }, target);
    el("circle", { cx: 64, cy: 32, r: 16, fill }, target);
    el("path", { d: "M74 58 H104 V118 H78 Z", fill }, target);
    el("path", { d: "M40 86 L16 118 H34 L48 96 Z", fill }, target);
    el("rect", { x: -6, y: 108, width: 28, height: 36, rx: 2, fill: fill === "#140c0a" ? "#b7b1a6" : fill }, target);
    el("path", { d: "M2 108 V98 H16 V108", fill: "none", stroke: fill === "#140c0a" ? "#6e6a64" : fill, "stroke-width": 3 }, target);
    el("rect", { x: 6, y: 122, width: 6, height: 8, fill: fill === "#140c0a" ? "#2a2826" : fill }, target);
  };
  draw(rim, "#e89a3c");
  draw(g, "#140c0a");
  return g;
}

export function buildIntroScene(container) {
  container.replaceChildren();
  const svg = el("svg", { viewBox: "0 0 1440 900", preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Atardecer sobre un pueblo colonial abandonado, con un volcán al fondo y un errante con maletín." }, container);

  const defs = el("defs", {}, svg);
  const sky = el("linearGradient", { id: "sky-grad", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
  el("stop", { offset: "0%", "stop-color": "#2a0d0c" }, sky);
  el("stop", { offset: "42%", "stop-color": "#7a1e14" }, sky);
  el("stop", { offset: "78%", "stop-color": "#c4501f" }, sky);
  el("stop", { offset: "100%", "stop-color": "#e89a3c" }, sky);
  const cloud = el("radialGradient", { id: "cloud-grad", cx: "50%", cy: "50%", r: "50%" }, defs);
  el("stop", { offset: "0%", "stop-color": "#3a1214", "stop-opacity": "0.9" }, cloud);
  el("stop", { offset: "100%", "stop-color": "#3a1214", "stop-opacity": "0" }, cloud);
  const smoke = el("radialGradient", { id: "smoke-grad", cx: "50%", cy: "50%", r: "50%" }, defs);
  el("stop", { offset: "0%", "stop-color": "#2a2424", "stop-opacity": "0.55" }, smoke);
  el("stop", { offset: "100%", "stop-color": "#2a2424", "stop-opacity": "0" }, smoke);

  const far = el("g", { "data-depth": "0.18" }, svg);
  el("rect", { width: "1440", height: "900", fill: "url(#sky-grad)" }, far);
  el("ellipse", { cx: "280", cy: "150", rx: "220", ry: "48", fill: "url(#cloud-grad)" }, far);
  el("ellipse", { cx: "620", cy: "110", rx: "260", ry: "40", fill: "url(#cloud-grad)" }, far);
  el("ellipse", { cx: "1080", cy: "180", rx: "300", ry: "56", fill: "url(#cloud-grad)" }, far);
  el("polygon", { points: "0,560 80,470 180,530 300,400 430,520 560,430 700,540 860,390 1040,530 1200,450 1440,560 1440,900 0,900", fill: "#3a2420", opacity: "0.55" }, far);

  const mid = el("g", { "data-depth": "0.4" }, svg);
  el("polygon", { points: "620,560 760,250 900,560", fill: "#2a1816" }, mid);
  el("polygon", { points: "760,250 800,300 770,292 786,250", fill: "#1a100e" }, mid);
  const glow = el("ellipse", { class: "crater-glow", cx: "778", cy: "268", rx: "18", ry: "8", fill: "#e89a3c" }, mid);
  glow.setAttribute("opacity", "0.45");
  for (const puff of [[770, 210, 18], [786, 176, 26], [798, 140, 34], [808, 100, 42]]) {
    el("ellipse", { cx: puff[0], cy: puff[1], rx: puff[2], ry: puff[2] * 0.7, fill: "url(#smoke-grad)" }, mid);
  }
  el("polygon", { points: "0,620 120,500 240,580 380,470 520,600 1440,640 1440,900 0,900", fill: "#241614" }, mid);

  const town = el("g", { "data-depth": "0.62", transform: "translate(180 500)" }, svg);
  buildSkyline(town, createRng(404), { width: 980, height: 200, night: false });

  const road = el("g", { "data-depth": "0.78" }, svg);
  el("polygon", { points: "430,690 620,640 860,640 1180,820 180,860", fill: "#1a120f" }, road);
  figure(road, 700, 700, 0.8);
  figure(road, 760, 708, 0.7);
  figure(road, 820, 704, 0.75);
  car(road, 240, 760, 1.15, "#6a341c");
  car(road, 430, 790, 0.9, "#8a3b1c");
  car(road, 980, 800, 1.05, "#4a2a22");

  const front = el("g", { "data-depth": "1" }, svg);
  addVines(front, 40, 80);
  addBanana(front, 70, 560, 1.15, 1);
  addPalm(front, 180, 640, 1.05, 1);
  addPalm(front, 1380, 620, 1.2, -1);
  addBanana(front, 1280, 700, 0.9, -1);
  protagonist(front);

  return attachParallax(svg);
}
