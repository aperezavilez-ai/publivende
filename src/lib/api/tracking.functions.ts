import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { getDb, schema } from "@/server/db";

/**
 * Real v2 — Tracking público real.
 * Antes /p/<slug> buscaba el post en el localStorage DEL VISITANTE (nunca lo
 * encontraba) y no registraba ningún clic. Ahora la resolución ocurre en el
 * servidor contra la BD y cada visita queda registrada en post_clicks: sin
 * esto no existe el «medible y justificable» del reporte por post.
 */
export const resolveTrackingPost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().min(1).max(64),
      referer: z.string().max(512).optional(),
      userAgent: z.string().max(512).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "El seguimiento público requiere modo producción" };
    }
    const db = getDb();
    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.trackingSlug, data.slug))
      .limit(1);
    if (!post) return { ok: false as const, error: "Publicación no encontrada" };

    // Registro del clic (la visita a la página pública ES el clic medible).
    try {
      await db.insert(schema.postClicks).values({
        postId: post.id,
        userId: post.userId,
        referer: data.referer ?? null,
        userAgent: data.userAgent ?? null,
      });
    } catch (err) {
      // El clic no debe tumbar la página pública; queda el error en el log.
      console.error("[tracking] no se pudo registrar el clic", err);
    }

    const [owner] = await db
      .select({
        nombre: schema.users.nombre,
        nombreNegocio: schema.users.nombreNegocio,
        celular: schema.users.celular,
        codigoPais: schema.users.codigoPais,
      })
      .from(schema.users)
      .where(eq(schema.users.id, post.userId))
      .limit(1);

    return {
      ok: true as const,
      post: {
        id: post.id,
        tipo: post.tipo,
        media_url: post.mediaUrl,
        copy: post.copy,
        source_url: post.sourceUrl ?? undefined,
        redes_destino: post.redesDestino ?? [],
        hashtags_virales: (post.hashtagsVirales as string[] | null) ?? undefined,
        tracking_slug: post.trackingSlug,
        nicho_label: post.nichoLabel ?? undefined,
      },
      owner: owner
        ? {
            nombre_negocio: owner.nombreNegocio || owner.nombre,
            celular: owner.celular,
            codigo_pais: owner.codigoPais,
          }
        : null,
    };
  });
