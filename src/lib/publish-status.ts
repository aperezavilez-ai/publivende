import type { Post, Red } from "@/lib/mock/types";
import { RED_LABELS } from "@/services/social/mock";

export function countApiPublishedRedes(post: Post): number {
  return post.external_ids ? Object.keys(post.external_ids).length : 0;
}

export function postStatusLabel(post: Post): string {
  if (post.estado === "programado") return "Programado";
  if (post.estado === "borrador") return "Borrador";
  if (post.estado === "error") return "Error al publicar";
  const apiCount = countApiPublishedRedes(post);
  const pedidas = post.redes_destino?.length ?? 0;
  if (apiCount > 0 && pedidas > apiCount) return `Parcial: ${apiCount} de ${pedidas} redes`;
  if (apiCount > 0) return `Publicado en ${apiCount} red${apiCount > 1 ? "es" : ""}`;
  return "Publicado";
}

export function buildPublishResultMessage(input: {
  redes: Red[];
  apiPublished: Partial<Record<Red, string>>;
  surfacesOk?: number;
  errors: string[];
  waSent: number;
  programar: boolean;
}): string {
  if (input.programar) return "Programado — se publicará y distribuirá a la hora indicada";

  const surfaceCount = input.surfacesOk ?? Object.keys(input.apiPublished).length;
  if (surfaceCount > 0) {
    const extra = [
      input.waSent > 0 ? `WhatsApp: ${input.waSent}` : "",
    ].filter(Boolean).join(" · ");
    return `Distribuido en ${surfaceCount} canal${surfaceCount > 1 ? "es" : ""}${extra ? ` · ${extra}` : ""}`;
  }

  if (input.errors.length) return input.errors.join(" · ");
  return "No se pudo publicar";
}

export function disconnectedRedes(
  redes: Red[],
  accounts: Array<{ red: Red; estado_conexion: string }>,
): Red[] {
  return redes.filter((r) => {
    const acc = accounts.find((a) => a.red === r);
    return !acc || acc.estado_conexion !== "conectada";
  });
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string | null> {
  try {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Sube blob/data URL al servidor para obtener URL pública (Graph API). */
export async function resolveMediaForPublish(
  mediaUrl: string,
  sessionToken: string,
): Promise<string> {
  if (!mediaUrl?.trim()) return "";
  if (mediaUrl.startsWith("http")) return mediaUrl;

  let dataUrl = mediaUrl;
  if (mediaUrl.startsWith("blob:")) {
    const converted = await blobUrlToDataUrl(mediaUrl);
    if (!converted) return "";
    dataUrl = converted;
  }
  if (!dataUrl.startsWith("data:")) return "";

  const { stagePublishMedia } = await import("@/lib/api/publish.functions");
  const staged = await stagePublishMedia({ data: { token: sessionToken, dataUrl } });
  if (!staged.ok) return "";
  return staged.publicUrl;
}
