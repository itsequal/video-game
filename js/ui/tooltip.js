export function createTooltip(element) {
  let armed = false;
  let timer = 0;
  let leaveTimer = 0;
  let current = null;

  function place(anchor) {
    const rect = anchor.getBoundingClientRect();
    const tip = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - tip.width / 2;
    let y = rect.top - tip.height - 10;
    let origin = "center bottom";
    if (y < 8) {
      y = rect.bottom + 10;
      origin = "center top";
    }
    x = Math.max(8, Math.min(window.innerWidth - tip.width - 8, x));
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.setProperty("--transform-origin", origin);
  }

  function show(anchor, render) {
    window.clearTimeout(leaveTimer);
    window.clearTimeout(timer);
    const instant = armed && current != null;
    timer = window.setTimeout(() => {
      render(element);
      element.hidden = false;
      element.classList.toggle("is-instant", instant);
      element.classList.add("is-out");
      element.classList.remove("is-in");
      element.getBoundingClientRect();
      place(anchor);
      element.classList.remove("is-out");
      element.classList.add("is-in");
      armed = true;
      current = anchor;
    }, instant ? 0 : 300);
  }

  function hide() {
    window.clearTimeout(timer);
    element.classList.remove("is-in");
    element.classList.add("is-out");
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      element.hidden = true;
      current = null;
      armed = false;
    }, 420);
  }

  return { show, hide };
}
