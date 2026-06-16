import { resolveAppBaseUrl } from "@/lib/app-url";
import { buildHostedOnboardUrl } from "@/server/whatsapp/embedded-signup";
import { getMetaAppIdPublic, getEmbeddedSignupConfigId } from "@/server/whatsapp/embedded-signup";
import type { DbPartner } from "@/server/db/schema";
import type { Red } from "@/lib/mock/types";
import { isReturnUrlAllowed } from "./users";

export function buildPartnerConnectPageUrl(
  partner: DbPartner,
  externalUserId: string,
  returnUrl?: string,
): string {
  const base = resolveAppBaseUrl();
  const url = new URL(`${base}/connect/${partner.slug}`);
  url.searchParams.set("external_user_id", externalUserId);
  if (returnUrl) url.searchParams.set("return_url", returnUrl);
  return url.toString();
}

export function buildPartnerWhatsAppOnboardUrl(partner: DbPartner, externalUserId: string, returnUrl?: string) {
  const appId = getMetaAppIdPublic();
  if (!appId) return null;

  const connectPage = buildPartnerConnectPageUrl(partner, externalUserId, returnUrl);
  const metaUrl = buildHostedOnboardUrl(appId, getEmbeddedSignupConfigId());
  return { connect_page_url: connectPage, meta_onboard_url: metaUrl };
}

export function buildPartnerOAuthReturnPath(
  partner: DbPartner,
  externalUserId: string,
  returnUrl?: string,
): string {
  const path = `/connect/${partner.slug}`;
  const params = new URLSearchParams({ external_user_id: externalUserId });
  if (returnUrl && isReturnUrlAllowed(partner, returnUrl)) {
    params.set("return_url", returnUrl);
  }
  return `${path}?${params.toString()}`;
}

export const PARTNER_CONNECT_REDES: Red[] = ["instagram", "facebook", "tiktok", "youtube"];
