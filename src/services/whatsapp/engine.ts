// Motor CRM: mensaje entrante → contacto + reglas automáticas + IA sobre publicación
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import type { AutomationRule, WaContact } from "@/lib/mock/types";
import {
  attributeContactToPost,
  resolvePostFromText,
} from "@/lib/whatsapp-post";
import { generatePostAwareReply } from "./post-reply";
import { sendMessage } from "./mock";

function applyTemplate(template: string, contact: WaContact, negocio: string, horario: string): string {
  return template
    .replace(/\{nombre\}/g, contact.nombre.split(" ")[0])
    .replace(/\{negocio\}/g, negocio)
    .replace(/\{horario\}/g, horario);
}

function matchRule(rule: AutomationRule, texto: string, isNewContact: boolean): boolean {
  if (!rule.activa) return false;
  const lower = texto.toLowerCase();
  if (rule.disparador === "mensaje_nuevo") return isNewContact;
  if (rule.disparador === "palabra_clave" && rule.palabra_clave) {
    return lower.includes(rule.palabra_clave.toLowerCase());
  }
  if (rule.disparador === "fuera_de_horario") {
    const hour = new Date().getHours();
    return hour < 9 || hour >= 19;
  }
  return false;
}

export interface IncomingMessageResult {
  contact: WaContact;
  autoReplies: string[];
  postId?: string;
}

/**
 * Procesa un mensaje entrante de WhatsApp:
 * atribuye publicación, dispara reglas y responde con IA sobre el post.
 */
export async function processIncomingMessage(
  userId: string,
  payload: { nombre: string; celular: string; texto: string; post_origen_id?: string; origen?: string },
): Promise<IncomingMessageResult> {
  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile) throw new Error("Usuario no encontrado");

  const resolvedPost = resolvePostFromText(userId, payload.texto);
  const postIdFromPayload = payload.post_origen_id ?? resolvedPost?.id;

  let contact = db.whatsapp_contacts.find((c) => c.user_id === userId && c.celular === payload.celular);
  const isNew = !contact;

  if (!contact) {
    contact = {
      id: uid(),
      user_id: userId,
      nombre: payload.nombre,
      celular: payload.celular,
      etiqueta: "Nuevo",
      etapa: "nuevo",
      origen: payload.origen ?? (resolvedPost ? `Publicación ref ${resolvedPost.tracking_slug}` : "WhatsApp directo"),
      post_origen_id: postIdFromPayload,
      notas: "",
      fecha_creacion: new Date().toISOString(),
      no_leidos: 1,
      lead_score: postIdFromPayload ? 45 : 25,
      score_motivos: postIdFromPayload ? ["Vino de publicación"] : ["Contacto directo"],
    };
    db.whatsapp_contacts.push(contact);
  } else {
    contact.no_leidos = (contact.no_leidos ?? 0) + 1;
    if (resolvedPost) attributeContactToPost(contact, resolvedPost);
    else if (postIdFromPayload && !contact.post_origen_id) {
      contact.post_origen_id = postIdFromPayload;
    }
  }

  db.whatsapp_messages.push({
    id: uid(),
    contact_id: contact.id,
    direccion: "entrante",
    texto: payload.texto,
    automatico: false,
    post_id: postIdFromPayload,
    timestamp: new Date().toISOString(),
  });

  saveDB(db);

  const reglas = db.automation_rules.filter((r) => r.user_id === userId);
  const autoReplies: string[] = [];

  for (const rule of reglas) {
    if (matchRule(rule, payload.texto, isNew)) {
      const reply = applyTemplate(
        rule.respuesta,
        contact,
        profile.nombre_negocio,
        profile.horario_atencion ?? "9am a 7pm",
      );
      await sendMessage(contact.id, reply, true, contact.post_origen_id);
      autoReplies.push(reply);
      if (isNew) {
        await updateContactStage(contact.id, "contactado");
      }
    }
  }

  const activePostId = contact.post_origen_id ?? resolvedPost?.id;
  if (activePostId) {
    const aiReply = generatePostAwareReply(userId, contact, payload.texto, activePostId);
    if (aiReply) {
      const alreadySimilar = autoReplies.some((r) => r.slice(0, 40) === aiReply.slice(0, 40));
      if (!alreadySimilar) {
        await sendMessage(contact.id, aiReply, true, activePostId);
        autoReplies.push(aiReply);
        if (contact.etapa === "nuevo") {
          await updateContactStage(contact.id, "contactado");
        }
      }
    }
  }

  return { contact, autoReplies, postId: activePostId };
}

async function updateContactStage(contactId: string, etapa: WaContact["etapa"]) {
  const db = loadDB();
  const c = db.whatsapp_contacts.find((x) => x.id === contactId);
  if (c) {
    c.etapa = etapa;
    saveDB(db);
  }
}

export { sendMessage, updateContact, broadcastPostLink } from "./mock";
