import type { Red, PublishSurfaceResult } from "@/lib/mock/types";

export interface PublishToNetworkInput {
  red: Red;
  accessToken: string;
  pageId?: string;
  copy: string;
  mediaUrl?: string;
  mediaType?: "imagen" | "video";
  trackingSlug: string;
  appUrl: string;
  /** Sustituye el link rastreable `/p/<slug>` (contenido propio de las cuentas oficiales). */
  linkUrl?: string;
  /** Usuarios de Instagram que aparecen como colaboradores (la publicación sale también en su perfil). */
  collaborators?: string[];
}

function trackingUrl(input: PublishToNetworkInput): string {
  return input.linkUrl ?? `${input.appUrl}/p/${input.trackingSlug}`;
}

/**
 * Confirmación de estado antes de declarar éxito (Real v1).
 * Ninguna red se marca publicada sin que la plataforma lo confirme:
 * TikTok debe llegar a PUBLISH_COMPLETE e Instagram a FINISHED.
 * La espera es parametrizable por entorno para no colgar el serverless
 * (presupuesto total por defecto < ~60 s por red).
 */
const POLL_INTERVAL_MS = Math.max(0, Number(process.env.PUBLISH_POLL_INTERVAL_MS ?? 5000));
const TIKTOK_POLL_ATTEMPTS = Math.max(1, Number(process.env.TIKTOK_POLL_ATTEMPTS ?? 10));
const IG_POLL_ATTEMPTS = Math.max(1, Number(process.env.IG_POLL_ATTEMPTS ?? 12));
const IG_POLL_INTERVAL_MS = Math.max(0, Number(process.env.IG_POLL_INTERVAL_MS ?? 4000));

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/** Espera a que un contenedor de Instagram quede FINISHED antes de media_publish. */
export async function waitForInstagramContainer(
  creationId: string,
  accessToken: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  let lastStatus: string | undefined;
  for (let attempt = 0; attempt < IG_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(IG_POLL_INTERVAL_MS);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      );
      const json = (await res.json()) as { status_code?: string; error?: { message?: string } };
      lastStatus = json.status_code ?? lastStatus;
      if (json.status_code === "FINISHED") return { ok: true, status: json.status_code };
      if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
        return {
          ok: false,
          status: json.status_code,
          error: json.error?.message ?? `El contenedor de Instagram quedó en estado ${json.status_code}`,
        };
      }
      // IN_PROGRESS (o sin estado): seguir esperando dentro del presupuesto.
    } catch {
      // Error transitorio de red al consultar: seguir dentro del presupuesto.
    }
  }
  return {
    ok: false,
    status: lastStatus,
    error: `Instagram no terminó de procesar el contenido (último estado: ${lastStatus ?? "desconocido"})`,
  };
}

/** Publica un contenedor de Instagram SOLO tras confirmar FINISHED. */
async function publishInstagramContainer(
  igUserId: string,
  creationId: string,
  accessToken: string,
): Promise<{ id?: string; error?: string }> {
  const ready = await waitForInstagramContainer(creationId, accessToken);
  if (!ready.ok) return { error: ready.error ?? "El contenido de Instagram no quedó listo" };

  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
  if (!pubJson.id) return { error: pubJson.error?.message ?? "Error publicando en Instagram" };
  return { id: pubJson.id };
}

/** Espera la confirmación final de TikTok: ok solo con PUBLISH_COMPLETE. */
export async function waitForTikTokPublish(
  publishId: string,
  accessToken: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  let lastStatus: string | undefined;
  for (let attempt = 0; attempt < TIKTOK_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(POLL_INTERVAL_MS);
    try {
      const res = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: publishId }),
      });
      const json = (await res.json()) as {
        data?: { status?: string; fail_reason?: string };
        error?: { message?: string };
      };
      lastStatus = json.data?.status ?? lastStatus;
      if (json.data?.status === "PUBLISH_COMPLETE") return { ok: true, status: json.data.status };
      if (json.data?.status === "FAILED") {
        return {
          ok: false,
          status: json.data.status,
          error: json.data.fail_reason ?? json.error?.message ?? "TikTok reportó FAILED",
        };
      }
      // PROCESSING_DOWNLOAD / PROCESSING_UPLOAD / SEND_TO_USER_INBOX: seguir esperando.
    } catch {
      // Error transitorio de red al consultar: seguir dentro del presupuesto.
    }
  }
  return {
    ok: false,
    status: lastStatus,
    error: `TikTok sigue procesando (publish_id ${publishId})`,
  };
}

async function createInstagramContainer(
  igUserId: string,
  body: Record<string, unknown>,
  collaborators?: string[],
): Promise<{ id?: string; error?: { message?: string } }> {
  const send = async (payload: Record<string, unknown>) => {
    const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as { id?: string; error?: { message?: string } };
  };
  if (collaborators?.length) {
    const withCollab = await send({ ...body, collaborators: collaborators.slice(0, 3) });
    if (withCollab.id) return withCollab;
  }
  return send(body);
}

async function publishFacebookFeed(input: PublishToNetworkInput): Promise<PublishSurfaceResult> {
  const pageId = input.pageId;
  if (!pageId) {
    return { red: "facebook", surface: "feed", ok: false, error: "Falta Page ID de Facebook" };
  }

  const isLocal = input.appUrl.includes("localhost") || input.appUrl.includes("127.0.0.1");
  const postUrl = isLocal ? "" : trackingUrl(input);
  const caption = postUrl && !input.copy.includes(postUrl) ? `${input.copy}\n\n${postUrl}` : input.copy;

  if (input.mediaUrl?.startsWith("http") && input.mediaType === "video") {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: input.mediaUrl,
        description: caption,
        access_token: input.accessToken,
      }),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json.id) {
      return { red: "facebook", surface: "feed_video", ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { red: "facebook", surface: "feed_video", channel_name: "Feed de página", external_id: json.id, ok: true };
  }

  if (input.mediaUrl?.startsWith("http") && input.mediaType !== "video") {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.mediaUrl, caption, access_token: input.accessToken }),
    });
    const json = (await res.json()) as { id?: string; post_id?: string; error?: { message?: string } };
    const id = json.post_id ?? json.id;
    if (!res.ok || !id) {
      const msg = json.error?.message?.includes("Invalid parameter")
        ? "Facebook requiere publicar en una Fan Page con permisos de administración, no en un perfil personal."
        : json.error?.message ?? `HTTP ${res.status}`;
      return { red: "facebook", surface: "feed", ok: false, error: msg };
    }
    return { red: "facebook", surface: "feed", channel_name: "Feed de página", external_id: id, ok: true };
  }

  // Publicación de solo texto en Feed de Facebook
  const body: Record<string, string> = { message: caption, access_token: input.accessToken };

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    const msg = json.error?.message?.includes("Invalid parameter")
      ? "Facebook requiere publicar en una Fan Page con permisos de administración, no en un perfil personal."
      : json.error?.message ?? `HTTP ${res.status}`;
    return { red: "facebook", surface: "feed", ok: false, error: msg };
  }
  return { red: "facebook", surface: "feed", channel_name: "Feed de página", external_id: json.id, ok: true };
}

async function publishInstagramFeed(input: PublishToNetworkInput): Promise<PublishSurfaceResult> {
  const igUserId = input.pageId;
  if (!igUserId) return { red: "instagram", surface: "feed", ok: false, error: "Falta Instagram Business Account ID" };
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "instagram", surface: "feed", ok: false, error: "Instagram requiere URL pública de imagen" };
  }

  const createJson = await createInstagramContainer(
    igUserId,
    {
      image_url: input.mediaUrl,
      caption: `${input.copy}\n\n${trackingUrl(input)}`,
      access_token: input.accessToken,
    },
    input.collaborators,
  );
  if (!createJson.id) {
    return { red: "instagram", surface: "feed", ok: false, error: createJson.error?.message ?? "Error creando media IG" };
  }

  const published = await publishInstagramContainer(igUserId, createJson.id, input.accessToken);
  if (!published.id) {
    return { red: "instagram", surface: "feed", ok: false, error: published.error ?? "Error publicando en IG" };
  }
  return { red: "instagram", surface: "feed", channel_name: "Feed Instagram", external_id: published.id, ok: true };
}

async function publishInstagramReel(input: PublishToNetworkInput): Promise<PublishSurfaceResult> {
  const igUserId = input.pageId;
  if (!igUserId) return { red: "instagram", surface: "reel", ok: false, error: "Falta Instagram Business Account ID" };
  if (!input.mediaUrl?.startsWith("http") || input.mediaType !== "video") {
    return { red: "instagram", surface: "reel", ok: false, error: "Reels requiere video con URL pública" };
  }

  const createJson = await createInstagramContainer(
    igUserId,
    {
      media_type: "REELS",
      video_url: input.mediaUrl,
      caption: `${input.copy}\n\n${trackingUrl(input)}`,
      access_token: input.accessToken,
    },
    input.collaborators,
  );
  if (!createJson.id) {
    return { red: "instagram", surface: "reel", ok: false, error: createJson.error?.message ?? "Error creando Reel" };
  }

  const published = await publishInstagramContainer(igUserId, createJson.id, input.accessToken);
  if (!published.id) {
    return { red: "instagram", surface: "reel", ok: false, error: published.error ?? "Error publicando Reel" };
  }
  return { red: "instagram", surface: "reel", channel_name: "Reels", external_id: published.id, ok: true };
}

async function publishYouTube(input: PublishToNetworkInput): Promise<PublishSurfaceResult> {
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "youtube", surface: "video", ok: false, error: "YouTube requiere video con URL pública" };
  }

  const title = input.mediaType === "video"
    ? `${input.copy.slice(0, 80)} #Shorts`.slice(0, 100)
    : input.copy.slice(0, 100) || "PubliVende";

  const metadata = {
    snippet: {
      title,
      description: `${input.copy}\n\n${trackingUrl(input)}`,
      tags: ["PubliVende", "LATAM", "Shorts"],
      categoryId: "22",
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    return { red: "youtube", surface: "shorts", ok: false, error: err.slice(0, 200) };
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) return { red: "youtube", surface: "shorts", ok: false, error: "YouTube no devolvió URL de upload" };

  const mediaRes = await fetch(input.mediaUrl);
  if (!mediaRes.ok) return { red: "youtube", surface: "shorts", ok: false, error: "No se pudo descargar el video" };
  const blob = await mediaRes.blob();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": blob.type || "video/mp4" },
    body: blob,
  });
  const uploadJson = (await uploadRes.json()) as { id?: string; error?: { message?: string } };
  if (!uploadJson.id) {
    return { red: "youtube", surface: "shorts", ok: false, error: uploadJson.error?.message ?? "Error subiendo a YouTube" };
  }
  return {
    red: "youtube",
    surface: "shorts",
    channel_name: "YouTube Shorts",
    external_id: uploadJson.id,
    ok: true,
  };
}

async function publishTikTok(input: PublishToNetworkInput): Promise<PublishSurfaceResult> {
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "tiktok", surface: "fyp", ok: false, error: "TikTok requiere video con URL pública" };
  }

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: input.copy.slice(0, 150),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: input.mediaUrl },
    }),
  });
  const initJson = (await initRes.json()) as {
    data?: { publish_id?: string };
    error?: { message?: string };
  };
  if (!initJson.data?.publish_id) {
    return { red: "tiktok", surface: "fyp", ok: false, error: initJson.error?.message ?? "TikTok init falló" };
  }
  // Real v1: el publish_id solo prueba que TikTok aceptó el envío, NO que
  // publicó. Éxito únicamente con la confirmación PUBLISH_COMPLETE.
  const confirmed = await waitForTikTokPublish(initJson.data.publish_id, input.accessToken);
  if (!confirmed.ok) {
    return {
      red: "tiktok",
      surface: "fyp",
      channel_name: "For You Page",
      external_id: initJson.data.publish_id,
      ok: false,
      error: confirmed.error ?? "TikTok no confirmó la publicación",
    };
  }
  return {
    red: "tiktok",
    surface: "fyp",
    channel_name: "For You Page",
    external_id: initJson.data.publish_id,
    ok: true,
  };
}

/** Publica en todas las superficies disponibles para una red. */
export async function publishToNetworkMulti(input: PublishToNetworkInput): Promise<PublishSurfaceResult[]> {
  const results: PublishSurfaceResult[] = [];

  switch (input.red) {
    case "facebook":
      results.push(await publishFacebookFeed(input));
      break;
    case "instagram":
      if (input.mediaType === "video") {
        results.push(await publishInstagramReel(input));
      } else {
        results.push(await publishInstagramFeed(input));
      }
      break;
    case "youtube":
      results.push(await publishYouTube(input));
      break;
    case "tiktok":
      results.push(await publishTikTok(input));
      break;
    default:
      results.push({ red: input.red, surface: "feed", ok: false, error: "Red no soportada" });
  }

  return results;
}

/** Compat: primera superficie exitosa como externalId principal. */
export async function publishToNetwork(input: PublishToNetworkInput): Promise<{
  red: Red;
  ok: boolean;
  externalId?: string;
  error?: string;
  surfaces: PublishSurfaceResult[];
}> {
  const surfaces = await publishToNetworkMulti(input);
  const okSurface = surfaces.find((s) => s.ok);
  const first = surfaces[0];
  return {
    red: input.red,
    ok: !!okSurface,
    externalId: okSurface?.external_id,
    error: okSurface ? undefined : first?.error ?? "Error al publicar",
    surfaces,
  };
}
