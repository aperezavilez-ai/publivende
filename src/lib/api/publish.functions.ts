import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { publishForUser } from "@/server/publish/service";
import { stageDataUrlMedia } from "@/server/publish/host-media";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);

export const stagePublishMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      dataUrl: z.string().min(32),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Requiere modo producción" };
    }
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const publicUrl = await stageDataUrlMedia(session.userId, data.dataUrl);
    if (!publicUrl) return { ok: false as const, error: "No se pudo procesar la imagen" };
    return { ok: true as const, publicUrl };
  });

export const publishPostReal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      post: z.object({
        id: z.string().optional(),
        tipo: z.enum(["imagen", "video", "texto"]),
        media_url: z.string(),
        copy: z.string(),
        copy_por_red: z.record(z.string()).optional(),
        source_url: z.string().optional(),
        alcance: z.unknown().optional(),
        redes: z.array(redSchema).min(1),
        programar: z.string().optional(),
        draft_id: z.string().optional(),
        hashtags_por_red: z.record(z.array(z.string())).optional(),
        hashtags_virales: z.array(z.string()).optional(),
        canales_distribucion: z.array(z.unknown()).optional(),
        nicho_label: z.string().optional(),
        total_canales: z.number().optional(),
        tracking_slug: z.string().optional(),
        schedule_meta: z
          .object({
            auto_repurpose: z.boolean().optional(),
            notify_whatsapp: z.boolean().optional(),
            tono: z.enum(["casual", "profesional", "formal"]).optional(),
          })
          .optional(),
      }),
      notifyWhatsApp: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Modo demo — publicación local", useLocal: true };
    }

    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const result = await publishForUser({
      userId: session.userId,
      post: data.post,
      notifyWhatsApp: data.notifyWhatsApp,
    });

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error ?? "Error al publicar",
        externalIds: result.externalIds,
        surfaces: result.surfaces,
        errors: result.errors,
        useLocal: false,
      };
    }

    return {
      ok: true as const,
      post: result.post!,
      externalIds: result.externalIds,
      surfaces: result.surfaces,
      errors: result.errors,
      waSent: result.waSent,
      useLocal: false,
    };
  });

export const publishExistingPost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      post: z.object({
        id: z.string().optional(),
        tipo: z.enum(["imagen", "video", "texto"]),
        media_url: z.string().optional().default(""),
        copy: z.string(),
        copy_por_red: z.record(z.string()).optional(),
        source_url: z.string().optional(),
        redes: z.array(redSchema),
        tracking_slug: z.string().optional(),
        nicho_label: z.string().optional(),
      }),
      red: redSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Requiere modo producción" };
    }

    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const targetRed = data.red ?? (data.post.redes[0] || "facebook");
    const result = await publishForUser({
      userId: session.userId,
      post: {
        id: data.post.id,
        tipo: data.post.tipo,
        media_url: data.post.media_url,
        copy: data.post.copy,
        copy_por_red: data.post.copy_por_red,
        source_url: data.post.source_url,
        redes: [targetRed],
        tracking_slug: data.post.tracking_slug,
        nicho_label: data.post.nicho_label,
      },
      notifyWhatsApp: false,
    });

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error ?? `Error al publicar en ${targetRed}`,
        externalIds: result.externalIds,
        errors: result.errors,
      };
    }

    return {
      ok: true as const,
      post: result.post!,
      externalId: result.externalIds?.[targetRed],
      externalIds: result.externalIds,
    };
  });
