import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getGoogleOAuthConfig,
  getMetaOAuthConfig,
  getTikTokOAuthConfig,
  isOAuthConfigured,
  type OAuthProvider,
} from "@/lib/oauth/config.server";
import { providerForRed } from "@/lib/oauth/providers";
import { createOAuthState, verifyOAuthState } from "@/lib/oauth/state.server";
import { isProductionMode } from "@/server/config";
import { upsertOAuthAccount } from "@/server/auth/users";
import { findPartnerById } from "@/server/partners/users";
import { notifyPartnerWebhook } from "@/server/partners/webhooks";
import type { Red } from "@/lib/mock/types";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);

export const getOAuthStatus = createServerFn({ method: "POST" }).handler(async () => ({
  meta: isOAuthConfigured("meta"),
  google: isOAuthConfigured("google"),
  tiktok: isOAuthConfigured("tiktok"),
}));

export const buildOAuthStartUrl = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      red: redSchema,
      userId: z.string().min(1),
      returnTo: z.string().default("/configuracion"),
    }),
  )
  .handler(async ({ data }) => {
    const provider = providerForRed(data.red);
    if (!provider) return { ok: false as const, error: "Red no soportada" };
    if (!isOAuthConfigured(provider)) {
      return {
        ok: false as const,
        error: `OAuth no configurado para ${provider}. Copia .env.example a .env y agrega las credenciales.`,
        provider,
      };
    }

    const state = createOAuthState({
      userId: data.userId,
      red: data.red,
      returnTo: data.returnTo,
      ts: Date.now(),
    });

    if (provider === "meta") {
      const cfg = getMetaOAuthConfig()!;
      const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
      url.searchParams.set("client_id", cfg.appId);
      url.searchParams.set("redirect_uri", cfg.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", cfg.scopes.join(","));
      url.searchParams.set("response_type", "code");
      return { ok: true as const, url: url.toString(), provider };
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
      return { ok: true as const, url: url.toString(), provider };
    }

    const cfg = getTikTokOAuthConfig()!;
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", cfg.clientKey);
    url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", cfg.scopes.join(","));
    url.searchParams.set("response_type", "code");
    return { ok: true as const, url: url.toString(), provider };
  });

export interface OAuthConnectResult {
  red: Red;
  nombre_cuenta: string;
  access_token: string;
  external_account_id?: string;
  token_expires_at?: string;
  avatar?: string;
  provider: OAuthProvider;
}

async function exchangeMetaCode(code: string, red: Red): Promise<OAuthConnectResult> {
  const cfg = getMetaOAuthConfig()!;
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      redirect_uri: cfg.redirectUri,
      code,
    })}`,
  );
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
  if (!tokenJson.access_token) {
    throw new Error(tokenJson.error?.message ?? "Meta no devolvió access_token");
  }

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,username}&access_token=${tokenJson.access_token}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      picture?: { data?: { url?: string } };
      instagram_business_account?: { id: string; username?: string };
    }>;
    error?: { message: string };
  };

  const page = pagesJson.data?.[0];
  if (!page) {
    throw new Error(
      pagesJson.error?.message ??
        "No encontramos una Fan Page. Crea una página de Facebook y vincúlala a tu cuenta de Meta Business.",
    );
  }

  if (red === "instagram") {
    const ig = page.instagram_business_account;
    if (!ig?.username) {
      throw new Error(
        "Esta Fan Page no tiene Instagram Business vinculado. Conéctalo en Meta Business Suite primero.",
      );
    }
    return {
      red,
      nombre_cuenta: `@${ig.username}`,
      access_token: page.access_token,
      external_account_id: ig.id,
      avatar: page.picture?.data?.url,
      provider: "meta",
    };
  }

  return {
    red: "facebook",
    nombre_cuenta: page.name,
    access_token: page.access_token,
    external_account_id: page.id,
    avatar: page.picture?.data?.url,
    provider: "meta",
  };
}

async function exchangeGoogleCode(code: string): Promise<OAuthConnectResult> {
  const cfg = getGoogleOAuthConfig()!;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? tokenJson.error ?? "Google no devolvió token");
  }

  const chRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  );
  const chJson = (await chRes.json()) as {
    items?: Array<{ id: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }>;
    error?: { message: string };
  };
  const channel = chJson.items?.[0];
  if (!channel) {
    throw new Error(chJson.error?.message ?? "No hay canal de YouTube en esta cuenta de Google");
  }

  return {
    red: "youtube",
    nombre_cuenta: channel.snippet?.title ?? "YouTube",
    access_token: tokenJson.access_token,
    external_account_id: channel.id,
    token_expires_at: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : undefined,
    avatar: channel.snippet?.thumbnails?.default?.url,
    provider: "google",
  };
}

async function exchangeTikTokCode(code: string): Promise<OAuthConnectResult> {
  const cfg = getTikTokOAuthConfig()!;
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: cfg.clientKey,
      client_secret: cfg.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    open_id?: string;
    error_description?: string;
  };
  if (!tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? "TikTok no devolvió token");
  }

  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const userJson = (await userRes.json()) as {
    data?: { user?: { display_name?: string; avatar_url?: string; open_id?: string } };
  };
  const u = userJson.data?.user;

  return {
    red: "tiktok",
    nombre_cuenta: u?.display_name ?? "TikTok",
    access_token: tokenJson.access_token,
    external_account_id: tokenJson.open_id ?? u?.open_id,
    token_expires_at: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : undefined,
    avatar: u?.avatar_url,
    provider: "tiktok",
  };
}

export const completeOAuthCallback = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      provider: z.enum(["meta", "google", "tiktok"]),
      code: z.string().min(1),
      state: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const payload = verifyOAuthState(data.state);
    if (!payload) return { ok: false as const, error: "Sesión OAuth inválida o expirada. Intenta de nuevo." };

    try {
      let result: OAuthConnectResult;
      if (data.provider === "meta") {
        result = await exchangeMetaCode(data.code, payload.red);
      } else if (data.provider === "google") {
        result = await exchangeGoogleCode(data.code);
      } else {
        result = await exchangeTikTokCode(data.code);
      }

      if (isProductionMode()) {
        await upsertOAuthAccount(payload.userId, {
          red: result.red,
          nombre_cuenta: result.nombre_cuenta,
          access_token: result.access_token,
          external_account_id: result.external_account_id,
          token_expires_at: result.token_expires_at,
          avatar: result.avatar,
          oauth_provider: result.provider,
        });

        if (payload.partnerId && payload.externalUserId) {
          const partner = await findPartnerById(payload.partnerId);
          if (partner) {
            notifyPartnerWebhook(partner, "connection.connected", payload.externalUserId, {
              platform: result.red,
              nombre_cuenta: result.nombre_cuenta,
            });
          }
        }
      }

      return {
        ok: true as const,
        userId: payload.userId,
        returnTo: payload.returnTo,
        partnerReturnUrl: payload.partnerReturnUrl,
        externalUserId: payload.externalUserId,
        account: result,
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Error OAuth" };
    }
  });
