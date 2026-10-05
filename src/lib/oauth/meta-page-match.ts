import type { MetaPageOption } from "@/lib/api/oauth.functions";

function normalizePageName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function scorePage(page: MetaPageOption, hintNorms: string[], allowPlatformPage: boolean): number {
  const pageNorm = normalizePageName(page.name);
  let best = 0;
  for (const hint of hintNorms) {
    if (pageNorm === hint) best = Math.max(best, 100);
    else if (pageNorm.includes(hint) || hint.includes(pageNorm)) best = Math.max(best, 60);
    else {
      const parts = hint.match(/[a-z0-9]{3,}/g) ?? [];
      const hits = parts.filter((part) => pageNorm.includes(part)).length;
      if (hits) best = Math.max(best, 20 + hits * 15);
    }
  }
  if (!allowPlatformPage && /publivende/i.test(page.name) && !hintNorms.some((h) => h.includes("publivende"))) {
    best = Math.min(best, 8);
  }
  return best;
}

export function rankMetaPages(
  pages: MetaPageOption[],
  hints: string[],
  { allowPlatformPage = false }: { allowPlatformPage?: boolean } = {},
): { pages: MetaPageOption[]; bestId: string | null; exactMatch: boolean } {
  const hintNorms = [...new Set(hints.map(normalizePageName).filter((h) => h.length >= 2))];
  if (!pages.length) return { pages: [], bestId: null, exactMatch: false };

  const scored = pages.map((page) => ({ page, score: scorePage(page, hintNorms, allowPlatformPage) }));
  scored.sort((a, b) => b.score - a.score || a.page.name.localeCompare(b.page.name, "es"));

  const top = scored[0];
  return {
    pages: scored.map((s) => s.page),
    bestId: top?.page.id ?? pages[0].id,
    exactMatch: (top?.score ?? 0) >= 100,
  };
}
