import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { DbPartner } from "@/server/db/schema";
import { extractBearerToken, hashPartnerApiKey } from "./keys";

export interface PartnerAuthContext {
  partner: DbPartner;
  apiKeyId: string;
}

export async function authenticatePartnerRequest(
  authHeader: string | null,
): Promise<PartnerAuthContext | null> {
  const raw = extractBearerToken(authHeader);
  if (!raw) return null;

  const prefix = raw.slice(0, 16);
  const hash = hashPartnerApiKey(raw);
  const db = getDb();

  const rows = await db
    .select({
      keyId: schema.partnerApiKeys.id,
      partner: schema.partners,
    })
    .from(schema.partnerApiKeys)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerApiKeys.partnerId))
    .where(
      and(
        eq(schema.partnerApiKeys.keyPrefix, prefix),
        eq(schema.partnerApiKeys.keyHash, hash),
        eq(schema.partnerApiKeys.activo, true),
        eq(schema.partners.activo, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db
    .update(schema.partnerApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.partnerApiKeys.id, row.keyId));

  return { partner: row.partner, apiKeyId: row.keyId };
}

export function partnerAuthErrorResponse() {
  return Response.json({ error: "API key inválida o partner inactivo" }, { status: 401 });
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function parseJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}
