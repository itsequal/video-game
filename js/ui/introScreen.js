import { NODE_META } from "../config.js";
import { BRIEFING, RADIO, rangeLine } from "../content/narrative.js";
import { buildIntroScene } from "../art/introScene.js";

const LEGEND = ["infected", "meds", "fuel", "food", "neutral", "blocked"];
const LEGEND_COLOR = {
  infected: "var(--infection)",
  meds: "#d7ec9a",
  fuel: "var(--ochre)",
  food: "#e7a07a",
  neutral: "var(--paper)",
  blocked: "#c4a090",
};

export function renderIntro(container, { onStart }) {
  container.replaceChildren();
  const root = document.createElement("div");
  root.className = "intro-root";
  root.innerHTML = `
    <div class="intro-art"></div>
    <div class="intro-panel">
      <p class="kicker reveal">Doce años después de El Colapso</p>
      <h1 class="display reveal">Ruta Cero</h1>
      <p class="subtitle reveal">El Último Convoy</p>
      <div class="rec reveal"><span class="rec-dot" aria-hidden="true"></span> Frecuencia abierta</div>
      <div class="radio"></div>
      <ul class="briefing"></ul>
      <div class="legend"></div>
      <button class="btn btn-primary" type="button">Iniciar misión</button>
    </div>
  `;
  container.appendChild(root);

  const radio = root.querySelector(".radio");
  for (const line of RADIO) {
    const p = document.createElement("p");
    p.className = "reveal";
    p.textContent = line;
    radio.appendChild(p);
  }

  const briefing = root.querySelector(".briefing");
  for (const line of BRIEFING) {
    const li = document.createElement("li");
    li.className = "reveal";
    li.textContent = line;
    briefing.appendChild(li);
  }

  const legend = root.querySelector(".legend");
  for (const type of LEGEND) {
    const meta = NODE_META[type];
    const item = document.createElement("div");
    item.className = "legend-item reveal";
    item.style.setProperty("--item-color", LEGEND_COLOR[type]);
    item.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-${meta.icon}"></use></svg>`;
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = meta.label;
    const range = document.createElement("small");
    range.textContent = type === "blocked" ? "No se puede cruzar." : `${meta.sub}. ${rangeLine(type)}`;
    copy.append(title, range);
    item.appendChild(copy);
    legend.appendChild(item);
  }

  const panel = root.querySelector(".intro-panel");
  [...panel.querySelectorAll(".reveal")].forEach((node, index) => {
    node.style.animationDelay = `${index * 50}ms`;
  });

  const stopParallax = buildIntroScene(root.querySelector(".intro-art"));
  const skip = () => panel.classList.add("is-skipped");
  root.addEventListener("pointerdown", skip);
  function onKey() { skip(); }
  window.addEventListener("keydown", onKey);

  root.querySelector("button").addEventListener("click", () => {
    stopParallax();
    window.removeEventListener("keydown", onKey);
    onStart();
  });

  return () => {
    stopParallax();
    window.removeEventListener("keydown", onKey);
  };
}
