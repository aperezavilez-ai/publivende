import { createFileRoute } from "@tanstack/react-router";
import { isProductionMode, getMercadoPagoToken } from "@/server/config";
import { findUserById, setUserBilling } from "@/server/auth/users";
import { isValidPlan } from "@/lib/plans";

/**
 * Real v2 — Webhook de Mercado Pago: es la confirmación oficial de
 * pagos de PubliVende (única pasarela desde el 2026-11-27).
 *
 * Flujo: MP notifica (topic=payment / type=payment) → se consulta el pago a
 * la API de MP con el token del servidor (la notificación sola NO se cree)
 * → si status === "approved" y el external_reference trae el formato
 * «plan:<userId>:<plan>», se activa el plan del usuario en BD.
 * Las preferencias de planes deben crearse con ese external_reference
 * (ver createMercadoPagoPreference, que además ya manda notification_url
 * hacia esta ruta).
 */

interface MpPayment {
  id: number | string;
  status?: string;
  external_reference?: string | null;
  payer?: { email?: string };
}

async function fetchPayment(paymentId: string, token: string): Promise<MpPayment | null> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPayment;
}

async function applyApprovedPayment(payment: MpPayment) {
  if (payment.status !== "approved") return;
  const ref = payment.external_reference ?? "";
  const m = ref.match(/^plan:([0-9a-fA-F-]{36}):([a-z]+)$/);
  if (!m) return; // Pago de producto u otro concepto: no toca suscripciones.
  const [, userId, plan] = m;
  if (!isValidPlan(plan)) return;
  const user = await findUserById(userId);
  if (!user) return;
  await setUserBilling(userId, {
    plan,
    planStatus: "active",
    planRenewsAt: null,
  });
}

export const Route = createFileRoute("/api/webhook/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getMercadoPagoToken();
        if (!token || !isProductionMode()) return new Response("Not configured", { status: 503 });

        const url = new URL(request.url);
        let paymentId: string | null =
          url.searchParams.get("data.id") ?? url.searchParams.get("id");
        let topic = url.searchParams.get("topic") ?? url.searchParams.get("type");

        try {
          const body = (await request.json().catch(() => null)) as
            | { type?: string; action?: string; data?: { id?: string | number } }
            | null;
          if (body) {
            topic = body.type ?? topic;
            if (body.data?.id != null) paymentId = String(body.data.id);
          }
        } catch {
          /* notificación sin cuerpo JSON: se usan los query params */
        }

        try {
          if ((topic === "payment" || topic === "payment.created" || !topic) && paymentId) {
            const payment = await fetchPayment(paymentId, token);
            if (payment) await applyApprovedPayment(payment);
          }
        } catch (err) {
          console.error("[mercadopago webhook]", err);
          return new Response("Error", { status: 500 });
        }

        // MP reintenta si no recibe 200: los temas que no aplican también se aceptan.
        return new Response("OK", { status: 200 });
      },
    },
  },
});
