import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "pv_live_";

export function generatePartnerApiKey(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `${KEY_PREFIX}${secret}`;
  const prefix = raw.slice(0, 16);
  const hash = hashPartnerApiKey(raw);
  return { raw, prefix, hash };
}

export function hashPartnerApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.startsWith(KEY_PREFIX) ? token : null;
}
