import { SPRITE } from "../art/errante.sprite.js";
import { reducedMotion } from "./motion.js";

const sheetUrl = new URL("../../assets/sprites/errante.png", import.meta.url).href;

function regionFor(crop) {
  if (crop === "portrait") return SPRITE.portrait;
  return { x: 0, y: 0, w: SPRITE.frameW, h: SPRITE.frameH };
}

export function createSprite({ crop = "full", targetHeight = 56, idle = false, shadow = false } = {}) {
  const region = regionFor(crop);
  const root = document.createElement("div");
  root.className = "pixel-sprite";
  root.setAttribute("aria-hidden", "true");
  const frameWindow = document.createElement("div");
  frameWindow.className = "pixel-sprite-window";
  const strip = document.createElement("div");
  strip.className = "pixel-sprite-strip";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.src = sheetUrl;
  strip.appendChild(image);
  frameWindow.appendChild(strip);
  root.appendChild(frameWindow);

  let shade = null;
  if (shadow) {
    shade = document.createElement("div");
    shade.className = "pixel-shadow";
    root.appendChild(shade);
  }

  let frame = "calm";
  let hp = 100;
  let pixel = 1;
  let seenDpr = window.devicePixelRatio || 1;
  let motion = null;
  let restoreTimer = 0;
  let idleTimer = 0;
  let watchFrame = 0;
  const density = { query: null };

  function height() {
    return typeof targetHeight === "function" ? targetHeight() : targetHeight;
  }

  function cssPixels(cells) {
    const dpr = window.devicePixelRatio || 1;
    return (cells * pixel) / dpr;
  }

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    pixel = Math.max(1, Math.round((height() * dpr) / region.h));
    frameWindow.style.width = `${cssPixels(region.w)}px`;
    frameWindow.style.height = `${cssPixels(region.h)}px`;
    image.style.width = `${cssPixels(SPRITE.frameW * SPRITE.frames.length)}px`;
    image.style.height = `${cssPixels(SPRITE.frameH)}px`;
    image.style.marginLeft = `${cssPixels(-region.x)}px`;
    image.style.marginTop = `${cssPixels(-region.y)}px`;
    if (shade) shade.style.height = `${cssPixels(2)}px`;
    applyFrame();
  }

  function applyFrame() {
    const index = Math.max(0, SPRITE.frames.indexOf(frame));
    strip.style.transform = `translateX(${-cssPixels(index * SPRITE.frameW)}px)`;
  }

  function setFrame(name) {
    frame = name;
    applyFrame();
  }

  function baseFrame() {
    return hp <= 25 ? "down" : "calm";
  }

  function settle(name) {
    window.clearTimeout(restoreTimer);
    motion?.cancel();
    motion = null;
    root.style.transform = "";
    setFrame(name);
  }

  function react(kind) {
    if (kind === "infected") {
      setFrame("hurt");
      window.clearTimeout(restoreTimer);
      if (!reducedMotion()) {
        motion?.cancel();
        const step = cssPixels(1);
        motion = root.animate(
          [
            { transform: "translateX(0px)" },
            { transform: `translateX(${-step}px)` },
            { transform: "translateX(0px)" },
          ],
          { duration: 160, easing: "steps(2, end)" },
        );
      }
      restoreTimer = window.setTimeout(() => setFrame(baseFrame()), 180);
      return;
    }
    if (kind !== "meds" && kind !== "fuel" && kind !== "food") return;
    if (reducedMotion()) return;
    motion?.cancel();
    const step = cssPixels(1);
    motion = root.animate(
      [
        { transform: "translateY(0px)" },
        { transform: `translateY(${-step}px)` },
        { transform: "translateY(0px)" },
      ],
      { duration: 200, easing: "steps(2, end)" },
    );
  }

  function noteHp(next) {
    hp = next;
    if (frame === "hurt") return;
    setFrame(baseFrame());
  }

  function onDensity() {
    density.query?.removeEventListener("change", onDensity);
    layout();
    bindDensity();
  }

  function bindDensity() {
    density.query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    density.query.addEventListener("change", onDensity);
  }

  function watchDensity() {
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== seenDpr) {
      seenDpr = dpr;
      layout();
    }
    watchFrame = window.requestAnimationFrame(watchDensity);
  }

  layout();
  window.addEventListener("resize", layout);
  bindDensity();
  watchFrame = window.requestAnimationFrame(watchDensity);
  if (idle && !reducedMotion()) {
    idleTimer = window.setInterval(() => {
      setFrame(frame === "calm" ? "breathe" : "calm");
    }, 900);
  }

  return {
    root,
    setFrame,
    react,
    settle,
    noteHp,
    destroy() {
      window.clearInterval(idleTimer);
      window.clearTimeout(restoreTimer);
      motion?.cancel();
      window.removeEventListener("resize", layout);
      window.cancelAnimationFrame(watchFrame);
      density.query?.removeEventListener("change", onDensity);
      root.remove();
    },
  };
}
