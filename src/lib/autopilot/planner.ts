import type {
  AutopilotModo,
  AutopilotSettings,
  Plan,
  Producto,
  Profile,
  Red,
  TipoPost,
} from "@/lib/mock/types";
import type { Diagnosis } from "@/lib/brain/diagnose";
import type { BrainDayPlan } from "@/lib/brain/plan";
import { analyzeHook, hasCta } from "@/lib/brain/hooks";
import { fillHook, NICHES, type NicheProfile } from "@/lib/brain/niches";

export const AUTOPILOT_LIMITS: Record<Plan, { max_posts: number; modos: AutopilotModo[] }> = {
  free: { max_posts: 3, modos: ["aprobar"] },
  pro: { max_posts: 7, modos: ["aprobar", "automatico"] },
  business: { max_posts: 14, modos: ["aprobar", "automatico"] },
};

export const DEFAULT_AUTOPILOT: AutopilotSettings = {
  activo: false,
  modo: "aprobar",
  posts_semana: 3,
  redes: [],
  ultima_generacion: null,
};

/** Redes que aceptan imagen o texto; TikTok y YouTube solo aceptan video. */
const IMAGE_REDES: Red[] = ["facebook", "instagram"];
const VIDEO_REDES: Red[] = ["tiktok", "youtube"];

export const DEFAULT_TIMEZONE = "America/Mexico_City";

export interface AutopilotSlot {
  /** ISO en UTC. */
  fecha: string;
  dia_label: string;
  hora_label: string;
  redes: Red[];
  tipo: TipoPost;
  media_url: string;
  producto?: { id: string; nombre: string; precio: number; descripcion: string };
  idea: string;
  formula: string;
  plantilla: string;
  requiere_media?: "video" | "imagen";
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};
const DIA_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** "Lunes a viernes" → [1..5]; "Martes" → [2]; desconocido → []. */
export function parseDias(label: string): number[] {
  const t = norm(label);
  const range = t.match(/(\w+)\s+a\s+(\w+)/);
  if (range && range[1] in WEEKDAYS && range[2] in WEEKDAYS) {
    const out: number[] = [];
    for (let d = WEEKDAYS[range[1]]; ; d = (d + 1) % 7) {
      out.push(d);
      if (d === WEEKDAYS[range[2]]) break;
    }
    return out;
  }
  return Object.entries(WEEKDAYS)
    .filter(([name]) => t.includes(name))
    .map(([, d]) => d);
}

/** "8:30 PM" → { h: 20, m: 30 }. */
export function parseHora(label: string): { h: number; m: number } | null {
  const match = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const ampm = match[3]?.toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function tzParts(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    y: get("year"),
    mo: get("month") - 1,
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second"),
  };
}

/** Convierte una hora local del negocio a timestamp UTC. */
export function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  timeZone: string,
): number {
  const guess = Date.UTC(y, mo, d, h, mi);
  const p = tzParts(guess, timeZone);
  const offset = Date.UTC(p.y, p.mo, p.d, p.h, p.mi, p.s) - guess;
  return guess - offset;
}

function fmtHora(h: number, m: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

interface PlanInput {
  diagnosis: Diagnosis;
  settings: Pick<AutopilotSettings, "posts_semana" | "redes">;
  productos: Array<
    Pick<Producto, "id" | "nombre" | "precio" | "descripcion" | "imagen" | "activo">
  >;
  connected: Red[];
  planSemana?: BrainDayPlan[];
  /** Publicaciones del piloto que ya están programadas para la semana (no se duplican). */
  yaProgramadas?: number;
  now?: number;
  timeZone?: string;
}

/** Decide cuándo, dónde y con qué medio sale cada publicación de la próxima semana. */
export function planAutopilotSlots(input: PlanInput): AutopilotSlot[] {
  const now = input.now ?? Date.now();
  const tz = input.timeZone ?? DEFAULT_TIMEZONE;
  const niche = NICHES[input.diagnosis.nicho];
  const total = Math.max(0, input.settings.posts_semana - (input.yaProgramadas ?? 0));
  if (total === 0) return [];

  const elegidas = input.settings.redes.filter((r) => input.connected.includes(r));
  const imageRedes = elegidas.filter((r) => IMAGE_REDES.includes(r));
  const videoRedes = elegidas.filter((r) => VIDEO_REDES.includes(r));
  if (!imageRedes.length && !videoRedes.length) return [];

  // Horarios: los del plan semanal de la IA si existen, si no los mejores del diagnóstico.
  const fuentes = input.planSemana?.length ? input.planSemana : input.diagnosis.mejores_horarios;
  const horarios: Array<{ dias: number[]; h: number; m: number }> = [];
  for (const f of fuentes) {
    const hora = parseHora(f.hora);
    const dias = parseDias(f.dia);
    if (hora && dias.length) horarios.push({ dias, ...hora });
  }
  if (!horarios.length) horarios.push({ dias: [2, 4, 6], h: 20, m: 0 });
  const horaDefault = horarios[0];

  const today = tzParts(now, tz);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const base = new Date(Date.UTC(today.y, today.mo, today.d + i + 1));
    return {
      y: base.getUTCFullYear(),
      mo: base.getUTCMonth(),
      d: base.getUTCDate(),
      weekday: base.getUTCDay(),
    };
  });

  const preferidos = dias.filter((d) => horarios.some((h) => h.dias.includes(d.weekday)));
  const resto = dias.filter((d) => !preferidos.includes(d));
  const orden = [...preferidos, ...resto];

  const elegidos: Array<{ dia: (typeof dias)[number]; h: number; m: number }> = [];
  for (let ronda = 0; elegidos.length < total && ronda < 3; ronda++) {
    for (const dia of orden) {
      if (elegidos.length >= total) break;
      const delDia = horarios.filter((h) => h.dias.includes(dia.weekday));
      const hora = delDia[ronda] ?? (ronda === 0 ? (delDia[0] ?? horaDefault) : null);
      if (!hora) continue;
      const shift = ronda > 0 && !delDia[ronda] ? 3 * ronda : 0;
      elegidos.push({ dia, h: Math.min(22, hora.h + shift), m: hora.m });
    }
  }

  const fechas = elegidos
    .map((e) => ({ ...e, ts: zonedToUtc(e.dia.y, e.dia.mo, e.dia.d, e.h, e.m, tz) }))
    .sort((a, b) => a.ts - b.ts);

  const conImagen = input.productos.filter((p) => p.activo && p.imagen);
  const activos = input.productos.filter((p) => p.activo);
  const videosSemana = videoRedes.length
    ? imageRedes.length
      ? Math.min(2, Math.ceil(total / 3))
      : total
    : 0;

  return fechas.map((f, i) => {
    const esVideo = i >= fechas.length - videosSemana;
    const hook = niche.hooks[i % niche.hooks.length];
    const brief = input.planSemana?.[i];
    const pool = !esVideo && conImagen.length ? conImagen : activos;
    const producto = pool.length ? pool[i % pool.length] : undefined;
    const idea = brief?.idea ?? niche.pilares[i % niche.pilares.length];

    let redes: Red[];
    let tipo: TipoPost;
    let media = "";
    let requiere: AutopilotSlot["requiere_media"];
    if (esVideo) {
      redes = videoRedes;
      tipo = "video";
      requiere = "video";
    } else if (producto?.imagen) {
      redes = imageRedes;
      tipo = "imagen";
      media = producto.imagen;
    } else if (imageRedes.includes("facebook")) {
      redes = ["facebook"];
      tipo = "texto";
    } else {
      redes = imageRedes;
      tipo = "imagen";
      requiere = "imagen";
    }

    return {
      fecha: new Date(f.ts).toISOString(),
      dia_label: DIA_LABEL[f.dia.weekday],
      hora_label: fmtHora(f.h, f.m),
      redes,
      tipo,
      media_url: media,
      producto: producto
        ? {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            descripcion: producto.descripcion,
          }
        : undefined,
      idea,
      formula: hook.formula,
      plantilla: hook.plantilla,
      requiere_media: requiere,
    };
  });
}

/** Garantiza que el copy abra con gancho y cierre con llamada a WhatsApp. */
export function enforceCopyQuality(
  copy: string,
  slot: AutopilotSlot,
  niche: NicheProfile,
  profile: Pick<Profile, "ciudad" | "publico_objetivo" | "nombre_negocio">,
): string {
  let out = copy.trim();
  if (analyzeHook(out).nivel === "debil") {
    const gancho = fillHook(slot.plantilla, {
      producto: slot.producto?.nombre,
      precio: slot.producto?.precio,
      ciudad: profile.ciudad,
      publico: profile.publico_objetivo,
      negocio: profile.nombre_negocio,
    });
    out = `${gancho}\n\n${out}`;
  }
  if (!hasCta(out)) out = `${out}\n\n${niche.cta_tipico}`;
  return out;
}

/** Copy sin IA: gancho del nicho + idea + producto + llamada a la acción. */
export function fallbackCopy(
  slot: AutopilotSlot,
  niche: NicheProfile,
  profile: Pick<Profile, "ciudad" | "publico_objetivo" | "nombre_negocio">,
): string {
  const gancho = fillHook(slot.plantilla, {
    producto: slot.producto?.nombre,
    precio: slot.producto?.precio,
    ciudad: profile.ciudad,
    publico: profile.publico_objetivo,
    negocio: profile.nombre_negocio,
  });
  const producto = slot.producto
    ? `\n\n✨ ${slot.producto.nombre}${slot.producto.precio ? ` — $${slot.producto.precio.toLocaleString("es-MX")}` : ""}${slot.producto.descripcion ? `\n${slot.producto.descripcion.slice(0, 160)}` : ""}`
    : "";
  const guion = slot.requiere_media === "video" ? `\n\n🎬 Qué grabar: ${slot.idea}` : "";
  return `${gancho}${producto}${guion}\n\n👉 ${niche.cta_tipico}`;
}
