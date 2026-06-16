// Adaptador mock — listo para reemplazar por Meta Graph / TikTok / YouTube APIs reales
import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import type { Red, Post, TipoPost, PostAlcance, CanalDistribucion, ScheduleMeta } from "@/lib/mock/types";

export interface PublishInput {
  user_id: string;
  tipo: TipoPost;
  media_url: string;
  copy: string;
  copy_por_red?: Partial<Record<Red, string>>;
  source_url?: string;
  alcance?: PostAlcance;
  redes: Red[];
  programar?: string;
  draft_id?: string;
  hashtags_por_red?: Partial<Record<Red, string[]>>;
  hashtags_virales?: string[];
  canales_distribucion?: CanalDistribucion[];
  nicho_label?: string;
  total_canales?: number;
  schedule_meta?: ScheduleMeta;
}

export async function publishPost(input: PublishInput): Promise<Post> {
  const db = loadDB();
  const now = new Date().toISOString();
  const primaryCopy = input.copy_por_red
    ? (input.redes.map((r) => input.copy_por_red![r]).find(Boolean) ?? input.copy)
    : input.copy;
  const estado = input.programar ? "programado" : "publicado";
  const postFields: Omit<Post, "id" | "created_at" | "tracking_slug"> = {
    user_id: input.user_id,
    tipo: input.tipo,
    media_url: input.media_url,
    copy: primaryCopy,
    copy_por_red: input.copy_por_red,
    source_url: input.source_url,
    alcance: input.alcance,
    redes_destino: input.redes,
    estado,
    fecha_programada: input.programar,
    fecha_publicacion: input.programar ? undefined : now,
    hashtags_por_red: input.hashtags_por_red,
    hashtags_virales: input.hashtags_virales,
    canales_distribucion: input.canales_distribucion,
    nicho_label: input.nicho_label,
    total_canales: input.total_canales,
    schedule_meta: input.schedule_meta,
  };

  let post: Post;
  const draftIdx = input.draft_id
    ? db.posts.findIndex((p) => p.id === input.draft_id && p.user_id === input.user_id)
    : -1;

  if (draftIdx >= 0) {
    post = {
      ...db.posts[draftIdx],
      ...postFields,
      tracking_slug: db.posts[draftIdx].tracking_slug,
      created_at: db.posts[draftIdx].created_at,
    };
    db.posts[draftIdx] = post;
  } else {
    post = {
      id: uid(),
      ...postFields,
      tracking_slug: slug(),
      created_at: now,
    };
    db.posts.push(post);
  }

  if (!input.programar) {
    input.redes.forEach((red) => {
      const vistas = 100 + Math.floor(Math.random() * 1500);
      db.post_metrics.push({
        id: uid(), post_id: post.id, red,
        vistas,
        likes: Math.floor(vistas * 0.06),
        comentarios: Math.floor(vistas * 0.012),
        compartidos: Math.floor(vistas * 0.005),
        seguidores_ganados: Math.floor(vistas * 0.002),
        mensajes_generados: Math.floor(vistas * 0.003),
      });
    });
  }

  saveDB(db);
  return post;
}

export interface ConnectOAuthInput {
  nombre_cuenta: string;
  access_token: string;
  external_account_id?: string;
  token_expires_at?: string;
  avatar?: string;
  oauth_provider?: "meta" | "google" | "tiktok";
}

export async function connectAccountOAuth(user_id: string, red: Red, data: ConnectOAuthInput) {
  const db = loadDB();
  const acc = db.social_accounts.find((a) => a.user_id === user_id && a.red === red);
  if (acc) {
    acc.estado_conexion = "conectada";
    acc.token_placeholder = data.access_token;
    acc.nombre_cuenta = data.nombre_cuenta;
    acc.external_account_id = data.external_account_id;
    acc.token_expires_at = data.token_expires_at;
    acc.oauth_provider = data.oauth_provider;
    if (data.avatar) acc.avatar = data.avatar;
  }
  saveDB(db);
}

/** @deprecated Solo desarrollo sin .env — usa startSocialOAuthConnect */
export async function connectAccount(user_id: string, red: Red, nombre_cuenta?: string) {
  const db = loadDB();
  const acc = db.social_accounts.find((a) => a.user_id === user_id && a.red === red);
  if (acc) {
    acc.estado_conexion = "conectada";
    acc.token_placeholder = "mock_token_" + slug();
    if (nombre_cuenta) acc.nombre_cuenta = nombre_cuenta;
    acc.oauth_provider = undefined;
  }
  saveDB(db);
}

export async function disconnectAccount(user_id: string, red: Red) {
  const db = loadDB();
  const acc = db.social_accounts.find((a) => a.user_id === user_id && a.red === red);
  if (acc) {
    acc.estado_conexion = "desconectada";
    acc.token_placeholder = "";
    acc.external_account_id = undefined;
    acc.token_expires_at = undefined;
    acc.oauth_provider = undefined;
  }
  saveDB(db);
}

export const RED_LABELS: Record<Red, string> = {
  facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
};
export const RED_LIMITS: Record<Red, number> = {
  facebook: 5000, instagram: 2200, tiktok: 2200, youtube: 5000,
};
export const RED_COLORS: Record<Red, string> = {
  facebook: "#1877F2", instagram: "#E4405F", tiktok: "#000000", youtube: "#FF0000",
};
