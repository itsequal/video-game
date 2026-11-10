import { el } from "./svg.js";

export function addPalm(parent, x, y, scale = 1, flip = 1) {
  const g = el("g", { transform: `translate(${x} ${y}) scale(${flip * scale} ${scale})` }, parent);
  el("path", { d: "M0 0 C 8 40 6 90 -2 150", fill: "none", stroke: "#1a120e", "stroke-width": 7, "stroke-linecap": "round" }, g);
  const fronds = ["M0 8 C 30 -10 70 10 92 28", "M0 8 C 24 -28 60 -36 78 -18", "M0 8 C -20 -24 -62 -20 -84 6", "M0 8 C -28 -6 -70 16 -96 34", "M0 4 C 10 -40 18 -52 16 -70"];
  for (const d of fronds) {
    el("path", { d, fill: "none", stroke: "#1d3a28", "stroke-width": 5, "stroke-linecap": "round" }, g);
  }
  return g;
}

export function addBanana(parent, x, y, scale = 1, flip = 1) {
  const g = el("g", { transform: `translate(${x} ${y}) scale(${flip * scale} ${scale})` }, parent);
  const leaves = [
    "M0 40 C -20 10 -10 -40 8 -78 C 4 -20 10 10 0 40",
    "M0 36 C 30 10 48 -30 70 -58 C 30 -10 16 16 0 36",
    "M0 36 C -36 6 -50 -24 -78 -40 C -30 0 -12 20 0 36",
  ];
  for (const d of leaves) el("path", { d, fill: "#24533a" }, g);
  el("path", { d: "M-6 40 C -2 70 4 100 0 130", fill: "none", stroke: "#143024", "stroke-width": 4 }, g);
  return g;
}

export function addVines(parent, x, y) {
  const g = el("g", {}, parent);
  el("path", {
    d: `M ${x} ${y} C ${x + 10} ${y + 40}, ${x - 16} ${y + 80}, ${x + 6} ${y + 140}`,
    fill: "none",
    stroke: "#1e4632",
    "stroke-width": 3,
  }, g);
  el("ellipse", { cx: x + 14, cy: y + 46, rx: 16, ry: 7, fill: "#2f5a3a", transform: `rotate(-30 ${x + 14} ${y + 46})` }, g);
  el("ellipse", { cx: x - 12, cy: y + 96, rx: 18, ry: 7, fill: "#24533a", transform: `rotate(24 ${x - 12} ${y + 96})` }, g);
  return g;
}
