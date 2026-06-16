import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { getWhatsAppConfig } from "@/server/config";
import { findUserIdByPhoneNumberId } from "@/server/whatsapp/accounts";
import { processWhatsAppWebhook } from "@/server/whatsapp/inbound";

export const Route = createFileRoute("/api/webhook/whatsapp")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Webhook WhatsApp — solo API</div>
  ),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cfg = getWhatsAppConfig();
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const verifyToken = cfg?.verifyToken ?? process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "publivende_verify";

        if (mode === "subscribe" && token === verifyToken) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          entry?: {
            changes?: {
              value?: {
                metadata?: { phone_number_id?: string };
                messages?: Array<{
                  from: string;
                  id: string;
                  timestamp: string;
                  type: string;
                  text?: { body: string };
                }>;
              };
            }[];
          }[];
        };

        const change = body.entry?.[0]?.changes?.[0]?.value;
        const phoneNumberId = change?.metadata?.phone_number_id;
        const messages = change?.messages ?? [];

        let userId: string | null = null;
        if (phoneNumberId) {
          userId = await findUserIdByPhoneNumberId(phoneNumberId);
        }
        if (!userId) {
          userId = process.env.WHATSAPP_DEFAULT_USER_ID ?? null;
        }
        if (!userId) {
          return Response.json({ ok: true, skipped: "no_user_for_phone" });
        }

        for (const msg of messages) {
          if (msg.type === "text") {
            await processWhatsAppWebhook(userId, msg);
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
