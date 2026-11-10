import { CONFIG, NODE_META } from "../config.js";

export const RADIO = [
  "— ...La Estación a quien escuche. No apaguen el receptor.",
  "— Doce años desde El Colapso. Unos dicen que fue la fiebre. Otros, el volcán. Otros, las tormentas.",
  "— Las carreteras siguen ahí, rotas por la lluvia. Los pueblos, no.",
  "— El maletín tiene que llegar con treinta frascos. Ni uno menos.",
  "— Cruza mientras quede luz. De noche salen los perdidos.",
];

export const BRIEFING = [
  "Eres un errante. El Mirador te entrega la pickup y el maletín.",
  "Viaja de pueblo en pueblo hacia el este, hasta la Ciudad de la Resistencia.",
  "En cada pueblo hay dos minutos de luz para marcar un camino sin repetir lugares.",
  "Cada tramo gasta la gasolina del letrero. Si no alcanza a mitad de camino, te quedas varado.",
  "Llegar con el tanque en cero es válido. Llegar sin salud, no.",
];

export const LORE = [
  {
    where: "Nota en una farmacia",
    text: "Las primeras fiebres llegaron antes de la ceniza. En el cuaderno de ventas, al margen, una palabra: lote.",
  },
  {
    where: "Bitácora de un taller",
    text: "El mismo día se apagaron las radios y dejaron de entrar los convoyes. Alguien escribió: «no fue la tormenta».",
  },
  {
    where: "Pizarrón de una escuela",
    text: "Los niños copiaron la última fecha en que hubo clase. Debajo, con otra letra: «la estación sigue hablando».",
  },
  {
    where: "Cajón sellado",
    text: "Un cajón metálico, igual al maletín, con el sello borrado a medias. Adentro, frascos vacíos y un mapa hacia el este.",
  },
  {
    where: "Transmisión cortada",
    text: "Entre el ruido, una frase de La Estación: «No fue el volcán. El volcán solo tapó lo que hicimos.»",
  },
];

export const FAILURES = {
  varado: {
    title: "Varado en la carretera",
    text: "El motor tose y se apaga a mitad del tramo. Con la noche encima, nadie va a empujar la pickup.",
  },
  devorado: {
    title: "Los perdidos",
    text: "Rodean el convoy antes de que puedas cerrar la puerta. La salud llega a cero.",
  },
  atrapado: {
    title: "La noche te alcanzó",
    text: "La noche te alcanzó en el pueblo. Sin una ruta hasta la salida, el convoy no vuelve a la carretera.",
  },
  mision: {
    title: "Maletín incompleto",
    text: "Llegas a La Estación, pero el maletín no completa los treinta frascos. La resistencia no puede abrir las puertas.",
  },
};

export const VICTORY = {
  kicker: "Ciudad de la Resistencia",
  title: "El maletín llega",
  text: "La Estación sigue en pie, con un generador que nadie admite haber encendido. El sello de los frascos es el mismo que el de los contenedores del laboratorio del fondo: lote cero. El volcán solo cubrió el cielo. Lo que quebró el mundo viajaba en el maletín, y también el remedio.",
};

export const CHOICE = {
  question: "¿Vale la pena reconstruir lo que existía antes, o la humanidad debería crear algo distinto?",
  rebuild: {
    label: "Reconstruir lo que había",
    line: "Encienden los generadores de La Estación y vuelven a ponerle nombre a las calles. El maletín se guarda bajo llave, como antes.",
  },
  anew: {
    label: "Crear algo distinto",
    line: "Dejan la estación cerrada. Reparten la medicina en los pueblos, sin bandera y sin dueño. El maletín queda vacío a propósito.",
  },
};

export const REJECT = {
  repeat: "Ya pasaste por aquí",
  "no-edge": "No hay camino directo",
  blocked: "Deslave: camino intransitable",
  done: "La ruta ya llega a la salida",
};

export function rangeLine(type) {
  switch (type) {
    case "infected":
      return `Entre −${CONFIG.damage[0]} y −${CONFIG.damage[1]} HP`;
    case "meds":
      return `Entre +${CONFIG.meds[0]} y +${CONFIG.meds[1]} frascos`;
    case "fuel":
      return `Entre +${CONFIG.fuelReward[0]} y +${CONFIG.fuelReward[1]} L`;
    case "food":
      return `Entre +${CONFIG.food[0]} y +${CONFIG.food[1]} HP`;
    case "neutral":
      return "No cambia la salud ni los suministros. El tramo igual gasta gasolina.";
    case "blocked":
      return "Intransitable.";
    default:
      return NODE_META[type]?.sub || "";
  }
}

export function formatClock(seconds) {
  const safe = seconds <= 0 ? 0 : Math.ceil(seconds - 1e-9);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function eventDelta(event) {
  if (!event) return "";
  if (event.kind === "infected") return `−${event.amount} HP`;
  if (event.kind === "meds") return `+${event.amount} frascos`;
  if (event.kind === "fuel") return `+${event.amount} L`;
  if (event.kind === "food") return `+${event.amount} HP`;
  return "";
}
