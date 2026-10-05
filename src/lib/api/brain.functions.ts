import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { isProductionMode, isRealAIEnabled } from "@/server/config";
import { getDb, schema } from "@/server/db";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { getBusinessContextServer } from "@/server/context";
import { generateBrainPlanOpenAI } from "@/server/ai/openai";
import { nicheBrief } from "@/lib/brain/niches";
import {
  buildFallbackPlan,
  compactDiagnosis,
  type BrainPlan,
  type BrainReport,
} from "@/lib/brain/plan";
import type { Diagnosis } from "@/lib/brain/diagnose";
import type { Plan } from "@/lib/mock/types";

const HOUR = 3600000;
/** Cada plan con IA cuesta tokens; el plan de suscripción define cada cuánto se puede regenerar. */
const COOLDOWN_MS: Record<Plan, number> = {
  free: 7 * 24 * HOUR,
  pro: 12 * HOUR,
  business: 1 * HOUR,
};
const MAX_DIAGNOSIS_BYTES = 60_000;

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const diagnosisSchema = z.custom<Diagnosis>((v) => {
  if (!isObj(v)) return false;
  return (
    typeof v.score === "number" &&
    typeof v.nicho === "string" &&
    isObj(v.areas) &&
    isObj(v.kpis) &&
    ["deficits", "fortalezas", "mejores_horarios", "ganchos_propios", "ganchos_a_mejorar"].every(
      (k) => Array.isArray(v[k]),
    )
  );
}, "Diagnóstico inválido");

const str = z.string().trim().min(1);
const prioridadesSchema = z
  .array(z.object({ titulo: str, por_que: str, pasos: z.array(str).default([]) }))
  .min(1)
  .max(5);
const semanaSchema = z
  .array(
    z.object({ dia: str, hora: str, red: str, formato: str, gancho: str, idea: str, cta: str }),
  )
  .min(3)
  .max(7);
const ganchosSchema = z
  .array(z.object({ texto: str, formula: str, por_que: str }))
  .min(3)
  .max(12);

/** Toma de la respuesta de la IA cada sección válida y completa el resto con el plan por reglas. */
function mergeAiPlan(raw: unknown, fallback: BrainPlan): BrainPlan {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resumen =
    typeof obj.resumen === "string" && obj.resumen.trim().length > 20 ? obj.resumen.trim() : null;
  const prioridades = prioridadesSchema.safeParse(obj.prioridades);
  const semana = semanaSchema.safeParse(obj.semana);
  const ganchos = ganchosSchema.safeParse(obj.ganchos);
  const anyAi = !!resumen || prioridades.success || semana.success || ganchos.success;
  return {
    resumen: resumen ?? fallback.resumen,
    prioridades: prioridades.success ? prioridades.data : fallback.prioridades,
    semana: semana.success ? semana.data : fallback.semana,
    ganchos: ganchos.success
      ? ganchos.data.map((g) => ({ ...g, texto: g.texto.slice(0, 160) }))
      : fallback.ganchos,
    fuente: anyAi ? "ia" : "reglas",
    generado_at: new Date().toISOString(),
  };
}

function rowToReport(row: typeof schema.brainReports.$inferSelect): BrainReport {
  return {
    id: row.id,
    user_id: row.userId,
    created_at: row.createdAt.toISOString(),
    score: row.score,
    diagnosis: row.diagnosis as Diagnosis,
    plan: row.plan as BrainPlan,
  };
}

export const generateBrainPlanServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), diagnosis: diagnosisSchema }))
  .handler(async ({ data }) => {
    if (!isProductionMode())
      return { ok: false as const, error: "Modo demo", useLocal: true as const };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    if (JSON.stringify(data.diagnosis).length > MAX_DIAGNOSIS_BYTES) {
      return { ok: false as const, error: "Diagnóstico demasiado grande" };
    }

    const user = await findUserById(session.userId);
    if (!user) return { ok: false as const, error: "Usuario no encontrado" };

    const db = getDb();
    const [latest] = await db
      .select()
      .from(schema.brainReports)
      .where(eq(schema.brainReports.userId, user.id))
      .orderBy(desc(schema.brainReports.createdAt))
      .limit(1);
    const cooldown = COOLDOWN_MS[user.plan] ?? COOLDOWN_MS.free;
    if (latest && Date.now() - latest.createdAt.getTime() < cooldown) {
      const nextAt = new Date(latest.createdAt.getTime() + cooldown);
      return {
        ok: false as const,
        error:
          user.plan === "free"
            ? "El plan Free incluye un plan con IA por semana. Sube a Pro para regenerarlo cada 12 horas."
            : `Tu siguiente plan con IA estará disponible a las ${nextAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}.`,
        nextAt: nextAt.toISOString(),
        report: rowToReport(latest),
      };
    }

    const diagnosis = data.diagnosis;
    const productos = await db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.userId, user.id));
    const fallback = buildFallbackPlan(
      diagnosis,
      {
        ciudad: user.ciudad ?? undefined,
        publico_objetivo: user.publicoObjetivo ?? undefined,
        nombre_negocio: user.nombreNegocio,
      },
      productos,
    );

    let plan = fallback;
    if (isRealAIEnabled()) {
      try {
        const raw = await generateBrainPlanOpenAI({
          businessContext: await getBusinessContextServer(user.id),
          nicheBrief: nicheBrief(user.industria),
          diagnosis: compactDiagnosis(diagnosis),
        });
        plan = mergeAiPlan(raw, fallback);
      } catch (err) {
        console.error("[generateBrainPlanServer] IA", err);
      }
    }

    const [row] = await db
      .insert(schema.brainReports)
      .values({
        userId: user.id,
        score: Math.round(diagnosis.score),
        fuente: plan.fuente,
        diagnosis,
        plan,
      })
      .returning();
    return { ok: true as const, report: rowToReport(row) };
  });
