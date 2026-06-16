import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById, updateUserProfile } from "@/server/auth/users";
import { createPartner, createPartnerApiKeyRecord, listPartners, listPartnerApiKeyPrefixes, updatePartnerWebhook } from "@/server/partners/admin";
import { findPartnerBySlug } from "@/server/partners/users";
import { buildPartnerConnectPageUrl } from "@/server/partners/connect";
import { buildPartnerOAuthStartUrl } from "@/server/partners/oauth";
import { upsertPartnerEndUser } from "@/server/partners/users";
import { notifyPartnerWebhook } from "@/server/partners/webhooks";
import type { Red } from "@/lib/mock/types";

async function requireAdmin(token: string) {
  const session = await verifySessionToken(token);
  if (!session) throw new Error("Sesión inválida");
  const user = await findUserById(session.userId);
  if (!user?.isAdmin) throw new Error("Solo administradores");
  return user;
}

export const partnerAdminList = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    await requireAdmin(data.token);
    const partners = await listPartners();
    const withKeys = await Promise.all(
      partners.map(async (p) => ({
        ...p,
        api_keys: await listPartnerApiKeyPrefixes(p.id),
      })),
    );
    return { ok: true as const, partners: withKeys };
  });

export const partnerAdminCreate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      slug: z.string().min(2),
      nombre: z.string().min(2),
      brand_name: z.string().min(2),
      logo_url: z.string().optional(),
      primary_color: z.string().optional(),
      allowed_return_origins: z.array(z.string()).optional(),
      webhook_url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    await requireAdmin(data.token);
    try {
      const partner = await createPartner(data);
      return { ok: true as const, partner };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear partner";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return { ok: false as const, error: "El slug ya existe" };
      }
      return { ok: false as const, error: msg };
    }
  });

export const partnerAdminCreateApiKey = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      partner_id: z.string().uuid(),
      label: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    await requireAdmin(data.token);
    const { apiKey, record } = await createPartnerApiKeyRecord(data.partner_id, data.label ?? "default");
    return {
      ok: true as const,
      api_key: apiKey,
      key_prefix: record.keyPrefix,
      id: record.id,
    };
  });

export const getPartnerConnectPage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      partner_slug: z.string(),
      external_user_id: z.string(),
      return_url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const partner = await findPartnerBySlug(data.partner_slug);
    if (!partner) return { ok: false as const, error: "Partner no encontrado" };

    const { user } = await upsertPartnerEndUser(partner, {
      external_user_id: data.external_user_id,
    });

    return {
      ok: true as const,
      partner: {
        slug: partner.slug,
        brand_name: partner.brandName,
        logo_url: partner.logoUrl,
        primary_color: partner.primaryColor,
      },
      external_user_id: data.external_user_id,
      user_id: user.id,
      return_url: data.return_url,
    };
  });

export const startPartnerOAuthFromConnect = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      partner_slug: z.string(),
      external_user_id: z.string(),
      red: z.enum(["facebook", "instagram", "tiktok", "youtube"]),
      return_url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const partner = await findPartnerBySlug(data.partner_slug);
    if (!partner) return { ok: false as const, error: "Partner no encontrado" };

    const { user } = await upsertPartnerEndUser(partner, {
      external_user_id: data.external_user_id,
    });

    const result = buildPartnerOAuthStartUrl(
      partner,
      user.id,
      data.external_user_id,
      data.red as Red,
      data.return_url,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, url: result.url };
  });

export const confirmPartnerWhatsAppPhone = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      partner_slug: z.string(),
      external_user_id: z.string(),
      celular: z.string().min(8),
      codigo_pais: z.string().default("+52"),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const partner = await findPartnerBySlug(data.partner_slug);
    if (!partner) return { ok: false as const, error: "Partner no encontrado" };

    const { user } = await upsertPartnerEndUser(partner, {
      external_user_id: data.external_user_id,
      celular: data.celular.replace(/\D/g, ""),
      codigo_pais: data.codigo_pais,
    });

    await updateUserProfile(user.id, {
      celular: data.celular.replace(/\D/g, ""),
      codigo_pais: data.codigo_pais,
      whatsapp_configurado: true,
    });

    const displayPhone = `${data.codigo_pais} ${data.celular.replace(/\D/g, "")}`;
    notifyPartnerWebhook(partner, "whatsapp.connected", data.external_user_id, {
      display_phone: displayPhone,
    });

    return {
      ok: true as const,
      display_phone: displayPhone,
    };
  });

export const getPartnerConnectUrlForAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      partner_slug: z.string(),
      external_user_id: z.string(),
      return_url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    await requireAdmin(data.token);
    const partner = await findPartnerBySlug(data.partner_slug);
    if (!partner) return { ok: false as const, error: "Partner no encontrado" };
    return {
      ok: true as const,
      connect_url: buildPartnerConnectPageUrl(partner, data.external_user_id, data.return_url),
    };
  });

export const partnerAdminUpdateWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      partner_id: z.string().uuid(),
      webhook_url: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    await requireAdmin(data.token);
    const updated = await updatePartnerWebhook(data.partner_id, data.webhook_url);
    if (!updated) return { ok: false as const, error: "Partner no encontrado" };
    return { ok: true as const, webhook_url: updated.webhookUrl };
  });
