import { CONFIG } from "../config.js";
import { formatClock } from "../content/narrative.js";
import { reducedMotion } from "./motion.js";

function polar(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return [60 + radius * Math.cos(rad), 70 - radius * Math.sin(rad)];
}

function arc(a0, a1, radius) {
  const [x0, y0] = polar(a0, radius);
  const [x1, y1] = polar(a1, radius);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 < a0 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function fuelAngle(liters) {
  const fraction = Math.max(0, Math.min(1, liters / CONFIG.gaugeMax));
  return 180 - fraction * 180;
}

export function createHud(container, { showTime = false } = {}) {
  container.replaceChildren();
  container.classList.add("hud");
  container.innerHTML = `
    <div class="hud-block">
      <span class="case-kicker">Salud</span>
      <div class="hp-track" role="meter" aria-label="Salud" aria-valuemin="0" aria-valuemax="${CONFIG.hpMax}"><div class="hp-fill"></div></div>
      <span class="hp-num"></span>
    </div>
    <div class="hud-block">
      <div class="gauge" role="meter" aria-label="Gasolina" aria-valuemin="0" aria-valuemax="${CONFIG.gaugeMax}">
        <svg viewBox="0 0 120 78" aria-hidden="true">
          <path class="gauge-track" d="${arc(180, 0, 48)}" fill="none" stroke="#3a3330" stroke-width="8" stroke-linecap="round"></path>
          <path class="gauge-fuel" d="" fill="none" stroke="#e89a3c" stroke-width="8" stroke-linecap="round"></path>
          <path class="gauge-spend" d="" fill="none" stroke="#d0402b" stroke-width="8" stroke-linecap="round"></path>
        </svg>
        <div class="needle-arm"></div>
      </div>
      <span class="hp-num fuel-num"></span>
    </div>
    <div class="hud-block case">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-briefcase"></use></svg>
      <div>
        <span class="case-kicker">Maletín</span>
        <span class="case-num"></span>
      </div>
    </div>
    <div class="hud-block day"${showTime ? "" : " hidden"}>
      <svg class="icon day-sun" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-sun"></use></svg>
      <div class="day-track" role="meter" aria-label="Luz del día" aria-valuemin="0" aria-valuemax="${CONFIG.timerSeconds}"><div class="day-fill"></div></div>
      <span class="day-num"></span>
    </div>
    <p class="fuel-warn" hidden></p>
  `;

  const hpFill = container.querySelector(".hp-fill");
  const hpNum = container.querySelector(".hp-num");
  const hpMeter = container.querySelector(".hp-track");
  const fuelPath = container.querySelector(".gauge-fuel");
  const spendPath = container.querySelector(".gauge-spend");
  const needle = container.querySelector(".needle-arm");
  const fuelNum = container.querySelector(".fuel-num");
  const fuelMeter = container.querySelector(".gauge");
  const caseNum = container.querySelector(".case-num");
  const caseBlock = container.querySelector(".case");
  const dayFill = container.querySelector(".day-fill");
  const dayNum = container.querySelector(".day-num");
  const dayMeter = container.querySelector(".day-track");
  const warn = container.querySelector(".fuel-warn");
  let warned30 = false;
  let warned10 = false;

  function setStats({ hp, fuel, meds }) {
    const hpRatio = Math.max(0, Math.min(1, hp / CONFIG.hpMax));
    hpFill.style.transform = `scaleX(${hpRatio})`;
    hpNum.textContent = String(Math.max(0, Math.round(hp)));
    hpMeter.setAttribute("aria-valuenow", String(Math.max(0, Math.round(hp))));
    const fraction = Math.max(0, Math.min(1, fuel / CONFIG.gaugeMax));
    const angle = -90 + fraction * 180;
    if (reducedMotion()) needle.style.transition = "none";
    needle.style.transform = `rotate(${angle}deg)`;
    fuelNum.textContent = `${Math.round(fuel)} L`;
    fuelMeter.setAttribute("aria-valuenow", String(Math.round(fuel)));
    const end = fuelAngle(fuel);
    fuelPath.setAttribute("d", fuel > 0 ? arc(180, end, 48) : "");
    caseNum.textContent = `${meds}/${CONFIG.medsGoal}`;
    caseBlock.classList.toggle("is-ready", meds >= CONFIG.medsGoal);
  }

  function setProjected(cost, fuel) {
    if (cost <= 0) {
      spendPath.setAttribute("d", "");
      warn.hidden = true;
      return;
    }
    const after = Math.max(0, fuel - cost);
    const from = fuelAngle(fuel);
    const to = fuelAngle(after);
    spendPath.setAttribute("d", arc(to, from, 48));
    spendPath.setAttribute("stroke", cost > fuel ? "#d0402b" : "#8a3b1c");
    if (cost > fuel) {
      warn.hidden = false;
      warn.textContent = `La ruta marcada pide ${cost} L y llevas ${fuel} L. Puede no alcanzar, salvo que recojas gasolina en el camino.`;
    } else {
      warn.hidden = true;
    }
  }

  function setTime(seconds) {
    const ratio = Math.max(0, Math.min(1, seconds / CONFIG.timerSeconds));
    dayFill.style.transform = `scaleX(${ratio})`;
    dayNum.textContent = formatClock(seconds);
    dayMeter.setAttribute("aria-valuenow", String(Math.ceil(seconds)));
    dayFill.classList.toggle("is-amber", seconds <= 30 && seconds > 10);
    dayFill.classList.toggle("is-danger", seconds <= 10);
    dayFill.classList.toggle("is-pulse", seconds <= 10 && seconds > 0);
    if (!warned30 && seconds <= 30 && seconds > 10) {
      warned30 = true;
      return "thirty";
    }
    if (!warned10 && seconds <= 10 && seconds > 0) {
      warned10 = true;
      return "ten";
    }
    return null;
  }

  return { setStats, setProjected, setTime };
}
