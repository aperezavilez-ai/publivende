/**
 * [UNIFICACIÓN DE NICHOS — 2026-11-26]
 *
 * Taxonomía canónica ÚNICA de nichos de Publivende: los 8 ids del catálogo
 * `market_niches` (el mismo que usa el motor de descubrimiento del Cerebro,
 * sembrado en scripts/seed-brain-data.ts) + «general» cuando no hay señal.
 *
 * Antes el lado publicación clasificaba con otra lista incompatible
 * (moda|ropa|belleza|comida|fitness|servicios|tecnologia|default) donde
 * «automotriz» ni existía: un post de llantas caía en «default» y jamás se
 * cruzaba con el mapa de comunidades de automotriz. Desde esta corrección,
 * descubrimiento, clasificación del post e impulso hablan el mismo idioma:
 * un post de llantas ES «automotriz» en todo el camino.
 *
 * NICHO_CATALOG es el ESPEJO en código de las keywords y hashtags sembrados
 * en scripts/seed-brain-data.ts: si el catálogo market_niches cambia, este
 * espejo se actualiza con él en el mismo cambio.
 */

export type NichoKey =
  | "automotriz"
  | "belleza_tatuajes"
  | "gastronomia"
  | "hogar_inmuebles"
  | "servicios_profesionales"
  | "comercio_general"
  | "salud_fitness"
  | "tecnologia_gadgets"
  | "general";

export interface NichoCatalogEntry {
  id: Exclude<NichoKey, "general">;
  nombre: string;
  keywords: string[];
  hashtags: string[];
}

/** Espejo del catálogo market_niches sembrado (orden = orden del catálogo). */
export const NICHO_CATALOG: NichoCatalogEntry[] = [
  {
    id: "automotriz",
    nombre: "Automotriz, Llantas y Mecánica",
    keywords: [
      "llantas", "rines", "alineacion", "balanceo", "frenos", "taller", "mecanico",
      "amortiguadores", "suspension", "vulcanizadora", "autopartes", "refacciones",
      "cambio de aceite", "afinacion", "bateria", "parches", "desponchadora", "neumaticos",
    ],
    hashtags: ["#LlantasNuevas", "#TallerMecanico", "#Autopartes", "#AlineacionYBalanceo", "#SeguridadVial", "#PromocionesAutos"],
  },
  {
    id: "belleza_tatuajes",
    nombre: "Tatuajes, Arte Corporal y Belleza",
    keywords: [
      "tatuaje", "tattoo", "tatuajes", "piercing", "perforaciones", "flash day", "tatuador",
      "tinta", "estudio de tatuajes", "barberia", "corte de pelo", "uñas", "pestanas",
      "microblading", "estetica", "skincare", "descuento tatuajes", "buen fin tatuajes",
    ],
    hashtags: ["#TattooArtist", "#TattooLovers", "#ArteCorporal", "#PiercingStyle", "#BuenFinTattoo", "#BarberShop"],
  },
  {
    id: "gastronomia",
    nombre: "Restaurantes, Comida y Bebidas",
    keywords: [
      "comida", "restaurante", "tacos", "pizza", "hamburguesas", "mariscos", "antojitos",
      "cafe", "postres", "menu del dia", "promocion comida", "servicio a domicilio", "dark kitchen",
      "cerveza", "buffet", "desayunos", "cenas",
    ],
    hashtags: ["#FoodLovers", "#ComidaLocal", "#PromoDelDia", "#TacosLovers", "#RestaurantesMX", "#SaborCasero"],
  },
  {
    id: "hogar_inmuebles",
    nombre: "Inmuebles, Construcción y Hogar",
    keywords: [
      "casa en venta", "renta", "inmobiliaria", "terreno", "departamento", "muebles",
      "decoracion", "pintura", "plomeria", "electricista", "remodelacion", "acabados",
      "herramientas", "ferreteria", "cocinas integrales",
    ],
    hashtags: ["#BienesRaices", "#HogarDulceHogar", "#RentaCasas", "#MueblesModernos", "#Remodelacion", "#TuCasaPropia"],
  },
  {
    id: "servicios_profesionales",
    nombre: "Servicios Profesionales y Negocios",
    keywords: [
      "abogado", "contador", "sat", "facturacion", "diseño grafico", "paginas web",
      "marketing digital", "reparacion computadoras", "seguridad privada", "consultoria",
      "capacitacion", "tramites", "licencias",
    ],
    hashtags: ["#NegociosExitosos", "#ServiciosProfesionales", "#PymesMexico", "#Emprendedores", "#SolucionesLegales", "#AsesoriaFiscal"],
  },
  {
    id: "comercio_general",
    nombre: "Comercio Local y Emprendimiento",
    keywords: [
      "ropa", "calzado", "tenis", "accesorios", "bolsas", "oferta", "liquidacion",
      "bazar", "compra venta", "tienda online", "envios a todo mexico", "joyeria",
      "regalos", "promocion", "descuento",
    ],
    hashtags: ["#ModaMexico", "#ComercioLocal", "#OfertasIncreibles", "#TiendaOnline", "#HechoEnMexico", "#BazarOnline"],
  },
  {
    id: "salud_fitness",
    nombre: "Salud, Gimnasios y Bienestar",
    keywords: [
      "gimnasio", "gym", "fitness", "nutriologo", "dentista", "ortodoncia", "fisioterapia",
      "suplementos", "proteina", "lentes", "optica", "psicologo", "salud visual", "masajes",
    ],
    hashtags: ["#VidaSaludable", "#FitnessMotivation", "#SaludDental", "#BienestarIntegral", "#CuidadoPersonal"],
  },
  {
    id: "tecnologia_gadgets",
    nombre: "Tecnología, Celulares y Electrónica",
    keywords: [
      "celulares", "iphone", "samsung", "reparacion celulares", "cambio de pantalla", "laptops",
      "computadoras", "videojuegos", "playstation", "nintendo", "auriculares", "smartwatch", "cargadores",
    ],
    hashtags: ["#Tecnologia", "#Gadgets", "#ReparacionCelulares", "#GamingMX", "#AppleMexico", "#OfertasTech"],
  },
];

const CANONICAL_IDS = new Set<string>([...NICHO_CATALOG.map((n) => n.id), "general"]);

/** Claves de la taxonomía vieja → id canónico (datos guardados no se rompen). */
export const NICHO_LEGACY_MAP: Record<string, NichoKey> = {
  moda: "comercio_general",
  ropa: "comercio_general",
  belleza: "belleza_tatuajes",
  comida: "gastronomia",
  fitness: "salud_fitness",
  servicios: "servicios_profesionales",
  tecnologia: "tecnologia_gadgets",
  default: "general",
  general: "general",
};

/** Minúsculas, sin acentos ni ñ, solo letras/números/espacios. */
export function normalizeNichoText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_KEYWORDS: Array<{ id: NichoCatalogEntry["id"]; keywords: string[] }> =
  NICHO_CATALOG.map((n) => ({ id: n.id, keywords: n.keywords.map(normalizeNichoText) }));

/**
 * ¿Aparece la keyword en el texto normalizado (ya relleno con espacios)?
 * - Keywords de 1 a 3 letras («sat», «gym», «cafe»): palabra completa, para
 *   no casar dentro de otra palabra («sat» en «satisfecho»).
 * - Keywords más largas: basta que una palabra del texto EMPIECE con ella,
 *   así «piercing» casa con «piercings» y «tatuaje» con «tatuajes».
 * Devuelve el índice de la primera aparición o -1.
 */
function keywordIndex(paddedText: string, keyword: string): number {
  const needle = ` ${keyword}`;
  if (keyword.length <= 3) {
    const idx = paddedText.indexOf(`${needle} `);
    return idx === -1 ? -1 : idx + 1;
  }
  const idx = paddedText.indexOf(needle);
  return idx === -1 ? -1 : idx + 1;
}

/**
 * Clasifica un texto en la taxonomía canónica por PUNTUACIÓN de keywords:
 * cada nicho suma 1 punto por cada keyword distinta del catálogo que aparece
 * en el texto. Gana el de mayor puntaje; en empate gana el nicho cuya primera
 * coincidencia aparece antes en el texto; si persiste el empate, el orden
 * del catálogo decide. Sin ninguna coincidencia → «general».
 */
export function inferNichoFromText(...texts: string[]): NichoKey {
  const joined = texts.filter(Boolean).join(" ");
  if (!joined.trim()) return "general";
  const padded = ` ${normalizeNichoText(joined)} `;

  let best: { id: NichoKey; score: number; firstIdx: number } = { id: "general", score: 0, firstIdx: Infinity };
  for (const entry of NORMALIZED_KEYWORDS) {
    let score = 0;
    let firstIdx = Infinity;
    for (const kw of entry.keywords) {
      const idx = keywordIndex(padded, kw);
      if (idx !== -1) {
        score++;
        if (idx < firstIdx) firstIdx = idx;
      }
    }
    if (score > best.score || (score === best.score && score > 0 && firstIdx < best.firstIdx)) {
      best = { id: entry.id, score, firstIdx };
    }
  }
  return best.id;
}

/** Mapea el giro/industria en texto libre del usuario a la taxonomía canónica. */
export function normalizeIndustria(industria: string): NichoKey {
  if (!industria) return "general";
  const i = normalizeNichoText(industria);
  if (/llanta|auto|mecan|taller|vulcan|refaccion|neumatic/.test(i)) return "automotriz";
  if (/tatu|tattoo|belleza|estetic|barber|piercing|unas|salon|pestana/.test(i)) return "belleza_tatuajes";
  if (/restaur|comida|food|gastro|taco|pizza|antojit|marisco/.test(i)) return "gastronomia";
  if (/inmuebl|bienes raices|casa|hogar|construc|inmobiliaria|terreno/.test(i)) return "hogar_inmuebles";
  if (/fitness|gym|gimnasio|salud|bienestar|nutri|dentista|clinica/.test(i)) return "salud_fitness";
  if (/tecnolog|celular|electron|software|gadget|comput|gaming|videojuego/.test(i)) return "tecnologia_gadgets";
  if (/servicio|consult|profesional|contador|abogad|asesor|agencia/.test(i)) return "servicios_profesionales";
  if (/comercio|venta|tienda|ropa|moda|bazar|calzado|emprend/.test(i)) return "comercio_general";
  return "general";
}

/**
 * Convierte cualquier valor histórico o libre al id canónico: acepta los ids
 * nuevos, las claves viejas (NICHO_LEGACY_MAP), los nombres del catálogo y
 * texto libre de giro («llantas y mecánica» → automotriz). Sin señal → «general».
 */
export function toCanonicalNicho(value: string | null | undefined): NichoKey {
  if (!value) return "general";
  const key = value.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (CANONICAL_IDS.has(key)) return key as NichoKey;
  if (NICHO_LEGACY_MAP[key]) return NICHO_LEGACY_MAP[key];
  return normalizeIndustria(value);
}

export function resolveNicho(texts: string[], industria: string): NichoKey {
  const fromText = inferNichoFromText(...texts);
  if (fromText !== "general") return fromText;
  return normalizeIndustria(industria);
}
