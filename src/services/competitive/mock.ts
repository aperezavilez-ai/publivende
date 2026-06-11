// Inteligencia competitiva mock (Fase 2 → conectar Semrush real)
export interface CompetitorSnapshot {
  dominio: string;
  ig_handle: string;
  authority: number;
  trafico_mensual: number;
  keywords_organico: number;
  keywords_ads: number;
  top_keywords: { kw: string; pos: number; volumen: number; cpc: number }[];
  top_posts: { red: "instagram" | "tiktok"; copy: string; engagement: number; vistas: number }[];
  gap_keywords: { kw: string; volumen: number; dificultad: number }[];
}

const POOL: Record<string, CompetitorSnapshot> = {
  "moda-latina.mx": {
    dominio: "moda-latina.mx", ig_handle: "@moda_latina_mx",
    authority: 48, trafico_mensual: 24800, keywords_organico: 1850, keywords_ads: 220,
    top_keywords: [
      { kw: "vestidos casuales mujer", pos: 3, volumen: 8100, cpc: 0.85 },
      { kw: "blusas elegantes", pos: 5, volumen: 4400, cpc: 0.72 },
      { kw: "ropa moda mexicana", pos: 2, volumen: 2900, cpc: 0.65 },
      { kw: "outfit oficina mujer", pos: 8, volumen: 5200, cpc: 0.91 },
    ],
    top_posts: [
      { red: "instagram", copy: "5 outfits para la oficina con una sola blusa 👗", engagement: 8.2, vistas: 42000 },
      { red: "tiktok", copy: "Try-on de la nueva colección otoño", engagement: 12.4, vistas: 128000 },
    ],
    gap_keywords: [
      { kw: "vestido boda invitada", volumen: 12000, dificultad: 45 },
      { kw: "ropa premamá moderna", volumen: 6800, dificultad: 32 },
      { kw: "outfit graduación 2025", volumen: 3400, dificultad: 28 },
    ],
  },
  "tiendaviral.co": {
    dominio: "tiendaviral.co", ig_handle: "@tiendaviral",
    authority: 52, trafico_mensual: 38200, keywords_organico: 2740, keywords_ads: 410,
    top_keywords: [
      { kw: "envíos gratis colombia", pos: 1, volumen: 14000, cpc: 0.95 },
      { kw: "tienda online ropa", pos: 4, volumen: 9800, cpc: 1.12 },
      { kw: "promociones moda", pos: 6, volumen: 5500, cpc: 0.78 },
    ],
    top_posts: [
      { red: "tiktok", copy: "Pedidos del día: empacando tu order 📦", engagement: 15.8, vistas: 245000 },
      { red: "instagram", copy: "Cliente real, reseña real (sin filtros) 💜", engagement: 9.4, vistas: 38000 },
    ],
    gap_keywords: [
      { kw: "vestidos juveniles", volumen: 8200, dificultad: 38 },
      { kw: "moda gen z colombia", volumen: 2900, dificultad: 22 },
    ],
  },
};

export async function analizarCompetidor(dominio: string): Promise<CompetitorSnapshot> {
  await new Promise((r) => setTimeout(r, 900));
  const found = POOL[dominio.toLowerCase().trim()];
  if (found) return found;
  // generar uno fake
  return {
    dominio, ig_handle: `@${dominio.split(".")[0]}`,
    authority: 25 + Math.floor(Math.random() * 50),
    trafico_mensual: 5000 + Math.floor(Math.random() * 50000),
    keywords_organico: 500 + Math.floor(Math.random() * 3000),
    keywords_ads: 50 + Math.floor(Math.random() * 500),
    top_keywords: [
      { kw: "producto destacado", pos: 4, volumen: 3200, cpc: 0.65 },
      { kw: "tienda online " + dominio.split(".")[1], pos: 6, volumen: 1800, cpc: 0.55 },
      { kw: "promo mes", pos: 12, volumen: 4400, cpc: 0.78 },
    ],
    top_posts: [
      { red: "instagram", copy: "Lanzamiento de la semana 🚀", engagement: 5.4, vistas: 18000 },
      { red: "tiktok", copy: "Tutorial rápido del producto", engagement: 9.2, vistas: 64000 },
    ],
    gap_keywords: [
      { kw: "tendencias " + new Date().getFullYear(), volumen: 6800, dificultad: 35 },
      { kw: "envío express", volumen: 9200, dificultad: 42 },
      { kw: "atención whatsapp", volumen: 4400, dificultad: 18 },
    ],
  };
}

export const COMPETIDORES_SUGERIDOS = ["moda-latina.mx", "tiendaviral.co"];
