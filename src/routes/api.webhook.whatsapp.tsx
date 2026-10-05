import { createFileRoute } from "@tanstack/react-router";
import { getWhatsAppConfig } from "@/server/config";
import { findUserIdByPhoneNumberId } from "@/server/whatsapp/accounts";
import { processWhatsAppWebhook } from "@/server/whatsapp/inbound";

export const Route = createFileRoute("/api/webhook/whatsapp")({
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

        const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!phoneNumberId || !message || message.type !== "text") {
          return new Response("OK", { status: 200 });
        }

        const userId = await findUserIdByPhoneNumberId(phoneNumberId);
        if (!userId) {
          return new Response("OK", { status: 200 });
        }

        await processWhatsAppWebhook(userId, message);
        return new Response("OK", { status: 200 });
      },
    },
  },
});
