export type NichoKey = "moda" | "ropa" | "belleza" | "comida" | "fitness" | "servicios" | "tecnologia" | "default";

const KEYWORDS: Record<NichoKey, RegExp> = {
  moda: /moda|outfit|look|boutique|colecci[oó]n|vestido|fashion/i,
  ropa: /ropa|blusa|pantal[oó]n|zapato|accesorio|talla|prenda/i,
  belleza: /belleza|skincare|maquillaje|makeup|uñas|sal[oó]n|cosm[eé]t/i,
  comida: /comida|restaur|menu|delivery|antojito|chef|receta|food/i,
  fitness: /fitness|gym|entren|workout|yoga|wellness|salud/i,
  servicios: /consultor|servicio|asesor|agencia|cotiz|profesional|clase/i,
  tecnologia: /tech|software|app|digital|marketing|saas|automatiz|inteligencia artificial|\bia\b|lanzamiento|startup|gafcore/i,
  default: /.^/,
};

export function normalizeIndustria(industria: string): NichoKey {
  const i = industria.toLowerCase();
  if (i.includes("moda")) return "moda";
  if (i.includes("ropa")) return "ropa";
  if (i.includes("belleza") || i.includes("cosm")) return "belleza";
  if (i.includes("comida") || i.includes("restaur") || i.includes("food")) return "comida";
  if (i.includes("fitness") || i.includes("gym")) return "fitness";
  if (i.includes("servic") || i.includes("consult")) return "servicios";
  if (i.includes("tech") || i.includes("digital") || i.includes("saas")) return "tecnologia";
  return "default";
}

export function inferNichoFromText(...texts: string[]): NichoKey {
  const joined = texts.filter(Boolean).join(" ");
  for (const [key, rx] of Object.entries(KEYWORDS) as [NichoKey, RegExp][]) {
    if (key === "default") continue;
    if (rx.test(joined)) return key;
  }
  return "default";
}

export function resolveNicho(texts: string[], industria: string): NichoKey {
  const fromText = inferNichoFromText(...texts);
  if (fromText !== "default") return fromText;
  return normalizeIndustria(industria);
}
