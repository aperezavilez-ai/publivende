import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import type { Post, Red, TipoPost, PostAlcance, CanalDistribucion } from "@/lib/mock/types";

export interface DraftPostInput {
  user_id: string;
  draft_id?: string;
  tipo: TipoPost;
  media_url: string;
  copy: string;
  copy_por_red?: Partial<Record<Red, string>>;
  source_url?: string;
  alcance?: PostAlcance;
  redes: Red[];
  hashtags_por_red?: Partial<Record<Red, string[]>>;
  hashtags_virales?: string[];
  canales_distribucion?: CanalDistribucion[];
  nicho_label?: string;
  total_canales?: number;
}

/** Guarda o actualiza un borrador en la biblioteca (colección posts). */
export function saveDraftPost(input: DraftPostInput): Post {
  const db = loadDB();
  const now = new Date().toISOString();
  const primaryCopy = input.copy_por_red
    ? (input.redes.map((r) => input.copy_por_red![r]).find(Boolean) ?? input.copy)
    : input.copy;

  const fields = {
    user_id: input.user_id,
    tipo: input.tipo,
    media_url: input.media_url,
    copy: primaryCopy,
    copy_por_red: input.copy_por_red,
    source_url: input.source_url,
    alcance: input.alcance,
    redes_destino: input.redes,
    estado: "borrador" as const,
    hashtags_por_red: input.hashtags_por_red,
    hashtags_virales: input.hashtags_virales,
    canales_distribucion: input.canales_distribucion,
    nicho_label: input.nicho_label,
    total_canales: input.total_canales,
  };

  const idx = input.draft_id
    ? db.posts.findIndex((p) => p.id === input.draft_id && p.user_id === input.user_id)
    : -1;

  if (idx >= 0) {
    db.posts[idx] = { ...db.posts[idx], ...fields };
    saveDB(db);
    return db.posts[idx];
  }

  const post: Post = {
    id: uid(),
    ...fields,
    tracking_slug: slug(),
    created_at: now,
  };
  db.posts.push(post);
  saveDB(db);
  return post;
}
