import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { findUserById } from "@/server/auth/users";
import { sendWhatsAppMessage } from "./cloud-api";
import { generatePostReplyOpenAI } from "@/server/ai/openai";
import { getBusinessContextServer, getPostContextBlockServer } from "@/server/context";
import { isRealAIEnabled } from "@/server/config";

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

/** Procesa mensaje entrante de WhatsApp Cloud API webhook. */
export async function processWhatsAppWebhook(userId: string, msg: WebhookMessage) {
  const db = getDb();
  const texto = msg.text?.body ?? "";
  if (!texto) return;

  const celular = `+${msg.from}`;
  let contacts = await db
    .select()
    .from(schema.whatsappContacts)
    .where(and(eq(schema.whatsappContacts.userId, userId), eq(schema.whatsappContacts.celular, celular)))
    .limit(1);

  let contact = contacts[0];
  const resolvedPost = await resolvePostFromTextServer(userId, texto);

  if (!contact) {
    const inserted = await db
      .insert(schema.whatsappContacts)
      .values({
        userId,
        nombre: `Cliente ${msg.from.slice(-4)}`,
        celular,
        origen: resolvedPost ? `Publicación ref ${resolvedPost.trackingSlug}` : "WhatsApp",
        postOrigenId: resolvedPost?.id,
        leadScore: resolvedPost ? 45 : 25,
        scoreMotivos: resolvedPost ? ["Vino de publicación"] : ["Contacto directo"],
      })
      .returning();
    contact = inserted[0]!;
  } else {
    contact.noLeidos = (contact.noLeidos ?? 0) + 1;
    if (resolvedPost && !contact.postOrigenId) {
      await db
        .update(schema.whatsappContacts)
        .set({ postOrigenId: resolvedPost.id, origen: `Publicación: ${resolvedPost.copy.slice(0, 55)}…` })
        .where(eq(schema.whatsappContacts.id, contact.id));
    }
  }

  await db.insert(schema.whatsappMessages).values({
    contactId: contact.id,
    userId,
    direccion: "entrante",
    texto,
    automatico: false,
    postId: resolvedPost?.id ?? contact.postOrigenId ?? undefined,
    waMessageId: msg.id,
  });

  const rules = await db
    .select()
    .from(schema.automationRules)
    .where(and(eq(schema.automationRules.userId, userId), eq(schema.automationRules.activa, true)));

  const profile = await findUserById(userId);
  if (!profile) return;

  for (const rule of rules) {
    if (rule.disparador === "palabra_clave" && rule.palabraClave) {
      if (!texto.toLowerCase().includes(rule.palabraClave.toLowerCase())) continue;
    }
    const reply = rule.respuesta
      .replace(/\{nombre\}/g, contact.nombre.split(" ")[0])
      .replace(/\{negocio\}/g, profile.nombreNegocio)
      .replace(/\{horario\}/g, profile.horarioAtencion ?? "9am a 7pm");

    await sendAndLog(userId, contact.id, contact.celular, reply, true, contact.postOrigenId ?? undefined);
  }

  const postId = contact.postOrigenId ?? resolvedPost?.id;
  if (postId && isRealAIEnabled()) {
    const businessContext = await getBusinessContextServer(userId);
    const postContext = await getPostContextBlockServer(userId, postId);
    const aiReply = await generatePostReplyOpenAI({
      businessContext,
      postContext,
      customerMessage: texto,
      customerName: contact.nombre,
    });
    await sendAndLog(userId, contact.id, contact.celular, aiReply, true, postId);
  }
}

async function sendAndLog(
  userId: string,
  contactId: string,
  celular: string,
  texto: string,
  automatico: boolean,
  postId?: string,
) {
  const db = getDb();
  const sent = await sendWhatsAppMessage({ to: celular, text: texto, userId });
  await db.insert(schema.whatsappMessages).values({
    contactId,
    userId,
    direccion: "saliente",
    texto,
    automatico,
    postId,
    waMessageId: sent.messageId,
  });
}

async function resolvePostFromTextServer(userId: string, texto: string) {
  const db = getDb();
  const allPosts = await db.select().from(schema.posts).where(eq(schema.posts.userId, userId));
  const slug =
    texto.match(/vi tu post \(([a-z0-9]+)\)/i)?.[1]
    ?? texto.match(/ref[:\s]+([a-z0-9]+)/i)?.[1]
    ?? texto.match(/\/p\/([a-z0-9]+)/i)?.[1];
  if (slug) return allPosts.find((p) => p.trackingSlug === slug) ?? null;
  for (const p of allPosts) {
    if (texto.includes(p.trackingSlug)) return p;
  }
  return null;
}
