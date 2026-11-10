import { reducedMotion } from "./motion.js";

function pause(ms, signal) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export async function playRoute({ view, city, result }) {
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "btn btn-ghost skip-btn";
  skip.textContent = "Saltar";
  view.stage.appendChild(skip);
  const control = new AbortController();
  skip.addEventListener("click", () => control.abort());

  view.placeToken();
  try {
    for (const step of result.steps) {
      if (control.signal.aborted) break;
      const animation = view.moveToken(step.u, step.v);
      const finished = animation.finished.catch(() => {});
      control.signal.addEventListener("abort", () => animation.cancel(), { once: true });
      await finished;
      if (control.signal.aborted) break;
      view.revealStep(step);
      view.setStats(step.snapshot);
      view.spawnDelta(step);
      await pause(reducedMotion() ? 60 : 260, control.signal);
    }
    if (!control.signal.aborted && result.reason === "varado" && result.from) {
      const animation = view.moveToken(result.from, result.at);
      await pause(reducedMotion() ? 40 : 280, control.signal);
      animation.cancel();
    }
  } finally {
    if (control.signal.aborted) {
      view.setStats(result.snapshot);
      for (const step of result.steps) view.revealStep(step);
      const last = result.steps.at(-1);
      if (last) view.moveToken(last.v, last.v).cancel();
      const node = city.nodes[last ? last.v : city.entry];
      const rect = view.stage.getBoundingClientRect();
      const token = view.stage.querySelector(".convoy-token");
      token.style.transform = `translate(${(node.x / 100) * rect.width}px, ${(node.y / 100) * rect.height}px)`;
    }
    skip.remove();
  }
}
