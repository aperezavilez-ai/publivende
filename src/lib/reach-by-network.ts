import type { Red } from "@/lib/mock/types";
import type { PublishAlcance } from "./geo-targeting";

export interface AlcancePorRed {
  red: Red;
  personas_min: number;
  personas_max: number;
  impresiones_min: number;
  impresiones_max: number;
  penetracion_pct: number;
  seleccionada: boolean;
}

const ALL_REDES: Red[] = ["instagram", "facebook", "tiktok", "youtube"];

/** Usuarios activos estimados sobre la población de la zona (México / LATAM). */
const PENETRACION_RED: Record<Red, number> = {
  instagram: 0.44,
  facebook: 0.39,
  tiktok: 0.36,
  youtube: 0.31,
};

/** Alcance orgánico típico sobre usuarios activos en la zona. */
const ALCANCE_ORGANICO_LOCAL: Record<Red, number> = {
  instagram: 0.14,
  facebook: 0.09,
  tiktok: 0.17,
  youtube: 0.07,
};

const ALCANCE_ORGANICO_GLOBAL: Record<Red, number> = {
  instagram: 0.04,
  facebook: 0.03,
  tiktok: 0.05,
  youtube: 0.025,
};

const POBLACION_PAIS: Record<string, number> = {
  MX: 130_000_000,
  CO: 52_000_000,
  AR: 46_000_000,
  CL: 19_500_000,
  PE: 34_000_000,
};

const METRO_KEYWORDS = /guadalajara|monterrey|tijuana|puebla|cancún|merida|mérida|querétaro|toluca|león|cdmx|ciudad de méxico|ecatepec|saltillo|hermosillo|culiacán|mazatlán/i;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Población aproximada dentro del radio (habitantes + zona de influencia comercial). */
export function poblacionEnZona(ciudad: string, estado: string, radioKm: number): number {
  const area = Math.PI * radioKm * radioKm;
  const isMetro = METRO_KEYWORDS.test(ciudad) || estado === "Ciudad de México";
  const density = isMetro ? 950 : 380;
  const variance = 0.85 + (hashStr(`${ciudad}-${estado}`) % 30) / 100;
  const raw = area * density * variance;
  const cap = isMetro ? 6_500_000 : 1_800_000;
  return Math.min(Math.round(raw), cap);
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("es-MX");
}

export { formatCompact as formatAlcanceNumero };

/**
 * Estima personas e impresiones alcanzables por red según alcance global/local.
 */
export function estimarAlcancePorRed(
  alcance: PublishAlcance,
  redesSeleccionadas: Red[],
  calidadScore = 65,
): AlcancePorRed[] {
  const factorCalidad = 0.7 + (calidadScore / 100) * 0.6;
  const esLocal = alcance.tipo === "local";
  const poblacionBase = esLocal
    ? poblacionEnZona(alcance.ciudad ?? "", alcance.estado ?? "", alcance.radio_km ?? 25)
    : (POBLACION_PAIS[alcance.pais_codigo ?? "MX"] ?? 130_000_000);

  const radioFactor = esLocal
    ? Math.max(0.6, Math.min(1.2, (alcance.radio_km ?? 25) / 50))
    : 1;

  return ALL_REDES.map((red) => {
    const activos = poblacionBase * PENETRACION_RED[red];
    const tasa = esLocal ? ALCANCE_ORGANICO_LOCAL[red] : ALCANCE_ORGANICO_GLOBAL[red];
    const centro = activos * tasa * factorCalidad * radioFactor;
    const personas_min = Math.round(centro * 0.8);
    const personas_max = Math.round(centro * 1.25);
    const impresiones_min = Math.round(personas_min * 1.4);
    const impresiones_max = Math.round(personas_max * 1.8);
    const penetracion_pct = Math.round((centro / Math.max(poblacionBase, 1)) * 1000) / 10;

    return {
      red,
      personas_min,
      personas_max,
      impresiones_min,
      impresiones_max,
      penetracion_pct,
      seleccionada: redesSeleccionadas.includes(red),
    };
  });
}

export function totalAlcanceSeleccionado(items: AlcancePorRed[]): { personas_min: number; personas_max: number } {
  const sel = items.filter((i) => i.seleccionada);
  if (!sel.length) {
    return {
      personas_min: items.reduce((s, i) => s + i.personas_min, 0),
      personas_max: items.reduce((s, i) => s + i.personas_max, 0),
    };
  }
  return {
    personas_min: sel.reduce((s, i) => s + i.personas_min, 0),
    personas_max: sel.reduce((s, i) => s + i.personas_max, 0),
  };
}
