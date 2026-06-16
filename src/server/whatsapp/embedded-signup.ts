import { getMetaOAuthConfig } from "@/lib/oauth/config.server";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface EmbeddedSignupInput {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface EmbeddedSignupResult {
  ok: true;
  accessToken: string;
  displayPhoneNumber: string;
  verifiedName?: string;
  tokenExpiresAt?: Date;
}

export interface EmbeddedSignupError {
  ok: false;
  error: string;
}

/** Intercambia el code de Embedded Signup por un access token de negocio. */
export async function exchangeEmbeddedSignupCode(code: string): Promise<{ accessToken: string; expiresIn?: number } | null> {
  const cfg = getMetaOAuthConfig();
  if (!cfg) return null;

  const url = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    code,
  })}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? `Error al intercambiar code OAuth (${res.status})`);
  }

  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

/** Suscribe el WABA del usuario a la app PubliVende para recibir webhooks. */
export async function subscribeWabaToApp(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
  if (!res.ok && !json.success) {
    throw new Error(json.error?.message ?? `No se pudo suscribir WABA (${res.status})`);
  }
}

/** Obtiene display_phone_number y verified_name del número conectado. */
export async function fetchPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string,
): Promise<{ displayPhoneNumber: string; verifiedName?: string }> {
  const res = await fetch(
    `${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const json = (await res.json()) as {
    display_phone_number?: string;
    verified_name?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? `No se pudo leer el número (${res.status})`);
  }

  return {
    displayPhoneNumber: json.display_phone_number ?? "",
    verifiedName: json.verified_name,
  };
}

/** Completa el flujo Embedded Signup: token + suscripción + metadatos del número. */
export async function completeEmbeddedSignup(
  input: EmbeddedSignupInput,
): Promise<EmbeddedSignupResult | EmbeddedSignupError> {
  try {
    const exchanged = await exchangeEmbeddedSignupCode(input.code);
    if (!exchanged) {
      return { ok: false, error: "Meta OAuth no configurado (META_APP_ID / META_APP_SECRET)" };
    }

    await subscribeWabaToApp(input.wabaId, exchanged.accessToken);
    const phone = await fetchPhoneNumberDetails(input.phoneNumberId, exchanged.accessToken);

    return {
      ok: true,
      accessToken: exchanged.accessToken,
      displayPhoneNumber: phone.displayPhoneNumber,
      verifiedName: phone.verifiedName,
      tokenExpiresAt: exchanged.expiresIn
        ? new Date(Date.now() + exchanged.expiresIn * 1000)
        : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al conectar WhatsApp" };
  }
}

export function getEmbeddedSignupConfigId(): string | undefined {
  return process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || undefined;
}

export function getMetaAppIdPublic(): string | undefined {
  return process.env.META_APP_ID?.trim() || process.env.VITE_META_APP_ID?.trim() || undefined;
}

export function buildHostedOnboardUrl(appId: string, configId?: string): string {
  const extras = JSON.stringify({ setup: {}, sessionInfoVersion: 3 });
  const params = new URLSearchParams({
    app_id: appId,
    response_type: "code",
    scope: "whatsapp_business_messaging,whatsapp_business_management",
    extras,
  });
  if (configId) params.set("config_id", configId);
  return `https://business.facebook.com/messaging/whatsapp/onboard/?${params.toString()}`;
}
