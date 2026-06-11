/**
 * 32 entidades + 2,478 municipios (INEGI / AGEEML).
 * Fuente: https://github.com/cisnerosnow/json-estados-municipios-mexico
 */
import rawInegi from "@/data/mexico-municipios.json";

/** Nombre corto en UI → clave en JSON INEGI */
const ESTADO_A_INGEI: Record<string, string> = {
  Coahuila: "Coahuila de Zaragoza",
  Michoacán: "Michoacán de Ocampo",
  Veracruz: "Veracruz de Ignacio de la Llave",
};

/** Clave INEGI → nombre corto en UI */
const INEGI_A_ESTADO: Record<string, string> = {
  "Coahuila de Zaragoza": "Coahuila",
  "Michoacán de Ocampo": "Michoacán",
  "Veracruz de Ignacio de la Llave": "Veracruz",
};

function displayEstado(inegiNombre: string): string {
  return INEGI_A_ESTADO[inegiNombre] ?? inegiNombre;
}

function inegiEstado(uiNombre: string): string {
  return ESTADO_A_INGEI[uiNombre] ?? uiNombre;
}

const MEXICO_RAW = rawInegi as Record<string, string[]>;

/** Todos los estados con todos sus municipios (orden alfabético). */
export const MEXICO_ESTADOS_CIUDADES: Record<string, string[]> = Object.fromEntries(
  Object.entries(MEXICO_RAW).map(([inegi, municipios]) => [
    displayEstado(inegi),
    [...municipios].sort((a, b) => a.localeCompare(b, "es")),
  ]),
);

export const MEXICO_TOTAL_MUNICIPIOS = Object.values(MEXICO_ESTADOS_CIUDADES).reduce(
  (s, list) => s + list.length,
  0,
);

export function municipiosDeEstadoMexico(estadoUi: string): string[] {
  return MEXICO_ESTADOS_CIUDADES[estadoUi] ?? MEXICO_RAW[inegiEstado(estadoUi)] ?? [];
}

/** Busca municipio en todo México (para autocompletar perfil). */
export function buscarMunicipioEnMexico(nombre: string): { estado: string; municipio: string } | null {
  const q = nombre.trim().toLowerCase();
  if (!q) return null;
  for (const [estado, municipios] of Object.entries(MEXICO_ESTADOS_CIUDADES)) {
    const exact = municipios.find((m) => m.toLowerCase() === q);
    if (exact) return { estado, municipio: exact };
    const partial = municipios.find((m) => m.toLowerCase().includes(q) || q.includes(m.toLowerCase()));
    if (partial) return { estado, municipio: partial };
  }
  return null;
}
