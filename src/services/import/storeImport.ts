import type { Tono } from "@/services/ai/mock";
import { suggestProductImage } from "@/services/ai/catalog";

export type StorePlatform = "mercadolibre" | "instagram" | "facebook" | "tiktok_shop" | "shopify" | "web";

export interface ImportedStoreProduct {
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
  tipo: "producto" | "servicio";
  copy_publicacion: string;
  url_origen?: string;
}

export interface StoreImportResult {
  platform: StorePlatform;
  url: string;
  tienda_nombre: string;
  productos: ImportedStoreProduct[];
}

export interface StoreImportContext {
  nombre_negocio: string;
  industria: string;
  tono: Tono;
  ciudad: string;
}

const PLATFORM_LABELS: Record<StorePlatform, string> = {
  mercadolibre: "Mercado Libre",
  instagram: "Instagram Shop",
  facebook: "Facebook / Marketplace",
  tiktok_shop: "TikTok Shop",
  shopify: "Shopify",
  web: "Sitio web",
};

function normalizeStoreUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function detectStorePlatform(url: string): StorePlatform | null {
  const u = normalizeStoreUrl(url).toLowerCase();
  if (!u) return null;
  if (u.includes("mercadolibre") || u.includes("mercadopago.com/stores") || u.includes("mpago.la")) return "mercadolibre";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("fb.me")) return "facebook";
  if (u.includes("tiktok.com") && (u.includes("shop") || u.includes("/t/"))) return "tiktok_shop";
  if (u.includes("myshopify.com") || u.includes("shopify.com")) return "shopify";
  if (u.startsWith("http")) return "web";
  return null;
}

export function getStorePlatformLabel(p: StorePlatform): string {
  return PLATFORM_LABELS[p];
}

function hashUrl(url: string): number {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function extractStoreName(url: string, platform: StorePlatform, fallback: string): string {
  try {
    const path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
    const parts = path.split("/").filter(Boolean);
    if (platform === "instagram" && parts[0]) return `@${parts[0]}`;
    if (platform === "mercadolibre" && parts.includes("perfil")) {
      const i = parts.indexOf("perfil");
      if (parts[i + 1]) return parts[i + 1].replace(/-/g, " ");
    }
    if (parts[0]) return parts[0].replace(/-/g, " ");
  } catch { /* ignore */ }
  return fallback;
}

type ProductSeed = { nombre: string; precio: number; desc: string };

const SEEDS: Record<StorePlatform, ProductSeed[]> = {
  mercadolibre: [
    { nombre: "Artículo más vendido", precio: 599, desc: "Importado de tu publicación ML — envío a todo el país." },
    { nombre: "Combo promocional", precio: 899, desc: "Pack destacado en tu tienda Mercado Libre." },
    { nombre: "Nuevo ingreso", precio: 449, desc: "Producto recién publicado en tu catálogo." },
    { nombre: "Oferta relámpago", precio: 349, desc: "Precio especial visible en tu tienda online." },
  ],
  instagram: [
    { nombre: "Best seller del feed", precio: 520, desc: "El producto más comentado en tu Instagram." },
    { nombre: "Drop exclusivo IG", precio: 780, desc: "Disponible en tu bio / shop de Instagram." },
    { nombre: "Edición limitada", precio: 650, desc: "Visto en tus últimas publicaciones." },
  ],
  facebook: [
    { nombre: "Producto del catálogo FB", precio: 480, desc: "Desde tu catálogo de Facebook / Marketplace." },
    { nombre: "Promo Messenger", precio: 720, desc: "Ideal para cerrar ventas por chat." },
    { nombre: "Destacado semanal", precio: 390, desc: "Producto con más interacción en tu página." },
  ],
  tiktok_shop: [
    { nombre: "Viral en TikTok Shop", precio: 299, desc: "Producto con alto engagement en TikTok." },
    { nombre: "Bundle TikTok", precio: 549, desc: "Combo popular en tu tienda TikTok." },
    { nombre: "Live shopping pick", precio: 420, desc: "Recomendado para lives de venta." },
  ],
  shopify: [
    { nombre: "Producto flagship", precio: 890, desc: "Importado de tu tienda Shopify." },
    { nombre: "Colección nueva", precio: 650, desc: "De tu catálogo en línea." },
    { nombre: "Add-on más vendido", precio: 250, desc: "Complemento frecuente en checkout." },
  ],
  web: [
    { nombre: "Servicio principal", precio: 1200, desc: "Detectado en tu sitio web." },
    { nombre: "Producto estrella", precio: 750, desc: "Lo más visible en tu página." },
    { nombre: "Consulta / cotización", precio: 0, desc: "Servicio a medida — precio según proyecto." },
  ],
};

function buildCopy(nombre: string, precio: number, ctx: StoreImportContext, platform: StorePlatform): string {
  const precioTxt = precio > 0 ? `\n\n💰 $${precio} MXN` : "\n\n📩 Escríbenos para cotizar";
  return `✨ ${nombre} — disponible en ${PLATFORM_LABELS[platform]}\n\n${ctx.nombre_negocio}${precioTxt}\n📍 ${ctx.ciudad || "Envíos disponibles"}\n\nPedidos por WhatsApp 👇`;
}

/**
 * Importa productos desde link de tienda (ML, IG, FB, TikTok Shop, Shopify, web).
 * Mock determinista — listo para scraper/API en Fase 2.
 */
export async function importStoreFromLink(url: string, ctx: StoreImportContext): Promise<StoreImportResult> {
  await new Promise((r) => setTimeout(r, 1200));

  const trimmed = normalizeStoreUrl(url);
  const platform = detectStorePlatform(trimmed);
  if (!platform) {
    throw new Error("Link no reconocido. Prueba Mercado Libre, Instagram, Facebook, TikTok Shop, Shopify o tu sitio web.");
  }

  const h = hashUrl(trimmed);
  const seeds = SEEDS[platform];
  const tienda_nombre = extractStoreName(trimmed, platform, ctx.nombre_negocio);
  const count = platform === "web" ? 3 : 4;

  const productos: ImportedStoreProduct[] = Array.from({ length: count }, (_, i) => {
    const seed = seeds[(h + i) % seeds.length];
    const nombre = i === 0 ? `${seed.nombre} — ${tienda_nombre}`.slice(0, 60) : seed.nombre;
    const precio = seed.precio > 0 ? seed.precio + (h % 7) * 50 : 999;
    const imagen = suggestProductImage(nombre, ctx.industria);
    const item: ImportedStoreProduct = {
      nombre,
      precio: platform === "web" && seed.precio === 0 ? 0 : precio,
      descripcion: seed.desc,
      imagen,
      tipo: seed.precio === 0 ? "servicio" : "producto",
      copy_publicacion: "",
      url_origen: trimmed,
    };
    item.copy_publicacion = buildCopy(item.nombre, item.precio, ctx, platform);
    return item;
  }).filter((p) => p.precio > 0 || p.tipo === "servicio");

  if (productos.every((p) => p.precio === 0)) {
    productos[0].precio = 799;
  }

  return { platform, url: trimmed, tienda_nombre, productos };
}
