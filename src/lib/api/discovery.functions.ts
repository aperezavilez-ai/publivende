import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { getDb, schema } from "@/server/db";
import { runDiscovery } from "@/server/discovery/engine";

/**
 * [FASE 1 — Descubrimiento real] Disparo manual y resumen del directorio:
 * cuántas comunidades son catálogo sin verificar y cuántas fueron
 * descubiertas de verdad en la red (con fuente y fecha).
 */

export const runDiscoveryNow = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), nicheId: z.string().optional() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const res = await runDiscovery({
      nicheIds: data.nicheId ? [data.nicheId] : undefined,
    });
    return res;
  });

export const getDiscoverySummary = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select({
        estadoProspecto: schema.brainCommunities.estadoProspecto,
        total: sql<number>`count(*)::int`,
        miembros: sql<number>`coalesce(sum(${schema.brainCommunities.miembrosEstimados}),0)::int`,
      })
      .from(schema.brainCommunities)
      .groupBy(schema.brainCommunities.estadoProspecto);

    const porEstado: Record<string, { total: number; miembros: number }> = {};
    for (const r of rows) porEstado[r.estadoProspecto] = { total: r.total, miembros: r.miembros };
    return { ok: true as const, porEstado };
  });

export const getDiscoveredCommunities = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select({
        nombre: schema.brainCommunities.nombre,
        nicheId: schema.brainCommunities.nicheId,
        plataforma: schema.brainCommunities.plataforma,
        url: schema.brainCommunities.url,
        ciudad: schema.brainCommunities.ciudad,
        estado: schema.brainCommunities.estado,
        miembrosEstimados: schema.brainCommunities.miembrosEstimados,
        verificadoEn: schema.brainCommunities.verificadoEn,
      })
      .from(schema.brainCommunities)
      .where(eq(schema.brainCommunities.estadoProspecto, "descubierto"))
      .orderBy(desc(schema.brainCommunities.miembrosEstimados))
      .limit(300);

    return {
      ok: true as const,
      comunidades: rows.map((r) => ({
        ...r,
        verificadoEn: r.verificadoEn ? r.verificadoEn.toISOString() : null,
      })),
    };
  });
