// Generador de captions con IA (mock determinista — listo para swap a Lovable AI Gateway)
export type Tono = "casual" | "profesional" | "divertido" | "promocional" | "inspirador";

export interface GenInput {
  idea: string;
  tono: Tono;
  emojis: boolean;
  hashtags: boolean;
  cta: boolean;
}

const TEMPLATES: Record<Tono, string[]> = {
  casual: [
    "Te cuento algo: {idea}. ¿Qué opinas?",
    "Mira esto 👀 — {idea}.",
    "Hoy quiero compartirte: {idea}.",
  ],
  profesional: [
    "{idea}. Calidad y atención garantizadas.",
    "Presentamos: {idea}. Confianza para tu día a día.",
    "{idea} — porque tu tiempo vale.",
  ],
  divertido: [
    "Atención atención 🚨 {idea} 🎉",
    "Esto te va a encantar: {idea} 😍",
    "Sí, leíste bien: {idea} 🤯",
  ],
  promocional: [
    "🔥 PROMO: {idea}. ¡Por tiempo limitado!",
    "Solo hoy: {idea}. Aprovecha ya 💸",
    "Oferta especial: {idea}. Stock limitado.",
  ],
  inspirador: [
    "Cree en ti. {idea}.",
    "Cada paso cuenta. {idea}.",
    "Hoy es el día perfecto para: {idea}.",
  ],
};

const HASHTAGS = ["#LATAM", "#Emprende", "#Pymes", "#VenderEnLínea", "#Creadores", "#MarketingDigital"];
const CTAS = ["Escríbenos por DM 💌", "Reserva ya por WhatsApp 📱", "Link en bio 👆", "Comenta YO y te escribimos 💜"];

export async function generateCaptions(input: GenInput): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 600));
  return TEMPLATES[input.tono].map((tpl) => {
    let s = tpl.replace("{idea}", input.idea);
    if (!input.emojis) s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
    if (input.cta) s += "\n\n" + CTAS[Math.floor(Math.random() * CTAS.length)];
    if (input.hashtags) s += "\n\n" + HASHTAGS.slice(0, 4).join(" ");
    return s.trim();
  });
}
