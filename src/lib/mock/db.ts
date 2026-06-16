import type { DB, Profile, Red, EtapaLead } from "./types";

const KEY = "publivende_db_v1";

let cachedRaw: string | null | undefined;
let cachedDb: DB | null = null;
let dbVersion = 0;

export function getDBVersion() {
  return dbVersion;
}

function invalidateCache() {
  cachedRaw = undefined;
  cachedDb = null;
  dbVersion++;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) invalidateCache();
  });
}

const emptyDB: DB = {
  profiles: [],
  social_accounts: [],
  posts: [],
  post_metrics: [],
  whatsapp_contacts: [],
  whatsapp_messages: [],
  automation_rules: [],
  media_assets: [],
  inbox: [],
  productos: [],
  ad_campaigns: [],
  ad_metrics: [],
  marketplace_recetas: [],
  ab_experiments: [],
  session_user_id: null,
};

export function loadDB(): DB {
  if (typeof window === "undefined") return { ...emptyDB };
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw && cachedDb) return cachedDb;
  cachedRaw = raw;
  if (!raw) {
    cachedDb = { ...emptyDB };
    return cachedDb;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DB>;
    cachedDb = {
      ...emptyDB,
      ...parsed,
      ab_experiments: Array.isArray(parsed.ab_experiments) ? parsed.ab_experiments : [],
    };
  } catch {
    cachedDb = { ...emptyDB };
  }
  return cachedDb;
}

export function saveDB(db: DB) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(db);
  localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedDb = db;
  dbVersion++;
  window.dispatchEvent(new Event("publivende-db-change"));
}

export function uid() { return crypto.randomUUID(); }
export function slug() { return Math.random().toString(36).slice(2, 10); }

const NOMBRES = ["Ana López", "Carlos Méndez", "María Fernanda", "Diego Ramírez", "Lucía Torres", "Jorge Pérez", "Sofía Castro", "Andrés Vargas", "Valentina Ríos", "Mateo Silva", "Camila Ruiz", "Pablo Herrera", "Isabel Núñez", "Roberto Salas", "Daniela Ortiz"];
const REDES: Red[] = ["instagram", "tiktok", "facebook", "youtube"];
const ETAPAS: EtapaLead[] = ["nuevo", "contactado", "negociando", "ganado", "perdido"];

const COPIES = [
  "✨ Nueva colección disponible. Envíos a todo México 🇲🇽 #ModaLatam",
  "🎉 Promo del día: 2x1 hasta agotar existencias. Escríbenos por DM.",
  "Tutorial rápido: 3 tips para vender más en redes 🚀",
  "Detrás de cámaras de la sesión de hoy 📸",
  "¿Cuál te llevas? Comenta tu favorito 👇",
  "Reseña real de una clienta feliz 💜",
  "Lunes de motivación: hoy es el día.",
  "Lanzamiento oficial: ya está disponible.",
  "Lo más vendido de la semana 🔥",
  "Promo flash 24h ⏰",
];

const IMGS = [
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
];

const AVATARS = (n: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}`;

/** Solo cuentas de redes vacías — para usuarios nuevos antes del onboarding. */
export function initMinimalUser(userId: string, nombreNegocio: string) {
  const db = loadDB();
  if (db.social_accounts.some((a) => a.user_id === userId)) return;
  const labels: Record<Red, string> = {
    instagram: "Conectar Instagram",
    tiktok: "Conectar TikTok",
    facebook: "Conectar Facebook",
    youtube: "Conectar YouTube",
  };
  REDES.forEach((red) => {
    db.social_accounts.push({
      id: uid(), user_id: userId, red,
      nombre_cuenta: labels[red],
      avatar: AVATARS(red),
      estado_conexion: "desconectada",
      token_placeholder: "",
    });
  });
  saveDB(db);
}

export function seedForUser(userId: string) {
  const db = loadDB();
  // social accounts (mock, desconectadas) — solo si el usuario aún no tiene
  if (!db.social_accounts.some((a) => a.user_id === userId)) {
    REDES.forEach((red) => {
      db.social_accounts.push({
        id: uid(), user_id: userId, red,
        nombre_cuenta: `@minegocio_${red}`,
        avatar: AVATARS(red),
        estado_conexion: "desconectada",
        token_placeholder: "",
      });
    });
  }

  // 20 posts en los últimos 60 días
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    const offset = Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000);
    const fecha = new Date(now - offset).toISOString();
    const redes = REDES.slice(0, 1 + Math.floor(Math.random() * 3));
    const postId = uid();
    db.posts.push({
      id: postId, user_id: userId,
      tipo: Math.random() > 0.4 ? "imagen" : "video",
      media_url: IMGS[i % IMGS.length],
      copy: COPIES[i % COPIES.length],
      redes_destino: redes,
      estado: "publicado",
      fecha_publicacion: fecha,
      tracking_slug: slug(),
      created_at: fecha,
    });
    redes.forEach((r) => {
      const vistas = 200 + Math.floor(Math.random() * 8000);
      db.post_metrics.push({
        id: uid(), post_id: postId, red: r,
        vistas,
        likes: Math.floor(vistas * (0.03 + Math.random() * 0.08)),
        comentarios: Math.floor(vistas * 0.01),
        compartidos: Math.floor(vistas * 0.005),
        seguidores_ganados: Math.floor(vistas * 0.002),
        mensajes_generados: Math.floor(vistas * 0.004),
      });
    });
  }

  // 3 programados a futuro
  for (let i = 0; i < 3; i++) {
    db.posts.push({
      id: uid(), user_id: userId, tipo: "imagen",
      media_url: IMGS[i],
      copy: COPIES[i],
      redes_destino: ["instagram", "facebook"],
      estado: "programado",
      fecha_programada: new Date(now + (i + 1) * 86400000 * 2).toISOString(),
      tracking_slug: slug(),
      created_at: new Date().toISOString(),
    });
  }

  // 15 contactos WhatsApp
  const postsPub = db.posts.filter((p) => p.user_id === userId && p.estado === "publicado");
  const SENALES_HOT = ["cuándo me llega", "ya pagué", "lo quiero", "envíos", "transferencia"];
  NOMBRES.forEach((nombre, i) => {
    const etapa = ETAPAS[i % ETAPAS.length];
    const postOrigen = postsPub[i % postsPub.length];
    const contactId = uid();
    const fecha = new Date(now - Math.floor(Math.random() * 20 * 86400000));
    const intro = [
      "Hola, vi tu publicación, ¿tienes disponible?",
      "Buen día, ¿cuál es el precio?",
      "Hola! Me interesa el producto del Reel",
      "¿Hacen envíos a Guadalajara?",
      "Quiero más info por favor 🙏",
    ][i % 5];
    const tieneAudio = i % 3 === 0;
    // Score 0-100 según etapa y señales
    let score = etapa === "ganado" ? 100 : etapa === "negociando" ? 75 : etapa === "contactado" ? 45 : etapa === "nuevo" ? 25 : 10;
    const motivos: string[] = [];
    if (etapa === "negociando") motivos.push("En etapa negociación");
    if (SENALES_HOT.some((s) => intro.toLowerCase().includes(s))) { score += 10; motivos.push("Mencionó intención compra"); }
    if (postOrigen) motivos.push("Vino de publicación atribuida");
    if (tieneAudio) { score += 5; motivos.push("Envió nota de voz"); }
    if (i < 4) { score += 5; motivos.push("Mensajes sin leer recientes"); }
    score = Math.min(100, score);

    db.whatsapp_contacts.push({
      id: contactId, user_id: userId, nombre,
      celular: `+52 55 ${1000 + i}-${2000 + i}`,
      etiqueta: ["VIP", "Nuevo", "Recurrente", ""][i % 4],
      etapa,
      origen: postOrigen ? `Reel del ${fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}` : "Directo",
      post_origen_id: postOrigen?.id,
      notas: "",
      monto_venta: etapa === "ganado" ? 500 + Math.floor(Math.random() * 3000) : undefined,
      fecha_creacion: fecha.toISOString(),
      no_leidos: i < 4 ? 1 + Math.floor(Math.random() * 3) : 0,
      lead_score: score,
      score_motivos: motivos,
    });

    db.whatsapp_messages.push({
      id: uid(), contact_id: contactId, direccion: "entrante",
      texto: intro, automatico: false,
      timestamp: new Date(fecha.getTime() + 1000).toISOString(),
    });
    if (tieneAudio) {
      db.whatsapp_messages.push({
        id: uid(), contact_id: contactId, direccion: "entrante",
        texto: "🎤 Hola, te mando audio: quiero saber si tienen disponible y cuánto cuesta el envío a mi ciudad por favor",
        automatico: false,
        tipo_media: "audio",
        duracion_seg: 12 + Math.floor(Math.random() * 20),
        timestamp: new Date(fecha.getTime() + 30000).toISOString(),
      });
    }
    db.whatsapp_messages.push({
      id: uid(), contact_id: contactId, direccion: "saliente",
      texto: `¡Hola ${nombre.split(" ")[0]}! Gracias por escribirnos 💜 Sí tenemos disponible, ¿qué talla buscas?`,
      automatico: true,
      timestamp: new Date(fecha.getTime() + 60000).toISOString(),
    });
    if (etapa !== "nuevo") {
      db.whatsapp_messages.push({
        id: uid(), contact_id: contactId, direccion: "entrante",
        texto: "Talla M porfa", automatico: false,
        timestamp: new Date(fecha.getTime() + 120000).toISOString(),
      });
    }
  });

  // 3 reglas plantilla
  db.automation_rules.push(
    { id: uid(), user_id: userId, nombre: "Mensaje de bienvenida", disparador: "mensaje_nuevo", respuesta: "¡Hola {nombre}! 💜 Gracias por escribirnos. En breve te atendemos.", activa: true },
    { id: uid(), user_id: userId, nombre: "Lista de precios", disparador: "palabra_clave", palabra_clave: "precio", respuesta: "Te paso nuestra lista de precios 💸 ¿Qué producto te interesa?", activa: true },
    { id: uid(), user_id: userId, nombre: "Fuera de horario", disparador: "fuera_de_horario", respuesta: "Gracias por escribirnos 🌙 Nuestro horario es de 9am a 7pm. Te respondemos mañana.", activa: false },
  );

  // bandeja unificada (25 items)
  for (let i = 0; i < 25; i++) {
    const red = REDES[i % REDES.length];
    const tipo: "comentario" | "dm" = i % 2 === 0 ? "comentario" : "dm";
    const autor = NOMBRES[i % NOMBRES.length];
    db.inbox.push({
      id: uid(), user_id: userId, red, tipo, autor,
      avatar: AVATARS(autor),
      texto: ["¿Sigue disponible?", "🔥🔥🔥", "Te escribí por DM", "Precio?", "Envían a Bogotá?", "Lo amo 💜"][i % 6],
      post_ref: tipo === "comentario" ? postsPub[i % postsPub.length]?.id : undefined,
      leido: i > 8,
      respondido: i > 15,
      timestamp: new Date(now - i * 3600000).toISOString(),
    });
  }

  // productos demo
  const PROVEEDORES = ["mercadopago", "payu", "wompi", "kushki"] as const;
  ["Blusa floral", "Vestido negro", "Tenis blancos", "Gorra urbana"].forEach((nombre, i) => {
    db.productos.push({
      id: uid(), user_id: userId, nombre,
      precio: [499, 899, 1299, 349][i],
      moneda: "MXN",
      descripcion: "Producto destacado de nuestra colección. Envíos a todo el país, pago seguro y atención por WhatsApp.",
      imagen: IMGS[i % IMGS.length],
      link_pago: "https://mpago.la/demo",
      pago_provider: PROVEEDORES[i % PROVEEDORES.length],
      slug_publico: slug() + "-" + nombre.toLowerCase().replace(/\s+/g, "-"),
      activo: true,
    });
  });


  // 4 campañas Google Ads demo
  const objetivos: Array<"mensajes_whatsapp" | "trafico_catalogo" | "ventas_link"> = ["mensajes_whatsapp", "ventas_link", "trafico_catalogo", "mensajes_whatsapp"];
  const tipos: Array<"search" | "performance_max" | "display"> = ["search", "performance_max", "search", "display"];
  const estados: Array<"activa" | "pausada" | "finalizada" | "borrador"> = ["activa", "activa", "pausada", "borrador"];
  const nombresCamp = ["Promo Día de las Madres", "Performance Max - Colección Verano", "Búsqueda - Vestidos MX", "Display - Remarketing"];
  for (let i = 0; i < 4; i++) {
    const campId = uid();
    const inicio = new Date(now - (15 - i * 3) * 86400000);
    const postRef = postsPub[i % postsPub.length];
    db.ad_campaigns.push({
      id: campId, user_id: userId,
      nombre: nombresCamp[i],
      objetivo: objetivos[i],
      tipo: tipos[i],
      estado: estados[i],
      presupuesto_diario: [150, 300, 200, 100][i],
      moneda: "MXN",
      paises: ["MX"],
      ciudades: ["CDMX", "Guadalajara", "Monterrey"],
      edad_min: 18, edad_max: 45,
      intereses: ["moda", "compras online", "tendencias"],
      keywords: ["vestido mujer", "moda latina", "ropa envío gratis", "outfit ideas"],
      headline: ["Encuentra tu look ideal", "Nueva colección 2025", "Vestidos únicos", "Vuelve y compra"][i],
      descripcion: "Envíos a todo México. Pago seguro. Atención por WhatsApp.",
      cta: ["Escribir a WhatsApp", "Comprar ahora", "Ver catálogo", "Conocer más"][i],
      post_id: postRef?.id,
      tracking_slug: slug(),
      fecha_inicio: inicio.toISOString(),
      created_at: inicio.toISOString(),
    });
    // métricas diarias últimos 14 días
    if (estados[i] !== "borrador") {
      for (let d = 13; d >= 0; d--) {
        const fecha = new Date(now - d * 86400000);
        const impr = 800 + Math.floor(Math.random() * 4000);
        const clics = Math.floor(impr * (0.02 + Math.random() * 0.05));
        const conv = Math.floor(clics * (0.05 + Math.random() * 0.12));
        const ventas = Math.floor(conv * (0.3 + Math.random() * 0.4));
        db.ad_metrics.push({
          id: uid(), campaign_id: campId,
          fecha: fecha.toISOString().slice(0, 10),
          impresiones: impr,
          clics,
          gasto: Math.round(clics * (3 + Math.random() * 8) * 100) / 100,
          conversiones: conv,
          ventas_atribuidas: ventas,
          monto_atribuido: Math.round(ventas * (400 + Math.random() * 1500) * 100) / 100,
        });
      }
    }
  }

  // Marketplace de Recetas (sembrar solo si está vacío)
  if (db.marketplace_recetas.length === 0) {
    const RECETAS_MKT = [
      { titulo: "Pack Black Friday Moda LATAM", industria: "Ropa y moda", emoji: "🛍️", desc: "10 posts + 5 reglas WA + campaña Google Ads lista", precio: 199, autor: "Ana López", descargas: 142, rating: 4.8 },
      { titulo: "Restaurante: menú del día viral", industria: "Comida", emoji: "🍕", desc: "Plantillas Reels + auto-respuesta delivery", precio: 149, autor: "Diego Ramírez", descargas: 89, rating: 4.6 },
      { titulo: "Salón de belleza 360°", industria: "Belleza", emoji: "💅", desc: "Agenda automática + before/after + reseñas", precio: 249, autor: "María Fernanda", descargas: 67, rating: 4.9 },
      { titulo: "Gym - cierre de membresías", industria: "Fitness", emoji: "💪", desc: "Funnel de leads para gimnasios y entrenadores", precio: 299, autor: "Carlos Méndez", descargas: 53, rating: 4.7 },
      { titulo: "Consultorio médico WhatsApp", industria: "Salud", emoji: "🩺", desc: "Recordatorios + triage automático + agenda", precio: 349, autor: "Lucía Torres", descargas: 41, rating: 5.0 },
      { titulo: "Inmobiliaria - tour 360", industria: "Bienes raíces", emoji: "🏠", desc: "Reels con propiedades + filtro de leads serios", precio: 399, autor: "Jorge Pérez", descargas: 28, rating: 4.5 },
    ];
    RECETAS_MKT.forEach((r) => {
      db.marketplace_recetas.push({
        id: uid(), autor_id: uid(), autor_nombre: r.autor,
        titulo: r.titulo, industria: r.industria, emoji: r.emoji,
        descripcion: r.desc, precio: r.precio,
        descargas: r.descargas, rating: r.rating,
        publicada: new Date(now - Math.floor(Math.random() * 60 * 86400000)).toISOString(),
      });
    });
  }

  saveDB(db);
}

export function userHasSeedData(userId: string): boolean {
  const db = loadDB();
  return db.whatsapp_contacts.some((c) => c.user_id === userId)
    || db.posts.some((p) => p.user_id === userId);
}

/** Carga datos demo solo para cuentas admin. Usuarios reales se alimentan vía onboarding. */
export function ensureUserSeeded(userId: string): boolean {
  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile?.is_admin) return false;
  if (userHasSeedData(userId)) return false;
  seedForUser(userId);
  return true;
}

export function getCurrentUser(): Profile | null {
  const db = loadDB();
  if (!db.session_user_id) return null;
  return db.profiles.find((p) => p.id === db.session_user_id) ?? null;
}
