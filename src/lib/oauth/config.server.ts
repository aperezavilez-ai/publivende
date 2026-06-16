import process from "node:process";

import { providerForRed as providerForRedShared, type OAuthProvider } from "./providers";
import { resolveAppBaseUrl } from "@/lib/app-url";

export type { OAuthProvider };
export { providerForRedShared as providerForRed };

export function getAppBaseUrl(): string {
  return resolveAppBaseUrl();
}

export function getOAuthStateSecret(): string {
  return process.env.OAUTH_STATE_SECRET ?? process.env.META_APP_SECRET ?? "dev-oauth-secret-change-me";
}

export function getMetaOAuthConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return {
    appId,
    appSecret,
    redirectUri: `${getAppBaseUrl()}/oauth/callback/meta`,
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
      "business_management",
    ],
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
    scopes: ["user.info.basic", "video.publish", "video.upload"],
  };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  if (provider === "meta") return !!getMetaOAuthConfig();
  if (provider === "google") return !!getGoogleOAuthConfig();
  return !!getTikTokOAuthConfig();
}
