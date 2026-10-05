import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import { getDb, schema } from "@/server/db";
import { computeServerDiagnosis } from "@/server/brain/server-diagnosis";
import { HOOK_FEATURE_LABELS, hookFeatures, type HookFeature } from "@/lib/brain/hooks";
import type { DiagnosisKpis } from "@/lib/brain/diagnose";
import type { BenchmarkMetric, BenchmarkStat, HookInsight, NicheBenchmark } from "@/lib/mock/types";

const DAY = 86400000;
/** Mínimo de negocios por nicho para publicar percentiles sin exponer a ninguno. */
export const MIN_BUSINESSES = 5;
const MIN_POSTS_PER_SIDE = 10;
const MIN_USERS_PER_FEATURE = 3;
const MIN_VIEWS = 50;
const KPI_STALE_MS = DAY;
const KPI_WINDOW_MS = 30 * DAY;
const POSTS_WINDOW_MS = 90 * DAY;

const KPI_METRICS: Array<Exclude<BenchmarkMetric, "score">> = [
  "posts_30d",
  "engagement_pct",
  "video_pct",
  "leads_por_mil_vistas",
  "respuesta_mediana_min",
  "tasa_cierre_pct",
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const round = (n: number) => Math.round(n * 10) / 10;

export function stats(values: number[]): BenchmarkStat | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length < MIN_BUSINESSES) return null;
  return {
    p25: round(percentile(clean, 0.25)),
    p50: round(percentile(clean, 0.5)),
    p75: round(percentile(clean, 0.75)),
    n: clean.length,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? percentile(s, 0.5) : 0;
};

/** Recalcula el diagnóstico de los negocios cuyo KPI está viejo (o no existe), dentro del tiempo dado. */
export async function refreshStaleKpis(deadline: number, maxUsers: number): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - KPI_STALE_MS);
  const due = await db
    .select({ user: schema.users })
    .from(schema.users)
    .leftJoin(schema.brainKpis, eq(schema.brainKpis.userId, schema.users.id))
    .where(
      and(
        eq(schema.users.onboardingCompletado, true),
        or(isNull(schema.brainKpis.userId), lt(schema.brainKpis.updatedAt, cutoff)),
      ),
    )
    .orderBy(sql`${schema.brainKpis.updatedAt} NULLS FIRST`)
    .limit(maxUsers);

  let done = 0;
  for (const { user } of due) {
    if (Date.now() > deadline) break;
    try {
      await computeServerDiagnosis(user);
      done++;
    } catch (err) {
      console.error("[benchmarks] diagnóstico", user.id, err);
    }
  }
  return done;
}

interface PostPerf {
  userId: string;
  copy: string;
  rate: number;
}

/** Qué rasgos del gancho suben o bajan la interacción frente al promedio de cada cuenta. */
export function hookLifts(posts: PostPerf[]): HookInsight[] {
  const byUser = new Map<string, number[]>();
  for (const p of posts) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p.rate]);
  const userMedian = new Map([...byUser].map(([u, rates]) => [u, median(rates)]));

  const normalized = posts
    .map((p) => ({
      ...p,
      norm: p.rate / (userMedian.get(p.userId) || 1),
      feats: new Set(hookFeatures(p.copy)),
    }))
    .filter((p) => (userMedian.get(p.userId) ?? 0) > 0);

  const out: HookInsight[] = [];
  for (const feature of Object.keys(HOOK_FEATURE_LABELS) as HookFeature[]) {
    const withF = normalized.filter((p) => p.feats.has(feature));
    const without = normalized.filter((p) => !p.feats.has(feature));
    const users = new Set(withF.map((p) => p.userId)).size;
    if (
      withF.length < MIN_POSTS_PER_SIDE ||
      without.length < MIN_POSTS_PER_SIDE ||
      users < MIN_USERS_PER_FEATURE
    )
      continue;
    const avg = (xs: typeof normalized) => xs.reduce((s, p) => s + p.norm, 0) / xs.length;
    const base = avg(without);
    if (base <= 0) continue;
    out.push({
      rasgo: feature,
      label: HOOK_FEATURE_LABELS[feature],
      lift: Math.round((avg(withF) / base - 1) * 100) / 100,
      posts: withF.length,
    });
  }
  return out.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift)).slice(0, 6);
}

/** Agrega KPIs y rendimiento de ganchos por nicho y guarda los percentiles anónimos. */
export async function computeNicheBenchmarks(): Promise<
  Array<{ nicho: string; negocios: number }>
> {
  const db = getDb();
  const kpiRows = await db
    .select()
    .from(schema.brainKpis)
    .where(gt(schema.brainKpis.updatedAt, new Date(Date.now() - KPI_WINDOW_MS)));

  const byNiche = new Map<string, typeof kpiRows>();
  for (const r of kpiRows) byNiche.set(r.nicho, [...(byNiche.get(r.nicho) ?? []), r]);
  const nicheOfUser = new Map(kpiRows.map((r) => [r.userId, r.nicho]));

  const perfRows = await db
    .select({
      userId: schema.posts.userId,
      copy: schema.posts.copy,
      vistas: sql<number>`sum(${schema.postMetrics.vistas})::int`,
      alcance: sql<number>`sum(coalesce(${schema.postMetrics.alcance}, 0))::int`,
      interacciones: sql<number>`sum(${schema.postMetrics.likes} + ${schema.postMetrics.comentarios} + ${schema.postMetrics.compartidos} + coalesce(${schema.postMetrics.guardados}, 0))::int`,
    })
    .from(schema.posts)
    .innerJoin(schema.postMetrics, eq(schema.postMetrics.postId, schema.posts.id))
    .where(
      and(
        eq(schema.posts.estado, "publicado"),
        gt(schema.posts.fechaPublicacion, new Date(Date.now() - POSTS_WINDOW_MS)),
      ),
    )
    .groupBy(schema.posts.id, schema.posts.userId, schema.posts.copy);

  const perfByNiche = new Map<string, PostPerf[]>();
  for (const r of perfRows) {
    const nicho = nicheOfUser.get(r.userId);
    const base = Math.max(r.alcance, r.vistas);
    if (!nicho || base < MIN_VIEWS) continue;
    perfByNiche.set(nicho, [
      ...(perfByNiche.get(nicho) ?? []),
      { userId: r.userId, copy: r.copy, rate: r.interacciones / base },
    ]);
  }

  const summary: Array<{ nicho: string; negocios: number }> = [];
  for (const [nicho, rows] of byNiche) {
    const enough = rows.length >= MIN_BUSINESSES;
    const metricas: NicheBenchmark["metricas"] = {};
    if (enough) {
      for (const m of KPI_METRICS) {
        const s = stats(
          rows
            .map((r) => (r.kpis as Partial<DiagnosisKpis>)[m])
            .filter((v): v is number => typeof v === "number"),
        );
        if (s) metricas[m] = s;
      }
      const score = stats(rows.map((r) => r.score));
      if (score) metricas.score = score;
    }
    const ganchos = enough ? hookLifts(perfByNiche.get(nicho) ?? []) : [];
    const values = { negocios: rows.length, metricas, ganchos, updatedAt: new Date() };
    await db
      .insert(schema.nicheBenchmarks)
      .values({ nicho, ...values })
      .onConflictDoUpdate({ target: schema.nicheBenchmarks.nicho, set: values });
    summary.push({ nicho, negocios: rows.length });
  }
  return summary;
}
