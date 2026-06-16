import { repurposeFromLink } from "@/services/import";
import { loadDB, saveDB } from "@/lib/mock/db";
import type { Post, Red, ScheduleMeta } from "@/lib/mock/types";

/** Ejecuta una publicación programada en modo demo (localStorage). */
export async function runLocalScheduledPost(post: Post, userId: string): Promise<{ ok: boolean; error?: string }> {
  const meta = post.schedule_meta;
  if (!meta?.auto_repurpose || !post.source_url) return { ok: false, error: "No es auto-repurpose" };

  const redes = post.redes_destino ?? [];
  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile) return { ok: false, error: "Usuario no encontrado" };

  try {
    const { source, copyPorRed } = await repurposeFromLink(
      post.source_url,
      redes.length ? redes : (["instagram"] as Red[]),
      profile.industria ?? "general",
      meta.tono ?? "casual",
    );

    const primaryCopy =
      Object.values(copyPorRed).find(Boolean) ??
      source.originalCaption ??
      source.ogDescription ??
      "Nueva publicación";

    const idx = db.posts.findIndex((p) => p.id === post.id);
    if (idx === -1) return { ok: false, error: "Post no encontrado" };

    db.posts[idx] = {
      ...db.posts[idx]!,
      copy: primaryCopy,
      copy_por_red: copyPorRed,
      media_url: source.mediaUrl || db.posts[idx]!.media_url,
      tipo: source.mediaType ?? "imagen",
      estado: "publicado",
      fecha_publicacion: new Date().toISOString(),
      fecha_programada: undefined,
    };
    saveDB(db);

    const updated = db.posts[idx]!;

    if (meta.notify_whatsapp) {
      await broadcastPostLink(userId, updated.id);
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const idx = db.posts.findIndex((p) => p.id === post.id);
    if (idx !== -1) {
      db.posts[idx] = {
        ...db.posts[idx]!,
        estado: "error",
        schedule_meta: { ...meta, schedule_error: msg },
      };
      saveDB(db);
    }
    return { ok: false, error: msg };
  }
}

export function getDueLocalScheduledPosts(userId: string): Post[] {
  const db = loadDB();
  const now = Date.now();
  return db.posts.filter((p) => {
    if (p.user_id !== userId || p.estado !== "programado" || !p.schedule_meta?.auto_repurpose) return false;
    if (!p.fecha_programada) return false;
    return new Date(p.fecha_programada).getTime() <= now;
  });
}
