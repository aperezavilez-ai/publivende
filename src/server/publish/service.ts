import { eq } from "drizzle-orm";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb, schema } from "@/server/db";
import { getOAuthAccount, findUserById } from "@/server/auth/users";
import { publishToNetwork } from "@/server/publish/networks";
import { broadcastWhatsAppMessages, userHasWhatsAppSending } from "@/server/whatsapp/cloud-api";
import { buildBroadcastMessage } from "@/lib/whatsapp-post";
import type { Red, Post } from "@/lib/mock/types";
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
  errors: string[];
  waSent: number;
  error?: string;
}

export async function publishForUser(input: PublishForUserInput): Promise<PublishForUserResult> {
  const db = getDb();
  const appUrl = resolveAppBaseUrl();
  const now = new Date();
  const trackingSlug = input.post.tracking_slug ?? Math.random().toString(36).slice(2, 10);
  const estado = input.post.programar ? "programado" : "publicado";

  const externalIds: Partial<Record<Red, string>> = {};
  const errors: string[] = [];

  if (!input.post.programar) {
    for (const red of input.post.redes) {
      const acc = await getOAuthAccount(input.userId, red);
      if (!acc?.accessToken) {
        errors.push(`${red}: cuenta no conectada`);
        continue;
      }
      const copy = input.post.copy_por_red?.[red] ?? input.post.copy;
      const result = await publishToNetwork({
        red,
        accessToken: acc.accessToken,
        pageId: acc.externalAccountId ?? undefined,
        copy,
        mediaUrl: input.post.media_url,
        mediaType: input.post.tipo === "video" ? "video" : "imagen",
        trackingSlug,
        appUrl,
      });
      if (result.ok && result.externalId) externalIds[red] = result.externalId;
      else if (result.error) errors.push(`${red}: ${result.error}`);
    }
  }

  const postValues = {
    userId: input.userId,
    tipo: input.post.tipo,
    mediaUrl: input.post.media_url,
    copy: input.post.copy,
    copyPorRed: input.post.copy_por_red,
    sourceUrl: input.post.source_url,
    alcance: input.post.alcance,
    redesDestino: input.post.redes,
    estado: estado as "publicado" | "programado",
    fechaProgramada: input.post.programar ? new Date(input.post.programar) : undefined,
    fechaPublicacion: input.post.programar ? undefined : now,
    trackingSlug,
    hashtagsPorRed: input.post.hashtags_por_red,
    hashtagsVirales: input.post.hashtags_virales,
    canalesDistribucion: input.post.canales_distribucion,
    nichoLabel: input.post.nicho_label,
    totalCanales: input.post.total_canales,
    externalIds,
    scheduleMeta: input.post.schedule_meta,
  };

  let saved;
  if (input.post.draft_id || input.post.id) {
    const id = input.post.draft_id ?? input.post.id!;
    const rows = await db
      .update(schema.posts)
      .set(postValues)
      .where(eq(schema.posts.id, id))
      .returning();
    saved = rows[0];
  } else {
    const rows = await db.insert(schema.posts).values(postValues).returning();
    saved = rows[0];
  }

  if (!saved) return { ok: false, error: "No se pudo guardar el post", externalIds, errors, waSent: 0 };

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

  const publishedCount = Object.keys(externalIds).length;
  const ok = input.post.programar ? true : publishedCount > 0 || input.post.redes.length === 0;

  return {
    ok,
    post: dbPostToClient(saved),
    externalIds,
    errors,
    waSent,
    error: !ok && !input.post.programar ? "No se publicó en ninguna red" : undefined,
  };
}

export function inferPostTipo(mediaUrl?: string): "imagen" | "video" | "texto" {
  if (!mediaUrl?.trim()) return "texto";
  const lower = mediaUrl.toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(lower)) return "video";
  return "imagen";
}
