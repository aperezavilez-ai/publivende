import { createHmac, timingSafeEqual } from "node:crypto";
import { getOAuthStateSecret } from "./config.server";
import type { Red } from "@/lib/mock/types";

export interface OAuthStatePayload {
  userId: string;
  red: Red;
  returnTo: string;
  ts: number;
  pageHint?: string;
  partnerId?: string;
  externalUserId?: string;
  partnerReturnUrl?: string;
  /** "hub" = el administrador conecta cuentas oficiales de la red PubliVende. */
  purpose?: "hub";
}

function sign(data: string): string {
  return createHmac("sha256", getOAuthStateSecret()).update(data).digest("base64url");
}

export function createOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  return verifySignedPayload<OAuthStatePayload>(state, (payload) => {
    if (!payload.userId || !payload.red || !payload.ts) return null;
    return payload;
  });
}

export interface MetaPageSelectPayload {
  userId: string;
  red: Red;
  returnTo: string;
  userAccessToken: string;
  ts: number;
  partnerId?: string;
  externalUserId?: string;
  partnerReturnUrl?: string;
}

export function createMetaPageSelectToken(payload: MetaPageSelectPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyMetaPageSelectToken(token: string): MetaPageSelectPayload | null {
  return verifySignedPayload<MetaPageSelectPayload>(token, (payload) => {
    if (!payload.userId || !payload.red || !payload.userAccessToken || !payload.ts) return null;
    return payload;
  });
}

function verifySignedPayload<T extends { ts: number }>(
  state: string,
  validate: (payload: T) => T | null,
): T | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (!payload.ts || Date.now() - payload.ts > 15 * 60 * 1000) return null;
    return validate(payload);
  } catch {
    return null;
  }
}
