import { randomBytes } from "node:crypto";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb, schema } from "@/server/db";

const BOT_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

const STORAGE_BUCKET = "publivende-media";

function getMimeExtension(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("webm")) return "webm";
  return "jpg";
}

function needsProxy(url: string): boolean {
  return /fbcdn\.net|facebook\.com|instagram\.com|cdninstagram\.com/i.test(url);
}

async function fetchRemote(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  for (const agent of BOT_AGENTS) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": agent, Accept: "image/*,video/*,*/*" },
      });
      if (!res.ok) continue;
      const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
      if (!mime.startsWith("image/") && !mime.startsWith("video/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 10) continue;
      return { buffer, mime };
    } catch {
      /* siguiente agente */
    }
  }
  return null;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 10) return null;
  return { buffer, mime };
}

async function uploadToGafCoreStorage(
  userId: string,
  buffer: Buffer,
  mime: string,
  fileId: string,
): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || "https://supabase.gafcore.com";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) return null;

  try {
    const ext = getMimeExtension(mime);
    const filePath = `${userId}/${fileId}.${ext}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: new Uint8Array(buffer),
    });

    if (res.ok) {
      return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
    }
  } catch (err) {
    console.error("Error subiendo a GAFCORE Storage:", err);
  }
  return null;
}

async function storeBuffer(userId: string, buffer: Buffer, mime: string, appUrl: string): Promise<string> {
  const id = randomBytes(16).toString("hex");

  // Intentar almacenamiento público en GAFCORE Storage
  const publicStorageUrl = await uploadToGafCoreStorage(userId, buffer, mime, id);
  if (publicStorageUrl) {
    return publicStorageUrl;
  }

  // Fallback: guardar en BD local
  const db = getDb();
  await db.insert(schema.hostedMedia).values({
    id,
    userId,
    mimeType: mime,
    dataBase64: buffer.toString("base64"),
  });
  return `${appUrl}/api/media/${id}`;
}

/** Convierte media local/CDN en URL pública en publivende-media para Graph API / TikTok / YouTube. */
export async function ensurePublicMediaUrl(userId: string, mediaUrl: string): Promise<string> {
  const trimmed = mediaUrl?.trim() ?? "";
  if (!trimmed) return "";

  const appUrl = resolveAppBaseUrl();

  if (trimmed.startsWith("data:")) {
    const parsed = parseDataUrl(trimmed);
    if (!parsed) return "";
    return storeBuffer(userId, parsed.buffer, parsed.mime, appUrl);
  }

  if (trimmed.startsWith("http")) {
    if (!needsProxy(trimmed)) return trimmed;
    const remote = await fetchRemote(trimmed);
    if (!remote) return trimmed;
    return storeBuffer(userId, remote.buffer, remote.mime, appUrl);
  }

  return "";
}

export async function stageDataUrlMedia(userId: string, dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return storeBuffer(userId, parsed.buffer, parsed.mime, resolveAppBaseUrl());
}
