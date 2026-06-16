import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { isProductionMode, isRealAIEnabled } from "@/server/config";
import { getDb, schema } from "@/server/db";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { broadcastWhatsAppMessages, userHasWhatsAppSending } from "@/server/whatsapp/cloud-api";
import {
  disconnectWhatsAppAccount,
  getWhatsAppFullStatus,
  getWhatsAppAccountPublic,
  upsertWhatsAppAccount,
} from "@/server/whatsapp/accounts";
import {
  completeEmbeddedSignup,
  getEmbeddedSignupConfigId,
  getMetaAppIdPublic,
} from "@/server/whatsapp/embedded-signup";
import { updateUserProfile } from "@/server/auth/users";
import { buildBroadcastMessage } from "@/lib/whatsapp-post";
import { generatePostReplyOpenAI } from "@/server/ai/openai";
import { getBusinessContextServer, getPostContextBlockServer } from "@/server/context";

export const getWhatsAppConnectConfig = createServerFn({ method: "GET" }).handler(async () => {
  const metaAppId = getMetaAppIdPublic();
  const configId = getEmbeddedSignupConfigId();
  return {
    metaAppId,
    configId,
    apiConnectAvailable: !!metaAppId,
    embeddedSignupAvailable: !!metaAppId,
  };
});

export const getWhatsAppAccountStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: true as const, account: { connected: false, mode: "none" as const, apiConnected: false, linkConnected: false }, useLocal: true };
    }
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const profile = await findUserById(session.userId);
    if (!profile) return { ok: false as const, error: "Usuario no encontrado" };
    const account = await getWhatsAppFullStatus(session.userId, {
      celular: profile.celular,
      codigoPais: profile.codigoPais,
      whatsappConfigurado: profile.whatsappConfigurado,
    });
    return { ok: true as const, account, useLocal: false };
  });

/** Conecta WhatsApp con el número del perfil (enlaces wa.me — funciona sin Meta API). */
export const confirmWhatsAppPhoneServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      celular: z.string().min(8),
      codigo_pais: z.string().default("+52"),
    }),
  )
  .handler(async ({ data }) => {
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const celular = data.celular.replace(/\D/g, "");
    if (celular.length < 10) {
      return { ok: false as const, error: "Ingresa un número válido (10 dígitos en México)" };
    }

    if (isProductionMode()) {
      await updateUserProfile(session.userId, {
        celular,
        codigo_pais: data.codigo_pais,
        whatsapp_configurado: true,
      });
    }

    const displayPhone = `${data.codigo_pais} ${celular}`;
    return {
      ok: true as const,
      account: {
        connected: true,
        mode: "link" as const,
        apiConnected: false,
        linkConnected: true,
        displayPhoneNumber: displayPhone,
      },
    };
  });

export const disconnectWhatsAppLinkServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    await updateUserProfile(session.userId, { whatsapp_configurado: false });
    return { ok: true as const };
  });

export const completeWhatsAppConnect = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      code: z.string().min(1),
      wabaId: z.string().min(1),
      phoneNumberId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Modo demo — configura DATABASE_URL" };
    }
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const result = await completeEmbeddedSignup({
      code: data.code,
      wabaId: data.wabaId,
      phoneNumberId: data.phoneNumberId,
    });

    if (!result.ok) return { ok: false as const, error: result.error };

    await upsertWhatsAppAccount(session.userId, {
      wabaId: data.wabaId,
      phoneNumberId: data.phoneNumberId,
      displayPhoneNumber: result.displayPhoneNumber,
      verifiedName: result.verifiedName,
      accessToken: result.accessToken,
      tokenExpiresAt: result.tokenExpiresAt,
    });

    const account = await getWhatsAppAccountPublic(session.userId);
    return { ok: true as const, account };
  });

export const disconnectWhatsAppConnect = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    await disconnectWhatsAppAccount(session.userId);
    return { ok: true as const };
  });

export const broadcastPostLinkServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      postId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Modo demo", useLocal: true };
    }

    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const canSend = await userHasWhatsAppSending(session.userId);
    if (!canSend) {
      const profile = await findUserById(session.userId);
      if (profile?.whatsappConfigurado && profile.celular.replace(/\D/g, "").length >= 10) {
        return {
          ok: true as const,
          sent: 0,
          failed: 0,
          useWaMe: true as const,
          useLocal: false,
        };
      }
      return {
        ok: false as const,
        error: "Conecta tu WhatsApp en Configuración para enviar mensajes",
        useLocal: true,
      };
    }

    const db = getDb();
    const profile = await findUserById(session.userId);
    const postRows = await db
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.id, data.postId), eq(schema.posts.userId, session.userId)))
      .limit(1);
    const post = postRows[0];
    if (!profile || !post) return { ok: false as const, error: "Post no encontrado" };

    const contacts = await db
      .select()
      .from(schema.whatsappContacts)
      .where(eq(schema.whatsappContacts.userId, session.userId));

    if (!contacts.length) return { ok: true as const, sent: 0, failed: 0 };

    const msg = buildBroadcastMessage(
      {
        id: profile.id,
        nombre: profile.nombre,
        email: profile.email,
        password: "",
        celular: profile.celular,
        codigo_pais: profile.codigoPais,
        nombre_negocio: profile.nombreNegocio,
        plan: profile.plan,
        whatsapp_configurado: profile.whatsappConfigurado,
        onboarding_completado: profile.onboardingCompletado,
        fecha_registro: profile.fechaRegistro.toISOString(),
      },
      {
        id: post.id,
        user_id: post.userId,
        tipo: post.tipo as "imagen",
        media_url: post.mediaUrl,
        copy: post.copy,
        redes_destino: post.redesDestino as import("@/lib/mock/types").Red[],
        estado: post.estado as "publicado",
        tracking_slug: post.trackingSlug,
        created_at: post.createdAt.toISOString(),
        source_url: post.sourceUrl ?? undefined,
      },
    );

    const result = await broadcastWhatsAppMessages(session.userId, contacts, msg);

    await db
      .update(schema.posts)
      .set({
        whatsappEnviadoAt: new Date(),
        whatsappBroadcastCount: result.sent,
      })
      .where(eq(schema.posts.id, post.id));

    for (const c of contacts) {
      await db.insert(schema.whatsappMessages).values({
        contactId: c.id,
        userId: session.userId,
        direccion: "saliente",
        texto: msg,
        automatico: false,
        postId: post.id,
      });
      if (!c.postOrigenId) {
        await db
          .update(schema.whatsappContacts)
          .set({ postOrigenId: post.id })
          .where(eq(schema.whatsappContacts.id, c.id));
      }
    }

    return { ok: true as const, sent: result.sent, failed: result.failed, useLocal: false };
  });

export const generateAIReplyServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      contactId: z.string().uuid(),
      message: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isRealAIEnabled()) {
      return { ok: false as const, error: "OPENAI_API_KEY no configurada", useLocal: true };
    }
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const contacts = await db
      .select()
      .from(schema.whatsappContacts)
      .where(and(eq(schema.whatsappContacts.id, data.contactId), eq(schema.whatsappContacts.userId, session.userId)))
      .limit(1);
    const contact = contacts[0];
    if (!contact) return { ok: false as const, error: "Contacto no encontrado" };

    const postId = contact.postOrigenId;
    const postContext = postId
      ? await getPostContextBlockServer(session.userId, postId)
      : "Sin publicación vinculada";
    const businessContext = await getBusinessContextServer(session.userId);

    const reply = await generatePostReplyOpenAI({
      businessContext,
      postContext,
      customerMessage: data.message,
      customerName: contact.nombre,
    });

    return { ok: true as const, reply };
  });

export const syncUserDataServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      data: z.unknown(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    await db
      .insert(schema.userDataSnapshots)
      .values({
        userId: session.userId,
        data: data.data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.userDataSnapshots.userId,
        set: { data: data.data, updatedAt: new Date() },
      });

    return { ok: true as const };
  });

export const loadUserDataServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.userDataSnapshots)
      .where(eq(schema.userDataSnapshots.userId, session.userId))
      .limit(1);

    return { ok: true as const, data: rows[0]?.data ?? null };
  });
