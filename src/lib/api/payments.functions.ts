import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isRealPaymentsEnabled } from "@/server/config";
import { createMercadoPagoPreference } from "@/server/payments/mercadopago";

const providerSchema = z.enum(["mercadopago"]);

export const createPaymentLinkServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string(),
      amount: z.number().positive(),
      currency: z.string().default("MXN"),
      reference: z.string().optional(),
      provider: providerSchema.default("mercadopago"),
    }),
  )
  .handler(async ({ data }) => {
    if (!isRealPaymentsEnabled()) {
      return { ok: false as const, useLocal: true };
    }

    if (data.provider === "mercadopago") {
      const result = await createMercadoPagoPreference({
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
      });
      if (!result.ok) return { ok: false as const, error: result.error };
      return { ok: true as const, url: result.url!, preferenceId: result.preferenceId };
    }

    return { ok: false as const, useLocal: true };
  });
