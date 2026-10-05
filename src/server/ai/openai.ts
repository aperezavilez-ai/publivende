import OpenAI from "openai";
import { getMeaiKey, getMeaiModel } from "../config";
import { resolveNiche } from "@/lib/brain/niches";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const key = getMeaiKey();
    if (!key) throw new Error("MEAI_API_KEY no configurada");
    client = new OpenAI({ apiKey: key, baseURL: "https://api.meai.cloud/v1" });
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
  const niche = resolveNiche(input.industria);
  const formulas = niche.hooks
    .slice(0, 6)
    .map((h) => `- ${h.formula}: "${h.plantilla}"`)
    .join("\n");
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    messages: [
      {
        role: "system",
        content: `Eres copywriter LATAM para redes sociales. Industria: ${input.industria ?? "general"} (nicho: ${niche.label}). Tono: ${input.tono}. Genera 3 captions distintos en español, numerados.

Cada caption DEBE abrir con un gancho fuerte en la primera línea (máximo 110 caracteres): nada de "Hola", "Les presentamos" ni saludos. Usa una fórmula distinta en cada uno, inspirada en las que funcionan en este nicho:
${formulas}
${input.cta === false ? "" : `Cierra con una llamada a la acción a WhatsApp, por ejemplo: "${niche.cta_tipico}".`}`,
      },
      { role: "user", content: input.idea },
    ],
    temperature: 0.8,
  });
  const text = res.choices[0]?.message?.content ?? "";
  return text.split(/\n(?=\d[).]|[-•*])/).map((s) => s.replace(/^\d[).]\s*/, "").trim()).filter(Boolean).slice(0, 3);
}

export interface ConversationTurn {
  direccion: "entrante" | "saliente";
  texto: string;
}

export async function generatePostReplyOpenAI(input: {
  businessContext: string;
  postContext: string;
  customerMessage: string;
  customerName: string;
  /** Mensajes previos en orden cronológico, sin incluir customerMessage. */
  history?: ConversationTurn[];
}): Promise<string> {
  const ai = getClient();
  const history = (input.history ?? []).map((t) => ({
    role: t.direccion === "entrante" ? ("user" as const) : ("assistant" as const),
    content: t.texto,
  }));
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    messages: [
      {
        role: "system",
        content: `Eres vendedor IA de WhatsApp para LATAM. Responde breve, amable y orientado a venta. Usa el contexto del negocio y la publicación. No repitas saludos ni información que ya diste en la conversación; avanza hacia el cierre (precio, disponibilidad, envío, link de pago). Nunca inventes precios ni productos que no estén en el catálogo.\n\n${input.businessContext}\n\nPUBLICACIÓN:\n${input.postContext || "Sin publicación vinculada"}\n\nCLIENTE: ${input.customerName}`,
      },
      ...history,
      { role: "user", content: input.customerMessage },
    ],
    temperature: 0.6,
    max_tokens: 400,
  });
  return res.choices[0]?.message?.content?.trim() ?? "¡Hola! Con gusto te ayudo. ¿Qué te interesa de la publicación?";
}

/**
 * Estratega de marketing: convierte el diagnóstico en prioridades, plan semanal y ganchos.
 * Devuelve el JSON crudo; quien llama lo valida.
 */
export async function generateBrainPlanOpenAI(input: {
  businessContext: string;
  nicheBrief: string;
  diagnosis: unknown;
}): Promise<unknown> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2200,
    messages: [
      {
        role: "system",
        content: `Eres el estratega de marketing digital de un pequeño negocio en México/LATAM. Tu trabajo es encontrar lo que le está haciendo perder ventas y decirle exactamente qué hacer esta semana.

Reglas:
- Basa cada recomendación en la evidencia del diagnóstico; cita números cuando existan.
- Si la confianza de los datos es "estimada", dilo y apóyate en las referencias del nicho.
- Nada genérico: usa los productos, la ciudad y el público reales del negocio.
- Los ganchos son la primera línea de un post: máximo 110 caracteres, en español neutro mexicano, sin hashtags.
- No inventes precios que no estén en el catálogo.
- Responde SOLO un objeto JSON con esta forma exacta:
{
  "resumen": "2-3 frases: diagnóstico honesto y la prioridad #1",
  "prioridades": [{"titulo": "...", "por_que": "...", "pasos": ["...", "..."]}],
  "semana": [{"dia": "Lunes", "hora": "8:00 PM", "red": "Instagram", "formato": "Reel", "gancho": "...", "idea": "qué mostrar en el post", "cta": "..."}],
  "ganchos": [{"texto": "...", "formula": "nombre corto de la fórmula", "por_que": "por qué funciona para este negocio"}]
}
- 3 prioridades, entre 4 y 7 días en "semana", 8 ganchos.`,
      },
      {
        role: "user",
        content: `NEGOCIO:\n${input.businessContext}\n\nREFERENCIAS DEL NICHO:\n${input.nicheBrief}\n\nDIAGNÓSTICO (datos reales de PubliVende):\n${JSON.stringify(input.diagnosis)}`,
      },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1) || "{}";
  return JSON.parse(jsonText);
}

/** Piloto automático: escribe el copy completo de cada publicación de la semana. Devuelve JSON crudo. */
export async function generateAutopilotCopiesOpenAI(input: {
  businessContext: string;
  nicheBrief: string;
  tono: string;
  aprendizajes: string[];
  slots: Array<{
    n: number;
    cuando: string;
    redes: string[];
    formato: string;
    producto?: string;
    idea: string;
    formula: string;
    ejemplo_gancho: string;
  }>;
}): Promise<unknown> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 2800,
    messages: [
      {
        role: "system",
        content: `Eres el community manager de un pequeño negocio en México/LATAM y escribes sus publicaciones de la semana. Tono de marca: ${input.tono}.

Reglas para cada publicación:
- Primera línea = gancho (máximo 110 caracteres) usando la fórmula indicada, adaptada al producto y la ciudad reales. Nada de "Hola" ni "Les presentamos".
- Cuerpo de 2 a 4 líneas cortas que desarrollen la idea, con 1-3 emojis.
- Cierra con una llamada a la acción para escribir por WhatsApp.
- Máximo 3 hashtags relevantes al final (en Facebook puedes omitirlos).
- Si el formato es video, agrega al final una línea "🎬 Qué grabar:" con una instrucción concreta de 15-30 segundos.
- No inventes precios, descuentos ni productos que no estén en el contexto.
- Todas las publicaciones deben ser distintas entre sí.

Responde SOLO JSON: {"posts": [{"n": 1, "copy": "texto completo listo para publicar"}]}`,
      },
      {
        role: "user",
        content: `NEGOCIO:\n${input.businessContext}\n\nREFERENCIAS DEL NICHO:\n${input.nicheBrief}\n\n${
          input.aprendizajes.length ? `LO QUE YA FUNCIONA CON ESTA AUDIENCIA:\n- ${input.aprendizajes.join("\n- ")}\n\n` : ""
        }PUBLICACIONES A ESCRIBIR:\n${JSON.stringify(input.slots)}`,
      },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1) || "{}";
  return JSON.parse(jsonText);
}

export interface MultiNetworkVariantResult {
  copy: string;
  hashtags: string[];
  title?: string;
  tags?: string[];
  hook?: string;
}

export interface AdaptMultiNetworkOutput {
  nicho: string;
  nicho_label: string;
  resumen_estrategico: string;
  variants: Partial<Record<"facebook" | "instagram" | "tiktok" | "youtube", MultiNetworkVariantResult>>;
}

export async function adaptMultiNetworkWithAI(input: {
  sourceCaption: string;
  title?: string;
  redes: Array<"facebook" | "instagram" | "tiktok" | "youtube">;
  industria?: string;
  tono?: string;
  negocio?: string;
}): Promise<AdaptMultiNetworkOutput> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content: `Eres el Director de Estrategia de Contenidos y Crecimiento Orgánico de PubliVende para Latinoamérica.
Tu misión: transformar un contenido base o producto en variantes virales perfectamente optimizadas para el algoritmo de cada red social solicitada: ${input.redes.join(", ")}.

Reglas críticas por red:
- **TikTok**:
  * hook: Gancho de retención de los primeros 3 segundos (pregunta provocadora, revelación o contraste).
  * copy: Máximo 150 caracteres, directo, sin relleno.
  * hashtags: 4-6 hashtags (#fyp, #parati + hashtags específicos de nicho).
- **Instagram**:
  * hook: Primera línea impactante de intriga o beneficio antes del botón "más...".
  * copy: 3-5 párrafos cortos con saltos de línea limpios, emojis selectos, propuesta de valor y llamada a la acción clara (WhatsApp o DM).
  * hashtags: 6-10 hashtags de nicho y de exploración (#reels, #comunidad).
- **Facebook**:
  * hook: Planteamiento de una situación cotidiana, dolor o pregunta que invite a la gente a comentar.
  * copy: Texto persuasivo, claro y orientado a generar debate o compartir. Termina con invitación al chat o catálogo.
  * hashtags: 2-3 hashtags como máximo o ninguno.
- **YouTube Shorts**:
  * title: Título SEO de alto CTR de 50 a 70 caracteres con gancho.
  * copy: Descripción con resumen, llamada al enlace/WhatsApp y 3-5 tags de búsqueda.
  * tags: Lista de palabras clave de búsqueda en YouTube.

Responde ÚNICAMENTE un objeto JSON con este formato exacto:
{
  "nicho": "nombre corto del nicho",
  "nicho_label": "Nombre Visible del Nicho (ej. Comida Rápida y Delivery)",
  "resumen_estrategico": "Explicación en 1 frase de por qué este enfoque posiciona en este nicho",
  "variants": {
    "instagram": { "hook": "...", "copy": "...", "hashtags": ["#tag1", "#tag2"] },
    "facebook": { "hook": "...", "copy": "...", "hashtags": ["#tag1"] },
    "tiktok": { "hook": "...", "copy": "...", "hashtags": ["#fyp", "#tag1"] },
    "youtube": { "title": "...", "copy": "...", "hashtags": ["#Shorts", "#tag1"], "tags": ["tag1", "tag2"] }
  }
}`,
      },
      {
        role: "user",
        content: `NEGOCIO: ${input.negocio || "General"}
INDUSTRIA: ${input.industria || "General"}
TONO DESEADO: ${input.tono || "persuasivo y casual"}
REDES OBJETIVO: ${input.redes.join(", ")}
TÍTULO BASE: ${input.title || "Sin título"}
TEXTO/COPY ORIGINAL A ADAPTAR:
${input.sourceCaption}`,
      },
    ],
  });

  const text = res.choices[0]?.message?.content ?? "{}";
  return parseMultiNetworkJson(text);
}

function parseMultiNetworkJson(rawText: string): AdaptMultiNetworkOutput {
  let clean = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  let parsed: any = {};
  if (start !== -1 && end > start) {
    try {
      parsed = JSON.parse(clean.slice(start, end + 1));
    } catch {
      parsed = {};
    }
  }

  const nicho = String(parsed.nicho || parsed.niche || "general");
  const nicho_label = String(
    parsed.nicho_label || parsed.categoria || (nicho.charAt(0).toUpperCase() + nicho.slice(1)),
  );
  const resumen_estrategico = String(
    parsed.resumen_estrategico || parsed.estrategia || "Optimización de contenido orgánico para LATAM",
  );

  const rawVariants = parsed.variants || parsed.variantes || parsed.redes || parsed;
  const variants: AdaptMultiNetworkOutput["variants"] = {};

  for (const red of ["facebook", "instagram", "tiktok", "youtube"] as const) {
    const v = rawVariants[red] || rawVariants[red.toLowerCase()];
    if (v && typeof v === "object") {
      variants[red] = {
        copy: String(v.copy || v.texto || ""),
        hook: v.hook ? String(v.hook) : undefined,
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String) : [],
        title: v.title ? String(v.title) : undefined,
        tags: Array.isArray(v.tags) ? v.tags.map(String) : [],
      };
    }
  }

  return { nicho, nicho_label, resumen_estrategico, variants };
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
    model: getMeaiModel(),
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

function parseJsonObject(text: string): unknown {
  const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1) || "{}";
  return JSON.parse(jsonText);
}

/**
 * Editor de la red PubliVende: clasifica el nicho (cualquiera), califica si el contenido merece
 * salir en las cuentas oficiales y escribe el texto que lo presenta. Devuelve JSON crudo.
 */
export async function reviewBoostOpenAI(input: {
  negocio: string;
  postCopy: string;
  mediaType: string;
  canales: Array<{ id: string; red: string; nombre: string; nichos: string[] }>;
}): Promise<unknown> {
  const ai = getClient();
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: `Eres el editor de la red PubliVende: cuentas oficiales en Facebook, Instagram, TikTok y YouTube que presentan a negocios y creadores de LATAM ante audiencias de su nicho. Decides si una publicación de un usuario sale en esas cuentas.

Reglas:
- "nicho": el nicho real del contenido en 1 a 3 palabras en español, minúsculas (cualquier nicho: "comida mexicana", "bienes raíces", "videojuegos", "mascotas", etc.).
- "score" de 0 a 100: qué tanto aporta a la audiencia de ese nicho (claridad, atractivo, oferta concreta, calidad del texto). Por debajo de 60 no se publica.
- Score 0 si es engañoso, promete resultados imposibles, es contenido adulto, armas, drogas, apuestas, esquemas de dinero fácil, odio o datos personales de terceros.
- "motivo": una frase honesta que explique el puntaje, dirigida al usuario.
- "copy": el texto para la cuenta oficial. Presenta al negocio en tercera persona, con un gancho en la primera línea, máximo 600 caracteres, 3 a 5 hashtags del nicho al final. No inventes precios, datos ni promociones que no estén en la publicación. No agregues links: se agregan solos.
- "canales": ids de las cuentas donde encaja (las que tienen ese nicho o las generales sin nichos). Solo ids de la lista.
- Responde SOLO un objeto JSON: {"nicho": "...", "score": 0, "motivo": "...", "copy": "...", "canales": ["..."]}`,
      },
      {
        role: "user",
        content: `NEGOCIO:\n${input.negocio}\n\nPUBLICACIÓN (${input.mediaType}):\n${input.postCopy}\n\nCUENTAS OFICIALES DISPONIBLES:\n${JSON.stringify(input.canales)}`,
      },
    ],
  });
  return parseJsonObject(res.choices[0]?.message?.content ?? "{}");
}

/** Contenido propio de una cuenta oficial para hacerla crecer en su nicho. */
export async function generateHubPostOpenAI(input: {
  cuenta: string;
  red: string;
  nichos: string[];
  tema?: string;
}): Promise<string> {
  const ai = getClient();
  const nicho = input.nichos.length ? input.nichos.join(", ") : "emprendimiento y negocios locales de LATAM";
  const res = await ai.chat.completions.create({
    model: getMeaiModel(),
    temperature: 0.8,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: `Escribes para "${input.cuenta}", una cuenta oficial de PubliVende en ${input.red} dedicada a: ${nicho}. Objetivo: que la audiencia del nicho la siga porque aporta valor (consejos, tendencias, datos útiles, recomendaciones), no publicidad.

Reglas: gancho fuerte en la primera línea (máximo 110 caracteres), máximo 700 caracteres, invita a comentar o guardar, 3 a 5 hashtags del nicho al final. No inventes estadísticas ni cifras; si das un dato, que sea de conocimiento general. Sin links. Responde solo con el texto de la publicación.`,
      },
      { role: "user", content: input.tema?.trim() || "Elige tú el tema que más interés genere hoy en este nicho." },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
