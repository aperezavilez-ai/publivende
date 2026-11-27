import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { findUserById } from "@/server/auth/users";
import { getMetricsSyncStatus } from "@/server/metrics/sync";
import { MIN_BUSINESSES } from "@/server/brain/benchmarks";
import type { Red } from "@/lib/mock/types";

const REDES: Red[] = ["facebook", "instagram", "tiktok", "youtube"];

export interface ResultadoPendiente {
  id: string;
  nivel: "alta" | "media" | "baja";
  texto: string;
  accion_label: string;
  accion_to: string;
}

export interface ResultadosPaquete {
  generado_at: string;
  periodo_dias: number;
  filtro_post_id: string | null;
  negocio: { nombre: string; industria: string | null };
  totales: {
    posts: number;
    vistas: number;
    alcance: number | null;
    interacciones: number;
    likes: number;
    comentarios: number;
    compartidos: number;
    guardados: number;
    clics: number;
    leads: number;
    ventas_cerradas: number;
    ingresos: number;
    seguidores: number;
  };
  anterior: {
    vistas: number;
    alcance: number | null;
    interacciones: number;
    clics: number | null;
    leads: number;
    ventas_cerradas: number;
    ingresos: number;
  } | null;
  por_red: Array<{
    red: Red;
    conectada: boolean;
    posts: number;
    vistas: number;
    alcance: number | null;
    interacciones: number;
    clics: number;
    seguidores: number | null;
    ultima_sync: string | null;
    error: string | null;
  }>;
  por_post: Array<{
    id: string;
    copy: string;
    fecha_publicacion: string | null;
    nicho_label: string | null;
    tracking_slug: string;
    vistas: number;
    alcance: number | null;
    interacciones: number;
    clics: number;
    leads: number;
    ventas: number;
    ingresos: number;
    likes: number;
    comentarios: number;
    compartidos: number;
    distribuciones: number;
    por_red: Array<{ red: Red; vistas: number; alcance: number | null; interacciones: number; clics: number | null }>;
  }>;
  evolucion: Array<{ fecha: string; seguidores: number; vistas_totales: number }>;
  benchmark: {
    nicho: string;
    negocios: number;
    muestra_suficiente: boolean;
    comparaciones: Array<{ metrica: string; etiqueta: string; tu_valor: number; p50: number }>;
  } | null;
  pendientes: ResultadoPendiente[];
  frescura: { metricas_at: string | null; snapshots_at: string | null };
}

const KPI_ETIQUETAS: Record<string, string> = {
  posts_30d: "Publicaciones en 30 días",
  engagement_pct: "Interacción %",
  leads_por_mil_vistas: "Leads por cada 1.000 vistas",
  tasa_cierre_pct: "Tasa de cierre %",
};

/**
 * Real v2 — ÚNICA fuente de verdad de Resultados y del Reporte de Lanzamiento.
 * Agrega SOLO datos reales de BD: post_metrics, account_snapshots,
 * post_distributions, post_clicks y leads atribuidos (whatsapp_contacts).
 * Lo que una red no entrega queda en null y la UI/PDF lo muestran como
 * «No disponible»: jamás se estima ni se siembra un número.
 */
export async function buildResultados(
  userId: string,
  opts: { dias?: number; postId?: string; desplazamientoDias?: number } = {},
): Promise<ResultadosPaquete> {
  const dias = Math.min(365, Math.max(1, opts.dias ?? 30));
  // [MÉTRICAS — 2026-11-27] desplazamientoDias mueve la ventana al
  // periodo anterior (para la comparación estilo Analytics).
  const desplazamiento = Math.min(365, Math.max(0, opts.desplazamientoDias ?? 0));
  const hasta = desplazamiento > 0 ? new Date(Date.now() - desplazamiento * 24 * 3600 * 1000) : null;
  const desde = new Date(Date.now() - (dias + desplazamiento) * 24 * 3600 * 1000);
  const db = getDb();
  const user = await findUserById(userId);

  // ---- Posts del periodo (o el post filtrado) ----
  const postWhere = opts.postId
    ? and(eq(schema.posts.userId, userId), eq(schema.posts.id, opts.postId))
    : and(
        eq(schema.posts.userId, userId),
        eq(schema.posts.estado, "publicado"),
        gte(schema.posts.fechaPublicacion, desde),
        ...(hasta ? [lt(schema.posts.fechaPublicacion, hasta)] : []),
      );
  const posts = await db
    .select()
    .from(schema.posts)
    .where(postWhere)
    .orderBy(desc(schema.posts.fechaPublicacion));
  const postIds = posts.map((p) => p.id);

  // ---- Métricas por post/red ----
  const metricRows = postIds.length
    ? await db.select().from(schema.postMetrics).where(inArray(schema.postMetrics.postId, postIds))
    : [];
  const clickRows = postIds.length
    ? await db.select().from(schema.postClicks).where(inArray(schema.postClicks.postId, postIds))
    : [];
  const distRows = postIds.length
    ? await db.select().from(schema.postDistributions).where(inArray(schema.postDistributions.postId, postIds))
    : [];
  const leads = postIds.length
    ? await db
        .select()
        .from(schema.whatsappContacts)
        .where(
          and(
            eq(schema.whatsappContacts.userId, userId),
            inArray(schema.whatsappContacts.postOrigenId, postIds),
          ),
        )
    : await db
        .select()
        .from(schema.whatsappContacts)
        .where(eq(schema.whatsappContacts.userId, userId));

  const clicsPorPost = new Map<string, number>();
  for (const c of clickRows) clicsPorPost.set(c.postId, (clicsPorPost.get(c.postId) ?? 0) + 1);
  const distPorPost = new Map<string, number>();
  for (const d of distRows) distPorPost.set(d.postId, (distPorPost.get(d.postId) ?? 0) + 1);

  const inter = (m: typeof metricRows[number]) =>
    m.likes + m.comentarios + m.compartidos + (m.guardados ?? 0);

  // ---- Por post ----
  const porPost = posts.map((p) => {
    const ms = metricRows.filter((m) => m.postId === p.id);
    const ls = leads.filter((l) => l.postOrigenId === p.id);
    const ganados = ls.filter((l) => l.etapa === "ganado");
    const alcanceVals = ms.filter((m) => m.alcance != null);
    return {
      id: p.id,
      copy: p.copy.length > 140 ? `${p.copy.slice(0, 140)}…` : p.copy,
      fecha_publicacion: p.fechaPublicacion?.toISOString() ?? null,
      nicho_label: p.nichoLabel ?? null,
      tracking_slug: p.trackingSlug,
      vistas: ms.reduce((s, m) => s + m.vistas, 0),
      alcance: alcanceVals.length ? alcanceVals.reduce((s, m) => s + (m.alcance ?? 0), 0) : null,
      interacciones: ms.reduce((s, m) => s + inter(m), 0),
      likes: ms.reduce((s, m) => s + m.likes, 0),
      comentarios: ms.reduce((s, m) => s + m.comentarios, 0),
      compartidos: ms.reduce((s, m) => s + m.compartidos, 0),
      clics:
        (clicsPorPost.get(p.id) ?? 0) +
        ms.reduce((s, m) => s + (m.clics ?? 0), 0),
      leads: ls.length,
      ventas: ganados.length,
      ingresos: ganados.reduce((s, l) => s + (l.montoVenta ?? 0), 0),
      distribuciones: distPorPost.get(p.id) ?? 0,
      por_red: ms.map((m) => ({
        red: m.red as Red,
        vistas: m.vistas,
        alcance: m.alcance,
        interacciones: inter(m),
        clics: m.clics,
      })),
    };
  });

  // ---- Snapshots / evolución ----
  const snaps = await db
    .select()
    .from(schema.accountSnapshots)
    .where(eq(schema.accountSnapshots.userId, userId))
    .orderBy(schema.accountSnapshots.fecha);
  const snapsPeriodo = snaps.filter((s) => new Date(s.fecha).getTime() >= desde.getTime() - 24 * 3600 * 1000);
  const porFecha = new Map<string, { seguidores: number; vistas: number }>();
  for (const s of snapsPeriodo) {
    const cur = porFecha.get(s.fecha) ?? { seguidores: 0, vistas: 0 };
    cur.seguidores += s.seguidores;
    cur.vistas += s.vistasTotales ?? 0;
    porFecha.set(s.fecha, cur);
  }
  const evolucion = [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, seguidores: v.seguidores, vistas_totales: v.vistas }));
  const ultimoSegPorRed = new Map<Red, number>();
  for (const s of snaps) ultimoSegPorRed.set(s.red as Red, s.seguidores);

  // ---- Conexiones y sync ----
  const syncStatus = await getMetricsSyncStatus(userId);
  const syncPorRed = new Map(syncStatus.map((s) => [s.red as Red, s]));

  const porRed = REDES.map((red) => {
    const ms = metricRows.filter((m) => m.red === red);
    const alcanceVals = ms.filter((m) => m.alcance != null);
    const st = syncPorRed.get(red);
    return {
      red,
      conectada: st?.conectada ?? false,
      posts: new Set(ms.map((m) => m.postId)).size,
      vistas: ms.reduce((s, m) => s + m.vistas, 0),
      alcance: alcanceVals.length ? alcanceVals.reduce((s, m) => s + (m.alcance ?? 0), 0) : null,
      interacciones: ms.reduce((s, m) => s + inter(m), 0),
      clics: ms.reduce((s, m) => s + (m.clics ?? 0), 0),
      seguidores: ultimoSegPorRed.get(red) ?? null,
      ultima_sync: st?.synced_at ?? null,
      error: st?.error ?? null,
    };
  });

  // ---- Totales ----
  const ganadosTodos = leads.filter((l) => l.etapa === "ganado");
  const alcanceTotalVals = metricRows.filter((m) => m.alcance != null);
  const totales: ResultadosPaquete["totales"] = {
    posts: posts.length,
    vistas: metricRows.reduce((s, m) => s + m.vistas, 0),
    alcance: alcanceTotalVals.length ? alcanceTotalVals.reduce((s, m) => s + (m.alcance ?? 0), 0) : null,
    interacciones: metricRows.reduce((s, m) => s + inter(m), 0),
    likes: metricRows.reduce((s, m) => s + m.likes, 0),
    comentarios: metricRows.reduce((s, m) => s + m.comentarios, 0),
    compartidos: metricRows.reduce((s, m) => s + m.compartidos, 0),
    guardados: metricRows.reduce((s, m) => s + (m.guardados ?? 0), 0),
    clics:
      clickRows.length + metricRows.reduce((s, m) => s + (m.clics ?? 0), 0),
    leads: leads.length,
    ventas_cerradas: ganadosTodos.length,
    ingresos: ganadosTodos.reduce((s, l) => s + (l.montoVenta ?? 0), 0),
    seguidores: [...ultimoSegPorRed.values()].reduce((s, v) => s + v, 0),
  };

  // ---- Benchmark de nicho (solo con muestra suficiente) ----
  let benchmark: ResultadosPaquete["benchmark"] = null;
  const nicho = user?.industria ?? null;
  if (nicho) {
    const [bench] = await db
      .select()
      .from(schema.nicheBenchmarks)
      .where(eq(schema.nicheBenchmarks.nicho, nicho))
      .limit(1);
    if (bench) {
      const [kpiRow] = await db
        .select()
        .from(schema.brainKpis)
        .where(eq(schema.brainKpis.userId, userId))
        .limit(1);
      const kpis = (kpiRow?.kpis ?? {}) as Record<string, number>;
      const metricas = (bench.metricas ?? {}) as Record<string, { p50?: number } | undefined>;
      const comparaciones = Object.keys(KPI_ETIQUETAS)
        .filter((k) => typeof kpis[k] === "number" && typeof metricas[k]?.p50 === "number")
        .map((k) => ({
          metrica: k,
          etiqueta: KPI_ETIQUETAS[k],
          tu_valor: kpis[k],
          p50: metricas[k]!.p50!,
        }));
      benchmark = {
        nicho,
        negocios: bench.negocios,
        muestra_suficiente: bench.negocios >= MIN_BUSINESSES,
        comparaciones: bench.negocios >= MIN_BUSINESSES ? comparaciones : [],
      };
    }
  }

  // ---- Lo que falta por hacer (pendientes verificables desde los datos) ----
  const pendientes: ResultadoPendiente[] = [];
  for (const r of porRed) {
    if (!r.conectada) {
      pendientes.push({
        id: `conectar-${r.red}`,
        nivel: "alta",
        texto: `${r.red[0].toUpperCase() + r.red.slice(1)} no está conectado: lo que publiques no sale ni se mide en esa red.`,
        accion_label: "Conectar",
        accion_to: "/configuracion",
      });
    } else if (r.error) {
      pendientes.push({
        id: `reconectar-${r.red}`,
        nivel: "alta",
        texto: `La sincronización de ${r.red} reporta un problema: ${r.error}. Reconecta la cuenta para seguir midiendo.`,
        accion_label: "Reconectar",
        accion_to: "/configuracion",
      });
    }
  }
  const [waAccount] = await db
    .select({ id: schema.whatsappAccounts.id })
    .from(schema.whatsappAccounts)
    .where(eq(schema.whatsappAccounts.userId, userId))
    .limit(1);
  if (!waAccount && !user?.whatsappConfigurado) {
    pendientes.push({
      id: "conectar-whatsapp",
      nivel: "alta",
      texto: "WhatsApp no está conectado: los clics de tus posts no se convierten en conversaciones atribuidas.",
      accion_label: "Conectar WhatsApp",
      accion_to: "/configuracion",
    });
  }
  if (posts.length === 0 && !opts.postId) {
    pendientes.push({
      id: "sin-posts",
      nivel: "alta",
      texto: `No hay publicaciones medidas en los últimos ${dias} días. Sin publicar no hay nada que medir.`,
      accion_label: "Crear publicación",
      accion_to: "/publicar",
    });
  }
  const ahora = Date.now();
  for (const p of porPost) {
    const edadH = p.fecha_publicacion ? (ahora - new Date(p.fecha_publicacion).getTime()) / 3600000 : 0;
    const tieneMetricas = metricRows.some((m) => m.postId === p.id);
    if (edadH > 48 && !tieneMetricas) {
      pendientes.push({
        id: `sin-metricas-${p.id}`,
        nivel: "media",
        texto: `Un post de hace ${Math.floor(edadH / 24)} días aún no tiene métricas: sincroniza para traerlas.`,
        accion_label: "Sincronizar métricas",
        accion_to: "/resultados",
      });
    }
    if (p.vistas >= 100 && p.clics === 0) {
      pendientes.push({
        id: `sin-clics-${p.id}`,
        nivel: "media",
        texto: `Un post alcanzó ${p.vistas.toLocaleString("es-MX")} vistas y 0 clics: la llamada a la acción no está convirtiendo.`,
        accion_label: "Crear una versión mejorada",
        accion_to: "/publicar",
      });
    }
    if (p.clics > 0 && p.leads === 0) {
      pendientes.push({
        id: `sin-leads-${p.id}`,
        nivel: "media",
        texto: `Un post recibió ${p.clics} clics y ninguna conversación: revisa que el botón de WhatsApp responda (vendedor IA).`,
        accion_label: "Revisar WhatsApp",
        accion_to: "/configuracion",
      });
    }
  }
  if (totales.leads > 0 && totales.ventas_cerradas === 0) {
    pendientes.push({
      id: "leads-sin-cierre",
      nivel: "baja",
      texto: `Tienes ${totales.leads} leads atribuidos y ningún cierre registrado: da seguimiento y marca las ventas para que el reporte las justifique.`,
      accion_label: "Revisar configuración de ventas",
      accion_to: "/configuracion",
    });
  }
  if (!benchmark) {
    pendientes.push({
      id: "sin-benchmark",
      nivel: "baja",
      texto: nicho
        ? `Aún no hay comparativa para el nicho «${nicho}»: se activa cuando haya suficientes negocios midiendo.`
        : "Declara la industria de tu negocio para activar la comparativa contra tu nicho.",
      accion_label: "Completar mi negocio",
      accion_to: "/configuracion",
    });
  } else if (!benchmark.muestra_suficiente) {
    pendientes.push({
      id: "benchmark-muestra",
      nivel: "baja",
      texto: `La comparativa de tu nicho necesita al menos ${MIN_BUSINESSES} negocios midiendo (van ${benchmark.negocios}).`,
      accion_label: "Ver resultados",
      accion_to: "/resultados",
    });
  }

  const frescura = {
    metricas_at: metricRows.length
      ? new Date(Math.max(...metricRows.map((m) => m.fetchedAt.getTime()))).toISOString()
      : null,
    snapshots_at: snaps.length
      ? new Date(Math.max(...snaps.map((s) => s.createdAt.getTime()))).toISOString()
      : null,
  };

  return {
    generado_at: new Date().toISOString(),
    periodo_dias: dias,
    filtro_post_id: opts.postId ?? null,
    negocio: { nombre: user?.nombreNegocio || user?.nombre || "Mi negocio", industria: nicho },
    totales,
    anterior: null,
    por_red: porRed,
    por_post: porPost,
    evolucion,
    benchmark,
    pendientes,
    frescura,
  };
}
