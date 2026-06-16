import type { Red } from "@/lib/mock/types";

export interface PublishToNetworkInput {
  red: Red;
  accessToken: string;
  pageId?: string;
  copy: string;
  mediaUrl?: string;
  mediaType?: "imagen" | "video";
  trackingSlug: string;
  appUrl: string;
}

export interface PublishResult {
  red: Red;
  ok: boolean;
  externalId?: string;
  error?: string;
}

async function publishFacebook(input: PublishToNetworkInput): Promise<PublishResult> {
  const pageId = input.pageId;
  if (!pageId) return { red: "facebook", ok: false, error: "Falta Page ID de Facebook" };

  const postUrl = `${input.appUrl}/p/${input.trackingSlug}`;
  const body: Record<string, string> = {
    message: `${input.copy}\n\n${postUrl}`,
    access_token: input.accessToken,
  };

  if (input.mediaUrl && input.mediaType !== "video") {
    body.link = input.mediaUrl.startsWith("http") ? input.mediaUrl : postUrl;
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    return { red: "facebook", ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { red: "facebook", ok: true, externalId: json.id };
}

async function publishInstagram(input: PublishToNetworkInput): Promise<PublishResult> {
  const igUserId = input.pageId;
  if (!igUserId) return { red: "instagram", ok: false, error: "Falta Instagram Business Account ID" };
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "instagram", ok: false, error: "Instagram requiere URL pública de imagen" };
  }

  const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: input.mediaUrl,
      caption: input.copy,
      access_token: input.accessToken,
    }),
  });
  const createJson = (await createRes.json()) as { id?: string; error?: { message?: string } };
  if (!createJson.id) {
    return { red: "instagram", ok: false, error: createJson.error?.message ?? "Error creando media IG" };
  }

  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createJson.id, access_token: input.accessToken }),
  });
  const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } };
  if (!pubJson.id) {
    return { red: "instagram", ok: false, error: pubJson.error?.message ?? "Error publicando en IG" };
  }
  return { red: "instagram", ok: true, externalId: pubJson.id };
}

async function publishYouTube(input: PublishToNetworkInput): Promise<PublishResult> {
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "youtube", ok: false, error: "YouTube requiere video con URL pública" };
  }

  const metadata = {
    snippet: {
      title: input.copy.slice(0, 100) || "PubliVende",
      description: `${input.copy}\n\n${input.appUrl}/p/${input.trackingSlug}`,
      tags: ["PubliVende", "LATAM"],
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
        "X-Upload-Content-Type": input.mediaType === "video" ? "video/*" : "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    return { red: "youtube", ok: false, error: err.slice(0, 200) };
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) return { red: "youtube", ok: false, error: "YouTube no devolvió URL de upload" };

  const mediaRes = await fetch(input.mediaUrl);
  if (!mediaRes.ok) return { red: "youtube", ok: false, error: "No se pudo descargar el video" };
  const blob = await mediaRes.blob();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": blob.type || "video/mp4" },
    body: blob,
  });
  const uploadJson = (await uploadRes.json()) as { id?: string; error?: { message?: string } };
  if (!uploadJson.id) {
    return { red: "youtube", ok: false, error: uploadJson.error?.message ?? "Error subiendo a YouTube" };
  }
  return { red: "youtube", ok: true, externalId: uploadJson.id };
}

async function publishTikTok(input: PublishToNetworkInput): Promise<PublishResult> {
  if (!input.mediaUrl?.startsWith("http")) {
    return { red: "tiktok", ok: false, error: "TikTok requiere video con URL pública" };
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
    return { red: "tiktok", ok: false, error: initJson.error?.message ?? "TikTok init falló" };
  }
  return { red: "tiktok", ok: true, externalId: initJson.data.publish_id };
}

export async function publishToNetwork(input: PublishToNetworkInput): Promise<PublishResult> {
  switch (input.red) {
    case "facebook":
      return publishFacebook(input);
    case "instagram":
      return publishInstagram(input);
    case "youtube":
      return publishYouTube(input);
    case "tiktok":
      return publishTikTok(input);
    default:
      return { red: input.red, ok: false, error: "Red no soportada" };
  }
}
