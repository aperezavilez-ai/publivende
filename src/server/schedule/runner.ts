import { eq, and, lte } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { DbPost } from "@/server/db/schema";
import { findUserById } from "@/server/auth/users";
import { repurposeFromLink } from "@/services/import";
import { publishForUser } from "@/server/publish/service";
import type { Red, ScheduleMeta } from "@/lib/mock/types";
import { analizarAlcanceIA, totalAlcanceIA } from "@/lib/reach-ai";
import { planificarDistribucionIA, totalCanales } from "@/lib/distribution-ai";
import { hashtagsFromAlcanceIA, mergeHashtagMaps, pickViralHashtags } from "@/lib/hashtags-ai";

export interface ScheduledRunResult {
  postId: string;
  ok: boolean;
  error?: string;
}

async function markScheduleError(postId: string, message: string) {
  const db = getDb();
  const rows = await db.select().from(schema.posts).where(eq(schema.posts.id, postId)).limit(1);
  const post = rows[0];
  const meta: ScheduleMeta = { ...(post?.scheduleMeta as ScheduleMeta | null), schedule_error: message };
  await db
    .update(schema.posts)
    .set({ estado: "error", scheduleMeta: meta })
    .where(eq(schema.posts.id, postId));
}

function estimateAdsConversion(peopleMin: number, peopleMax: number) {
  const leadsMin = Math.max(1, Math.round(peopleMin * 0.004));
  const leadsMax = Math.max(leadsMin, Math.round(peopleMax * 0.009));
  const conversionPct = 2.8;
  const cplMxn = 42;
  return { cpl_mxn: cplMxn, conversion_pct: conversionPct, leads_min: leadsMin, leads_max: leadsMax };
}

export async function executeScheduledPost(post: DbPost): Promise<ScheduledRunResult> {
  const meta = (post.scheduleMeta ?? {}) as ScheduleMeta;
  const redes = (post.redesDestino ?? []) as Red[];

  const user = await findUserById(post.userId);
  if (!user) {
    await markScheduleError(post.id, "Usuario no encontrado");
    return { postId: post.id, ok: false, error: "Usuario no encontrado" };
  }

  try {
    let primaryCopy = post.copy;
    let copyPorRed = post.copyPorRed as Partial<Record<Red, string>> | undefined;
    let mediaUrl = post.mediaUrl;
    let tipo = post.tipo;

    if (meta.auto_repurpose) {
      if (!post.sourceUrl?.trim()) {
        await markScheduleError(post.id, "Falta el link de origen");
        return { postId: post.id, ok: false, error: "Falta el link de origen" };
      }

      const { source, copyPorRed: adapted } = await repurposeFromLink(
        post.sourceUrl,
        redes.length ? redes : ["instagram"],
        user.industria ?? "general",
        meta.tono ?? "casual",
      );

      primaryCopy =
        Object.values(adapted).find(Boolean) ??
        source.originalCaption ??
        source.ogDescription ??
        "Nueva publicación";
      copyPorRed = adapted;
      mediaUrl = source.mediaUrl || post.mediaUrl || "";
      tipo = source.mediaType ?? "imagen";

      const alcance = (post.alcance as {
        tipo: "global" | "local";
        pais?: string;
        pais_codigo?: string;
        estado?: string;
        ciudad?: string;
        radio_km?: number;
      } | null) ?? { tipo: "global", pais: "México", pais_codigo: "MX" };

      const alcanceIA = analizarAlcanceIA({
        alcance,
        redes,
        industria: user.industria ?? "general",
        source,
        copyPorRed: adapted,
        copyManual: primaryCopy,
        fuente: "link_ia",
      });

      const hashtagsNicho = alcanceIA
        ? hashtagsFromAlcanceIA(alcanceIA.por_red, redes, user.industria ?? "general", primaryCopy)
        : {};
      const hashtagsPorRed = mergeHashtagMaps(hashtagsNicho);
      const hashtagsVirales = pickViralHashtags(hashtagsPorRed);
      const distribucion = alcanceIA
        ? planificarDistribucionIA(redes, alcanceIA.analysis.nicho, alcance)
        : [];
      const totalCanalesValue = totalCanales(distribucion);
      const alcanceTotal = alcanceIA ? totalAlcanceIA(alcanceIA.por_red) : { personas_min: 0, personas_max: 0 };
      const ads = estimateAdsConversion(alcanceTotal.personas_min, alcanceTotal.personas_max);

      meta.ia_snapshot = {
        nicho_label: alcanceIA?.analysis.nicho_label,
        alcance_personas_min: alcanceTotal.personas_min,
        alcance_personas_max: alcanceTotal.personas_max,
        total_canales: totalCanalesValue,
        hashtags_virales: hashtagsVirales,
      };
      meta.ads_estimate = ads;
      delete meta.schedule_error;

      await getDb()
        .update(schema.posts)
        .set({
          alcance,
          hashtagsPorRed: hashtagsPorRed,
          hashtagsVirales: hashtagsVirales,
          canalesDistribucion: distribucion,
          nichoLabel: alcanceIA?.analysis.nicho_label,
          totalCanales: totalCanalesValue,
          scheduleMeta: meta,
        })
        .where(eq(schema.posts.id, post.id));

      post.scheduleMeta = meta;
      post.alcance = alcance as DbPost["alcance"];
    }

    const result = await publishForUser({
      userId: post.userId,
      post: {
        id: post.id,
        tipo,
        media_url: mediaUrl,
        copy: primaryCopy,
        copy_por_red: copyPorRed,
        source_url: post.sourceUrl ?? undefined,
        redes: redes.length ? redes : [],
        tracking_slug: post.trackingSlug,
        alcance: post.alcance,
        hashtags_por_red: post.hashtagsPorRed as Record<string, string[]> | undefined,
        hashtags_virales: post.hashtagsVirales as string[] | undefined,
        canales_distribucion: post.canalesDistribucion as unknown[] | undefined,
        nicho_label: post.nichoLabel ?? undefined,
        total_canales: post.totalCanales ?? undefined,
      },
      notifyWhatsApp: meta.notify_whatsapp ?? false,
    });

    const published = Object.keys(result.externalIds).length > 0 || result.waSent > 0;

    if (!result.ok && !published) {
      const err = result.error ?? result.errors.join("; ") ?? "Error al publicar";
      await markScheduleError(post.id, err);
      return { postId: post.id, ok: false, error: err };
    }

    return { postId: post.id, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error en programación automática";
    await markScheduleError(post.id, msg);
    return { postId: post.id, ok: false, error: msg };
  }
}

export async function runDueScheduledPosts(): Promise<{
  processed: number;
  results: ScheduledRunResult[];
}> {
  const db = getDb();
  const now = new Date();

  const due = await db
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.estado, "programado"), lte(schema.posts.fechaProgramada, now)));

  const results: ScheduledRunResult[] = [];

  for (const post of due) {
    results.push(await executeScheduledPost(post));
  }

  return { processed: due.length, results };
}
