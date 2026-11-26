import type { Red } from "@/lib/mock/types";
import { NICHO_CATALOG, resolveNicho, type NichoKey } from "./inferNiche";

/**
 * [UNIFICACIÓN DE NICHOS — 2026-11-26] Los hashtags salen del MISMO catálogo
 * canónico (espejo de market_niches en inferNiche.ts): cada nicho usa los
 * hashtags sembrados para ese nicho. Ya no hay pools con las claves viejas
 * (moda|ropa|belleza|comida|fitness|servicios|tecnologia|default).
 * «general» conserva un pool genérico de emprendimiento por red.
 */

const GENERAL_POOLS: Partial<Record<Red, string[]>> = {
  instagram: ["#LATAM", "#Emprende", "#Pymes", "#VenderEnLinea", "#Creadores", "#MarketingDigital", "#NegocioOnline", "#WhatsAppBusiness", "#Emprendedoras", "#Viral", "#ContenidoDigital", "#RedesSociales", "#GrowthHacking", "#VentasOnline", "#SmallBusiness"],
  facebook: ["#Emprendimiento", "#NegocioLocal", "#VentasOnline", "#LATAM", "#Pymes"],
  tiktok: ["#fyp", "#emprende", "#smallbusiness", "#latam", "#viral", "#negocios", "#tips"],
  youtube: ["emprendimiento latam", "negocio online", "marketing digital", "ventas whatsapp", "pymes mexico"],
};

const CATALOG_HASHTAGS: Record<string, string[]> = Object.fromEntries(
  NICHO_CATALOG.map((n) => [n.id, n.hashtags]),
);

export function getNicheHashtags(industria: string, red: Red, limit?: number, contentText = ""): string[] {
  const key: NichoKey = resolveNicho([contentText], industria);
  let pool: string[];
  if (key === "general") {
    pool = GENERAL_POOLS[red] ?? [];
  } else if (red === "tiktok") {
    // TikTok rinde mejor con el gancho de descubrimiento al frente.
    pool = ["#fyp", ...(CATALOG_HASHTAGS[key] ?? [])];
  } else {
    pool = CATALOG_HASHTAGS[key] ?? [];
  }
  const max = limit ?? (red === "instagram" ? 20 : red === "tiktok" ? 8 : red === "facebook" ? 5 : 10);
  return pool.slice(0, max);
}
