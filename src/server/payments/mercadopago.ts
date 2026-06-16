import { getMercadoPagoToken } from "../config";

export interface MercadoPagoPreferenceInput {
  title: string;
  amount: number;
  currency: string;
  reference?: string;
}

export interface MercadoPagoPreferenceResult {
  ok: boolean;
  url?: string;
  preferenceId?: string;
  error?: string;
}

export async function createMercadoPagoPreference(
  input: MercadoPagoPreferenceInput,
): Promise<MercadoPagoPreferenceResult> {
  const token = getMercadoPagoToken();
  if (!token) return { ok: false, error: "MERCADOPAGO_ACCESS_TOKEN no configurado" };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency,
        },
      ],
      external_reference: input.reference,
      auto_return: "approved",
    }),
  });

  const json = (await res.json()) as {
    init_point?: string;
    id?: string;
    message?: string;
  };

  if (!res.ok || !json.init_point) {
    return { ok: false, error: json.message ?? `HTTP ${res.status}` };
  }

  return { ok: true, url: json.init_point, preferenceId: json.id };
}
