export function attachParallax(root) {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return () => {};

  const layers = [...root.querySelectorAll("[data-depth]")];
  const motion = layers.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  let targetX = 0;
  let targetY = 0;
  let frame = 0;
  let last = performance.now();

  function onMove(event) {
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function step(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    layers.forEach((layer, index) => {
      const reach = Number(layer.dataset.depth) * 12;
      const item = motion[index];
      const goalX = targetX * reach;
      const goalY = targetY * reach;
      item.vx += ((goalX - item.x) * 90 - item.vx * 16) * dt;
      item.vy += ((goalY - item.y) * 90 - item.vy * 16) * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const dpr = window.devicePixelRatio || 1;
      const x = layer.dataset.pixel != null ? Math.round(item.x * dpr) / dpr : item.x;
      const y = layer.dataset.pixel != null ? Math.round(item.y * dpr) / dpr : item.y;
      layer.style.transform = `translate(${x}px, ${y}px)`;
    });
    frame = requestAnimationFrame(step);
  }

  root.addEventListener("pointermove", onMove);
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener("pointermove", onMove);
  };
}
