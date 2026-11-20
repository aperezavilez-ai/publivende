/** URL pública de producción (dominio canónico sin www). */
export const PRODUCTION_APP_URL = "https://publivende.mx";

export function normalizeAppUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function resolveAppBaseUrl(): string {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return PRODUCTION_APP_URL;
  }
  const raw = process.env.APP_URL ?? process.env.VITE_APP_URL;
  if (raw?.trim() && !raw.includes("localhost") && !raw.includes("127.0.0.1")) {
    return normalizeAppUrl(raw.trim());
  }
  return PRODUCTION_APP_URL;
}
