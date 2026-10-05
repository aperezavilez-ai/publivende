import { createFileRoute } from "@tanstack/react-router";
import { isProductionMode } from "@/server/config";
import { verifyStripeSignature } from "@/server/payments/stripe";
import { findUserById, findUserByStripeCustomerId, setUserBilling } from "@/server/auth/users";
import { isValidPlan } from "@/lib/plans";

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
}

interface StripeCheckoutSession {
  mode?: string;
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string>;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function resolveUserId(metadataUserId: string | undefined, customerId: string | null | undefined) {
  if (metadataUserId && (await findUserById(metadataUserId))) return metadataUserId;
  if (customerId) return (await findUserByStripeCustomerId(customerId))?.id ?? null;
  return null;
}

async function applySubscription(sub: StripeSubscription, deleted: boolean) {
  const userId = await resolveUserId(sub.metadata?.user_id, sub.customer);
  if (!userId) return;
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const metaPlan = sub.metadata?.plan;
  const active = !deleted && ACTIVE_STATUSES.has(sub.status);
  await setUserBilling(userId, {
    plan: active && isValidPlan(metaPlan) ? metaPlan : "free",
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: deleted ? null : sub.id,
    planStatus: deleted ? "canceled" : sub.status,
    planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
  });
}

export const Route = createFileRoute("/api/webhook/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !isProductionMode()) return new Response("Not configured", { status: 503 });

        const payload = await request.text();
        if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
          return new Response("Invalid signature", { status: 400 });
        }

        const event = JSON.parse(payload) as { type: string; data: { object: unknown } };

        try {
          if (event.type === "checkout.session.completed") {
            const s = event.data.object as StripeCheckoutSession;
            if (s.mode === "subscription") {
              const userId = await resolveUserId(s.metadata?.user_id ?? s.client_reference_id ?? undefined, s.customer);
              const plan = s.metadata?.plan;
              if (userId && isValidPlan(plan)) {
                await setUserBilling(userId, {
                  plan,
                  stripeCustomerId: s.customer ?? null,
                  stripeSubscriptionId: s.subscription ?? null,
                  planStatus: "active",
                });
              }
            }
          } else if (
            event.type === "customer.subscription.created" ||
            event.type === "customer.subscription.updated"
          ) {
            await applySubscription(event.data.object as StripeSubscription, false);
          } else if (event.type === "customer.subscription.deleted") {
            await applySubscription(event.data.object as StripeSubscription, true);
          }
        } catch (err) {
          console.error("[stripe webhook]", event.type, err);
          return new Response("Error", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
