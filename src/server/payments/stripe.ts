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
