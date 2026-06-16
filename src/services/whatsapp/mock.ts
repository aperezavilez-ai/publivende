// Adaptador mock WhatsApp — listo para reemplazar por WhatsApp Business Cloud API
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { buildBroadcastMessage } from "@/lib/whatsapp-post";

export async function sendMessage(
  contact_id: string,
  texto: string,
  automatico = false,
  post_id?: string,
) {
  const db = loadDB();
  db.whatsapp_messages.push({
    id: uid(),
    contact_id,
    direccion: "saliente",
    texto,
    automatico,
    post_id,
    timestamp: new Date().toISOString(),
  });
  saveDB(db);
}

export async function updateContact(
  contact_id: string,
  patch: Partial<{ etapa: string; etiqueta: string; notas: string; monto_venta: number; no_leidos: number }>,
) {
  const db = loadDB();
  const c = db.whatsapp_contacts.find((x) => x.id === contact_id);
  if (c) Object.assign(c, patch);
  saveDB(db);
}

/** Envía el link de la publicación a todos los contactos del CRM. */
export async function broadcastPostLink(
  userId: string,
  postId: string,
  opts?: { contactIds?: string[] },
): Promise<{ sent: number; skipped: number }> {
  try {
    const { getSessionToken, isProductionModeClient } = await import("@/lib/production/session");
    const token = getSessionToken();
    if (isProductionModeClient() && token) {
      const { broadcastPostLinkServer } = await import("@/lib/api/whatsapp.functions");
      const real = await broadcastPostLinkServer({ data: { token, postId } });
      if (real.ok) {
        if ("useWaMe" in real && real.useWaMe) {
          return { sent: 0, skipped: 0, useWaMe: true };
        }
        return { sent: real.sent, skipped: real.failed ?? 0 };
      }
    }
  } catch {
    /* fallback local */
  }

  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  const post = db.posts.find((p) => p.id === postId && p.user_id === userId);
  if (!profile || !post) return { sent: 0, skipped: 0 };

  const msg = buildBroadcastMessage(profile, post);
  let contacts = db.whatsapp_contacts.filter((c) => c.user_id === userId);
  if (opts?.contactIds?.length) {
    contacts = contacts.filter((c) => opts.contactIds!.includes(c.id));
  }

  let sent = 0;
  for (const contact of contacts) {
    await sendMessage(contact.id, msg, false, post.id);
    if (!contact.post_origen_id) contact.post_origen_id = post.id;
    sent++;
  }

  post.whatsapp_broadcast_count = sent;
  post.whatsapp_enviado_at = new Date().toISOString();
  saveDB(db);
  return { sent, skipped: 0 };
}
