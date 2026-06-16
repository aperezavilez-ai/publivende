import { createHmac } from "node:crypto";
import type { DbPartner } from "@/server/db/schema";
import { getSessionSecret } from "@/server/config";

export type PartnerWebhookEvent =
  | "user.created"
  | "connection.connected"
  | "whatsapp.connected"
  | "publish.completed"
  | "publish.failed";

export interface PartnerWebhookPayload {
  event: PartnerWebhookEvent;
  timestamp: string;
  partner_id: string;
  partner_slug: string;
  external_user_id: string;
  data: Record<string, unknown>;
}

function signPayload(body: string, partnerId: string): string {
  const secret = getSessionSecret();
  return createHmac("sha256", `${secret}:${partnerId}`).update(body).digest("hex");
}

/** Envía webhook al partner de forma fire-and-forget (no bloquea el flujo principal). */
export function notifyPartnerWebhook(
  partner: DbPartner,
  event: PartnerWebhookEvent,
  externalUserId: string,
  data: Record<string, unknown>,
): void {
  const url = partner.webhookUrl?.trim();
  if (!url) return;

  const payload: PartnerWebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    partner_id: partner.id,
    partner_slug: partner.slug,
    external_user_id: externalUserId,
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signPayload(body, partner.id);

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PubliVende-Event": event,
      "X-PubliVende-Signature": `sha256=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    // Partner webhook failures are non-fatal
  });
}
