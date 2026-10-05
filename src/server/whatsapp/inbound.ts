import { eq, and, desc, ne } from "drizzle-orm";
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

const HISTORY_TURNS = 12;
const DEFAULT_TIMEZONE = "America/Mexico_City";

/** Interpreta horarios tipo "Lunes a sábado, 9am a 7pm" o "09:00 - 18:30". */
export function parseHorario(horario: string | null | undefined): { open: number; close: number } | null {
  if (!horario) return null;
  const m = horario.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|hrs|h)?\s*(?:a|-|–|al|hasta)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|hrs|h)?/i);
  if (!m) return null;
  const toMinutes = (h: string, min: string | undefined, suffix: string | undefined, isClose: boolean) => {
    let hour = Number(h);
    const s = suffix?.toLowerCase();
    if (s === "pm" && hour < 12) hour += 12;
    else if (s === "am" && hour === 12) hour = 0;
    // "9 a 7" sin am/pm: el cierre se entiende por la tarde.
    else if (s !== "am" && s !== "pm" && isClose && hour <= 9) hour += 12;
    return hour * 60 + Number(min ?? 0);
  };
  const open = toMinutes(m[1]!, m[2], m[3], false);
  const close = toMinutes(m[4]!, m[5], m[6], true);
  return close > open ? { open, close } : null;
}

function isOutsideHours(horario: string | null | undefined, now = new Date()): boolean {
  const range = parseHorario(horario);
  if (!range) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BUSINESS_TIMEZONE ?? DEFAULT_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const current = hour * 60 + minute;
  return current < range.open || current >= range.close;
}

/** Procesa mensaje entrante de WhatsApp Cloud API webhook. */
export async function processWhatsAppWebhook(userId: string, msg: WebhookMessage) {
  const db = getDb();
  const texto = msg.text?.body ?? "";
  if (!texto) return;

  const duplicate = await db
    .select({ id: schema.whatsappMessages.id })
    .from(schema.whatsappMessages)
    .where(and(eq(schema.whatsappMessages.userId, userId), eq(schema.whatsappMessages.waMessageId, msg.id)))
    .limit(1);
  if (duplicate.length) return;

  const celular = `+${msg.from}`;
  const contacts = await db
    .select()
    .from(schema.whatsappContacts)
    .where(and(eq(schema.whatsappContacts.userId, userId), eq(schema.whatsappContacts.celular, celular)))
    .limit(1);

  let contact = contacts[0];
  const isNewContact = !contact;
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
        noLeidos: 1,
      })
      .returning();
    contact = inserted[0]!;
  } else {
    await db
      .update(schema.whatsappContacts)
      .set({
        noLeidos: (contact.noLeidos ?? 0) + 1,
        ...(resolvedPost && !contact.postOrigenId
          ? { postOrigenId: resolvedPost.id, origen: `Publicación: ${resolvedPost.copy.slice(0, 55)}…` }
          : {}),
      })
      .where(eq(schema.whatsappContacts.id, contact.id));
    if (resolvedPost && !contact.postOrigenId) contact = { ...contact, postOrigenId: resolvedPost.id };
  }

  const [inbound] = await db
    .insert(schema.whatsappMessages)
    .values({
      contactId: contact.id,
      userId,
      direccion: "entrante",
      texto,
      automatico: false,
      postId: resolvedPost?.id ?? contact.postOrigenId ?? undefined,
      waMessageId: msg.id,
    })
    .returning();

  const profile = await findUserById(userId);
  if (!profile) return;

  const rules = await db
    .select()
    .from(schema.automationRules)
    .where(and(eq(schema.automationRules.userId, userId), eq(schema.automationRules.activa, true)));

  const postId = contact.postOrigenId ?? resolvedPost?.id ?? undefined;
  // Vendedor IA: siempre que haya publicación vinculada; sin publicación, solo plan Business (24/7).
  const aiWillReply = isRealAIEnabled() && (!!postId || profile.plan === "business");
  const fillTemplate = (t: string) =>
    t
      .replace(/\{nombre\}/g, contact.nombre.split(" ")[0] ?? "")
      .replace(/\{negocio\}/g, profile.nombreNegocio)
      .replace(/\{horario\}/g, profile.horarioAtencion ?? "9am a 7pm");

  let keywordMatched = false;
  for (const rule of rules) {
    let fire = false;
    if (rule.disparador === "mensaje_nuevo") fire = isNewContact;
    else if (rule.disparador === "palabra_clave" && rule.palabraClave) {
      fire = texto.toLowerCase().includes(rule.palabraClave.toLowerCase());
      if (fire) keywordMatched = true;
    } else if (rule.disparador === "fuera_de_horario") {
      fire = !aiWillReply && isOutsideHours(profile.horarioAtencion);
    }
    if (fire) await sendAndLog(userId, contact.id, contact.celular, fillTemplate(rule.respuesta), contact.postOrigenId ?? undefined);
  }

  if (!aiWillReply || keywordMatched) return;

  const historyRows = await db
    .select({ direccion: schema.whatsappMessages.direccion, texto: schema.whatsappMessages.texto })
    .from(schema.whatsappMessages)
    .where(
      and(
        eq(schema.whatsappMessages.contactId, contact.id),
        inbound ? ne(schema.whatsappMessages.id, inbound.id) : undefined,
      ),
    )
    .orderBy(desc(schema.whatsappMessages.createdAt))
    .limit(HISTORY_TURNS);

  const [businessContext, postContext] = await Promise.all([
    getBusinessContextServer(userId),
    postId ? getPostContextBlockServer(userId, postId) : Promise.resolve(""),
  ]);
  const aiReply = await generatePostReplyOpenAI({
    businessContext,
    postContext,
    customerMessage: texto,
    customerName: contact.nombre,
    history: historyRows.reverse(),
  });
  await sendAndLog(userId, contact.id, contact.celular, aiReply, postId);
}

async function sendAndLog(userId: string, contactId: string, celular: string, texto: string, postId?: string) {
  const db = getDb();
  const sent = await sendWhatsAppMessage({ to: celular, text: texto, userId });
  if (!sent.ok) {
    console.error("[whatsapp inbound] envío fallido", sent.error);
    return;
  }
  await db.insert(schema.whatsappMessages).values({
    contactId,
    userId,
    direccion: "saliente",
    texto,
    automatico: true,
    postId,
    waMessageId: sent.messageId,
  });
}

async function resolvePostFromTextServer(userId: string, texto: string) {
  const db = getDb();
  const allPosts = await db.select().from(schema.posts).where(eq(schema.posts.userId, userId));
  const slug =
    texto.match(/vi tu post \(([a-z0-9-]+)\)/i)?.[1]
    ?? texto.match(/ref[:\s]+([a-z0-9-]+)/i)?.[1]
    ?? texto.match(/\/p\/([a-z0-9-]+)/i)?.[1];
  if (slug) return allPosts.find((p) => p.trackingSlug === slug) ?? null;
  for (const p of allPosts) {
    if (texto.includes(p.trackingSlug)) return p;
  }
  return null;
}
