import process from "node:process";

import { providerForRed as providerForRedShared, type OAuthProvider } from "./providers";
import { resolveAppBaseUrl } from "@/lib/app-url";
import type { Red } from "@/lib/mock/types";

export type { OAuthProvider };
export { providerForRedShared as providerForRed };

export function getAppBaseUrl(): string {
  return resolveAppBaseUrl();
}

export function getOAuthStateSecret(): string {
  return process.env.OAUTH_STATE_SECRET ?? process.env.META_APP_SECRET ?? "dev-oauth-secret-change-me";
}

export function getMetaScopesForRed(red: Red): string[] {
  // Meta requiere pages_show_list, pages_read_engagement, pages_manage_posts
  // y read_insights (metricas de la Pagina) e instagram_basic,
  // instagram_content_publish para conectar ambas redes a la vez.
  const base = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "read_insights",
  ];
  if (red === "instagram" || red === "facebook") {
    return [...base, "instagram_basic", "instagram_content_publish"];
  }
  return base;
}

export function getMetaOAuthConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  // Meta tiene registrada en la lista blanca oficial https://www.publivende.mx/facebook/callback
  const baseUrl =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
      ? "https://www.publivende.mx"
      : getAppBaseUrl();
  return {
    appId,
    appSecret,
    redirectUri: `${baseUrl}/facebook/callback`,
    scopes: getMetaScopesForRed("facebook"),
  };
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${getAppBaseUrl()}/oauth/callback/google`,
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  };
}

export function getTikTokOAuthConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;
  return {
    clientKey,
    clientSecret,
    redirectUri: `${getAppBaseUrl()}/oauth/callback/tiktok`,
    scopes: ["user.info.basic", "user.info.stats", "video.publish", "video.upload", "video.list"],
  };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  if (provider === "meta") return !!getMetaOAuthConfig();
  if (provider === "google") return !!getGoogleOAuthConfig();
  return !!getTikTokOAuthConfig();
}
