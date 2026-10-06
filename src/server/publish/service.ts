import { eq, and } from "drizzle-orm";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb, schema } from "@/server/db";
import { findUserById } from "@/server/auth/users";
import { ensurePublicMediaUrl } from "@/server/publish/host-media";
import { expandDistribution } from "@/server/distribution/expand";
import { broadcastWhatsAppMessages, userHasWhatsAppSending } from "@/server/whatsapp/cloud-api";
import { buildBroadcastMessage } from "@/lib/whatsapp-post";
import type { Red, Post, PublishSurfaceResult } from "@/lib/mock/types";
import type { ScheduleMeta } from "@/lib/mock/types";

export function dbPostToClient(row: typeof schema.posts.$inferSelect): Post {
  return {
    id: row.id,
    user_id: row.userId,
    tipo: row.tipo as Post["tipo"],
    media_url: row.mediaUrl,
    copy: row.copy,
    copy_por_red: row.copyPorRed ?? undefined,
    source_url: row.sourceUrl ?? undefined,
    alcance: row.alcance as Post["alcance"],
    redes_destino: (row.redesDestino ?? []) as Red[],
    estado: row.estado as Post["estado"],
    fecha_programada: row.fechaProgramada?.toISOString(),
    fecha_publicacion: row.fechaPublicacion?.toISOString(),
    tracking_slug: row.trackingSlug,
    hashtags_por_red: row.hashtagsPorRed as Post["hashtags_por_red"],
    hashtags_virales: row.hashtagsVirales ?? undefined,
    canales_distribucion: row.canalesDistribucion as Post["canales_distribucion"],
    nicho_label: row.nichoLabel ?? undefined,
    total_canales: row.totalCanales ?? undefined,
    whatsapp_enviado_at: row.whatsappEnviadoAt?.toISOString(),
    whatsapp_broadcast_count: row.whatsappBroadcastCount ?? undefined,
    external_ids: row.externalIds ?? undefined,
    publish_surfaces: (row.publishSurfaces as PublishSurfaceResult[] | null) ?? undefined,
    schedule_meta: row.scheduleMeta as Post["schedule_meta"],
    created_at: row.createdAt.toISOString(),
  };
}

export interface PublishForUserInput {
  userId: string;
  post: {
    id?: string;
    draft_id?: string;
    tipo: "imagen" | "video" | "texto";
    media_url: string;
    copy: string;
    copy_por_red?: Record<string, string>;
    source_url?: string;
    alcance?: unknown;
    redes: Red[];
    programar?: string;
    hashtags_por_red?: Record<string, string[]>;
    hashtags_virales?: string[];
    canales_distribucion?: unknown[];
    nicho_label?: string;
    total_canales?: number;
    tracking_slug?: string;
    schedule_meta?: ScheduleMeta;
  };
  notifyWhatsApp?: boolean;
}

export interface PublishForUserResult {
  ok: boolean;
  post?: Post;
  externalIds: Partial<Record<Red, string>>;
  surfaces: PublishSurfaceResult[];
  errors: string[];
  waSent: number;
  error?: string;
}

export async function publishForUser(input: PublishForUserInput): Promise<PublishForUserResult> {
  const db = getDb();
  const now = new Date();
  const trackingSlug = input.post.tracking_slug ?? Math.random().toString(36).slice(2, 10);

  const publicMediaUrl = input.post.media_url
    ? await ensurePublicMediaUrl(input.userId, input.post.media_url)
    : "";

  const postValues = {
    userId: input.userId,
    tipo: input.post.tipo,
    mediaUrl: publicMediaUrl || input.post.media_url,
    copy: input.post.copy,
    copyPorRed: input.post.copy_por_red,
    sourceUrl: input.post.source_url,
    alcance: input.post.alcance,
    redesDestino: input.post.redes,
    estado: (input.post.programar ? "programado" : "publicado") as "publicado" | "programado" | "error",
    fechaProgramada: input.post.programar ? new Date(input.post.programar) : undefined,
    fechaPublicacion: input.post.programar ? undefined : now,
    trackingSlug,
    hashtagsPorRed: input.post.hashtags_por_red,
    hashtagsVirales: input.post.hashtags_virales,
    canalesDistribucion: input.post.canales_distribucion,
    nichoLabel: input.post.nicho_label,
    totalCanales: input.post.total_canales,
    scheduleMeta: input.post.schedule_meta,
  };

  let saved;
  const targetId = input.post.draft_id || input.post.id;
  if (targetId) {
    const rows = await db
      .update(schema.posts)
      .set(postValues)
      .where(and(eq(schema.posts.id, targetId), eq(schema.posts.userId, input.userId)))
      .returning();
    saved = rows[0];

    if (!saved) {
      try {
        const inserted = await db
          .insert(schema.posts)
          .values({ id: targetId, ...postValues })
          .returning();
        saved = inserted[0];
      } catch (insertErr) {
        console.warn("[publishForUser] Insert with targetId failed, trying fallback:", insertErr);
        const fallback = await db.insert(schema.posts).values(postValues).returning();
        saved = fallback[0];
      }
    }
  } else {
    const rows = await db.insert(schema.posts).values(postValues).returning();
    saved = rows[0];
  }

  if (!saved) {
    return { ok: false, error: "No se pudo guardar el post", externalIds: {}, surfaces: [], errors: [], waSent: 0 };
  }

  const externalIds: Partial<Record<Red, string>> = {};
  const errors: string[] = [];
  let surfaces: PublishSurfaceResult[] = [];

  if (!input.post.programar && input.post.redes.length > 0) {
    const expanded = await expandDistribution({
      userId: input.userId,
      postId: saved.id,
      redes: input.post.redes,
      copy: input.post.copy,
      copyPorRed: input.post.copy_por_red,
      mediaUrl: publicMediaUrl || input.post.media_url,
      mediaType: input.post.tipo,
      trackingSlug,
      nichoLabel: input.post.nicho_label,
    });
    surfaces = expanded.surfaces;

    for (const s of surfaces) {
      if (!s.ok && s.error) errors.push(`${s.red}/${s.surface}: ${s.error}`);
      if (s.ok && s.external_id && !externalIds[s.red]) externalIds[s.red] = s.external_id;
    }

    const anyOk = surfaces.some((s) => s.ok);
    await db
      .update(schema.posts)
      .set({
        estado: anyOk ? "publicado" : "error",
        externalIds,
        publishSurfaces: surfaces,
      })
      .where(eq(schema.posts.id, saved.id));
    saved = {
      ...saved,
      estado: anyOk ? ("publicado" as const) : ("error" as const),
      externalIds,
      publishSurfaces: surfaces,
    };
  }

  const publishedCount = Object.keys(externalIds).length;

  let waSent = 0;
  if (input.notifyWhatsApp && !input.post.programar && (await userHasWhatsAppSending(input.userId))) {
    const profile = await findUserById(input.userId);
    const contacts = await db
      .select()
      .from(schema.whatsappContacts)
      .where(eq(schema.whatsappContacts.userId, input.userId));
    if (profile && contacts.length) {
      const msg = buildBroadcastMessage(
        {
          id: profile.id,
          nombre: profile.nombre,
          email: profile.email,
          password: "",
          celular: profile.celular,
          codigo_pais: profile.codigoPais,
          nombre_negocio: profile.nombreNegocio,
          plan: profile.plan,
          whatsapp_configurado: profile.whatsappConfigurado,
          onboarding_completado: profile.onboardingCompletado,
          fecha_registro: profile.fechaRegistro.toISOString(),
        },
        dbPostToClient(saved),
      );
      const result = await broadcastWhatsAppMessages(input.userId, contacts, msg);
      waSent = result.sent;
      await db
        .update(schema.posts)
        .set({ whatsappEnviadoAt: new Date(), whatsappBroadcastCount: result.sent })
        .where(eq(schema.posts.id, saved.id));
    }
  }

  const refreshed = await db.select().from(schema.posts).where(eq(schema.posts.id, saved.id)).limit(1);

  return {
    ok: input.post.programar ? true : input.post.redes.length === 0 ? true : publishedCount > 0 || surfaces.some((s) => s.ok),
    post: dbPostToClient(refreshed[0] ?? saved),
    externalIds,
    surfaces,
    errors,
    waSent,
    error:
      !input.post.programar && input.post.redes.length > 0 && publishedCount === 0 && !surfaces.some((s) => s.ok)
        ? errors.join(" · ") || "No se publicó en ninguna red"
        : undefined,
  };
}

export function inferPostTipo(mediaUrl?: string): "imagen" | "video" | "texto" {
  if (!mediaUrl?.trim()) return "texto";
  const lower = mediaUrl.toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(lower)) return "video";
  return "imagen";
}
