import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { getDb, schema } from "@/server/db";
import type { Red, Post, ScheduleMeta } from "@/lib/mock/types";
import { userHasWhatsAppSending } from "@/server/whatsapp/cloud-api";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);

function dbPostToClient(row: typeof schema.posts.$inferSelect): Post {
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
    schedule_meta: row.scheduleMeta as ScheduleMeta | undefined,
    created_at: row.createdAt.toISOString(),
  };
}

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const listCalendarPosts = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo", useLocal: true };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.userId, session.userId))
      .orderBy(desc(schema.posts.fechaProgramada), desc(schema.posts.createdAt));

    return { ok: true as const, posts: rows.map(dbPostToClient), useLocal: false };
  });

export const scheduleLinkPost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      source_url: z.string().min(8),
      fecha_programada: z.string(),
      redes: z.array(redSchema).default([]),
      notify_whatsapp: z.boolean().default(false),
      tono: z.enum(["casual", "profesional", "formal"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo", useLocal: true };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const when = new Date(data.fecha_programada);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      return { ok: false as const, error: "La fecha debe ser futura" };
    }

    if (!data.redes.length && !data.notify_whatsapp) {
      return { ok: false as const, error: "Selecciona al menos una red o WhatsApp" };
    }

    const db = getDb();
    if (data.redes.length) {
      const connected = await db
        .select({ red: schema.oauthAccounts.red })
        .from(schema.oauthAccounts)
        .where(and(eq(schema.oauthAccounts.userId, session.userId), eq(schema.oauthAccounts.estadoConexion, "conectada")));
      const connectedSet = new Set(connected.map((x) => x.red));
      const missing = data.redes.filter((r) => !connectedSet.has(r));
      if (missing.length) {
        return {
          ok: false as const,
          error: `Conecta estas redes antes de programar: ${missing.join(", ")}`,
        };
      }
    }

    if (data.notify_whatsapp) {
      const hasWa = await userHasWhatsAppSending(session.userId);
      if (!hasWa) {
        return { ok: false as const, error: "Conecta tu WhatsApp en Configuración antes de programar envíos" };
      }
      const contacts = await db
        .select({ id: schema.whatsappContacts.id })
        .from(schema.whatsappContacts)
        .where(eq(schema.whatsappContacts.userId, session.userId));
      if (!contacts.length) {
        return { ok: false as const, error: "No tienes contactos en WhatsApp CRM para enviar esta campaña" };
      }
    }

    const scheduleMeta: ScheduleMeta = {
      auto_repurpose: true,
      notify_whatsapp: data.notify_whatsapp,
      tono: data.tono ?? "casual",
    };

    const rows = await db
      .insert(schema.posts)
      .values({
        userId: session.userId,
        tipo: "imagen",
        mediaUrl: "",
        copy: "⏰ Compartida programada — se adaptará automáticamente",
        sourceUrl: data.source_url.trim(),
        redesDestino: data.redes,
        estado: "programado",
        fechaProgramada: when,
        trackingSlug: randomSlug(),
        scheduleMeta,
      })
      .returning();

    return { ok: true as const, post: dbPostToClient(rows[0]!) };
  });

export const cancelScheduledPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), post_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo", useLocal: true };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const deleted = await db
      .delete(schema.posts)
      .where(
        and(
          eq(schema.posts.id, data.post_id),
          eq(schema.posts.userId, session.userId),
          eq(schema.posts.estado, "programado"),
        ),
      )
      .returning();

    if (!deleted.length) return { ok: false as const, error: "No encontrado o ya publicado" };
    return { ok: true as const };
  });
