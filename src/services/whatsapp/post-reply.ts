import { loadDB } from "@/lib/mock/db";
import type { WaContact } from "@/lib/mock/types";
import { getBusinessContext } from "@/lib/bootstrap";
import {
  buildPostPageUrl,
  getPostById,
  isPublicationQuestion,
} from "@/lib/whatsapp-post";

/**
 * Respuesta IA (heurística) sobre la publicación que originó el contacto.
 */
export function generatePostAwareReply(
  userId: string,
  contact: WaContact,
  texto: string,
  postId: string,
): string | null {
  const post = getPostById(userId, postId);
  if (!post) return null;

  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile) return null;

  const lower = texto.toLowerCase();
  const nombre = contact.nombre.split(" ")[0];
  const pageUrl = buildPostPageUrl(post.tracking_slug);
  const productos = db.productos.filter((p) => p.user_id === userId && p.activo);

  if (lower.includes("link") || lower.includes("ver") || lower.includes("publicaci")) {
    return `¡Claro ${nombre}! 👋\n\nAquí está la publicación:\n👉 ${pageUrl}${post.source_url ? `\n\nTambién puedes ver el contenido original:\n${post.source_url}` : ""}`;
  }

  if (lower.includes("precio") || lower.includes("cuánto") || lower.includes("cuanto") || lower.includes("cuesta") || lower.includes("costo")) {
    let r = `¡Hola ${nombre}! 💜 Sobre la publicación que viste:\n\n"${post.copy.slice(0, 180)}…"\n\n`;
    if (productos.length) {
      r += `Precios de nuestro catálogo:\n${productos.slice(0, 6).map((p) => `• ${p.nombre}: $${p.precio} ${p.moneda}`).join("\n")}`;
    } else {
      r += "Escríbeme qué producto te interesa y te confirmo el precio al instante.";
    }
    return r;
  }

  if (lower.includes("envío") || lower.includes("envio") || lower.includes("entrega")) {
    return `¡Hola ${nombre}! 🚚 Sí hacemos envíos${profile.ciudad ? ` desde ${profile.ciudad}` : ""}.\n\nSobre la publicación: "${post.copy.slice(0, 120)}…"\n\n¿A qué ciudad te lo enviamos?`;
  }

  if (lower.includes("disponib") || lower.includes("stock") || lower.includes("talla") || lower.includes("color")) {
    return `¡Hola ${nombre}! ✅ Sí tenemos disponibilidad.\n\nTe interesa lo de esta publicación:\n"${post.copy.slice(0, 160)}…"\n\n¿Qué talla/color o cantidad necesitas?`;
  }

  if (lower.includes("horario") || lower.includes("atienden")) {
    return `¡Hola ${nombre}! 🕐 Atendemos ${profile.horario_atencion ?? "de 9am a 7pm"}.\n\nSobre tu consulta de la publicación, con gusto te ayudo ahora mismo.`;
  }

  if (!isPublicationQuestion(texto)) {
    return null;
  }

  const ctx = getBusinessContext(userId);
  let r = `¡Hola ${nombre}! 👋 Gracias por escribir sobre nuestra publicación.\n\n`;
  r += `📌 *Lo que publicamos:*\n${post.copy.slice(0, 280)}`;
  if (post.source_url) r += `\n\n🔗 Más info: ${post.source_url}`;
  r += `\n\n👉 Ver todo: ${pageUrl}`;
  if (productos[0]) {
    r += `\n\n⭐ Te recomiendo: *${productos[0].nombre}* — $${productos[0].precio} ${productos[0].moneda}`;
  }
  if (profile.descripcion_negocio) {
    r += `\n\n_${profile.descripcion_negocio.slice(0, 100)}_`;
  }
  if (ctx && productos.length === 0) {
    r += `\n\n¿Te gustaría que te envíe el catálogo completo?`;
  }
  return r;
}
