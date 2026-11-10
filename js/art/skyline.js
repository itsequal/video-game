import { el } from "./svg.js";

function church(parent, x, ground, tone, hole) {
  el("polygon", { points: `${x - 46},${ground} ${x - 46},${ground - 78} ${x - 16},${ground - 78} ${x - 16},${ground - 118} ${x + 4},${ground - 118} ${x + 4},${ground - 78} ${x + 34},${ground - 78} ${x + 34},${ground}`, fill: tone }, parent);
  el("polygon", { points: `${x - 16},${ground - 118} ${x - 6},${ground - 148} ${x + 4},${ground - 118}`, fill: tone }, parent);
  el("rect", { x: x - 8, y: ground - 168, width: 3, height: 22, fill: tone }, parent);
  el("rect", { x: x - 13, y: ground - 164, width: 13, height: 3, fill: tone }, parent);
  el("rect", { x: x - 8, y: ground - 36, width: 16, height: 36, fill: hole }, parent);
  el("rect", { x: x - 34, y: ground - 58, width: 10, height: 16, fill: hole }, parent);
  el("rect", { x: x + 16, y: ground - 58, width: 10, height: 16, fill: hole }, parent);
}

function house(parent, x, ground, width, height, tone, hole, windows) {
  el("rect", { x, y: ground - height, width, height, fill: tone }, parent);
  el("rect", { x: x - 2, y: ground - height - 8, width: width + 4, height: 8, fill: tone }, parent);
  for (let row = 0; row < windows; row += 1) {
    for (let col = 0; col < Math.max(1, Math.floor(width / 22)); col += 1) {
      el("rect", {
        x: x + 6 + col * 18,
        y: ground - height + 14 + row * 22,
        width: 8,
        height: 10,
        fill: hole,
      }, parent);
    }
  }
}

function poles(parent, ground, width, tone) {
  const gap = Math.max(120, width / 6);
  let previous = null;
  for (let x = 30; x < width - 10; x += gap) {
    el("line", { x1: x, y1: ground, x2: x, y2: ground - 70, stroke: tone, "stroke-width": 2 }, parent);
    el("line", { x1: x - 12, y1: ground - 62, x2: x + 12, y2: ground - 62, stroke: tone, "stroke-width": 2 }, parent);
    if (previous != null) {
      const mid = (previous + x) / 2;
      el("path", {
        d: `M ${previous} ${ground - 62} Q ${mid} ${ground - 40} ${x} ${ground - 62}`,
        fill: "none",
        stroke: tone,
        "stroke-width": 1.4,
      }, parent);
    }
    previous = x;
  }
}

export function buildSkyline(parent, rng, { width = 1000, height = 210, night = false } = {}) {
  const g = el("g", { class: "skyline" }, parent);
  const ground = height - 6;
  const tone = night ? "#121816" : "#2a1814";
  const toneAlt = night ? "#1a2420" : "#4a2c22";
  const hole = night ? "#070908" : "#140c0c";
  const churchX = width * 0.46;
  let cursor = 8;
  let tankHost = null;

  while (cursor < width - 30) {
    if (cursor < churchX && cursor + 80 > churchX - 30) {
      church(g, churchX, ground, tone, hole);
      cursor = churchX + 48;
      continue;
    }
    const w = rng.randInt(34, 86);
    const h = rng.randInt(46, night ? 100 : 130);
    const tonePick = rng.chance(0.5) ? tone : toneAlt;
    house(g, cursor, ground, w, h, tonePick, hole, h > 80 ? 2 : 1);
    if (!tankHost || h > tankHost.h) tankHost = { x: cursor, w, h };
    cursor += w + rng.randInt(6, 16);
  }

  if (tankHost) {
    const tx = tankHost.x + tankHost.w / 2;
    const ty = ground - tankHost.h - 8;
    el("rect", { x: tx - 8, y: ty - 28, width: 16, height: 28, fill: toneAlt }, g);
    el("ellipse", { cx: tx, cy: ty - 28, rx: 8, ry: 4, fill: tone }, g);
  }

  poles(g, ground, width, night ? "#24302c" : "#1a100e");
  el("rect", { x: 0, y: ground, width, height: 8, fill: night ? "#0c100e" : "#1a100e" }, g);
  return g;
}
