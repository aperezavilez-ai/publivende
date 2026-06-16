import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { loadDB } from "@/lib/mock/db";
import type { Post, Profile, WaContact } from "@/lib/mock/types";

export function resolvePostFromText(userId: string, texto: string): Post | null {
  const db = loadDB();
  const posts = db.posts.filter((p) => p.user_id === userId);
  if (!posts.length) return null;

  const explicit =
    texto.match(/vi tu post \(([a-z0-9]+)\)/i)?.[1]
    ?? texto.match(/ref[:\s]+([a-z0-9]+)/i)?.[1]
    ?? texto.match(/\/p\/([a-z0-9]+)/i)?.[1];

  if (explicit) {
    return posts.find((p) => p.tracking_slug === explicit) ?? null;
  }

  for (const post of posts) {
    if (texto.includes(post.tracking_slug)) return post;
  }
  return null;
}

export function buildPostPageUrl(trackingSlug: string, origin?: string): string {
  const base =
    origin
    ?? (typeof window !== "undefined" ? window.location.origin : PRODUCTION_APP_URL);
  return `${base}/p/${trackingSlug}`;
}

export function buildPostWhatsAppLink(profile: Profile, post: Post, origin?: string): string {
  const pageUrl = buildPostPageUrl(post.tracking_slug, origin);
  const msg = `Hola! Vi tu publicación ${pageUrl} (ref: ${post.tracking_slug})`;
  const phone = (profile.codigo_pais + profile.celular).replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function buildBroadcastMessage(profile: Profile, post: Post, origin?: string): string {
  const pageUrl = buildPostPageUrl(post.tracking_slug, origin);
  const lines = [
    `✨ *Nueva publicación — ${profile.nombre_negocio}*`,
    "",
    post.copy.slice(0, 320),
  ];
  if (post.source_url) {
    lines.push("", `🔗 Contenido original: ${post.source_url}`);
  }
  lines.push(
    "",
    `👉 Ver publicación completa: ${pageUrl}`,
    "",
    `_Responde este mensaje si te interesa. Ref: ${post.tracking_slug}_`,
  );
  return lines.join("\n");
}

export function getPostById(userId: string, postId: string): Post | null {
  const db = loadDB();
  return db.posts.find((p) => p.id === postId && p.user_id === userId) ?? null;
}

export function getPostContextBlock(userId: string, postId: string): string {
  const post = getPostById(userId, postId);
  if (!post) return "";
  const lines = [
    `Publicación: ${post.copy.slice(0, 400)}`,
    post.source_url ? `Link original: ${post.source_url}` : "",
    `Página: ${buildPostPageUrl(post.tracking_slug)}`,
    `Ref: ${post.tracking_slug}`,
  ];
  if (post.hashtags_virales?.length) {
    lines.push(`Hashtags: ${post.hashtags_virales.slice(0, 8).join(" ")}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function isPublicationQuestion(texto: string): boolean {
  const lower = texto.toLowerCase();
  return /precio|cu[aá]nto|cuesta|costo|info|informaci[oó]n|detalle|disponib|env[ií]o|entrega|link|publicaci[oó]n|ver|comprar|pedir|interesa|producto|servicio|whatsapp|horario|talla|color|stock/.test(
    lower,
  );
}

export function attributeContactToPost(contact: WaContact, post: Post): void {
  if (!contact.post_origen_id) {
    contact.post_origen_id = post.id;
    contact.origen = `Publicación: ${post.copy.slice(0, 55)}…`;
    contact.lead_score = Math.min(100, (contact.lead_score ?? 25) + 20);
    contact.score_motivos = [...(contact.score_motivos ?? []), "Vino de publicación"].filter(
      (m, i, arr) => arr.indexOf(m) === i,
    );
  }
}
