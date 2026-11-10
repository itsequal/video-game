export function createCityTimer({ seconds, onTick, onEnd, onPause, onResume }) {
  const total = seconds * 1000;
  let remaining = total;
  let last = null;
  let frame = 0;
  let running = false;
  let stopped = false;
  let ended = false;

  function tick(now) {
    if (!running) return;
    if (last == null) last = now;
    remaining -= now - last;
    last = now;
    if (remaining <= 0) {
      remaining = 0;
      running = false;
      onTick(0);
      if (!ended) {
        ended = true;
        onEnd();
      }
      return;
    }
    onTick(remaining / 1000);
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    last = null;
    onPause?.();
  }

  function resume() {
    if (stopped || ended || running || document.hidden) return;
    running = true;
    last = null;
    frame = requestAnimationFrame(tick);
    onResume?.();
  }

  function onVisibility() {
    if (stopped || ended) return;
    if (document.hidden) pause();
    else resume();
  }

  document.addEventListener("visibilitychange", onVisibility);

  return {
    start() {
      if (stopped || ended) return;
      onTick(remaining / 1000);
      resume();
    },
    pause,
    resume,
    stop() {
      stopped = true;
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
    },
    getRemaining() {
      return remaining / 1000;
    },
  };
}
