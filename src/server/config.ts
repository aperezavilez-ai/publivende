import process from "node:process";

export function isProductionMode(): boolean {
  return !!(process.env.DATABASE_URL && process.env.SESSION_SECRET);
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no configurado");
  return secret;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurado");
  return url;
}

export function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId, verifyToken: verifyToken ?? "publivende_verify" };
}

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY;
}

export function getMercadoPagoToken(): string | undefined {
  return process.env.MERCADOPAGO_ACCESS_TOKEN;
}

export function isRealPublishEnabled(): boolean {
  return isProductionMode();
}

export function isRealWhatsAppEnabled(): boolean {
  return !!getWhatsAppConfig() || !!process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID;
}

export function isRealAIEnabled(): boolean {
  return !!getOpenAIKey();
}

export function isRealPaymentsEnabled(): boolean {
  return !!(getStripeSecretKey() || getMercadoPagoToken());
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}
