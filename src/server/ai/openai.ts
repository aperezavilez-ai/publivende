import OpenAI from "openai";
import { getOpenAIKey, getGafcoreProxyProjectKey } from "../config";

let client: OpenAI | null = null;

// Ruteado via GafCore API Proxy (pool-cheap: Groq -> Cerebras -> GPTPRO4ALL
// con fallback automatico). Si no hay project key del proxy configurada,
// cae a OPENAI_API_KEY directo como respaldo.
function getClient(): OpenAI {
  if (!client) {
    const proxyProjectKey = getGafcoreProxyProjectKey();
    if (proxyProjectKey) {
      client = new OpenAI({
        apiKey: "gafcore-proxy", // no se usa: el proxy autentica via headers
        baseURL: "https://gafcore-api-proxy.vercel.app/api/proxy/v1",
        defaultHeaders: {
          "x-project-key": proxyProjectKey,
          "x-provider-id": "pool-cheap",
        },
      });
    } else {
      const key = getOpenAIKey();
      if (!key) throw new Error("Ni GAFCORE_PROXY_PROJECT_KEY ni OPENAI_API_KEY estan configuradas");
      client = new OpenAI({ apiKey: key });
    }
  }
  return client;
}

export async function generateCaptionsOpenAI(input: {
  idea: string;
  tono: string;
  industria?: string;
  emojis?: boolean;
  hashtags?: boolean;
  cta?: boolean;
}): Promise<string[]> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Eres copywriter LATAM para redes sociales. Industria: ${input.industria ?? "general"}. Tono: ${input.tono}. Genera 3 captions distintos en español.`,
      },
      { role: "user", content: input.idea },
    ],
    temperature: 0.8,
  });
  const text = res.choices[0]?.message?.content ?? "";
  return text.split(/\n(?=\d[\).]|[-•*])/).map((s) => s.replace(/^\d[\).]\s*/, "").trim()).filter(Boolean).slice(0, 3);
}

export async function generatePostReplyOpenAI(input: {
  businessContext: string;
  postContext: string;
  customerMessage: string;
  customerName: string;
}): Promise<string> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Eres vendedor IA de WhatsApp para LATAM. Responde breve, amable y orientado a venta. Usa el contexto del negocio y la publicación.\n\n${input.businessContext}\n\nPUBLICACIÓN:\n${input.postContext}`,
      },
      {
        role: "user",
        content: `Cliente ${input.customerName} dice: "${input.customerMessage}"`,
      },
    ],
    temperature: 0.6,
    max_tokens: 400,
  });
  return res.choices[0]?.message?.content?.trim() ?? "¡Hola! Con gusto te ayudo. ¿Qué te interesa de la publicación?";
}

export async function adaptCopyForNetworkOpenAI(input: {
  sourceCaption: string;
  red: string;
  tono: string;
  industria?: string;
  hashtags?: string[];
}): Promise<string> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Adapta el copy para ${input.red}. Tono ${input.tono}. Industria ${input.industria ?? "general"}. Incluye hashtags: ${(input.hashtags ?? []).join(" ")}`,
      },
      { role: "user", content: input.sourceCaption },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  return res.choices[0]?.message?.content?.trim() ?? input.sourceCaption;
}
