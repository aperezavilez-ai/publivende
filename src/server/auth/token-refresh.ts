import { eq } from "drizzle-orm";

import { getDb, schema } from "@/server/db";
import type { DbOAuthAccount } from "@/server/db/schema";
import { getOAuthAccount } from "@/server/auth/users";
import { getGoogleOAuthConfig, getTikTokOAuthConfig } from "@/lib/oauth/config.server";
import type { Red } from "@/lib/mock/types";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export type RefreshedToken = { accessToken: string; refreshToken?: string; expiresAt?: Date };

export class RefreshRejected extends Error {}

export async function refreshGoogle(refreshToken: string): Promise<RefreshedToken> {
  const cfg = getGoogleOAuthConfig();
  if (!cfg) throw new Error("Google OAuth no configurado");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new RefreshRejected(
      json.error_description ?? json.error ?? "Google rechazó la renovación",
    );
  }
  return {
    accessToken: json.access_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
  };
}

export async function refreshTikTok(refreshToken: string): Promise<RefreshedToken> {
  const cfg = getTikTokOAuthConfig();
  if (!cfg) throw new Error("TikTok OAuth no configurado");
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: cfg.clientKey,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!json.access_token)
    throw new RefreshRejected(json.error_description ?? "TikTok rechazó la renovación");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
  };
}

function needsRefresh(acc: DbOAuthAccount): boolean {
  if (!acc.tokenExpiresAt) return false;
  return acc.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;
}

/**
 * Devuelve la cuenta OAuth con un access token vigente, renovándolo si está por expirar.
 * Si no se puede renovar, marca la cuenta como "expirada" y devuelve null.
 */
export async function getFreshOAuthAccount(
  userId: string,
  red: Red,
): Promise<DbOAuthAccount | null> {
  const acc = await getOAuthAccount(userId, red);
  if (!acc || acc.estadoConexion !== "conectada" || !acc.accessToken) return null;
  if (!needsRefresh(acc)) return acc;

  const provider = acc.oauthProvider;
  if (!acc.refreshToken || (provider !== "google" && provider !== "tiktok")) {
    await markExpired(acc.id, "El acceso expiró. Vuelve a conectar la cuenta.");
    return null;
  }

  try {
    const fresh =
      provider === "google"
        ? await refreshGoogle(acc.refreshToken)
        : await refreshTikTok(acc.refreshToken);
    const patch = {
      accessToken: fresh.accessToken,
      refreshToken: fresh.refreshToken ?? acc.refreshToken,
      tokenExpiresAt: fresh.expiresAt ?? null,
      updatedAt: new Date(),
    };
    await getDb()
      .update(schema.oauthAccounts)
      .set(patch)
      .where(eq(schema.oauthAccounts.id, acc.id));
    return { ...acc, ...patch };
  } catch (err) {
    if (err instanceof RefreshRejected) await markExpired(acc.id, err.message);
    return null;
  }
}

async function markExpired(accountId: string, reason: string) {
  await getDb()
    .update(schema.oauthAccounts)
    .set({ estadoConexion: "expirada", metricsError: reason, updatedAt: new Date() })
    .where(eq(schema.oauthAccounts.id, accountId));
}
