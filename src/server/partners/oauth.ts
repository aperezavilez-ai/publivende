import {
  getGoogleOAuthConfig,
  getMetaOAuthConfig,
  getTikTokOAuthConfig,
  isOAuthConfigured,
} from "@/lib/oauth/config.server";
import { providerForRed } from "@/lib/oauth/providers";
import { createOAuthState } from "@/lib/oauth/state.server";
import type { Red } from "@/lib/mock/types";
import type { DbPartner } from "@/server/db/schema";
import { buildPartnerOAuthReturnPath } from "./connect";

export function buildPartnerOAuthStartUrl(
  partner: DbPartner,
  userId: string,
  externalUserId: string,
  red: Red,
  returnUrl?: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const provider = providerForRed(red);
  if (!provider) return { ok: false, error: "Red no soportada" };
  if (!isOAuthConfigured(provider)) {
    return { ok: false, error: `OAuth no configurado para ${provider}` };
  }

  const returnTo = buildPartnerOAuthReturnPath(partner, externalUserId, returnUrl);
  const state = createOAuthState({
    userId,
    red,
    returnTo,
    ts: Date.now(),
    partnerId: partner.id,
    externalUserId,
    partnerReturnUrl: returnUrl,
  });

  if (provider === "meta") {
    const cfg = getMetaOAuthConfig()!;
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", cfg.appId);
    url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", cfg.scopes.join(","));
    url.searchParams.set("response_type", "code");
    return { ok: true, url: url.toString() };
  }

  if (provider === "google") {
    const cfg = getGoogleOAuthConfig()!;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", cfg.scopes.join(" "));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return { ok: true, url: url.toString() };
  }

  const cfg = getTikTokOAuthConfig()!;
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", cfg.clientKey);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", cfg.scopes.join(","));
  url.searchParams.set("response_type", "code");
  return { ok: true, url: url.toString() };
}
