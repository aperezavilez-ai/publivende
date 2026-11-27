import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { getDb, schema } from "@/server/db";
import { verifySessionToken } from "@/server/auth/crypto";
import { getSyncStatusForViewer, syncUserMetrics } from "@/server/metrics/sync";
import { mergeRealMetrics } from "@/server/sync/user-data";
import type { DB, WaContact } from "@/lib/mock/types";

/** Evita que el botón dispare ráfagas de llamadas a las APIs de las redes (tienen cuotas). */
const MANUAL_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

async function realMetricsFor(userId: string) {
  const contacts = await getDb()
    .select({ id: schema.whatsappContacts.id, postOrigenId: schema.whatsappContacts.postOrigenId })
    .from(schema.whatsappContacts)
    .where(eq(schema.whatsappContacts.userId, userId));
  const data: Partial<DB> = {
    post_metrics: [],
    whatsapp_contacts: contacts.map(
      (c: typeof contacts[number]) => ({ id: c.id, post_origen_id: c.postOrigenId ?? undefined }) as WaContact,
    ),
  };
  await mergeRealMetrics(userId, data);
  return {
    post_metrics: data.post_metrics ?? [],
    account_snapshots: data.account_snapshots ?? [],
    metrics_sync: data.metrics_sync ?? [],
  };
}

/**
 * Real v2 — Resultados: UN paquete de datos reales por usuario/periodo.
 * La pantalla Resultados y el PDF «Reporte de Lanzamiento» salen de aquí:
 * es imposible que digan cosas distintas.
 */
export const getResultadosServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      dias: z.number().int().min(1).max(365).default(30),
      postId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode())
      return { ok: false as const, error: "Resultados requiere modo producción (datos reales de tus redes)" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const { buildResultados } = await import("@/server/metrics/resultados");
    const paquete = await buildResultados(session.userId, { dias: data.dias, postId: data.postId });
    // [MÉTRICAS — 2026-11-27] Comparación estilo Analytics: totales del
    // periodo anterior (misma duración, ventana desplazada) para los
    // deltas de los KPI. Solo sin filtro por post y solo si el periodo
    // anterior tuvo publicaciones; si no, anterior queda null y la
    // pantalla lo dice — nunca un delta falso.
    if (!data.postId) {
      const ant = await buildResultados(session.userId, {
        dias: data.dias,
        desplazamientoDias: data.dias,
      });
      paquete.anterior =
        ant.totales.posts > 0
          ? {
              vistas: ant.totales.vistas,
              alcance: ant.totales.alcance,
              interacciones: ant.totales.interacciones,
              clics: ant.totales.clics,
              leads: ant.totales.leads,
              ventas_cerradas: ant.totales.ventas_cerradas,
              ingresos: ant.totales.ingresos,
            }
          : null;
    }
    return { ok: true as const, paquete };
  });

/** Lista breve de posts publicados del usuario, para el filtro por post/campaña del reporte. */
export const listMyPublishedPostsServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const rows = await getDb()
      .select({
        id: schema.posts.id,
        copy: schema.posts.copy,
        fechaPublicacion: schema.posts.fechaPublicacion,
        nichoLabel: schema.posts.nichoLabel,
      })
      .from(schema.posts)
      .where(eq(schema.posts.userId, session.userId))
      .orderBy(desc(schema.posts.fechaPublicacion))
      .limit(100);
    return {
      ok: true as const,
      posts: rows
        .filter((r) => r.fechaPublicacion)
        .map((r) => ({
          id: r.id,
          copy: r.copy.length > 80 ? `${r.copy.slice(0, 80)}…` : r.copy,
          fecha_publicacion: r.fechaPublicacion?.toISOString() ?? null,
          nicho_label: r.nichoLabel ?? null,
        })),
    };
  });

export const syncMyMetricsServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode())
      return { ok: false as const, error: "Disponible solo con cuentas reales conectadas" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const status = await getSyncStatusForViewer(session.userId);
    const lastSync = Math.max(0, ...status.map((s) => (s.synced_at ? Date.parse(s.synced_at) : 0)));
    const wait = MANUAL_SYNC_COOLDOWN_MS - (Date.now() - lastSync);
    if (wait > 0) {
      return {
        ok: false as const,
        error: `Las métricas se actualizaron hace poco. Intenta en ${Math.ceil(wait / 60000)} min.`,
        metrics: await realMetricsFor(session.userId),
      };
    }

    const summary = await syncUserMetrics(session.userId);
    return { ok: true as const, summary, metrics: await realMetricsFor(session.userId) };
  });
