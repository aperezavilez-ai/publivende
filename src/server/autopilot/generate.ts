import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { getDb, schema } from "@/server/db";
import type { DbUser } from "@/server/db/schema";
import { isRealAIEnabled } from "@/server/config";
import { getBusinessContextServer } from "@/server/context";
import { generateAutopilotCopiesOpenAI } from "@/server/ai/openai";
import { dbPostToClient } from "@/server/publish/service";
import { computeServerDiagnosis } from "@/server/brain/server-diagnosis";
import {
  AUTOPILOT_LIMITS,
  DEFAULT_AUTOPILOT,
  enforceCopyQuality,
  fallbackCopy,
  planAutopilotSlots,
  type AutopilotSlot,
} from "@/lib/autopilot/planner";
import { NICHES, nicheBrief } from "@/lib/brain/niches";
import type { BrainPlan } from "@/lib/brain/plan";
import type { AutopilotSettings, Post, Red, ScheduleMeta } from "@/lib/mock/types";

const DAY = 86400000;
const MINUTE = 60000;
/** Regenerar a mano cuesta tokens de IA: Free una vez por semana, planes de pago cada 10 minutos. */
export const REGEN_COOLDOWN_MS = {
  free: 7 * DAY,
  pro: 10 * MINUTE,
  business: 10 * MINUTE,
} as const;
/** El cron vuelve a llenar la semana cuando la última generación tiene más de 6 días. */
export const CRON_REGEN_AFTER_MS = 6 * DAY;
const PLAN_FRESH_MS = 8 * DAY;

const autopilotEstado = sql<string>`${schema.posts.scheduleMeta}->'autopilot'->>'estado'`;
const autopilotAprobadoPor = sql<string>`${schema.posts.scheduleMeta}->'autopilot'->>'aprobado_por'`;

function rowToSettings(
  row: typeof schema.autopilotSettings.$inferSelect | undefined,
): AutopilotSettings {
  if (!row) return { ...DEFAULT_AUTOPILOT };
  return {
    activo: row.activo,
    modo: row.modo,
    posts_semana: row.postsSemana,
    redes: row.redes ?? [],
    ultima_generacion: row.ultimaGeneracion?.toISOString() ?? null,
  };
}

export async function getAutopilotSettings(userId: string): Promise<AutopilotSettings> {
  const [row] = await getDb()
    .select()
    .from(schema.autopilotSettings)
    .where(eq(schema.autopilotSettings.userId, userId))
    .limit(1);
  return rowToSettings(row);
}

/** Ajusta la configuración a lo que permite el plan del cliente. */
export function clampSettings(
  user: Pick<DbUser, "plan">,
  input: Omit<AutopilotSettings, "ultima_generacion">,
) {
  const limits = AUTOPILOT_LIMITS[user.plan] ?? AUTOPILOT_LIMITS.free;
  return {
    activo: input.activo,
    modo: limits.modos.includes(input.modo) ? input.modo : "aprobar",
    posts_semana: Math.min(limits.max_posts, Math.max(1, Math.round(input.posts_semana))),
    redes: [...new Set(input.redes)],
  } satisfies Omit<AutopilotSettings, "ultima_generacion">;
}

export async function saveAutopilotSettings(
  user: DbUser,
  input: Omit<AutopilotSettings, "ultima_generacion">,
): Promise<AutopilotSettings> {
  const s = clampSettings(user, input);
  const values = {
    activo: s.activo,
    modo: s.modo,
    postsSemana: s.posts_semana,
    redes: s.redes,
    updatedAt: new Date(),
  };
  const [row] = await getDb()
    .insert(schema.autopilotSettings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: schema.autopilotSettings.userId, set: values })
    .returning();
  return rowToSettings(row);
}

export async function listAutopilotPosts(userId: string): Promise<Post[]> {
  const rows = await getDb()
    .select()
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.userId, userId),
        sql`(${schema.posts.scheduleMeta} -> 'autopilot') IS NOT NULL`,
        gt(schema.posts.fechaProgramada, new Date(Date.now() - DAY)),
      ),
    )
    .orderBy(schema.posts.fechaProgramada);
  return rows.map(dbPostToClient);
}

async function connectedRedes(userId: string): Promise<Red[]> {
  const rows = await getDb()
    .select({ red: schema.oauthAccounts.red })
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.userId, userId),
        eq(schema.oauthAccounts.estadoConexion, "conectada"),
      ),
    );
  return [...new Set(rows.map((r) => r.red))];
}

async function latestPlanSemana(userId: string) {
  const [row] = await getDb()
    .select({ plan: schema.brainReports.plan, createdAt: schema.brainReports.createdAt })
    .from(schema.brainReports)
    .where(eq(schema.brainReports.userId, userId))
    .orderBy(desc(schema.brainReports.createdAt))
    .limit(1);
  if (!row || Date.now() - row.createdAt.getTime() > PLAN_FRESH_MS) return undefined;
  return (row.plan as BrainPlan | null)?.semana;
}

function parseAiCopies(raw: unknown): Map<number, string> {
  const out = new Map<number, string>();
  const posts = (raw as { posts?: unknown } | null)?.posts;
  if (!Array.isArray(posts)) return out;
  for (const p of posts) {
    const n = Number((p as { n?: unknown })?.n);
    const copy = (p as { copy?: unknown })?.copy;
    if (Number.isInteger(n) && typeof copy === "string" && copy.trim().length >= 40) {
      out.set(n, copy.trim().slice(0, 2000));
    }
  }
  return out;
}

export type GenerateResult =
  | { ok: true; posts: Post[]; fuente: "ia" | "reglas" }
  | { ok: false; error: string; nextAt?: string };

/**
 * Llena la próxima semana con publicaciones del piloto automático.
 * Reemplaza las pendientes y las que programó el modo automático; respeta las que aprobó el cliente.
 */
export async function generateAutopilotWeek(
  user: DbUser,
  opts: { manual: boolean },
): Promise<GenerateResult> {
  const db = getDb();
  const settings = await getAutopilotSettings(user.id);
  if (!settings.activo) return { ok: false, error: "Activa el piloto automático primero" };

  if (opts.manual && settings.ultima_generacion) {
    const cooldown = REGEN_COOLDOWN_MS[user.plan] ?? REGEN_COOLDOWN_MS.free;
    const nextAt = new Date(new Date(settings.ultima_generacion).getTime() + cooldown);
    if (nextAt.getTime() > Date.now()) {
      return {
        ok: false,
        error:
          user.plan === "free"
            ? "El plan Free genera una semana a la vez. Sube a Pro para regenerarla cuando quieras."
            : "Espera unos minutos antes de regenerar la semana.",
        nextAt: nextAt.toISOString(),
      };
    }
  }

  const s = clampSettings(user, settings);
  const connected = await connectedRedes(user.id);
  if (!s.redes.some((r) => connected.includes(r))) {
    return { ok: false, error: "Conecta al menos una de las redes elegidas en Configuración" };
  }

  const now = new Date();
  const replaceable = and(
    eq(schema.posts.userId, user.id),
    gt(schema.posts.fechaProgramada, now),
    inArray(schema.posts.estado, ["borrador", "programado"]),
    sql`(${autopilotEstado} = 'pendiente' OR ${autopilotAprobadoPor} = 'auto')`,
  );
  await db.delete(schema.posts).where(replaceable);

  const [aprobados] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.userId, user.id),
        gt(schema.posts.fechaProgramada, now),
        sql`${schema.posts.fechaProgramada} < ${new Date(now.getTime() + 8 * DAY)}`,
        sql`${autopilotEstado} = 'aprobado'`,
      ),
    );

  const diagnosis = await computeServerDiagnosis(user);
  const productos = await db
    .select()
    .from(schema.productos)
    .where(eq(schema.productos.userId, user.id));
  const slots = planAutopilotSlots({
    diagnosis,
    settings: s,
    productos,
    connected,
    planSemana: await latestPlanSemana(user.id),
    yaProgramadas: aprobados?.n ?? 0,
  });

  const touchGeneration = () =>
    db
      .update(schema.autopilotSettings)
      .set({ ultimaGeneracion: new Date() })
      .where(eq(schema.autopilotSettings.userId, user.id));

  if (!slots.length) {
    await touchGeneration();
    return { ok: true, posts: await listAutopilotPosts(user.id), fuente: "reglas" };
  }

  const niche = NICHES[diagnosis.nicho];
  const profile = {
    ciudad: user.ciudad ?? undefined,
    publico_objetivo: user.publicoObjetivo ?? undefined,
    nombre_negocio: user.nombreNegocio,
  };

  let aiCopies = new Map<number, string>();
  if (isRealAIEnabled()) {
    try {
      const aprendizajes = [
        ...diagnosis.ganchos_propios
          .slice(0, 3)
          .map((h) => `Gancho propio que funcionó (${h.vistas} vistas): "${h.gancho}"`),
        ...(diagnosis.comparativo?.ganchos ?? [])
          .filter((g) => Math.abs(g.lift) >= 0.1)
          .map((g) =>
            g.lift > 0
              ? `En este nicho, "${g.label}" da +${Math.round(g.lift * 100)}% de interacción`
              : `Evitar: "${g.label}" da ${Math.round(g.lift * 100)}% de interacción en este nicho`,
          ),
      ];
      const raw = await generateAutopilotCopiesOpenAI({
        businessContext: await getBusinessContextServer(user.id),
        nicheBrief: nicheBrief(user.industria),
        tono: user.tonoMarca || "cercano y entusiasta",
        aprendizajes,
        slots: slots.map((slot, i) => slotBrief(slot, i + 1)),
      });
      aiCopies = parseAiCopies(raw);
    } catch (err) {
      console.error("[autopilot] IA", user.id, err);
    }
  }

  const automatico = s.modo === "automatico";
  const generadoAt = now.toISOString();
  const values = slots.map((slot, i) => {
    const ai = aiCopies.get(i + 1);
    const copy = ai
      ? enforceCopyQuality(ai, slot, niche, profile)
      : fallbackCopy(slot, niche, profile);
    const autoPublish = automatico && !slot.requiere_media;
    const scheduleMeta: ScheduleMeta = {
      autopilot: {
        estado: autoPublish ? "aprobado" : "pendiente",
        aprobado_por: autoPublish ? "auto" : undefined,
        fuente: ai ? "ia" : "reglas",
        formula: slot.formula,
        requiere_media: slot.requiere_media,
        generado_at: generadoAt,
      },
    };
    return {
      userId: user.id,
      tipo: slot.tipo,
      mediaUrl: slot.media_url,
      copy,
      redesDestino: slot.redes,
      estado: autoPublish ? ("programado" as const) : ("borrador" as const),
      fechaProgramada: new Date(slot.fecha),
      trackingSlug: Math.random().toString(36).slice(2, 10),
      nichoLabel: niche.label,
      scheduleMeta,
    };
  });

  await db.insert(schema.posts).values(values);
  await touchGeneration();
  return {
    ok: true,
    posts: await listAutopilotPosts(user.id),
    fuente: aiCopies.size ? "ia" : "reglas",
  };
}

function slotBrief(slot: AutopilotSlot, n: number) {
  return {
    n,
    cuando: `${slot.dia_label} ${slot.hora_label}`,
    redes: slot.redes,
    formato:
      slot.tipo === "video"
        ? "video corto (el cliente lo grabará)"
        : slot.tipo === "imagen"
          ? "foto del producto"
          : "solo texto",
    producto: slot.producto
      ? `${slot.producto.nombre}${slot.producto.precio ? ` ($${slot.producto.precio})` : ""}${slot.producto.descripcion ? ` — ${slot.producto.descripcion.slice(0, 140)}` : ""}`
      : undefined,
    idea: slot.idea,
    formula: slot.formula,
    ejemplo_gancho: slot.plantilla,
  };
}

/** Usuarios con piloto activo cuya semana necesita llenarse (para el cron). */
export async function findUsersDueForAutopilot(limit: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - CRON_REGEN_AFTER_MS);
  const rows = await getDb()
    .select({ userId: schema.autopilotSettings.userId })
    .from(schema.autopilotSettings)
    .where(
      and(
        eq(schema.autopilotSettings.activo, true),
        sql`(${schema.autopilotSettings.ultimaGeneracion} IS NULL OR ${schema.autopilotSettings.ultimaGeneracion} < ${cutoff})`,
        sql`EXISTS (SELECT 1 FROM ${schema.oauthAccounts} WHERE ${schema.oauthAccounts.userId} = ${schema.autopilotSettings.userId} AND ${schema.oauthAccounts.estadoConexion} = 'conectada' AND ${schema.oauthAccounts.red} IN (SELECT jsonb_array_elements_text(${schema.autopilotSettings.redes})))`,
      ),
    )
    .orderBy(sql`${schema.autopilotSettings.ultimaGeneracion} NULLS FIRST`)
    .limit(limit);
  return rows.map((r) => r.userId);
}
