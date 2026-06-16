import { eq, desc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { Red } from "@/lib/mock/types";
import { getWhatsAppFullStatus } from "@/server/whatsapp/accounts";
import { generatePartnerApiKey } from "./keys";

export async function listPartners() {
  const db = getDb();
  return db.select().from(schema.partners).orderBy(desc(schema.partners.createdAt));
}

export async function createPartner(input: {
  slug: string;
  nombre: string;
  brand_name: string;
  logo_url?: string;
  primary_color?: string;
  allowed_return_origins?: string[];
  webhook_url?: string;
}) {
  const db = getDb();
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const rows = await db
    .insert(schema.partners)
    .values({
      slug,
      nombre: input.nombre,
      brandName: input.brand_name,
      logoUrl: input.logo_url,
      primaryColor: input.primary_color ?? "#7c3aed",
      allowedReturnOrigins: input.allowed_return_origins ?? [],
      webhookUrl: input.webhook_url,
    })
    .returning();
  return rows[0]!;
}

export async function createPartnerApiKeyRecord(partnerId: string, label = "default") {
  const db = getDb();
  const { raw, prefix, hash } = generatePartnerApiKey();
  const rows = await db
    .insert(schema.partnerApiKeys)
    .values({ partnerId, keyPrefix: prefix, keyHash: hash, label })
    .returning();
  return { apiKey: raw, record: rows[0]! };
}

export async function listPartnerApiKeyPrefixes(partnerId: string) {
  const db = getDb();
  return db
    .select({
      id: schema.partnerApiKeys.id,
      keyPrefix: schema.partnerApiKeys.keyPrefix,
      label: schema.partnerApiKeys.label,
      activo: schema.partnerApiKeys.activo,
      lastUsedAt: schema.partnerApiKeys.lastUsedAt,
      createdAt: schema.partnerApiKeys.createdAt,
    })
    .from(schema.partnerApiKeys)
    .where(eq(schema.partnerApiKeys.partnerId, partnerId));
}

export async function updatePartnerWebhook(partnerId: string, webhookUrl: string | null) {
  const db = getDb();
  const rows = await db
    .update(schema.partners)
    .set({ webhookUrl, updatedAt: new Date() })
    .where(eq(schema.partners.id, partnerId))
    .returning();
  return rows[0] ?? null;
}

export async function getConnectionStatusForUser(userId: string, profile: {
  celular: string;
  codigoPais: string;
  whatsappConfigurado: boolean;
}) {
  const db = getDb();
  const wa = await getWhatsAppFullStatus(userId, {
    celular: profile.celular,
    codigoPais: profile.codigoPais,
    whatsappConfigurado: profile.whatsappConfigurado,
  });

  const oauth = await db
    .select({
      red: schema.oauthAccounts.red,
      nombreCuenta: schema.oauthAccounts.nombreCuenta,
      estadoConexion: schema.oauthAccounts.estadoConexion,
    })
    .from(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.userId, userId));

  const redes: Red[] = ["facebook", "instagram", "tiktok", "youtube"];
  const social: Record<string, { connected: boolean; nombre_cuenta?: string }> = {};
  for (const red of redes) {
    const acc = oauth.find((o) => o.red === red);
    social[red] = {
      connected: acc?.estadoConexion === "conectada",
      nombre_cuenta: acc?.nombreCuenta,
    };
  }

  return {
    whatsapp: {
      connected: wa.connected,
      mode: wa.mode,
      display_phone: wa.displayPhoneNumber,
    },
    social,
  };
}
