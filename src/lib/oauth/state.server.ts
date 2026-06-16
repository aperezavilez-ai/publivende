import { createHmac, timingSafeEqual } from "node:crypto";
import { getOAuthStateSecret } from "./config.server";
import type { Red } from "@/lib/mock/types";

export interface OAuthStatePayload {
  userId: string;
  red: Red;
  returnTo: string;
  ts: number;
  partnerId?: string;
  externalUserId?: string;
  partnerReturnUrl?: string;
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!payload.userId || !payload.red || !payload.ts) return null;
    if (Date.now() - payload.ts > 15 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
