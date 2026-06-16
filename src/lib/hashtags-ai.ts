import type { Red } from "@/lib/mock/types";
import type { NetworkVariant } from "@/services/import/adaptForNetworks";
import type { AlcancePorRedIA } from "@/lib/reach-ai";
import { getNicheHashtags } from "@/services/import/nicheHashtags";

const VIRAL_RE = /viral|fyp|foryou|trending|tendencia|foryoupage/i;

/** Extrae los hashtags más virales del pool generado por IA. */
export function pickViralHashtags(
  porRed: Partial<Record<Red, string[]>>,
  limit = 10,
): string[] {
  const viral: string[] = [];
  const rest: string[] = [];

  for (const tags of Object.values(porRed)) {
    for (const tag of tags ?? []) {
      const normalized = tag.startsWith("#") ? tag : `#${tag}`;
      if (VIRAL_RE.test(normalized) && !viral.includes(normalized)) {
        viral.push(normalized);
      } else if (!rest.includes(normalized)) {
        rest.push(normalized);
      }
    }
  }

  return [...viral, ...rest].slice(0, limit);
}

export function hashtagsFromVariants(
  variants: Partial<Record<Red, NetworkVariant>>,
  redes: Red[],
): Partial<Record<Red, string[]>> {
  const out: Partial<Record<Red, string[]>> = {};
  for (const r of redes) {
    if (variants[r]?.hashtags?.length) out[r] = variants[r]!.hashtags;
  }
  return out;
}

export function hashtagsFromAlcanceIA(
  porRed: AlcancePorRedIA[],
  redes: Red[],
  industria: string,
  contentHint: string,
): Partial<Record<Red, string[]>> {
  const out: Partial<Record<Red, string[]>> = {};
  for (const r of redes) {
    const item = porRed.find((p) => p.red === r);
    if (item?.hashtags_nicho?.length) {
      out[r] = item.hashtags_nicho;
    } else {
      out[r] = getNicheHashtags(industria, r, undefined, contentHint);
    }
  }
  return out;
}

export function mergeHashtagMaps(
  ...maps: Partial<Record<Red, string[]>>[]
): Partial<Record<Red, string[]>> {
  const out: Partial<Record<Red, string[]>> = {};
  for (const map of maps) {
    for (const [red, tags] of Object.entries(map)) {
      const r = red as Red;
      out[r] = [...(out[r] ?? []), ...(tags ?? [])].filter(
        (t, i, arr) => arr.indexOf(t) === i,
      );
    }
  }
  return out;
}
