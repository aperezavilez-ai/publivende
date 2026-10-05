import type {
  AccountSnapshot,
  AutomationRule,
  BenchmarkMetric,
  BenchmarkStat,
  HookInsight,
  NicheBenchmark,
  Post,
  PostMetric,
  Producto,
  Profile,
  Red,
  SocialAccount,
  WaContact,
  WaMessage,
} from "@/lib/mock/types";
import type { PublishDraft } from "@/lib/draft";
import { analyzeHook } from "./hooks";
import { fillHook, resolveNiche, type NicheKey } from "./niches";

export type Area = "constancia" | "contenido" | "alcance" | "conversion" | "ventas";
export type Severidad = "alta" | "media" | "baja";

export const AREA_LABELS: Record<Area, string> = {
  constancia: "Constancia",
  contenido: "Contenido y ganchos",
  alcance: "Alcance",
  conversion: "Conversión a WhatsApp",
  ventas: "Cierre de ventas",
};

const AREA_WEIGHTS: Record<Area, number> = {
  constancia: 0.2,
  contenido: 0.2,
  alcance: 0.15,
  conversion: 0.2,
  ventas: 0.25,
};

const PENALTY: Record<Severidad, number> = { alta: 45, media: 25, baja: 10 };

export type BrainRoute =
  | "/publicar"
  | "/whatsapp"
  | "/configuracion"
  | "/productos"
  | "/automatizaciones"
  | "/calendario"
  | "/analiticas";

export interface BrainAction {
  label: string;
  to: BrainRoute;
  draft?: PublishDraft;
}

export interface Deficit {
  id: string;
  area: Area;
  severidad: Severidad;
  titulo: string;
  evidencia: string;
  impacto: string;
  accion: string;
  cta?: BrainAction;
  /** Valor estimado en dinero que se pierde por este problema. */
  dinero?: number;
}

export interface Fortaleza {
  titulo: string;
  evidencia: string;
}

export interface OwnHook {
  post_id: string;
  gancho: string;
  puntaje: number;
  vistas: number;
  engagement: number | null;
  leads: number;
}

export interface AreaScore {
  score: number;
  sin_datos: boolean;
}

export interface DiagnosisKpis {
  posts_30d: number;
  posts_prev_30d: number;
  objetivo_30d: number;
  programados_7d: number;
  dias_sin_publicar: number | null;
  vistas_30d: number;
  vistas_prev_30d: number;
  engagement_pct: number | null;
  video_pct: number | null;
  ganchos_debiles_pct: number | null;
  sin_cta_pct: number | null;
  leads_30d: number;
  leads_por_mil_vistas: number | null;
  tasa_cierre_pct: number | null;
  ingresos_30d: number;
  respuesta_mediana_min: number | null;
  sin_responder: number;
  seguimientos_pendientes: number;
  ticket_promedio: number;
  dinero_en_riesgo: number;
  seguidores_delta_30d: number | null;
  redes_conectadas: Red[];
}

export interface Diagnosis {
  generado_at: string;
  nicho: NicheKey;
  nicho_label: string;
  score: number;
  areas: Record<Area, AreaScore>;
  confianza: "real" | "mixta" | "estimada";
  kpis: DiagnosisKpis;
  deficits: Deficit[];
  fortalezas: Fortaleza[];
  mejores_horarios: Array<{ dia: string; hora: string; fuente: "tus_datos" | "nicho" }>;
  ganchos_propios: OwnHook[];
  ganchos_a_mejorar: OwnHook[];
  /** Comparación anónima contra negocios del mismo nicho (null si no hay datos del servidor). */
  comparativo?: Comparativo | null;
}

export interface ComparisonRow {
  metrica: BenchmarkMetric;
  label: string;
  tuyo: number;
  p25: number;
  p50: number;
  p75: number;
  mejor_si: "mayor" | "menor";
  /** "arriba" = mejor que 3 de cada 4 negocios; "abajo" = peor que 3 de cada 4. */
  posicion: "arriba" | "medio" | "abajo";
  unidad: string;
}

export interface Comparativo {
  negocios: number;
  suficiente: boolean;
  filas: ComparisonRow[];
  ganchos: HookInsight[];
  actualizado_at: string;
}

const BENCH_META: Record<
  BenchmarkMetric,
  { label: string; mejor_si: "mayor" | "menor"; unidad: string; deficit?: string }
> = {
  score: { label: "Puntaje PubliVende", mejor_si: "mayor", unidad: "/100" },
  posts_30d: { label: "Publicaciones en 30 días", mejor_si: "mayor", unidad: "", deficit: "constancia_baja" },
  engagement_pct: { label: "Interacción", mejor_si: "mayor", unidad: "%", deficit: "engagement_bajo" },
  video_pct: { label: "Publicaciones en video", mejor_si: "mayor", unidad: "%", deficit: "poco_video" },
  leads_por_mil_vistas: {
    label: "Conversaciones por cada 1,000 vistas",
    mejor_si: "mayor",
    unidad: "",
    deficit: "pocas_conversaciones",
  },
  respuesta_mediana_min: {
    label: "Tiempo de respuesta",
    mejor_si: "menor",
    unidad: " min",
    deficit: "respuesta_lenta",
  },
  tasa_cierre_pct: { label: "Contactos que compran", mejor_si: "mayor", unidad: "%", deficit: "cierre_bajo" },
};

function compareWithNiche(
  benchmark: NicheBenchmark | undefined,
  kpis: DiagnosisKpis,
  score: number,
  deficits: Deficit[],
): Comparativo | null {
  if (!benchmark) return null;
  const filas: ComparisonRow[] = [];
  for (const [metrica, stat] of Object.entries(benchmark.metricas) as Array<[BenchmarkMetric, BenchmarkStat]>) {
    const meta = BENCH_META[metrica];
    const tuyo = metrica === "score" ? score : kpis[metrica];
    if (!meta || !stat || typeof tuyo !== "number") continue;
    const better = meta.mejor_si === "mayor" ? tuyo >= stat.p75 : tuyo <= stat.p25;
    const worse = meta.mejor_si === "mayor" ? tuyo <= stat.p25 : tuyo >= stat.p75;
    filas.push({
      metrica,
      label: meta.label,
      tuyo,
      p25: stat.p25,
      p50: stat.p50,
      p75: stat.p75,
      mejor_si: meta.mejor_si,
      posicion: better ? "arriba" : worse ? "abajo" : "medio",
      unidad: meta.unidad,
    });
    const d = meta.deficit ? deficits.find((x) => x.id === meta.deficit) : undefined;
    if (d) d.evidencia += ` El negocio típico de tu nicho en PubliVende tiene ${stat.p50}${meta.unidad}.`;
  }
  return {
    negocios: benchmark.negocios,
    suficiente: filas.length > 0,
    filas,
    ganchos: benchmark.ganchos,
    actualizado_at: benchmark.actualizado_at,
  };
}

export interface BrainInput {
  profile: Profile;
  posts: Post[];
  metrics: PostMetric[];
  contacts: WaContact[];
  messages: WaMessage[];
  productos: Producto[];
  accounts: SocialAccount[];
  snapshots: AccountSnapshot[];
  rules: AutomationRule[];
  /** Percentiles de negocios del mismo nicho (Fase 4), si hay muestra suficiente. */
  benchmark?: NicheBenchmark;
  now?: number;
}

const DAY = 86400000;
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = [
  { desde: 0, hasta: 9, label: "7:00 AM" },
  { desde: 9, hasta: 12, label: "10:00 AM" },
  { desde: 12, hasta: 15, label: "1:00 PM" },
  { desde: 15, hasta: 18, label: "4:00 PM" },
  { desde: 18, hasta: 21, label: "7:30 PM" },
  { desde: 21, hasta: 24, label: "9:30 PM" },
];

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : null;
export const formatMoney = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h >= 24) return `${Math.round(h / 24)} días`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function postDate(p: Post): number {
  return Date.parse(p.fecha_publicacion ?? p.created_at);
}

type PostStats = { vistas: number; interacciones: number; real: boolean };

export function diagnose(input: BrainInput): Diagnosis {
  const now = input.now ?? Date.now();
  const niche = resolveNiche(input.profile.industria);
  const deficits: Deficit[] = [];
  const fortalezas: Fortaleza[] = [];
  const evaluated = new Set<Area>();

  const published = input.posts
    .filter((p) => p.estado === "publicado")
    .sort((a, b) => postDate(b) - postDate(a));
  const in30 = published.filter((p) => postDate(p) >= now - 30 * DAY);
  const prev30 = published.filter(
    (p) => postDate(p) < now - 30 * DAY && postDate(p) >= now - 60 * DAY,
  );
  const recent90 = published.filter((p) => postDate(p) >= now - 90 * DAY);
  const programados7 = input.posts.filter(
    (p) =>
      p.estado === "programado" &&
      p.fecha_programada &&
      Date.parse(p.fecha_programada) >= now &&
      Date.parse(p.fecha_programada) <= now + 7 * DAY,
  ).length;

  const stats = new Map<string, PostStats>();
  for (const m of input.metrics) {
    const s = stats.get(m.post_id) ?? { vistas: 0, interacciones: 0, real: false };
    s.vistas += m.vistas;
    s.interacciones += m.likes + m.comentarios + m.compartidos + (m.guardados ?? 0);
    s.real ||= m.fuente === "real";
    stats.set(m.post_id, s);
  }
  const leadsByPost = new Map<string, number>();
  for (const c of input.contacts) {
    if (c.post_origen_id)
      leadsByPost.set(c.post_origen_id, (leadsByPost.get(c.post_origen_id) ?? 0) + 1);
  }

  const sumVistas = (list: Post[]) => list.reduce((s, p) => s + (stats.get(p.id)?.vistas ?? 0), 0);
  const vistas30 = sumVistas(in30);
  const vistasPrev = sumVistas(prev30);
  const realPosts = published.filter((p) => stats.get(p.id)?.real).length;
  const confianza = realPosts >= 5 ? "real" : realPosts >= 1 ? "mixta" : "estimada";

  const measured = recent90.filter((p) => (stats.get(p.id)?.vistas ?? 0) > 0);
  const totalInteracciones = measured.reduce(
    (s, p) => s + (stats.get(p.id)?.interacciones ?? 0),
    0,
  );
  const totalVistasMed = measured.reduce((s, p) => s + (stats.get(p.id)?.vistas ?? 0), 0);
  const engagementPct = measured.length >= 3 ? pct(totalInteracciones, totalVistasMed) : null;

  const topProducto = [...input.productos]
    .filter((p) => p.activo)
    .sort((a, b) => b.precio - a.precio)[0];
  const hookVars = {
    producto: topProducto?.nombre,
    precio: topProducto?.precio,
    ciudad: input.profile.ciudad,
    publico: input.profile.publico_objetivo,
    negocio: input.profile.nombre_negocio,
  };
  const draftFromNiche = (i: number): PublishDraft => {
    const h = niche.hooks[i % niche.hooks.length];
    const gancho = fillHook(h.plantilla, hookVars);
    return {
      copy: `${gancho}\n\n${niche.cta_tipico}`,
      idea: `${h.formula}: ${gancho}`,
      openIa: true,
    };
  };

  // ── Constancia ────────────────────────────────────────────────
  const objetivo30 = Math.round(niche.frecuencia_semanal * 4.3);
  const diasSinPublicar = published[0] ? Math.floor((now - postDate(published[0])) / DAY) : null;
  evaluated.add("constancia");
  if (!published.length) {
    deficits.push({
      id: "sin_publicaciones",
      area: "constancia",
      severidad: "alta",
      titulo: "Todavía no publicas",
      evidencia: "No hay publicaciones registradas en PubliVende.",
      impacto: "Sin publicaciones no hay alcance, ni mensajes, ni ventas desde redes.",
      accion: `Publica tu primer post hoy. En ${niche.label} funciona mejor ${niche.formato_estrella === "video" ? "un video corto" : "una imagen clara del producto"}.`,
      cta: { label: "Crear mi primer post", to: "/publicar", draft: draftFromNiche(0) },
    });
  } else {
    const ratio = in30.length / objetivo30;
    if (ratio < 0.7 || (diasSinPublicar ?? 0) > 7) {
      deficits.push({
        id: "constancia_baja",
        area: "constancia",
        severidad: ratio < 0.35 || (diasSinPublicar ?? 0) > 14 ? "alta" : "media",
        titulo: "Publicas menos de lo que tu nicho necesita",
        evidencia: `${in30.length} publicaciones en 30 días; la referencia para ${niche.label} es ~${objetivo30}.${diasSinPublicar != null && diasSinPublicar > 3 ? ` Llevas ${diasSinPublicar} días sin publicar.` : ""}`,
        impacto:
          "Los algoritmos premian la constancia: si desapareces, tus siguientes posts arrancan con menos alcance.",
        accion: `Programa ${Math.max(3, Math.ceil(objetivo30 / 4.3))} publicaciones para esta semana en el calendario.`,
        cta: { label: "Programar la semana", to: "/calendario" },
      });
    } else {
      fortalezas.push({
        titulo: "Publicas con constancia",
        evidencia: `${in30.length} publicaciones en 30 días (referencia del nicho: ~${objetivo30}).`,
      });
    }
    if (programados7 === 0) {
      deficits.push({
        id: "calendario_vacio",
        area: "constancia",
        severidad: "baja",
        titulo: "Tu próxima semana está vacía",
        evidencia: "No tienes publicaciones programadas para los próximos 7 días.",
        impacto:
          "Sin calendario, publicar depende de tener tiempo cada día y es lo primero que se abandona.",
        accion: "Dedica 20 minutos a programar la semana completa de una sola vez.",
        cta: { label: "Abrir calendario", to: "/calendario" },
      });
    }
  }

  // ── Contenido y ganchos ───────────────────────────────────────
  const hooks = recent90.map((p) => {
    const a = analyzeHook(p.copy);
    const s = stats.get(p.id);
    return {
      post: p,
      analysis: a,
      own: {
        post_id: p.id,
        gancho: a.gancho,
        puntaje: a.puntaje,
        vistas: s?.vistas ?? 0,
        engagement: s && s.vistas > 0 ? Math.round((s.interacciones / s.vistas) * 1000) / 10 : null,
        leads: leadsByPost.get(p.id) ?? 0,
      } satisfies OwnHook,
    };
  });
  const debiles = hooks.filter((h) => h.analysis.nivel === "debil");
  const sinCta = hooks.filter((h) => !h.analysis.tiene_cta);
  const ganchosDebilesPct = hooks.length >= 3 ? pct(debiles.length, hooks.length) : null;
  const sinCtaPct = hooks.length >= 3 ? pct(sinCta.length, hooks.length) : null;

  const recent60 = published.filter((p) => postDate(p) >= now - 60 * DAY);
  const videoPct =
    recent60.length >= 4
      ? pct(recent60.filter((p) => p.tipo === "video").length, recent60.length)
      : null;

  if (hooks.length >= 3) {
    evaluated.add("contenido");
    if ((ganchosDebilesPct ?? 0) >= 50) {
      const ejemplo = debiles[0]?.analysis.gancho;
      deficits.push({
        id: "ganchos_debiles",
        area: "contenido",
        severidad: (ganchosDebilesPct ?? 0) >= 75 ? "alta" : "media",
        titulo: "Tus primeras líneas no detienen el scroll",
        evidencia: `${ganchosDebilesPct}% de tus posts abren con un gancho débil${ejemplo ? `, por ejemplo: "${ejemplo.slice(0, 80)}"` : ""}.`,
        impacto:
          "La gente decide en 1–2 segundos si se queda. Sin gancho, aunque el producto sea bueno, nadie lo ve completo.",
        accion:
          "Abre con una pregunta de dolor, un error común o un número concreto. Usa los ganchos de tu nicho.",
        cta: { label: "Escribir con un gancho probado", to: "/publicar", draft: draftFromNiche(1) },
      });
    } else if ((ganchosDebilesPct ?? 100) <= 25) {
      fortalezas.push({
        titulo: "Buenos ganchos",
        evidencia: "La mayoría de tus posts abren con una primera línea fuerte.",
      });
    }
  }

  if (videoPct != null) {
    evaluated.add("contenido");
    const minPct = niche.video_min * 100;
    if (videoPct < minPct) {
      deficits.push({
        id: "poco_video",
        area: "contenido",
        severidad: videoPct < minPct / 2 ? "alta" : "media",
        titulo: "Te falta video",
        evidencia: `Solo ${videoPct}% de tus publicaciones recientes son video; en ${niche.label} se recomienda al menos ${Math.round(minPct)}%.`,
        impacto:
          "Reels, TikTok y Shorts son donde hoy se regala alcance orgánico a cuentas pequeñas.",
        accion: `Graba 2 videos de 15–30 segundos esta semana. Idea: ${niche.pilares[0].toLowerCase()}.`,
        cta: { label: "Crear video", to: "/publicar", draft: draftFromNiche(0) },
      });
    } else {
      fortalezas.push({
        titulo: "Buen uso de video",
        evidencia: `${videoPct}% de tus publicaciones recientes son video.`,
      });
    }
  }

  if (engagementPct != null) {
    evaluated.add("contenido");
    if (engagementPct < 1) {
      deficits.push({
        id: "engagement_bajo",
        area: "contenido",
        severidad: "media",
        titulo: "Tu contenido genera poca interacción",
        evidencia: `Interacción promedio de ${engagementPct}% (likes, comentarios, compartidos y guardados sobre vistas). Como referencia general, menos de 1% es bajo.`,
        impacto: "Con poca interacción, las redes muestran tus posts a menos personas cada vez.",
        accion:
          "Termina cada post con una pregunta fácil de responder (¿cuál prefieres, A o B?) y responde todos los comentarios la primera hora.",
        cta: { label: "Crear post con pregunta", to: "/publicar", draft: draftFromNiche(2) },
      });
    } else if (engagementPct >= 3) {
      fortalezas.push({
        titulo: "Tu audiencia interactúa",
        evidencia: `Interacción promedio de ${engagementPct}%.`,
      });
    }
  }

  const perfilIncompleto =
    !input.profile.descripcion_negocio?.trim() || !input.profile.publico_objetivo?.trim();
  if (perfilIncompleto) {
    evaluated.add("contenido");
    deficits.push({
      id: "perfil_incompleto",
      area: "contenido",
      severidad: "baja",
      titulo: "La IA no conoce bien tu negocio",
      evidencia: "Falta la descripción del negocio o el público objetivo en tu perfil.",
      impacto: "Los textos, ganchos y respuestas de WhatsApp salen genéricos sin ese contexto.",
      accion: "Completa a quién le vendes y qué te hace diferente (2 minutos).",
      cta: { label: "Completar perfil", to: "/configuracion" },
    });
  }

  // ── Alcance ───────────────────────────────────────────────────
  const conectadas = [
    ...new Set(input.accounts.filter((a) => a.estado_conexion === "conectada").map((a) => a.red)),
  ];
  evaluated.add("alcance");
  const faltantes = niche.redes_prioritarias.filter((r) => !conectadas.includes(r));
  if (faltantes.length) {
    const nombres: Record<Red, string> = {
      facebook: "Facebook",
      instagram: "Instagram",
      tiktok: "TikTok",
      youtube: "YouTube",
    };
    deficits.push({
      id: "redes_faltantes",
      area: "alcance",
      severidad: conectadas.length === 0 ? "alta" : faltantes.length >= 2 ? "media" : "baja",
      titulo:
        conectadas.length === 0
          ? "No tienes redes conectadas"
          : `No estás en ${faltantes.map((r) => nombres[r]).join(" ni ")}`,
      evidencia: `Para ${niche.label} las redes clave son ${niche.redes_prioritarias.map((r) => nombres[r]).join(", ")}. Conectadas: ${conectadas.length ? conectadas.map((r) => nombres[r]).join(", ") : "ninguna"}.`,
      impacto:
        "Cada red conectada multiplica el alcance del mismo contenido sin trabajo extra: PubliVende lo adapta y publica por ti.",
      accion: `Conecta ${faltantes.map((r) => nombres[r]).join(" y ")} para publicar en todas con un clic.`,
      cta: { label: "Conectar redes", to: "/configuracion" },
    });
  }

  if (vistasPrev > 0) {
    const cambio = (vistas30 - vistasPrev) / vistasPrev;
    if (cambio <= -0.1) {
      deficits.push({
        id: "alcance_cayendo",
        area: "alcance",
        severidad: cambio <= -0.3 ? "alta" : "media",
        titulo: "Tu alcance está cayendo",
        evidencia: `${vistas30.toLocaleString("es-MX")} vistas en los últimos 30 días contra ${vistasPrev.toLocaleString("es-MX")} en los 30 anteriores (${Math.round(cambio * 100)}%).`,
        impacto: "Menos vistas hoy son menos mensajes y ventas en las próximas semanas.",
        accion: "Repite el formato de tu post con más vistas y publica en tus mejores horarios.",
        cta: { label: "Ver qué funcionó", to: "/analiticas" },
      });
    } else if (cambio >= 0.2) {
      fortalezas.push({
        titulo: "Tu alcance está creciendo",
        evidencia: `+${Math.round(cambio * 100)}% de vistas contra el mes anterior.`,
      });
    }
  }

  let seguidoresDelta: number | null = null;
  const porRed = new Map<Red, AccountSnapshot[]>();
  for (const s of input.snapshots) porRed.set(s.red, [...(porRed.get(s.red) ?? []), s]);
  for (const snaps of porRed.values()) {
    const sorted = [...snaps].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const last = sorted[sorted.length - 1];
    const target = Date.parse(last.fecha) - 30 * DAY;
    const base = [...sorted].reverse().find((s) => Date.parse(s.fecha) <= target) ?? sorted[0];
    if (base !== last)
      seguidoresDelta = (seguidoresDelta ?? 0) + (last.seguidores - base.seguidores);
  }
  if (seguidoresDelta != null) {
    if (seguidoresDelta <= 0) {
      deficits.push({
        id: "sin_crecimiento",
        area: "alcance",
        severidad: "media",
        titulo: "No estás ganando seguidores",
        evidencia: `${seguidoresDelta >= 0 ? "+" : ""}${seguidoresDelta} seguidores en el periodo medido.`,
        impacto: "Sin audiencia nueva, cada venta depende de los mismos clientes de siempre.",
        accion:
          "Publica contenido que se comparte: tips, errores comunes y retos de tu nicho, no solo producto.",
        cta: { label: "Crear post compartible", to: "/publicar", draft: draftFromNiche(3) },
      });
    } else {
      fortalezas.push({
        titulo: "Tu comunidad crece",
        evidencia: `+${seguidoresDelta.toLocaleString("es-MX")} seguidores en 30 días.`,
      });
    }
  }

  if (confianza === "estimada" && conectadas.length > 0) {
    deficits.push({
      id: "sin_metricas_reales",
      area: "alcance",
      severidad: "baja",
      titulo: "Aún no medimos tus resultados reales",
      evidencia: "Tus publicaciones todavía no tienen métricas leídas de las redes.",
      impacto:
        "Sin datos reales, el diagnóstico usa referencias generales del nicho en lugar de lo que funciona con tu audiencia.",
      accion: "Publica desde PubliVende y actualiza las métricas en Analíticas.",
      cta: { label: "Actualizar métricas", to: "/analiticas" },
    });
  }

  // ── Conversión a WhatsApp ─────────────────────────────────────
  const leads30 = input.contacts.filter((c) => Date.parse(c.fecha_creacion) >= now - 30 * DAY);
  const leadsDePosts30 = in30.reduce((s, p) => s + (leadsByPost.get(p.id) ?? 0), 0);
  const leadsPorMil = vistas30 >= 500 ? Math.round((leadsDePosts30 / vistas30) * 10000) / 10 : null;

  if (!input.profile.whatsapp_configurado) {
    evaluated.add("conversion");
    deficits.push({
      id: "whatsapp_no_conectado",
      area: "conversion",
      severidad: "alta",
      titulo: "WhatsApp Business no está conectado",
      evidencia: "Los mensajes que generan tus posts no llegan al CRM ni al vendedor IA.",
      impacto:
        "Pierdes el registro de qué post trae cada cliente y las respuestas automáticas 24/7.",
      accion: "Conecta tu número de WhatsApp Business en 2 minutos.",
      cta: { label: "Conectar WhatsApp", to: "/whatsapp" },
    });
  }
  if (sinCtaPct != null) {
    evaluated.add("conversion");
    if (sinCtaPct >= 40) {
      deficits.push({
        id: "sin_cta",
        area: "conversion",
        severidad: sinCtaPct >= 70 ? "alta" : "media",
        titulo: "Tus posts no le dicen al cliente qué hacer",
        evidencia: `${sinCtaPct}% de tus publicaciones no tienen una llamada a la acción (escríbenos, pide, aparta, cotiza).`,
        impacto:
          "Un cliente interesado que no sabe cómo comprar se va con el siguiente post que ve.",
        accion: `Cierra cada post con: "${niche.cta_tipico}".`,
        cta: {
          label: "Crear post con llamada a la acción",
          to: "/publicar",
          draft: draftFromNiche(4),
        },
      });
    }
  }
  if (leadsPorMil != null) {
    evaluated.add("conversion");
    if (leadsPorMil < 1) {
      deficits.push({
        id: "pocas_conversaciones",
        area: "conversion",
        severidad: "media",
        titulo: "Muchas vistas, pocos mensajes",
        evidencia: `${leadsPorMil} conversaciones por cada 1,000 vistas en los últimos 30 días.`,
        impacto: "El contenido atrae, pero no lleva a la gente a WhatsApp, que es donde se vende.",
        accion:
          "Agrega precio o 'desde $' en el post y una razón para escribir hoy (apartado, promo, cupo limitado).",
        cta: { label: "Crear post de venta", to: "/publicar", draft: draftFromNiche(5) },
      });
    } else if (leadsPorMil >= 5) {
      fortalezas.push({
        titulo: "Tus posts generan conversaciones",
        evidencia: `${leadsPorMil} mensajes por cada 1,000 vistas.`,
      });
    }
  }

  // ── Cierre de ventas ──────────────────────────────────────────
  const messagesByContact = new Map<string, WaMessage[]>();
  for (const m of input.messages)
    messagesByContact.set(m.contact_id, [...(messagesByContact.get(m.contact_id) ?? []), m]);
  const responseTimes: number[] = [];
  let sinResponder = 0;
  let seguimientos = 0;
  const lastActivity = new Map<string, number>();
  for (const [contactId, msgs] of messagesByContact) {
    const sorted = [...msgs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let waitingSince: number | null = null;
    for (const m of sorted) {
      const t = Date.parse(m.timestamp);
      if (m.direccion === "entrante") {
        if (waitingSince == null) waitingSince = t;
      } else if (waitingSince != null) {
        if (t >= now - 30 * DAY) responseTimes.push((t - waitingSince) / 60000);
        waitingSince = null;
      }
    }
    const last = sorted[sorted.length - 1];
    if (last) {
      lastActivity.set(contactId, Date.parse(last.timestamp));
      const age = now - Date.parse(last.timestamp);
      if (last.direccion === "entrante" && age > 60 * 60000 && age < 14 * DAY) sinResponder++;
    }
  }
  for (const c of input.contacts) {
    if (c.etapa !== "contactado" && c.etapa !== "negociando") continue;
    const last = lastActivity.get(c.id) ?? Date.parse(c.fecha_creacion);
    const age = now - last;
    if (age > 3 * DAY && age < 45 * DAY) seguimientos++;
  }

  const ganados = input.contacts.filter((c) => c.etapa === "ganado");
  const tasaCierre = input.contacts.length >= 5 ? pct(ganados.length, input.contacts.length) : null;
  const ingresos30 = ganados
    .filter((c) => Date.parse(c.fecha_creacion) >= now - 30 * DAY)
    .reduce((s, c) => s + (c.monto_venta ?? 0), 0);
  const ticketVentas = ganados.filter((c) => c.monto_venta).map((c) => c.monto_venta as number);
  const preciosActivos = input.productos
    .filter((p) => p.activo && p.precio > 0)
    .map((p) => p.precio);
  const ticket =
    (ticketVentas.length ? ticketVentas.reduce((a, b) => a + b, 0) / ticketVentas.length : 0) ||
    (preciosActivos.length ? preciosActivos.reduce((a, b) => a + b, 0) / preciosActivos.length : 0);
  const probCierre = tasaCierre != null && tasaCierre > 0 ? Math.min(tasaCierre / 100, 0.5) : 0.2;
  const dineroSinResponder = Math.round(sinResponder * ticket * probCierre);
  const dineroSeguimientos = Math.round(seguimientos * ticket * probCierre);
  const respuestaMediana = median(responseTimes);

  if (input.contacts.length > 0 || input.messages.length > 0) evaluated.add("ventas");

  if (sinResponder > 0) {
    deficits.push({
      id: "sin_responder",
      area: "ventas",
      severidad: sinResponder >= 3 ? "alta" : "media",
      titulo: `${sinResponder} ${sinResponder === 1 ? "cliente espera" : "clientes esperan"} respuesta`,
      evidencia:
        sinResponder === 1
          ? "Una conversación termina con un mensaje del cliente sin contestar desde hace más de 1 hora."
          : `${sinResponder} conversaciones terminan con un mensaje del cliente sin contestar desde hace más de 1 hora.`,
      impacto:
        "Un cliente que no recibe respuesta en minutos le compra a otro. Es la fuga de ventas más cara y la más fácil de tapar.",
      accion:
        "Respóndeles ahora y activa el vendedor IA para que conteste al instante, incluso de noche.",
      cta: { label: "Responder ahora", to: "/whatsapp" },
      dinero: ticket > 0 ? dineroSinResponder : undefined,
    });
  }
  if (respuestaMediana != null) {
    if (respuestaMediana > 15) {
      deficits.push({
        id: "respuesta_lenta",
        area: "ventas",
        severidad: respuestaMediana > 60 ? "alta" : "media",
        titulo: "Respondes lento en WhatsApp",
        evidencia: `Tiempo típico de respuesta: ${formatMinutes(respuestaMediana)}.`,
        impacto: "La probabilidad de venta cae fuerte después de los primeros 5–10 minutos.",
        accion:
          "Activa una regla de bienvenida automática y deja que la IA conteste preguntas de precio y disponibilidad.",
        cta: { label: "Activar respuestas automáticas", to: "/automatizaciones" },
      });
    } else if (respuestaMediana <= 10) {
      fortalezas.push({
        titulo: "Respondes rápido",
        evidencia: `Tiempo típico de respuesta: ${Math.max(1, Math.round(respuestaMediana))} min.`,
      });
    }
  }
  if (seguimientos > 0) {
    deficits.push({
      id: "sin_seguimiento",
      area: "ventas",
      severidad: seguimientos >= 5 ? "alta" : "media",
      titulo: "Hay ventas a medias sin seguimiento",
      evidencia:
        seguimientos === 1
          ? "Un cliente interesado lleva más de 3 días sin que le escribas."
          : `${seguimientos} clientes interesados llevan más de 3 días sin que les escribas.`,
      impacto:
        "La mayoría de las ventas se cierran en el segundo o tercer contacto, no en el primero.",
      accion:
        "Mándales un mensaje corto con una razón para decidir hoy (última pieza, promo, envío gratis).",
      cta: { label: "Ver clientes pendientes", to: "/whatsapp" },
      dinero: ticket > 0 ? dineroSeguimientos : undefined,
    });
  }
  if (tasaCierre != null) {
    if (tasaCierre < 15) {
      deficits.push({
        id: "cierre_bajo",
        area: "ventas",
        severidad: "media",
        titulo: "Pocos mensajes terminan en venta",
        evidencia: `${tasaCierre}% de tus contactos terminan como venta ganada.`,
        impacto: "Estás pagando (en tiempo o anuncios) por conversaciones que no se convierten.",
        accion: `Prepara respuestas para las objeciones típicas de ${niche.label}: ${niche.objeciones.map((o) => `"${o.objecion}"`).join(", ")}.`,
        cta: { label: "Configurar respuestas", to: "/automatizaciones" },
      });
    } else if (tasaCierre >= 25) {
      fortalezas.push({
        titulo: "Cierras bien tus ventas",
        evidencia: `${tasaCierre}% de tus contactos compran.`,
      });
    }
  }
  const bienvenida = input.rules.some((r) => r.activa && r.disparador === "mensaje_nuevo");
  if (!bienvenida && input.profile.whatsapp_configurado) {
    evaluated.add("ventas");
    deficits.push({
      id: "sin_bienvenida",
      area: "ventas",
      severidad: "baja",
      titulo: "Sin mensaje de bienvenida automático",
      evidencia: "No tienes una regla activa para responder al primer mensaje.",
      impacto:
        "El primer mensaje marca la venta: una respuesta inmediata retiene al cliente mientras lo atiendes.",
      accion: "Crea una bienvenida con tu catálogo y horario.",
      cta: { label: "Crear bienvenida", to: "/automatizaciones" },
    });
  }

  const activos = input.productos.filter((p) => p.activo);
  if (!activos.length) {
    evaluated.add("ventas");
    deficits.push({
      id: "sin_catalogo",
      area: "ventas",
      severidad: "alta",
      titulo: "No tienes productos en tu catálogo",
      evidencia: "El vendedor IA no puede dar precios ni mandar links de pago.",
      impacto: "Sin catálogo, cada venta depende de que tú respondas manualmente.",
      accion: "Agrega tus 3 productos o servicios más vendidos con precio y foto.",
      cta: { label: "Agregar productos", to: "/productos" },
    });
  } else {
    const sinLink = activos.filter((p) => !p.link_pago).length;
    if (sinLink > 0) {
      evaluated.add("ventas");
      deficits.push({
        id: "sin_link_pago",
        area: "ventas",
        severidad: sinLink === activos.length ? "media" : "baja",
        titulo: "Productos sin link de pago",
        evidencia: `${sinLink} de ${activos.length} productos no tienen link de cobro.`,
        impacto:
          "Cada paso extra para pagar (transferencia, datos bancarios) hace que se caigan ventas.",
        accion: "Genera links de pago para cobrar en el mismo chat.",
        cta: { label: "Generar links de pago", to: "/productos" },
      });
    }
  }

  // ── Horarios ──────────────────────────────────────────────────
  const buckets = new Map<string, { dia: number; franja: number; score: number; n: number }>();
  for (const p of measured) {
    const d = new Date(postDate(p));
    const franja = FRANJAS.findIndex((f) => d.getHours() >= f.desde && d.getHours() < f.hasta);
    const key = `${d.getDay()}-${franja}`;
    const b = buckets.get(key) ?? { dia: d.getDay(), franja, score: 0, n: 0 };
    b.score += (stats.get(p.id)?.vistas ?? 0) + 50 * (leadsByPost.get(p.id) ?? 0);
    b.n++;
    buckets.set(key, b);
  }
  const propios = [...buckets.values()]
    .filter((b) => b.n >= 2)
    .sort((a, b) => b.score / b.n - a.score / a.n)
    .slice(0, 3)
    .map((b) => ({
      dia: DIAS[b.dia],
      hora: FRANJAS[b.franja].label,
      fuente: "tus_datos" as const,
    }));
  const mejores_horarios =
    measured.length >= 8 && propios.length >= 2
      ? propios
      : niche.horarios.map((h) => ({ ...h, fuente: "nicho" as const }));

  // ── Ganchos propios ───────────────────────────────────────────
  const conDatos = hooks.filter((h) => h.own.vistas > 0 || h.own.leads > 0);
  const ranking = [...(conDatos.length >= 3 ? conDatos : hooks)].sort(
    (a, b) =>
      b.own.vistas + b.own.leads * 50 - (a.own.vistas + a.own.leads * 50) ||
      b.own.puntaje - a.own.puntaje,
  );
  const ganchos_propios = ranking
    .slice(0, 5)
    .map((h) => h.own)
    .filter((h) => h.gancho);
  const ganchos_a_mejorar = hooks
    .filter((h) => h.analysis.nivel === "debil" && h.own.gancho)
    .slice(0, 5)
    .map((h) => h.own);

  if (ganchos_propios[0] && conDatos.length >= 3) {
    const promedio = conDatos.reduce((s, h) => s + h.own.vistas, 0) / conDatos.length;
    const top = ganchos_propios[0];
    if (promedio > 0 && top.vistas >= promedio * 2) {
      fortalezas.push({
        titulo: "Tienes un post ganador para repetir",
        evidencia: `"${top.gancho.slice(0, 70)}" tuvo ${(top.vistas / promedio).toFixed(1)}× tus vistas promedio.`,
      });
    }
  }

  // ── Puntajes ──────────────────────────────────────────────────
  const areas = {} as Record<Area, AreaScore>;
  for (const area of Object.keys(AREA_LABELS) as Area[]) {
    const penal = deficits
      .filter((d) => d.area === area)
      .reduce((s, d) => s + PENALTY[d.severidad], 0);
    const sinDatos = !evaluated.has(area);
    areas[area] = { score: sinDatos ? 50 : Math.max(0, 100 - penal), sin_datos: sinDatos };
  }
  const score = Math.round(
    (Object.keys(AREA_WEIGHTS) as Area[]).reduce((s, a) => s + areas[a].score * AREA_WEIGHTS[a], 0),
  );

  const order: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };
  deficits.sort(
    (a, b) => order[a.severidad] - order[b.severidad] || (b.dinero ?? 0) - (a.dinero ?? 0),
  );

  const kpis: DiagnosisKpis = {
      posts_30d: in30.length,
      posts_prev_30d: prev30.length,
      objetivo_30d: objetivo30,
      programados_7d: programados7,
      dias_sin_publicar: diasSinPublicar,
      vistas_30d: vistas30,
      vistas_prev_30d: vistasPrev,
      engagement_pct: engagementPct,
      video_pct: videoPct,
      ganchos_debiles_pct: ganchosDebilesPct,
      sin_cta_pct: sinCtaPct,
      leads_30d: leads30.length,
      leads_por_mil_vistas: leadsPorMil,
      tasa_cierre_pct: tasaCierre,
      ingresos_30d: ingresos30,
      respuesta_mediana_min: respuestaMediana != null ? Math.round(respuestaMediana) : null,
      sin_responder: sinResponder,
      seguimientos_pendientes: seguimientos,
      ticket_promedio: Math.round(ticket),
      dinero_en_riesgo: dineroSinResponder + dineroSeguimientos,
      seguidores_delta_30d: seguidoresDelta,
      redes_conectadas: conectadas,
  };
  const comparativo = compareWithNiche(
    input.benchmark?.nicho === niche.key ? input.benchmark : undefined,
    kpis,
    score,
    deficits,
  );

  return {
    generado_at: new Date(now).toISOString(),
    nicho: niche.key,
    nicho_label: niche.label,
    score,
    areas,
    confianza,
    kpis,
    deficits,
    fortalezas,
    mejores_horarios,
    ganchos_propios,
    ganchos_a_mejorar,
    comparativo,
  };
}

/** Arma la entrada del diagnóstico a partir de la base local del navegador. */
export function brainInputFromDB(
  db: {
    posts: Post[];
    post_metrics: PostMetric[];
    whatsapp_contacts: WaContact[];
    whatsapp_messages: WaMessage[];
    productos: Producto[];
    social_accounts: SocialAccount[];
    account_snapshots?: AccountSnapshot[];
    automation_rules: AutomationRule[];
    niche_benchmark?: NicheBenchmark | null;
  },
  profile: Profile,
): BrainInput {
  const posts = db.posts.filter((p) => p.user_id === profile.id);
  const postIds = new Set(posts.map((p) => p.id));
  const contacts = db.whatsapp_contacts.filter((c) => c.user_id === profile.id);
  const contactIds = new Set(contacts.map((c) => c.id));
  return {
    profile,
    posts,
    metrics: db.post_metrics.filter((m) => postIds.has(m.post_id)),
    contacts,
    messages: db.whatsapp_messages.filter((m) => contactIds.has(m.contact_id)),
    productos: db.productos.filter((p) => p.user_id === profile.id),
    accounts: db.social_accounts.filter((a) => a.user_id === profile.id),
    snapshots: db.account_snapshots ?? [],
    rules: db.automation_rules.filter((r) => r.user_id === profile.id),
    benchmark: db.niche_benchmark ?? undefined,
  };
}
