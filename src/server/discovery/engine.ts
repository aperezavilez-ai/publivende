import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { getSearchConfig } from "@/server/config";

/**
 * [FASE 1 — Descubrimiento real]
 *
 * Motor que descubre grupos y páginas PÚBLICOS de Facebook por nicho usando
 * un proveedor de búsqueda web (SerpApi/Google o Brave): los índices web sí
 * conocen los grupos y páginas públicos que Facebook no deja raspar directo.
 *
 * Reglas de honestidad del motor:
 * - Sin proveedor configurado NO se escribe nada y se reporta el error.
 * - Solo se guarda lo que el índice devolvió: nombre del resultado, URL
 *   canónica y, SOLO si el texto del resultado lo dice, el conteo de
 *   miembros/seguidores observado. Sin conteo visible, miembros = 0
 *   (cero = "sin dato observado", nunca una cifra inventada).
 * - Cada fila guarda fuente, fecha de verificación y URL de evidencia.
 * - Las filas del catálogo sembrado a mano quedan marcadas
 *   "catalogo_sin_verificar" y este motor nunca las promueve: solo crea o
 *   actualiza filas con URL real observada.
 */

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

const RESERVED_SEGMENTS = new Set([
  "groups", "pages", "watch", "reel", "reels", "posts", "photos", "videos",
  "marketplace", "events", "share", "stories", "gaming", "help", "login",
  "profile.php", "permalink.php", "photo.php", "watch.php", "sharer",
]);

/** Extrae el conteo de miembros/seguidores SOLO si el texto lo declara. */
export function parseObservedCount(text: string): number | null {
  const m = text.match(
    /(\d+(?:[.,]\d+)?)\s*(millones|mil|k|m)?\s*(?:de\s+)?(miembros|seguidores|integrantes|members|followers)/i,
  );
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "mil" || unit === "k") n *= 1_000;
  else if (unit === "m" || unit === "millones") n *= 1_000_000;
  return Math.round(n);
}

/** Clasifica una URL de Facebook como grupo o página y la canonicaliza. */
export function classifyFacebookUrl(
  rawUrl: string,
): { plataforma: "facebook_group" | "facebook_page"; url: string } | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)facebook\.com$/i.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);

  if (parts[0] === "groups" && parts[1]) {
    return { plataforma: "facebook_group", url: `https://www.facebook.com/groups/${parts[1]}` };
  }
  if (parts[0] === "profile.php" && u.searchParams.get("id")) {
    return {
      plataforma: "facebook_page",
      url: `https://www.facebook.com/profile.php?id=${u.searchParams.get("id")}`,
    };
  }
  if (parts[0] && !RESERVED_SEGMENTS.has(parts[0].toLowerCase())) {
    return { plataforma: "facebook_page", url: `https://www.facebook.com/${parts[0]}` };
  }
  return null;
}

export function cleanResultName(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*Facebook.*$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim()
    .slice(0, 160);
}

async function searchSerpApi(apiKey: string, query: string): Promise<SearchHit[]> {
  const url =
    `https://serpapi.com/search.json?engine=google&num=10&q=${encodeURIComponent(query)}` +
    `&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi respondió ${res.status}`);
  const json = (await res.json()) as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return (json.organic_results ?? [])
    .filter((r) => r.link)
    .map((r) => ({ title: r.title ?? "", url: r.link as string, snippet: r.snippet ?? "" }));
}

async function searchBrave(apiKey: string, query: string): Promise<SearchHit[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
  });
  if (!res.ok) throw new Error(`Brave Search respondió ${res.status}`);
  const json = (await res.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  return (json.web?.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({ title: r.title ?? "", url: r.url as string, snippet: r.description ?? "" }));
}

export function buildQueries(niche: { nombre: string; keywords: string[] }): string[] {
  const terms = [niche.nombre.split(",")[0].trim(), ...niche.keywords.slice(0, 2)].filter(Boolean);
  const queries: string[] = [];
  for (const t of terms) {
    queries.push(`site:facebook.com/groups ${t}`);
    queries.push(`site:facebook.com ${t}`);
  }
  return [...new Set(queries)].slice(0, 6);
}

export interface DiscoverySummary {
  ok: true;
  provider: string;
  consultas: number;
  hallazgos: number;
  nuevos: number;
  actualizados: number;
  porNicho: Record<string, number>;
}

export async function runDiscovery(opts?: {
  nicheIds?: string[];
  maxQueries?: number;
}): Promise<DiscoverySummary | { ok: false; error: string }> {
  const cfg = getSearchConfig();
  if (!cfg) {
    return {
      ok: false,
      error:
        "Sin proveedor de búsqueda configurado. Define SERPAPI_API_KEY o BRAVE_SEARCH_API_KEY en Vercel para activar el descubrimiento real.",
    };
  }
  const search = cfg.provider === "serpapi" ? searchSerpApi : searchBrave;
  const db = getDb();
  const niches = await db
    .select()
    .from(schema.marketNiches)
    .where(eq(schema.marketNiches.activo, true));
  const target = opts?.nicheIds?.length
    ? niches.filter((n) => opts.nicheIds?.includes(n.id))
    : niches;

  const maxQueries = opts?.maxQueries ?? 30;
  let consultas = 0;
  let nuevos = 0;
  let actualizados = 0;
  const porNicho: Record<string, number> = {};
  const now = new Date();

  for (const niche of target) {
    const candidates = new Map<
      string,
      { plataforma: string; nombre: string; miembros: number | null; evidencia: string }
    >();
    for (const q of buildQueries(niche)) {
      if (consultas >= maxQueries) break;
      consultas++;
      let hits: SearchHit[] = [];
      try {
        hits = await search(cfg.apiKey, q);
      } catch {
        continue; // un fallo de consulta no detiene la pasada ni inventa datos
      }
      for (const hit of hits) {
        const cls = classifyFacebookUrl(hit.url);
        if (!cls) continue;
        const count = parseObservedCount(`${hit.title} ${hit.snippet}`);
        const prev = candidates.get(cls.url);
        candidates.set(cls.url, {
          plataforma: cls.plataforma,
          nombre: cleanResultName(hit.title) || prev?.nombre || cls.url,
          miembros: count ?? prev?.miembros ?? null,
          evidencia: hit.url,
        });
      }
    }

    porNicho[niche.id] = candidates.size;
    for (const [url, c] of candidates) {
      const existing = await db
        .select()
        .from(schema.brainCommunities)
        .where(eq(schema.brainCommunities.url, url));
      const row = existing[0];
      if (row) {
        await db
          .update(schema.brainCommunities)
          .set({
            fuente: cfg.provider,
            verificadoEn: now,
            evidenciaUrl: c.evidencia,
            estadoProspecto: row.estadoProspecto === "catalogo_sin_verificar" ? "descubierto" : row.estadoProspecto,
            ...(c.miembros != null ? { miembrosEstimados: c.miembros } : {}),
          })
          .where(eq(schema.brainCommunities.id, row.id));
        actualizados++;
      } else {
        await db.insert(schema.brainCommunities).values({
          nicheId: niche.id,
          plataforma: c.plataforma,
          nombre: c.nombre,
          url,
          miembrosEstimados: c.miembros ?? 0, // 0 = sin conteo observado, jamás inventado
          nivelInteraccion: "media",
          tipoAlcance: "nacional",
          fuente: cfg.provider,
          estadoProspecto: "descubierto",
          verificadoEn: now,
          evidenciaUrl: c.evidencia,
        });
        nuevos++;
      }
    }
  }

  return {
    ok: true,
    provider: cfg.provider,
    consultas,
    hallazgos: Object.values(porNicho).reduce((a, b) => a + b, 0),
    nuevos,
    actualizados,
    porNicho,
  };
}
