import { getWhatsAppConfig } from "../config";
import { getWhatsAppCredentialsForUser, type WhatsAppCredentials } from "./accounts";

export interface SendWhatsAppInput {
  to: string;
  text: string;
  userId?: string;
}

export interface SendWhatsAppResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function normalizePhone(celular: string): string {
  return celular.replace(/\D/g, "");
}

async function resolveCredentials(userId?: string): Promise<WhatsAppCredentials | null> {
  if (userId) {
    const userCreds = await getWhatsAppCredentialsForUser(userId);
    if (userCreds) return userCreds;
  }

  const cfg = getWhatsAppConfig();
  if (!cfg) return null;
  return {
    phoneNumberId: cfg.phoneNumberId,
    token: cfg.token,
    wabaId: "",
    displayPhoneNumber: "",
  };
}

export async function sendWhatsAppMessage(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const creds = await resolveCredentials(input.userId);
  if (!creds) {
    return {
      ok: false,
      error: input.userId
        ? "Conecta tu WhatsApp Business en Configuración para enviar mensajes"
        : "WhatsApp Cloud API no configurada",
    };
  }

  const to = normalizePhone(input.to);
  const res = await fetch(`https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: input.text },
    }),
  });

  const json = (await res.json()) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, messageId: json.messages?.[0]?.id };
}

export async function broadcastWhatsAppMessages(
  userId: string,
  contacts: { celular: string }[],
  text: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    const result = await sendWhatsAppMessage({ to: c.celular, text, userId });
    if (result.ok) sent++;
    else {
      failed++;
      if (result.error) errors.push(`${c.celular}: ${result.error}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return { sent, failed, errors };
}

export async function userHasWhatsAppSending(userId: string): Promise<boolean> {
  const creds = await resolveCredentials(userId);
  return !!creds;
}
