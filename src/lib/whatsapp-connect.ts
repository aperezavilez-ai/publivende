import type { Profile } from "@/lib/mock/types";

/** Número E.164 solo dígitos (código país + celular). */
export function normalizeWhatsAppPhone(codigoPais: string, celular: string): string {
  const digits = `${codigoPais}${celular}`.replace(/\D/g, "");
  return digits;
}

export function formatWhatsAppDisplay(codigoPais: string, celular: string): string {
  const d = normalizeWhatsAppPhone(codigoPais, celular);
  if (d.startsWith("52") && d.length >= 12) {
    return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return `+${d}`;
}

export function buildWaMeUrl(codigoPais: string, celular: string, text?: string): string {
  const phone = normalizeWhatsAppPhone(codigoPais, celular);
  const base = `https://wa.me/${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function profileWaMeUrl(profile: Pick<Profile, "codigo_pais" | "celular">, text?: string): string {
  return buildWaMeUrl(profile.codigo_pais, profile.celular, text);
}

/** URL alojada de Meta (funciona sin ID de configuración en muchos casos). */
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

export const META_POST_MESSAGE_ORIGINS = [
  "https://www.facebook.com",
  "https://business.facebook.com",
  "https://web.facebook.com",
];
