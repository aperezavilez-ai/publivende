export const SESSION_TOKEN_KEY = "publivende_session_token";
export const PRODUCTION_MODE_KEY = "publivende_production_mode";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function setProductionModeFlag(enabled: boolean) {
  localStorage.setItem(PRODUCTION_MODE_KEY, enabled ? "1" : "0");
}

export function isProductionModeClient(): boolean {
  return localStorage.getItem(PRODUCTION_MODE_KEY) === "1";
}
