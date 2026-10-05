/** Prueba rápida del motor de diagnóstico con un negocio de ejemplo: `npx tsx scripts/check-brain.ts` */
import { diagnose } from "../src/lib/brain/diagnose";
import { analyzeHook, hookFeatures } from "../src/lib/brain/hooks";
import { buildFallbackPlan } from "../src/lib/brain/plan";
import { NICHES } from "../src/lib/brain/niches";
import {
  DEFAULT_TIMEZONE,
  enforceCopyQuality,
  fallbackCopy,
  parseDias,
  parseHora,
  planAutopilotSlots,
} from "../src/lib/autopilot/planner";
import { hookLifts } from "../src/server/brain/benchmarks";
import type { Post, PostMetric, Profile, WaContact, WaMessage } from "../src/lib/mock/types";

const now = Date.now();
const DAY = 86400000;
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const profile: Profile = {
  id: "u1",
  nombre: "Ana",
  email: "ana@example.com",
  password: "",
  celular: "5512345678",
  codigo_pais: "+52",
  nombre_negocio: "Boutique Ana",
  industria: "Ropa y moda",
  ciudad: "Puebla",
  plan: "pro",
  whatsapp_configurado: true,
  onboarding_completado: true,
  fecha_registro: iso(90 * DAY),
};

const copies = [
  "Hola a todos, les presentamos nuestra nueva colección",
  "¿Sigues buscando vestido para la boda? Mira esto antes de comprar. Escríbenos por WhatsApp",
  "Buenos días! Disponible en tallas S a XL",
  "3 formas de usar el mismo blazer esta semana 👀 Pide el tuyo por WhatsApp",
  "Nuevo producto disponible",
];
const posts: Post[] = copies.map((copy, i) => ({
  id: `p${i}`,
  user_id: "u1",
  tipo: i === 3 ? "video" : "imagen",
  media_url: "",
  copy,
  redes_destino: ["facebook"],
  estado: "publicado",
  fecha_publicacion: iso((i * 5 + 2) * DAY),
  tracking_slug: `s${i}`,
  created_at: iso((i * 5 + 2) * DAY),
}));
const metrics: PostMetric[] = posts.map((p, i) => ({
  id: `m${i}`,
  post_id: p.id,
  red: "facebook",
  vistas: [300, 1800, 250, 4200, 200][i],
  likes: [3, 40, 2, 120, 1][i],
  comentarios: [0, 6, 0, 15, 0][i],
  compartidos: [0, 2, 0, 9, 0][i],
  seguidores_ganados: 0,
  mensajes_generados: 0,
  fuente: "real",
}));
const contacts: WaContact[] = [
  {
    id: "c1",
    user_id: "u1",
    nombre: "Luis",
    celular: "1",
    etiqueta: "",
    etapa: "negociando",
    origen: "",
    notas: "",
    fecha_creacion: iso(8 * DAY),
    no_leidos: 0,
    post_origen_id: "p3",
  },
  {
    id: "c2",
    user_id: "u1",
    nombre: "Mar",
    celular: "2",
    etiqueta: "",
    etapa: "nuevo",
    origen: "",
    notas: "",
    fecha_creacion: iso(1 * DAY),
    no_leidos: 1,
    post_origen_id: "p1",
  },
  {
    id: "c3",
    user_id: "u1",
    nombre: "Eva",
    celular: "3",
    etiqueta: "",
    etapa: "ganado",
    origen: "",
    notas: "",
    fecha_creacion: iso(12 * DAY),
    no_leidos: 0,
    monto_venta: 899,
  },
];
const messages: WaMessage[] = [
  {
    id: "w1",
    contact_id: "c1",
    direccion: "entrante",
    texto: "¿Precio?",
    automatico: false,
    timestamp: iso(8 * DAY),
  },
  {
    id: "w2",
    contact_id: "c1",
    direccion: "saliente",
    texto: "$899",
    automatico: false,
    timestamp: iso(8 * DAY - 95 * 60000),
  },
  {
    id: "w3",
    contact_id: "c2",
    direccion: "entrante",
    texto: "¿Tienen talla M?",
    automatico: false,
    timestamp: iso(5 * 3600000),
  },
];

const d = diagnose({
  profile,
  posts,
  metrics,
  contacts,
  messages,
  productos: [
    {
      id: "x",
      user_id: "u1",
      nombre: "Blazer lino",
      precio: 899,
      moneda: "MXN",
      descripcion: "",
      imagen: "",
      link_pago: "",
      activo: true,
    },
  ],
  accounts: [
    {
      id: "a",
      user_id: "u1",
      red: "facebook",
      nombre_cuenta: "Ana",
      avatar: "",
      estado_conexion: "conectada",
      token_placeholder: "",
    },
  ],
  snapshots: [],
  rules: [],
  now,
});

console.log("Score:", d.score, "| nicho:", d.nicho_label, "| confianza:", d.confianza);
console.log(
  "Áreas:",
  Object.fromEntries(Object.entries(d.areas).map(([k, v]) => [k, v.sin_datos ? "s/d" : v.score])),
);
console.log(
  "Dinero en riesgo:",
  d.kpis.dinero_en_riesgo,
  "| respuesta mediana (min):",
  d.kpis.respuesta_mediana_min,
);
console.log("\nDéficits:");
for (const x of d.deficits) console.log(`  [${x.severidad}] ${x.titulo} — ${x.evidencia}`);
console.log("\nFortalezas:");
for (const f of d.fortalezas) console.log(`  + ${f.titulo} — ${f.evidencia}`);
console.log("\nMejor gancho propio:", d.ganchos_propios[0]?.gancho);
console.log(
  "Horarios:",
  d.mejores_horarios.map((h) => `${h.dia} ${h.hora} (${h.fuente})`).join(", "),
);

console.log("\nGanchos:");
for (const c of copies) {
  const a = analyzeHook(c);
  console.log(`  ${a.puntaje.toString().padStart(3)} ${a.nivel.padEnd(7)} "${a.gancho}"`);
}

const plan = buildFallbackPlan(d, profile, [{ nombre: "Blazer lino", precio: 899, activo: true }]);
console.log("\nPlan (reglas):", plan.resumen);
console.log("  Día 1:", plan.semana[0]);

console.log("\nParseo de horarios:", parseDias("Lunes a viernes"), parseDias("Sábado"), parseHora("8:30 PM"), parseHora("12:00 AM"));

const slots = planAutopilotSlots({
  diagnosis: d,
  settings: { posts_semana: 5, redes: ["facebook", "instagram", "tiktok"] },
  productos: [
    { id: "x", nombre: "Blazer lino", precio: 899, descripcion: "Fresco para verano", imagen: "https://example.com/b.jpg", activo: true },
    { id: "y", nombre: "Vestido midi", precio: 650, descripcion: "", imagen: "", activo: true },
  ],
  connected: ["facebook", "instagram", "tiktok"],
  now,
});
console.log("\nPiloto automático (5 posts):");
const niche = NICHES[d.nicho];
for (const s of slots) {
  const local = new Date(s.fecha).toLocaleString("es-MX", { timeZone: DEFAULT_TIMEZONE, weekday: "short", hour: "numeric", minute: "2-digit" });
  console.log(`  ${s.dia_label} ${s.hora_label} [${local}] ${s.tipo} → ${s.redes.join("+")}${s.requiere_media ? ` (falta ${s.requiere_media})` : ""}`);
}
const copy = fallbackCopy(slots[0], niche, profile);
const a0 = analyzeHook(copy);
console.log("  Copy de respaldo:", JSON.stringify(copy));
console.log("  Gancho:", a0.puntaje, a0.nivel, "| CTA:", a0.tiene_cta);
console.log("  Copy débil corregido:", JSON.stringify(enforceCopyQuality("Nuevo producto disponible", slots[0], niche, profile)));

const bench = diagnose({
  profile,
  posts,
  metrics,
  contacts,
  messages,
  productos: [],
  accounts: [],
  snapshots: [],
  rules: [],
  now,
  benchmark: {
    nicho: d.nicho,
    negocios: 9,
    metricas: {
      posts_30d: { p25: 4, p50: 9, p75: 16, n: 9 },
      respuesta_mediana_min: { p25: 6, p50: 25, p75: 90, n: 7 },
      score: { p25: 30, p50: 48, p75: 66, n: 9 },
    },
    ganchos: [{ rasgo: "pregunta", label: "Abrir con una pregunta", lift: 0.34, posts: 40 }],
    actualizado_at: new Date(now).toISOString(),
  },
});
console.log("\nComparativa:");
for (const f of bench.comparativo?.filas ?? []) console.log(`  ${f.label}: tú ${f.tuyo} | típico ${f.p50} → ${f.posicion}`);
console.log("  Evidencia con nicho:", bench.deficits.find((x) => x.id === "constancia_baja")?.evidencia);
console.log("Rasgos:", hookFeatures("¿Buscas vestido? 3 tips para ti. Escríbenos por WhatsApp"));
console.log(
  "Lift sintético:",
  hookLifts(
    Array.from({ length: 40 }, (_, i) => ({
      userId: `u${Math.floor(i / 10)}`,
      copy: i % 2 ? "¿Te gusta? Pide por WhatsApp" : "Nuevo producto disponible",
      rate: i % 2 ? 0.06 : 0.03,
    })),
  ).slice(0, 3),
);
