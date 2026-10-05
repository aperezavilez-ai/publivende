import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getAppBaseUrl,
  getGoogleOAuthConfig,
  getMetaOAuthConfig,
  getMetaScopesForRed,
  getTikTokOAuthConfig,
  isOAuthConfigured,
  type OAuthProvider,
} from "@/lib/oauth/config.server";
import { providerForRed } from "@/lib/oauth/providers";
import {
  createMetaPageSelectToken,
  createOAuthState,
  verifyMetaPageSelectToken,
  verifyOAuthState,
} from "@/lib/oauth/state.server";
import { isProductionMode } from "@/server/config";
import { findUserById, upsertOAuthAccount } from "@/server/auth/users";
import { verifySessionToken } from "@/server/auth/crypto";
import { upsertHubChannel } from "@/server/red/channels";
import { findPartnerById } from "@/server/partners/users";
import { notifyPartnerWebhook } from "@/server/partners/webhooks";
import type { Red } from "@/lib/mock/types";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);

export const getOAuthStatus = createServerFn({ method: "POST" }).handler(async () => {
  const baseUrl = getAppBaseUrl();
  const meta = getMetaOAuthConfig();
  const google = getGoogleOAuthConfig();
  const tiktok = getTikTokOAuthConfig();
  return {
    appBaseUrl: baseUrl,
    meta: !!meta,
    google: !!google,
    tiktok: !!tiktok,
    redirectUris: {
      meta: meta?.redirectUri ?? `${baseUrl}/facebook/callback`,
      google: google?.redirectUri ?? `${baseUrl}/oauth/callback/google`,
      tiktok: tiktok?.redirectUri ?? `${baseUrl}/oauth/callback/tiktok`,
    },
    metaAppDomains: ["publivende.mx", "www.publivende.mx"],
  };
});

export const buildOAuthStartUrl = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      red: redSchema,
      userId: z.string().min(1),
      returnTo: z.string().default("/configuracion"),
      pageHint: z.string().optional(),
      purpose: z.literal("hub").optional(),
      token: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const provider = providerForRed(data.red);
    if (!provider) return { ok: false as const, error: "Red no soportada" };
    if (data.purpose === "hub") {
      const session = data.token ? await verifySessionToken(data.token) : null;
      const admin = session ? await findUserById(session.userId) : null;
      if (!session || session.userId !== data.userId || !admin?.isAdmin) {
        return { ok: false as const, error: "Solo el administrador puede conectar cuentas oficiales", provider };
      }
    }
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
      returnTo: data.purpose === "hub" ? "/red" : data.returnTo,
      pageHint: data.pageHint,
      purpose: data.purpose,
      ts: Date.now(),
    });

    if (provider === "meta") {
      const cfg = getMetaOAuthConfig()!;
      const scopes = getMetaScopesForRed(data.red);
      const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
      url.searchParams.set("client_id", cfg.appId);
      url.searchParams.set("redirect_uri", cfg.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", scopes.join(","));
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
  refresh_token?: string;
  external_account_id?: string;
  token_expires_at?: string;
  avatar?: string;
  provider: OAuthProvider;
}

export interface MetaPageOption {
  id: string;
  name: string;
  avatar?: string;
  instagramUsername?: string;
}

type MetaPageRaw = {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string; username?: string };
};

async function exchangeMetaUserToken(code: string): Promise<string> {
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

  // Los tokens de página derivados de un token de usuario de larga duración no expiran;
  // los derivados del token corto caducan en ~1 h y rompen publicación y métricas.
  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      fb_exchange_token: tokenJson.access_token,
    })}`,
  );
  const longJson = (await longRes.json()) as { access_token?: string };
  return longJson.access_token ?? tokenJson.access_token;
}

async function fetchMetaPages(userAccessToken: string): Promise<MetaPageRaw[]> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,username}&access_token=${userAccessToken}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: MetaPageRaw[];
    error?: { message: string };
  };
  const pages = pagesJson.data ?? [];
  if (!pages.length) {
    throw new Error(
      pagesJson.error?.message ??
        "No encontramos Fan Pages. Crea una página de Facebook y vincúlala a tu cuenta de Meta Business.",
    );
  }
  return pages;
}

function toMetaPageOptions(pages: MetaPageRaw[]): MetaPageOption[] {
  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    avatar: page.picture?.data?.url,
    instagramUsername: page.instagram_business_account?.username,
  }));
}

function buildMetaConnectResult(page: MetaPageRaw, red: Red): OAuthConnectResult {
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

async function finalizeMetaOAuth(
  payload: ReturnType<typeof verifyOAuthState>,
  userAccessToken: string,
  pageId?: string,
): Promise<
  | { kind: "connected"; result: OAuthConnectResult }
  | { kind: "select_page"; pages: MetaPageOption[]; pageSelectToken: string }
> {
  if (!payload) throw new Error("Sesión OAuth inválida");

  const pages = await fetchMetaPages(userAccessToken);
  const eligible =
    payload.red === "instagram"
      ? pages.filter((p) => p.instagram_business_account?.username)
      : pages;

  if (!eligible.length) {
    throw new Error(
      payload.red === "instagram"
        ? "Ninguna de tus Fan Pages tiene Instagram Business vinculado. Conéctalo en Meta Business Suite primero."
        : "No encontramos Fan Pages disponibles en tu cuenta de Meta.",
    );
  }

  if (pageId) {
    const page = eligible.find((p) => p.id === pageId);
    if (!page) throw new Error("La página seleccionada no está disponible. Intenta conectar de nuevo.");
    return { kind: "connected", result: buildMetaConnectResult(page, payload.red) };
  }

  if (eligible.length === 1) {
    return { kind: "connected", result: buildMetaConnectResult(eligible[0], payload.red) };
  }

  return {
    kind: "select_page",
    pages: toMetaPageOptions(eligible),
    pageSelectToken: createMetaPageSelectToken({
      userId: payload.userId,
      red: payload.red,
      returnTo: payload.returnTo,
      userAccessToken,
      ts: Date.now(),
      partnerId: payload.partnerId,
      externalUserId: payload.externalUserId,
      partnerReturnUrl: payload.partnerReturnUrl,
    }),
  };
}

async function persistOAuthConnect(
  payload: NonNullable<ReturnType<typeof verifyOAuthState>>,
  result: OAuthConnectResult,
) {
  if (!isProductionMode()) return;

  await upsertOAuthAccount(payload.userId, {
    red: result.red,
    nombre_cuenta: result.nombre_cuenta,
    access_token: result.access_token,
    refresh_token: result.refresh_token,
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
    refresh_token?: string;
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
    refresh_token: tokenJson.refresh_token,
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
    refresh_token?: string;
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
    refresh_token: tokenJson.refresh_token,
    external_account_id: tokenJson.open_id ?? u?.open_id,
    token_expires_at: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : undefined,
    avatar: u?.avatar_url,
    provider: "tiktok",
  };
}

/** Importa como cuentas oficiales todas las páginas (y su Instagram si se pidió) o el canal conectado. */
async function connectHubChannels(
  payload: NonNullable<ReturnType<typeof verifyOAuthState>>,
  provider: OAuthProvider,
  code: string,
): Promise<string[]> {
  const admin = await findUserById(payload.userId);
  if (!admin?.isAdmin) throw new Error("Solo el administrador puede conectar cuentas oficiales");

  if (provider === "meta") {
    const pages = await fetchMetaPages(await exchangeMetaUserToken(code));
    const names: string[] = [];
    for (const page of pages) {
      await upsertHubChannel({
        red: "facebook",
        externalAccountId: page.id,
        nombre: page.name,
        avatar: page.picture?.data?.url,
        accessToken: page.access_token,
        oauthProvider: "meta",
      });
      names.push(page.name);
      const ig = page.instagram_business_account;
      if (payload.red === "instagram" && ig?.username) {
        await upsertHubChannel({
          red: "instagram",
          externalAccountId: ig.id,
          nombre: `@${ig.username}`,
          avatar: page.picture?.data?.url,
          accessToken: page.access_token,
          oauthProvider: "meta",
        });
        names.push(`@${ig.username}`);
      }
    }
    return names;
  }

  const result = provider === "google" ? await exchangeGoogleCode(code) : await exchangeTikTokCode(code);
  if (!result.external_account_id) throw new Error("La red no devolvió el identificador de la cuenta");
  await upsertHubChannel({
    red: result.red,
    externalAccountId: result.external_account_id,
    nombre: result.nombre_cuenta,
    avatar: result.avatar,
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    tokenExpiresAt: result.token_expires_at ? new Date(result.token_expires_at) : undefined,
    oauthProvider: provider,
  });
  return [result.nombre_cuenta];
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
      if (payload.purpose === "hub") {
        const cuentas = await connectHubChannels(payload, data.provider, data.code);
        return { ok: true as const, hub: true as const, returnTo: "/red", cuentas };
      }

      if (data.provider === "meta") {
        const userAccessToken = await exchangeMetaUserToken(data.code);
        const meta = await finalizeMetaOAuth(payload, userAccessToken);

        if (meta.kind === "select_page") {
          return {
            ok: true as const,
            needsPageSelection: true as const,
            userId: payload.userId,
            returnTo: payload.returnTo,
            red: payload.red,
            pageHint: payload.pageHint,
            pages: meta.pages,
            pageSelectToken: meta.pageSelectToken,
          };
        }

        await persistOAuthConnect(payload, meta.result);

        return {
          ok: true as const,
          needsPageSelection: false as const,
          userId: payload.userId,
          returnTo: payload.returnTo,
          partnerReturnUrl: payload.partnerReturnUrl,
          externalUserId: payload.externalUserId,
          account: meta.result,
        };
      }

      const result =
        data.provider === "google" ? await exchangeGoogleCode(data.code) : await exchangeTikTokCode(data.code);

      await persistOAuthConnect(payload, result);

      return {
        ok: true as const,
        needsPageSelection: false as const,
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

export const completeMetaPageSelection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      pageSelectToken: z.string().min(1),
      pageId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const payload = verifyMetaPageSelectToken(data.pageSelectToken);
    if (!payload) {
      return { ok: false as const, error: "La selección expiró. Conecta de nuevo desde Configuración." };
    }

    try {
      const meta = await finalizeMetaOAuth(
        {
          userId: payload.userId,
          red: payload.red,
          returnTo: payload.returnTo,
          ts: payload.ts,
          partnerId: payload.partnerId,
          externalUserId: payload.externalUserId,
          partnerReturnUrl: payload.partnerReturnUrl,
        },
        payload.userAccessToken,
        data.pageId,
      );

      if (meta.kind !== "connected") {
        return { ok: false as const, error: "No pudimos vincular la página seleccionada." };
      }

      await persistOAuthConnect(
        {
          userId: payload.userId,
          red: payload.red,
          returnTo: payload.returnTo,
          ts: payload.ts,
          partnerId: payload.partnerId,
          externalUserId: payload.externalUserId,
          partnerReturnUrl: payload.partnerReturnUrl,
        },
        meta.result,
      );

      return {
        ok: true as const,
        userId: payload.userId,
        returnTo: payload.returnTo,
        partnerReturnUrl: payload.partnerReturnUrl,
        externalUserId: payload.externalUserId,
        account: meta.result,
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Error OAuth" };
    }
  });
