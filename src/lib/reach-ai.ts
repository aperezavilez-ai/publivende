import type { Red } from "@/lib/mock/types";
import type { PublishAlcance } from "./geo-targeting";
import { estimarAlcancePorRed, formatAlcanceNumero, type AlcancePorRed } from "./reach-by-network";
import type { SourceMetadata } from "@/services/import/fetchMetadata";
import type { SourcePlatform } from "@/services/import/detectPlatform";
import { getNicheHashtags } from "@/services/import/nicheHashtags";
import { SOURCE_LABELS } from "@/services/import/detectPlatform";
import { inferNichoFromText, normalizeIndustria, type NichoKey } from "@/services/import/inferNiche";

export type { NichoKey };

export interface ReachAIAnalysis {
  nicho: NichoKey;
  nicho_label: string;
  mercados: string[];
  confianza: number;
  origen_plataforma?: SourcePlatform;
  fuente: "link_ia" | "link_import" | "manual";
  resumen: string;
}

export interface AlcancePorRedIA extends AlcancePorRed {
  afinidad_nicho: number;
  mercados_red: string[];
  hashtags_nicho: string[];
  confianza: number;
}

const NICHO_LABELS: Record<NichoKey, string> = {
  moda: "Moda y retail",
  ropa: "Ropa y accesorios",
  belleza: "Belleza y cuidado personal",
  comida: "Comida y restaurantes",
  fitness: "Fitness y wellness",
  servicios: "Servicios profesionales",
  tecnologia: "Tecnología y digital",
  default: "Emprendimiento general",
};

/** Afinidad del nicho por red (1 = promedio LATAM). */
const AFINIDAD_NICHO_RED: Record<NichoKey, Record<Red, number>> = {
  moda: { instagram: 1.38, tiktok: 1.32, facebook: 0.92, youtube: 0.88 },
  ropa: { instagram: 1.35, tiktok: 1.28, facebook: 0.95, youtube: 0.85 },
  belleza: { instagram: 1.42, tiktok: 1.35, facebook: 0.88, youtube: 1.05 },
  comida: { instagram: 1.15, tiktok: 1.22, facebook: 1.12, youtube: 1.08 },
  fitness: { instagram: 1.2, tiktok: 1.38, facebook: 0.9, youtube: 1.15 },
  servicios: { instagram: 0.95, tiktok: 0.88, facebook: 1.18, youtube: 1.22 },
  tecnologia: { instagram: 0.9, tiktok: 1.05, facebook: 1.05, youtube: 1.35 },
  default: { instagram: 1.05, tiktok: 1.1, facebook: 1.0, youtube: 0.95 },
};

/** Boost si republicas en la misma red de origen. */
const BOOST_MISMA_RED: Record<SourcePlatform, Partial<Record<Red, number>>> = {
  instagram: { instagram: 1.12 },
  facebook: { facebook: 1.1 },
  tiktok: { tiktok: 1.15 },
  youtube: { youtube: 1.12 },
};

function mercadosParaNicho(
  nicho: NichoKey,
  alcance: PublishAlcance,
  red: Red,
): string[] {
  const label = NICHO_LABELS[nicho];
  const mercados: string[] = [];
  if (alcance.tipo === "local") {
    if (alcance.ciudad) mercados.push(`${label} · ${alcance.ciudad}`);
    if (alcance.estado) mercados.push(`Compradores ${alcance.estado}`);
    mercados.push(`Radio ${alcance.radio_km ?? 25} km`);
  } else {
    mercados.push(`${label} LATAM`);
    if (alcance.pais) mercados.push(`Audiencia ${alcance.pais}`);
    mercados.push("Hispanohablantes");
  }
  const redMercado: Partial<Record<Red, string>> = {
    instagram: "Feed + Reels + Stories",
    facebook: "Feed + Marketplace + Grupos",
    tiktok: "For You + TikTok Shop",
    youtube: "Shorts + Suscriptores",
  };
  mercados.push(redMercado[red] ?? red);
  return mercados.slice(0, 4);
}

export interface AnalizarAlcanceInput {
  alcance: PublishAlcance;
  redes: Red[];
  calidadScore?: number;
  industria?: string;
  source?: SourceMetadata | null;
  copyPorRed?: Partial<Record<Red, string>>;
  copyManual?: string;
  fuente: ReachAIAnalysis["fuente"];
}

export interface AnalizarAlcanceResult {
  analysis: ReachAIAnalysis;
  por_red: AlcancePorRedIA[];
}

/**
 * IA de alcance: detecta nicho del link/copy y estima personas por red seleccionada.
 */
export function analizarAlcanceIA(input: AnalizarAlcanceInput): AnalizarAlcanceResult | null {
  const { alcance, redes, calidadScore = 65, industria = "general", source, copyPorRed, copyManual, fuente } = input;
  if (!redes.length) return null;

  const textosRed = redes.map((r) => copyPorRed?.[r] ?? "").filter(Boolean);
  const nichoIndustria = normalizeIndustria(industria);
  const nichoTexto = inferNichoFromText(
    source?.originalCaption ?? "",
    copyManual ?? "",
    ...textosRed,
  );
  const nicho: NichoKey = nichoTexto !== "default" ? nichoTexto : nichoIndustria;

  const confianzaBase = fuente === "link_ia" ? 82 : fuente === "link_import" ? 58 : 48;
  const confianza = Math.min(
    96,
    confianzaBase
      + (textosRed.length > 0 ? 8 : 0)
      + (source ? 6 : 0)
      + Math.round((calidadScore - 50) / 10),
  );

  const mercadosGlobales = alcance.tipo === "local"
    ? [`Nicho ${NICHO_LABELS[nicho]} en zona local`, `${alcance.ciudad ?? "tu ciudad"}, ${alcance.estado ?? ""}`.trim()]
    : [`Nicho ${NICHO_LABELS[nicho]} en ${alcance.pais ?? "LATAM"}`, "Mercado hispanohablante"];

  const analysis: ReachAIAnalysis = {
    nicho,
    nicho_label: NICHO_LABELS[nicho],
    mercados: mercadosGlobales.filter(Boolean),
    confianza,
    origen_plataforma: source?.platform,
    fuente,
    resumen: source
      ? `Contenido de ${SOURCE_LABELS[source.platform]} adaptado al nicho «${NICHO_LABELS[nicho]}»`
      : `Análisis del copy para nicho «${NICHO_LABELS[nicho]}»`,
  };

  const basePorRed = estimarAlcancePorRed(alcance, redes, calidadScore);
  const baseMap = Object.fromEntries(basePorRed.map((b) => [b.red, b])) as Record<Red, AlcancePorRed>;

  const por_red: AlcancePorRedIA[] = redes.map((red) => {
    const base = baseMap[red];
    const afinidad = AFINIDAD_NICHO_RED[nicho][red]
      * (source ? (BOOST_MISMA_RED[source.platform]?.[red] ?? 1) : 1);
    const personas_min = Math.round(base.personas_min * afinidad);
    const personas_max = Math.round(base.personas_max * afinidad);
    const impresiones_min = Math.round(base.impresiones_min * afinidad);
    const impresiones_max = Math.round(base.impresiones_max * afinidad);

    return {
      red,
      personas_min,
      personas_max,
      impresiones_min,
      impresiones_max,
      penetracion_pct: Math.round(base.penetracion_pct * afinidad * 10) / 10,
      seleccionada: true,
      afinidad_nicho: Math.round(afinidad * 100),
      mercados_red: mercadosParaNicho(nicho, alcance, red),
      hashtags_nicho: getNicheHashtags(industria, red, 5, [source?.originalCaption, copyManual, ...textosRed].filter(Boolean).join(" ")),
      confianza,
    };
  });

  return { analysis, por_red };
}

export function totalAlcanceIA(items: AlcancePorRedIA[]): { personas_min: number; personas_max: number } {
  return {
    personas_min: items.reduce((s, i) => s + i.personas_min, 0),
    personas_max: items.reduce((s, i) => s + i.personas_max, 0),
  };
}

export { formatAlcanceNumero };
