import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/oauth/config.server";
import { getStripeSecretKey } from "../config";

export interface StripeCheckoutInput {
  title: string;
  amount: number;
  currency: string;
  reference?: string;
}

export interface StripeCheckoutResult {
  ok: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
}

function toStripeAmount(amount: number, currency: string): number {
  const zeroDecimal = new Set(["clp", "jpy", "krw", "vnd"]);
  const code = currency.toLowerCase();
  if (zeroDecimal.has(code)) return Math.round(amount);
  return Math.round(amount * 100);
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput,
): Promise<StripeCheckoutResult> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) return { ok: false, error: "STRIPE_SECRET_KEY no configurado" };

  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/dashboard?pago=ok`);
  params.set("cancel_url", `${baseUrl}/dashboard?pago=cancelado`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(toStripeAmount(input.amount, input.currency)));
  params.set("line_items[0][price_data][product_data][name]", input.title.slice(0, 250));
  if (input.reference) params.set("client_reference_id", input.reference);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json()) as {
    url?: string;
    id?: string;
    error?: { message?: string };
  };

  if (!res.ok || !json.url) {
    return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  }

  return { ok: true, url: json.url, sessionId: json.id };
}

async function stripePost(path: string, params: URLSearchParams) {
  const secretKey = getStripeSecretKey();
  if (!secretKey) return { ok: false as const, error: "STRIPE_SECRET_KEY no configurado" };
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const json = (await res.json()) as { url?: string; id?: string; error?: { message?: string } };
  if (!res.ok || !json.url) {
    return { ok: false as const, error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true as const, url: json.url, id: json.id };
}

export interface SubscriptionCheckoutInput {
  userId: string;
  email: string;
  plan: "pro" | "business";
  planName: string;
  amountMxn: number;
  customerId?: string | null;
}

/** Checkout de suscripción mensual. Usa STRIPE_PRICE_PRO / STRIPE_PRICE_BUSINESS si existen. */
export async function createStripeSubscriptionCheckout(input: SubscriptionCheckoutInput): Promise<StripeCheckoutResult> {
  const baseUrl = getAppBaseUrl();
  const priceId = input.plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_BUSINESS;
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${baseUrl}/configuracion?suscripcion=ok`);
  params.set("cancel_url", `${baseUrl}/configuracion?suscripcion=cancelada`);
  params.set("client_reference_id", input.userId);
  params.set("metadata[user_id]", input.userId);
  params.set("metadata[plan]", input.plan);
  params.set("subscription_data[metadata][user_id]", input.userId);
  params.set("subscription_data[metadata][plan]", input.plan);
  params.set("allow_promotion_codes", "true");
  if (input.customerId) params.set("customer", input.customerId);
  else params.set("customer_email", input.email);
  params.set("line_items[0][quantity]", "1");
  if (priceId) {
    params.set("line_items[0][price]", priceId);
  } else {
    params.set("line_items[0][price_data][currency]", "mxn");
    params.set("line_items[0][price_data][unit_amount]", String(toStripeAmount(input.amountMxn, "mxn")));
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("line_items[0][price_data][product_data][name]", `PubliVende ${input.planName}`);
  }
  const r = await stripePost("checkout/sessions", params);
  return r.ok ? { ok: true, url: r.url, sessionId: r.id } : { ok: false, error: r.error };
}

export async function createStripePortalSession(customerId: string): Promise<StripeCheckoutResult> {
  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", `${getAppBaseUrl()}/configuracion`);
  const r = await stripePost("billing_portal/sessions", params);
  return r.ok ? { ok: true, url: r.url } : { ok: false, error: r.error };
}

/** Verifica el header Stripe-Signature (esquema v1, tolerancia 5 min). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, ...rest] = kv.split("=");
      return [k?.trim(), rest.join("=")];
    }),
  ) as Record<string, string>;
  const timestamp = Number(parts.t);
  const signatures = header
    .split(",")
    .filter((kv) => kv.trim().startsWith("v1="))
    .map((kv) => kv.trim().slice(3));
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
