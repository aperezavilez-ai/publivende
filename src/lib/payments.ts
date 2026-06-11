// Generador mock de links de cobro — listo para reemplazar por SDK real de Stripe / MercadoPago / Wompi
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

const BASES: Record<PagoProvider, string> = {
  stripe: "https://buy.stripe.com/test_",
  mercadopago: "https://mpago.la/",
  wompi: "https://checkout.wompi.co/l/",
  payu: "https://checkout.payulatam.com/ppp-web-gateway-payu/",
  kushki: "https://app.kushkipagos.com/checkout/",
  manual: "https://publivende.app/pay/",
};

function rnd(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export function generarLinkCobro(opts: {
  provider: PagoProvider;
  monto: number;
  moneda: string;
  descripcion: string;
}): CobroLink {
  const ref = rnd(8);
  const url = `${BASES[opts.provider]}${ref}?amount=${opts.monto}&currency=${opts.moneda.toLowerCase()}`;
  return {
    url,
    provider: opts.provider,
    referencia: ref,
    monto: opts.monto,
    moneda: opts.moneda,
    descripcion: opts.descripcion,
    qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`,
    expira: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Parser del comando "/cobrar 350 [descripción]"
export function parseCobrarCommand(text: string): { monto: number; descripcion: string } | null {
  const m = text.trim().match(/^\/cobrar\s+(\d+(?:[.,]\d{1,2})?)\s*(.*)$/i);
  if (!m) return null;
  const monto = Number(m[1].replace(",", "."));
  if (!Number.isFinite(monto) || monto <= 0) return null;
  return { monto, descripcion: m[2].trim() || "Pago PubliVende" };
}
