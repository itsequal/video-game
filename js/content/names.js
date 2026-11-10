export const TOWN_NAMES = [
  "San Isidro de las Cenizas",
  "Santa Lucía del Humo",
  "Pueblo Nuevo del Volcán",
  "El Rosario de la Ceiba",
  "San Martín de la Lluvia",
  "Las Palmas Quemadas",
  "Santa Cruz del Río Seco",
  "El Carmen de los Helechos",
  "San Rafael del Polvo",
  "La Esperanza Baja",
  "San Pedro de la Niebla",
  "Las Mercedes del Barro",
  "El Triunfo de la Costa",
  "Santa Ana de los Mangos",
  "San Miguel del Derrumbe",
  "La Concordia Vieja",
];

export const PLACE_NAMES = {
  meds: ["Farmacia", "Centro de salud", "Botica", "Consultorio", "Dispensario"],
  fuel: ["Gasolinera", "Taller mecánico", "Camión abandonado", "Depósito de diésel", "Bidones"],
  food: ["Mercado", "Tienda de abarrotes", "Huerto", "Comedor", "Milpa"],
  infected: ["Iglesia tomada", "Terminal de autobuses", "Escuela", "Cine abandonado", "Mercado techado"],
  neutral: ["Plaza", "Cruce", "Puente", "Andén", "Mirador"],
  blocked: ["Deslave", "Derrumbe", "Puente caído", "Calle inundada"],
  entry: ["Entrada del pueblo"],
  exit: ["Salida a la carretera"],
};

export function pickPlaceName(rng, type, used) {
  const pool = PLACE_NAMES[type].filter((name) => !used.has(name));
  const name = rng.pick(pool.length ? pool : PLACE_NAMES[type]);
  used.add(name);
  return name;
}
