const GRAPH = "https://graph.facebook.com/v21.0";

export interface MetricValues {
  vistas: number;
  alcance: number | null;
  likes: number;
  comentarios: number;
  compartidos: number;
  guardados: number | null;
  clics: number | null;
}

export type CollectError = {
  ok: false;
  error: string;
  /** Token inválido o permiso faltante: hay que reconectar la cuenta. */
  reconnect?: boolean;
  /** La publicación todavía no está disponible (TikTok procesando o privado). */
  pending?: boolean;
};

export type CollectResult =
  | { ok: true; values: MetricValues; resolvedId?: string; notes?: string[] }
  | CollectError;

export interface AccountStats {
  seguidores: number;
  publicaciones: number | null;
  vistasTotales: number | null;
  raw: unknown;
}

export type AccountResult = { ok: true; stats: AccountStats } | CollectError;

const emptyValues = (): MetricValues => ({
  vistas: 0,
  alcance: null,
  likes: 0,
  comentarios: 0,
  compartidos: 0,
  guardados: null,
  clics: null,
});

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

type GraphError = { message?: string; code?: number; error_subcode?: number };

/** Códigos de Meta que significan token caducado/revocado o permiso no concedido. */
function isMetaReconnectError(err: GraphError | undefined): boolean {
  const code = err?.code ?? 0;
  return code === 190 || code === 10 || (code >= 200 && code < 300);
}

async function graphGet<T>(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<{ data?: T; error?: GraphError }> {
  try {
    const res = await fetch(
      `${GRAPH}/${path}?${new URLSearchParams({ ...params, access_token: token })}`,
    );
    const json = (await res.json()) as T & { error?: GraphError };
    if (!res.ok || json.error) return { error: json.error ?? { message: `HTTP ${res.status}` } };
    return { data: json };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : "Error de red" } };
  }
}

function metaError(err: GraphError | undefined, fallback: string): CollectError {
  return {
    ok: false,
    error: err?.message ?? fallback,
    reconnect: isMetaReconnectError(err),
  };
}

type InsightsRow = {
  name: string;
  values?: Array<{ value?: unknown }>;
  total_value?: { value?: unknown };
};

/**
 * Meta renombra/retira métricas de insights con frecuencia y un solo nombre inválido
 * hace fallar toda la petición, así que se prueban varios juegos en orden.
 */
async function firstWorkingInsights(
  path: string,
  metricSets: string[],
  token: string,
  extra: Record<string, string> = {},
): Promise<{ values: Record<string, number> } | { error: GraphError }> {
  let lastError: GraphError | undefined;
  for (const metric of metricSets) {
    const { data, error } = await graphGet<{ data?: InsightsRow[] }>(
      path,
      { metric, ...extra },
      token,
    );
    if (data?.data) {
      const values: Record<string, number> = {};
      for (const row of data.data) {
        values[row.name] = num(row.total_value?.value ?? row.values?.[0]?.value);
      }
      return { values };
    }
    lastError = error;
    if (error?.code === 190) break;
  }
  return { error: lastError ?? { message: "Insights no disponibles" } };
}

type CountEdge = { summary?: { total_count?: number } };

export async function collectFacebookPost(
  id: string,
  surface: string,
  token: string,
): Promise<CollectResult> {
  const values = emptyValues();
  const notes: string[] = [];
  const isVideo = surface === "feed_video";
  const isPost = id.includes("_");

  const fields = isPost
    ? "shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)"
    : "comments.limit(0).summary(true),reactions.limit(0).summary(true)";
  const base = await graphGet<{
    shares?: { count?: number };
    comments?: CountEdge;
    reactions?: CountEdge;
  }>(id, { fields }, token);
  if (!base.data) return metaError(base.error, "No se pudo leer la publicación de Facebook");
  values.likes = num(base.data.reactions?.summary?.total_count);
  values.comentarios = num(base.data.comments?.summary?.total_count);
  values.compartidos = num(base.data.shares?.count);

  if (isVideo) {
    const ins = await firstWorkingInsights(
      `${id}/video_insights`,
      ["total_video_views,total_video_impressions_unique", "total_video_views"],
      token,
    );
    if ("values" in ins) {
      values.vistas = ins.values.total_video_views ?? 0;
      values.alcance = ins.values.total_video_impressions_unique ?? null;
    } else {
      notes.push(`insights: ${ins.error.message ?? "no disponibles"}`);
    }
  } else if (isPost) {
    const ins = await firstWorkingInsights(
      `${id}/insights`,
      [
        "post_impressions,post_impressions_unique,post_clicks",
        "post_media_view,post_total_media_view_unique,post_clicks",
        "post_clicks",
      ],
      token,
    );
    if ("values" in ins) {
      values.vistas = ins.values.post_impressions ?? ins.values.post_media_view ?? 0;
      values.alcance =
        ins.values.post_impressions_unique ?? ins.values.post_total_media_view_unique ?? null;
      values.clics = ins.values.post_clicks ?? null;
    } else {
      notes.push(`insights: ${ins.error.message ?? "no disponibles"}`);
    }
  }

  return { ok: true, values, notes };
}

export async function collectInstagramMedia(id: string, token: string): Promise<CollectResult> {
  const values = emptyValues();
  const notes: string[] = [];

  const base = await graphGet<{ like_count?: number; comments_count?: number }>(
    id,
    { fields: "like_count,comments_count,media_product_type" },
    token,
  );
  if (!base.data) return metaError(base.error, "No se pudo leer la publicación de Instagram");
  values.likes = num(base.data.like_count);
  values.comentarios = num(base.data.comments_count);

  const ins = await firstWorkingInsights(
    `${id}/insights`,
    ["views,reach,saved,shares", "impressions,reach,saved,shares", "reach,saved"],
    token,
  );
  if ("values" in ins) {
    values.vistas = ins.values.views ?? ins.values.impressions ?? 0;
    values.alcance = ins.values.reach ?? null;
    values.guardados = ins.values.saved ?? null;
    values.compartidos = ins.values.shares ?? 0;
  } else {
    notes.push(`insights: ${ins.error.message ?? "no disponibles"}`);
  }

  return { ok: true, values, notes };
}

export async function collectYouTubeVideos(
  ids: string[],
  token: string,
): Promise<Map<string, CollectResult>> {
  const out = new Map<string, CollectResult>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${chunk.map(encodeURIComponent).join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = (await res.json()) as {
        items?: Array<{ id: string; statistics?: Record<string, string> }>;
        error?: { code?: number; message?: string };
      };
      if (!res.ok || json.error) {
        const err: CollectError = {
          ok: false,
          error: json.error?.message ?? `HTTP ${res.status}`,
          reconnect: res.status === 401 || res.status === 403,
        };
        chunk.forEach((id) => out.set(id, err));
        continue;
      }
      const found = new Map((json.items ?? []).map((it) => [it.id, it.statistics ?? {}]));
      for (const id of chunk) {
        const s = found.get(id);
        if (!s) {
          out.set(id, {
            ok: false,
            error: "Video no encontrado (borrado o en procesamiento)",
            pending: true,
          });
          continue;
        }
        out.set(id, {
          ok: true,
          values: {
            ...emptyValues(),
            vistas: num(s.viewCount),
            likes: num(s.likeCount),
            comentarios: num(s.commentCount),
          },
        });
      }
    } catch (err) {
      const e: CollectError = {
        ok: false,
        error: err instanceof Error ? err.message : "Error de red",
      };
      chunk.forEach((id) => out.set(id, e));
    }
  }
  return out;
}

const TIKTOK = "https://open.tiktokapis.com/v2";

type TikTokError = { code?: string; message?: string };

function tiktokError(err: TikTokError | undefined, status: number): CollectError {
  const code = err?.code ?? "";
  return {
    ok: false,
    error: err?.message || code || `HTTP ${status}`,
    reconnect: status === 401 || code === "access_token_invalid" || code === "scope_not_authorized",
  };
}

/** El publish_id de TikTok no sirve para consultar métricas; hay que resolver el video_id público. */
export async function resolveTikTokVideoId(
  publishId: string,
  token: string,
): Promise<{ ok: true; videoId: string } | CollectError> {
  try {
    const res = await fetch(`${TIKTOK}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const json = (await res.json()) as {
      data?: {
        status?: string;
        publicaly_available_post_id?: Array<number | string>;
        fail_reason?: string;
      };
      error?: TikTokError;
    };
    if (!res.ok || (json.error?.code && json.error.code !== "ok"))
      return tiktokError(json.error, res.status);
    const videoId = json.data?.publicaly_available_post_id?.[0];
    if (videoId) return { ok: true, videoId: String(videoId) };
    if (json.data?.status === "FAILED") {
      return {
        ok: false,
        error: `TikTok rechazó el video: ${json.data.fail_reason ?? "sin motivo"}`,
      };
    }
    return {
      ok: false,
      pending: true,
      error: "TikTok aún no hace público el video (en proceso o publicado como privado)",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

export async function collectTikTokVideos(
  videoIds: string[],
  token: string,
): Promise<Map<string, CollectResult>> {
  const out = new Map<string, CollectResult>();
  for (let i = 0; i < videoIds.length; i += 20) {
    const chunk = videoIds.slice(i, i + 20);
    try {
      const res = await fetch(
        `${TIKTOK}/video/query/?fields=id,view_count,like_count,comment_count,share_count`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({ filters: { video_ids: chunk } }),
        },
      );
      const json = (await res.json()) as {
        data?: {
          videos?: Array<{
            id: string;
            view_count?: number;
            like_count?: number;
            comment_count?: number;
            share_count?: number;
          }>;
        };
        error?: TikTokError;
      };
      if (!res.ok || (json.error?.code && json.error.code !== "ok")) {
        const err = tiktokError(json.error, res.status);
        chunk.forEach((id) => out.set(id, err));
        continue;
      }
      const found = new Map((json.data?.videos ?? []).map((v) => [String(v.id), v]));
      for (const id of chunk) {
        const v = found.get(id);
        if (!v) {
          out.set(id, { ok: false, error: "Video no encontrado en TikTok", pending: true });
          continue;
        }
        out.set(id, {
          ok: true,
          resolvedId: id,
          values: {
            ...emptyValues(),
            vistas: num(v.view_count),
            likes: num(v.like_count),
            comentarios: num(v.comment_count),
            compartidos: num(v.share_count),
          },
        });
      }
    } catch (err) {
      const e: CollectError = {
        ok: false,
        error: err instanceof Error ? err.message : "Error de red",
      };
      chunk.forEach((id) => out.set(id, e));
    }
  }
  return out;
}

export async function collectFacebookPage(pageId: string, token: string): Promise<AccountResult> {
  const { data, error } = await graphGet<{ followers_count?: number; fan_count?: number }>(
    pageId,
    { fields: "followers_count,fan_count" },
    token,
  );
  if (!data) return metaError(error, "No se pudo leer la página de Facebook");
  return {
    ok: true,
    stats: {
      seguidores: num(data.followers_count ?? data.fan_count),
      publicaciones: null,
      vistasTotales: null,
      raw: data,
    },
  };
}

export async function collectInstagramAccount(igId: string, token: string): Promise<AccountResult> {
  const { data, error } = await graphGet<{ followers_count?: number; media_count?: number }>(
    igId,
    { fields: "followers_count,media_count" },
    token,
  );
  if (!data) return metaError(error, "No se pudo leer la cuenta de Instagram");
  return {
    ok: true,
    stats: {
      seguidores: num(data.followers_count),
      publicaciones: data.media_count ?? null,
      vistasTotales: null,
      raw: data,
    },
  };
}

export async function collectYouTubeChannel(token: string): Promise<AccountResult> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const json = (await res.json()) as {
      items?: Array<{ statistics?: Record<string, string> }>;
      error?: { message?: string };
    };
    const s = json.items?.[0]?.statistics;
    if (!res.ok || !s) {
      return {
        ok: false,
        error: json.error?.message ?? "No se pudo leer el canal de YouTube",
        reconnect: res.status === 401 || res.status === 403,
      };
    }
    return {
      ok: true,
      stats: {
        seguidores: num(s.subscriberCount),
        publicaciones: num(s.videoCount),
        vistasTotales: num(s.viewCount),
        raw: s,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

export async function collectTikTokAccount(token: string): Promise<AccountResult> {
  try {
    const res = await fetch(`${TIKTOK}/user/info/?fields=follower_count,video_count,likes_count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as {
      data?: { user?: { follower_count?: number; video_count?: number; likes_count?: number } };
      error?: TikTokError;
    };
    const u = json.data?.user;
    if (!res.ok || !u || (json.error?.code && json.error.code !== "ok"))
      return tiktokError(json.error, res.status);
    return {
      ok: true,
      stats: {
        seguidores: num(u.follower_count),
        publicaciones: u.video_count ?? null,
        vistasTotales: null,
        raw: u,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}
