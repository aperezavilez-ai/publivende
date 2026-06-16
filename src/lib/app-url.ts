/** URL pública de producción (dominio propio). */
export const PRODUCTION_APP_URL = "https://publivende.mx";

export function normalizeAppUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function resolveAppBaseUrl(): string {
  const raw = process.env.VITE_APP_URL ?? process.env.APP_URL;
  if (raw?.trim()) return normalizeAppUrl(raw.trim());
  if (process.env.NODE_ENV === "production") return PRODUCTION_APP_URL;
  return "http://localhost:8083";
}
