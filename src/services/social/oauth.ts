import type { Red } from "@/lib/mock/types";
import { buildOAuthStartUrl, getOAuthStatus } from "@/lib/api/oauth.functions";
import { oauthProviderLabel } from "@/lib/oauth/providers";

export type { OAuthConnectResult } from "@/lib/api/oauth.functions";
export { oauthProviderLabel };

export async function startSocialOAuthConnect(
  userId: string,
  red: Red,
  returnTo = "/configuracion",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const result = await buildOAuthStartUrl({ data: { red, userId, returnTo } });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, url: result.url };
}

export async function fetchOAuthProvidersStatus() {
  return getOAuthStatus();
}
