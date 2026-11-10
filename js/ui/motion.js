export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function announce(text) {
  const live = document.getElementById("live");
  if (!live) return;
  live.textContent = "";
  live.textContent = text;
}

export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
