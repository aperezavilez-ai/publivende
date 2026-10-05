import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode, getStripeSecretKey } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { createStripePortalSession, createStripeSubscriptionCheckout } from "@/server/payments/stripe";
import { PLAN_OFFERS } from "@/lib/plans";

export const createPlanCheckoutServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), plan: z.enum(["pro", "business"]) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo", useLocal: true };
    if (!getStripeSecretKey()) return { ok: false as const, error: "Cobro de planes no configurado (STRIPE_SECRET_KEY)" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const user = await findUserById(session.userId);
    if (!user) return { ok: false as const, error: "Usuario no encontrado" };

    const offer = PLAN_OFFERS.find((p) => p.id === data.plan)!;
    const result = await createStripeSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      plan: data.plan,
      planName: offer.nombre,
      amountMxn: offer.precioNum,
      customerId: user.stripeCustomerId,
    });
    if (!result.ok || !result.url) return { ok: false as const, error: result.error ?? "No se pudo iniciar el pago" };
    return { ok: true as const, url: result.url };
  });

export const createBillingPortalServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    const user = await findUserById(session.userId);
    if (!user?.stripeCustomerId) return { ok: false as const, error: "Aún no tienes una suscripción activa" };
    const result = await createStripePortalSession(user.stripeCustomerId);
    if (!result.ok || !result.url) return { ok: false as const, error: result.error ?? "No se pudo abrir el portal" };
    return { ok: true as const, url: result.url };
  });
