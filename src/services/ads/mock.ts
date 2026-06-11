import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import type { AdCampaign } from "@/lib/mock/types";

export async function createCampaign(input: Omit<AdCampaign, "id" | "tracking_slug" | "created_at">): Promise<AdCampaign> {
  const db = loadDB();
  const camp: AdCampaign = {
    ...input,
    id: uid(),
    tracking_slug: slug(),
    created_at: new Date().toISOString(),
  };
  db.ad_campaigns.push(camp);
  saveDB(db);
  return camp;
}

export async function updateCampaign(id: string, patch: Partial<AdCampaign>) {
  const db = loadDB();
  const c = db.ad_campaigns.find((x) => x.id === id);
  if (!c) return;
  Object.assign(c, patch);
  saveDB(db);
}

export async function deleteCampaign(id: string) {
  const db = loadDB();
  db.ad_campaigns = db.ad_campaigns.filter((c) => c.id !== id);
  db.ad_metrics = db.ad_metrics.filter((m) => m.campaign_id !== id);
  saveDB(db);
}

// Keyword generator mock (luego se reemplaza por Lovable AI Gateway)
const KW_INDUSTRIA: Record<string, string[]> = {
  moda: ["vestido mujer", "ropa de moda", "outfit ideas", "moda latina", "blusas elegantes", "tenis tendencia"],
  comida: ["comida a domicilio", "restaurante cerca", "delivery rápido", "menú del día", "comida casera"],
  belleza: ["productos de belleza", "skincare natural", "maquillaje profesional", "cuidado piel", "rutina facial"],
  servicios: ["servicio profesional", "asesoría a domicilio", "presupuesto gratis", "consultoría", "atención 24/7"],
  fitness: ["entrenador personal", "gym cerca", "rutina casa", "perder peso", "ejercicio en casa"],
  default: ["envío gratis", "promoción del día", "ofertas especiales", "atención personalizada", "compra segura"],
};

export async function generarKeywordsIA(industria: string, descripcion: string): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 600));
  const base = KW_INDUSTRIA[industria.toLowerCase()] ?? KW_INDUSTRIA.default;
  const palabras = descripcion.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
  return [...base, ...palabras.map((p) => `${p} cerca de mí`)].slice(0, 8);
}

export async function generarCopyIA(objetivo: string, producto: string): Promise<{ headline: string; descripcion: string; cta: string }> {
  await new Promise((r) => setTimeout(r, 600));
  const map: Record<string, { headline: string; cta: string }> = {
    mensajes_whatsapp: { headline: `Escríbenos por WhatsApp 💬`, cta: "Escribir ahora" },
    ventas_link: { headline: `Compra ${producto} con envío express 🚀`, cta: "Comprar ahora" },
    trafico_catalogo: { headline: `Descubre ${producto} y mucho más`, cta: "Ver catálogo" },
  };
  const m = map[objetivo] ?? map.ventas_link;
  return {
    headline: m.headline,
    descripcion: `${producto}. Envíos a todo el país. Pago seguro. Atención personalizada por WhatsApp.`,
    cta: m.cta,
  };
}

export function calcularROAS(gasto: number, monto_atribuido: number): number {
  if (gasto <= 0) return 0;
  return Math.round((monto_atribuido / gasto) * 100) / 100;
}
