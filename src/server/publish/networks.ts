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

  const postUrl = trackingUrl(input);
  const caption = `${input.copy}\n\n${postUrl}`;

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
      return { red: "facebook", surface: "feed", ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { red: "facebook", surface: "feed", channel_name: "Feed de página", external_id: id, ok: true };
  }

  const body: Record<string, string> = { message: caption, access_token: input.accessToken };
  if (input.mediaUrl?.startsWith("http")) body.link = input.mediaUrl;

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    return { red: "facebook", surface: "feed", ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
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

  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createJson.id, access_token: input.accessToken }),
  });
  const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
  if (!pubJson.id) {
    return { red: "instagram", surface: "feed", ok: false, error: pubJson.error?.message ?? "Error publicando en IG" };
  }
  return { red: "instagram", surface: "feed", channel_name: "Feed Instagram", external_id: pubJson.id, ok: true };
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

  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createJson.id, access_token: input.accessToken }),
  });
  const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
  if (!pubJson.id) {
    return { red: "instagram", surface: "reel", ok: false, error: pubJson.error?.message ?? "Error publicando Reel" };
  }
  return { red: "instagram", surface: "reel", channel_name: "Reels", external_id: pubJson.id, ok: true };
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
