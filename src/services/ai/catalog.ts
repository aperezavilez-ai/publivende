import type { Tono } from "./mock";

export interface CatalogGenInput {
  nombre_negocio: string;
  industria: string;
  descripcion: string;
  publico_objetivo: string;
  tono: Tono;
  ciudad: string;
  precio_min?: number;
  precio_max?: number;
}

export interface GeneratedCatalogItem {
  nombre: string;
  precio: number;
  descripcion: string;
  imagen: string;
  tipo: "producto" | "servicio";
  copy_publicacion: string;
  generado_ia: true;
}

const IMGS: Record<string, string[]> = {
  moda: [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",
  ],
  belleza: [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800",
  ],
  comida: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
  ],
  default: [
    "https://images.unsplash.com/photo-1556745757-8d76bdb6834?w=800",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  ],
};

type CatalogTemplate = { items: Array<{ nombre: string; precio: number; desc: string; tipo: "producto" | "servicio" }> };

const TEMPLATES: Record<string, CatalogTemplate> = {
  "Ropa y moda": {
    items: [
      { nombre: "Blusa estrella", precio: 499, desc: "Algodón premium, tallas S-XL. Envío 2-3 días.", tipo: "producto" },
      { nombre: "Vestido ocasión", precio: 899, desc: "Ideal para eventos. Incluye guía de tallas por WhatsApp.", tipo: "producto" },
      { nombre: "Pack 2x1 accesorios", precio: 349, desc: "Promo de lanzamiento para nuevos clientes.", tipo: "producto" },
      { nombre: "Asesoría de outfit", precio: 199, desc: "30 min por videollamada — te armamos 3 looks.", tipo: "servicio" },
    ],
  },
  "Belleza y cosmética": {
    items: [
      { nombre: "Kit skincare básico", precio: 599, desc: "Limpieza + hidratante. Para todo tipo de piel.", tipo: "producto" },
      { nombre: "Maquillaje social", precio: 850, desc: "Servicio a domicilio en {ciudad}.", tipo: "servicio" },
      { nombre: "Corte + brushing", precio: 450, desc: "Incluye lavado y peinado.", tipo: "servicio" },
      { nombre: "Promo primera cita", precio: 299, desc: "20% dto en tu primer servicio.", tipo: "servicio" },
    ],
  },
  "Comida y delivery": {
    items: [
      { nombre: "Menú del día", precio: 129, desc: "Plato fuerte + agua fresca. Cambia diario.", tipo: "producto" },
      { nombre: "Combo familiar", precio: 399, desc: "Para 4 personas. Envío incluido en {ciudad}.", tipo: "producto" },
      { nombre: "Postre del chef", precio: 89, desc: "Porción individual, hecho hoy.", tipo: "producto" },
    ],
  },
  "Fitness y wellness": {
    items: [
      { nombre: "Membresía mensual", precio: 799, desc: "Acceso ilimitado + rutina personalizada.", tipo: "servicio" },
      { nombre: "Plan nutricional 4 sem", precio: 1299, desc: "Menú + seguimiento por WhatsApp.", tipo: "servicio" },
      { nombre: "Clase grupal", precio: 150, desc: "Yoga o funcional — cupo limitado.", tipo: "servicio" },
    ],
  },
};

function industryKey(industria: string): string {
  const i = industria.toLowerCase();
  if (i.includes("moda") || i.includes("ropa")) return "Ropa y moda";
  if (i.includes("belleza") || i.includes("salón") || i.includes("salon")) return "Belleza y cosmética";
  if (i.includes("comida") || i.includes("restaur")) return "Comida y delivery";
  if (i.includes("fitness") || i.includes("gym") || i.includes("wellness")) return "Fitness y wellness";
  return industria;
}

function imgPool(industria: string): string[] {
  const i = industria.toLowerCase();
  if (i.includes("moda") || i.includes("ropa")) return IMGS.moda;
  if (i.includes("belleza") || i.includes("salón") || i.includes("salon")) return IMGS.belleza;
  if (i.includes("comida") || i.includes("restaur")) return IMGS.comida;
  return IMGS.default;
}

function buildCopy(item: GeneratedCatalogItem, input: CatalogGenInput): string {
  const hooks: Record<Tono, string> = {
    casual: `✨ ${item.nombre} — ¡te va a encantar!`,
    profesional: `${item.nombre}. Calidad y atención en ${input.nombre_negocio}.`,
    divertido: `🔥 OMG mira esto: ${item.nombre} 😍`,
    promocional: `🎉 OFERTA: ${item.nombre} — solo $${item.precio} MXN`,
    inspirador: `Tu mejor versión empieza con ${item.nombre} 💜`,
  };
  const hook = hooks[input.tono] ?? hooks.casual;
  return `${hook}\n\n${item.descripcion}\n\n💰 $${item.precio} MXN\n📍 ${input.ciudad || "Envíos disponibles"}\n\nEscríbenos por WhatsApp 👇`;
}

function scalePrice(base: number, min?: number, max?: number): number {
  if (!min && !max) return base;
  const lo = min ?? Math.round(base * 0.7);
  const hi = max ?? Math.round(base * 1.3);
  const mid = Math.round((lo + hi) / 2);
  return Math.max(lo, Math.min(hi, base + Math.round((mid - base) * 0.5)));
}

/**
 * Genera catálogo completo listo para publicar cuando el cliente no tiene productos.
 * Usa industria + descripción del negocio (mock — listo para Lovable AI Gateway).
 */
export async function generateCatalogFromBusiness(input: CatalogGenInput): Promise<GeneratedCatalogItem[]> {
  await new Promise((r) => setTimeout(r, 1400));

  const key = industryKey(input.industria);
  const template = TEMPLATES[key] ?? {
    items: [
      { nombre: "Producto estrella", precio: 499, desc: input.descripcion.slice(0, 80) || "Lo más pedido de nuestro catálogo.", tipo: "producto" as const },
      { nombre: "Servicio principal", precio: 799, desc: "Atención personalizada para " + (input.publico_objetivo.slice(0, 40) || "nuestros clientes"), tipo: "servicio" as const },
      { nombre: "Promo de bienvenida", precio: 349, desc: "Precio especial para nuevos clientes de " + input.nombre_negocio, tipo: "producto" as const },
    ],
  };

  const imgs = imgPool(input.industria);
  const suffix = input.nombre_negocio ? ` — ${input.nombre_negocio}` : "";

  return template.items.map((item, i) => {
    const desc = item.desc.replace("{ciudad}", input.ciudad || "tu ciudad");
    const nombre = item.nombre.includes("estrella") || item.nombre.includes("principal")
      ? item.nombre + suffix
      : item.nombre;
    const precio = scalePrice(item.precio, input.precio_min, input.precio_max);
    const gen: GeneratedCatalogItem = {
      nombre,
      precio,
      descripcion: desc,
      imagen: imgs[i % imgs.length],
      tipo: item.tipo,
      copy_publicacion: "",
      generado_ia: true,
    };
    gen.copy_publicacion = buildCopy(gen, input);
    return gen;
  });
}

/** Imagen sugerida por palabra clave cuando el usuario no sube foto. */
export function suggestProductImage(keyword: string, industria: string): string {
  const pool = imgPool(industria);
  const idx = Math.abs(keyword.split("").reduce((s, c) => s + c.charCodeAt(0), 0)) % pool.length;
  return pool[idx];
}
