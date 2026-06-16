import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { publishForUser } from "@/server/publish/service";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);

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
        errors: result.errors,
        useLocal: false,
      };
    }

    return {
      ok: true as const,
      post: result.post!,
      externalIds: result.externalIds,
      errors: result.errors,
      waSent: result.waSent,
      useLocal: false,
    };
  });
