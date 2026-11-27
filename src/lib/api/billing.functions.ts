import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode, getMercadoPagoToken } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { createMercadoPagoPreference } from "@/server/payments/mercadopago";
import { PLAN_OFFERS } from "@/lib/plans";

// [SOLO MERCADO PAGO — 2026-11-27] La pasarela anterior salió del
// código por decisión de Luis: Mercado Pago es la única. Los
// planes se cobran con una preferencia de Mercado Pago cuyo
// external_reference «plan:<userId>:<plan>» activa el plan en el
// webhook de Mercado Pago cuando el pago se aprueba. No existe
// portal externo de facturación: el plan se renueva con un pago
// nuevo y se deja vencer para bajar a Free.
export const createPlanCheckoutServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), plan: z.enum(["plus", "pro", "business"]) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo", useLocal: true };
    if (!getMercadoPagoToken())
      return { ok: false as const, error: "Cobro de planes no configurado (MERCADOPAGO_ACCESS_TOKEN)" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const user = await findUserById(session.userId);
    if (!user) return { ok: false as const, error: "Usuario no encontrado" };

    const offer = PLAN_OFFERS.find((p) => p.id === data.plan)!;
    const result = await createMercadoPagoPreference({
      title: `PubliVende — Plan ${offer.nombre} (mensual)`,
      amount: offer.precioNum,
      currency: "MXN",
      reference: `plan:${user.id}:${data.plan}`,
    });
    if (!result.ok || !result.url)
      return { ok: false as const, error: result.error ?? "No se pudo iniciar el pago" };
    return { ok: true as const, url: result.url };
  });
