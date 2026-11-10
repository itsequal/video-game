import { reducedMotion } from "./motion.js";

export function createScreens() {
  const nodes = {
    intro: document.getElementById("screen-intro"),
    world: document.getElementById("screen-world"),
    city: document.getElementById("screen-city"),
  };
  let current = "intro";

  function show(name, { origin } = {}) {
    if (name === current) return Promise.resolve();
    const next = nodes[name];
    const prev = nodes[current];
    current = name;
    if (reducedMotion()) {
      prev.classList.remove("is-active", "is-leaving", "is-entering");
      next.classList.add("is-active");
      next.classList.remove("is-entering", "is-leaving");
      return Promise.resolve();
    }
    next.style.transformOrigin = origin ? `${origin.x}px ${origin.y}px` : "50% 50%";
    next.classList.add("is-entering");
    next.getBoundingClientRect();
    prev.classList.add("is-leaving");
    next.classList.remove("is-entering");
    next.classList.add("is-active");
    return new Promise((resolve) => {
      window.setTimeout(() => {
        prev.classList.remove("is-active", "is-leaving", "is-entering");
        resolve();
      }, 300);
    });
  }

  return { show, nodes, current: () => current };
}
