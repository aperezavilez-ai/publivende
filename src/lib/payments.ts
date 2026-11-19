// Links de cobro REALES (Stripe / Mercado Pago vía servidor).
// Real v2: se eliminó el «generador mock» que fabricaba URLs inexistentes
// (buy.stripe.com/test_<random>, mpago.la/<random>) cuando el proveedor no
// respondía. Ahora, sin proveedor real configurado, generarLinkCobro LANZA
// un error claro: jamás se presenta un link de cobro falso como real.
import type { PagoProvider } from "@/lib/mock/types";

export interface CobroLink {
  url: string;
  provider: PagoProvider;
  referencia: string;
  monto: number;
  moneda: string;
  descripcion: string;
  qr_url: string;
  expira: string;
}

export const PROVIDER_LABEL: Record<PagoProvider, string> = {
  stripe: "Stripe",
  mercadopago: "MercadoPago",
  wompi: "Wompi",
  payu: "PayU",
  kushki: "Kushki",
  manual: "Transferencia",
};

export class PagoNoDisponibleError extends Error {
  constructor(provider: PagoProvider) {
    super(
      `No se pudo generar el link de cobro con ${PROVIDER_LABEL[provider]}: el proveedor no está configurado o no respondió. No se creó ningún link.`,
    );
    this.name = "PagoNoDisponibleError";
  }
}

export async function generarLinkCobro(opts: {
  provider: PagoProvider;
  monto: number;
  moneda: string;
  descripcion: string;
}): Promise<CobroLink> {
  if (opts.provider === "stripe" || opts.provider === "mercadopago") {
    try {
      const { createPaymentLinkServer } = await import("@/lib/api/payments.functions");
      const real = await createPaymentLinkServer({
        data: {
          title: opts.descripcion,
          amount: opts.monto,
          currency: opts.moneda,
          provider: opts.provider,
        },
      });
      if (real.ok && real.url) {
        return {
          url: real.url,
          provider: opts.provider,
          referencia: real.preferenceId ?? "",
          monto: opts.monto,
          moneda: opts.moneda,
          descripcion: opts.descripcion,
          qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(real.url)}`,
          expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    } catch {
      /* cae al error claro de abajo */
    }
  }
  throw new PagoNoDisponibleError(opts.provider);
}

// Parser del comando "/cobrar 350 [descripción]"
export function parseCobrarCommand(text: string): { monto: number; descripcion: string } | null {
  const m = text.trim().match(/^\/cobrar\s+(\d+(?:[.,]\d{1,2})?)\s*(.*)$/i);
  if (!m) return null;
  const monto = Number(m[1].replace(",", "."));
  if (!Number.isFinite(monto) || monto <= 0) return null;
  return { monto, descripcion: m[2].trim() || "Pago PubliVende" };
}
