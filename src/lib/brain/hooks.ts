export interface HookAnalysis {
  gancho: string;
  /** 0–100: qué tanto detiene el scroll la primera línea. */
  puntaje: number;
  nivel: "debil" | "regular" | "fuerte";
  consejos: string[];
  tiene_cta: boolean;
}

/** `\b` de JS no reconoce letras acentuadas; estos límites sí. */
const words = (alts: string) => new RegExp(`(?<!\\p{L})(?:${alts})(?!\\p{L})`, "iu");

const CURIOSITY = words(
  "secreto|error|errores|nadie|por qu[eé]|c[oó]mo|deja de|antes de|nunca|truco|descubre|mira|esto|as[ií]|verdad|mito|raz[oó]n|razones|evita|cuidado",
);
const URGENCY = words("hoy|[uú]ltim[oa]s?|s[oó]lo|quedan|promo|descuento|gratis|oferta|ya|ahora");
const SECOND_PERSON = words("t[uú]|te|ti|tus|tuyo|tuya|contigo|usted");
const GENERIC_OPENERS =
  /^(hola|buen[oa]s (dias|días|tardes|noches)|les (presentamos|comparto|dejo|traemos)|les recordamos|disponible|nuevo producto|aqui|aquí les|feliz (lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo))/i;
const CTA =
  /(whats|wa\.me|escr[ií]be|escr[ií]benos|m[aá]nda(nos|me)|mensaje|\bdm\b|inbox|pide|pedido|ordena|aparta|agenda|cotiza|link|enlace|compra|reserva|ll[aá]ma|clic|click|inf[oó]rmate|info\b)/i;

/** Lo que se alcanza a leer antes del "ver más" en la mayoría de las redes. */
const VISIBLE_CHARS = 125;

/** Primera línea con texto (lo que se ve antes del "ver más"). */
export function extractHook(copy: string): string {
  const line =
    copy
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.replace(/[\p{Extended_Pictographic}\s]/gu, "").length > 0) ?? "";
  return line.slice(0, VISIBLE_CHARS).trim();
}

export function hasCta(copy: string): boolean {
  return CTA.test(copy);
}

export type HookFeature =
  | "pregunta"
  | "numero"
  | "curiosidad"
  | "urgencia"
  | "segunda_persona"
  | "saludo_generico"
  | "precio"
  | "emoji_inicio"
  | "cta";

export const HOOK_FEATURE_LABELS: Record<HookFeature, string> = {
  pregunta: "Abrir con una pregunta",
  numero: "Usar un número o lista (\"3 errores…\")",
  curiosidad: "Generar curiosidad (secreto, error, mira esto)",
  urgencia: "Urgencia (hoy, últimas piezas, promo)",
  segunda_persona: "Hablarle directo al cliente (tú, te)",
  saludo_generico: "Abrir con saludo o \"les presentamos\"",
  precio: "Mostrar el precio en la primera línea",
  emoji_inicio: "Empezar con emoji",
  cta: "Cerrar con llamada a WhatsApp",
};

/** Rasgos presentes en un copy; base para medir qué tipo de gancho rinde más en cada nicho. */
export function hookFeatures(copy: string): HookFeature[] {
  const text = extractHook(copy).normalize("NFC");
  if (!text) return [];
  const out: HookFeature[] = [];
  if (/\?/.test(text)) out.push("pregunta");
  if (/^\s*[\p{Extended_Pictographic}\s]*\d/u.test(text) || /\d+\s+(razones|formas|errores|pasos|tips|secretos|cosas)/i.test(text)) {
    out.push("numero");
  }
  if (CURIOSITY.test(text)) out.push("curiosidad");
  if (URGENCY.test(text)) out.push("urgencia");
  if (SECOND_PERSON.test(text)) out.push("segunda_persona");
  if (GENERIC_OPENERS.test(text)) out.push("saludo_generico");
  if (/\$\s?\d/.test(text)) out.push("precio");
  if (/^\s*\p{Extended_Pictographic}/u.test(text)) out.push("emoji_inicio");
  if (hasCta(copy)) out.push("cta");
  return out;
}

export function analyzeHook(copy: string): HookAnalysis {
  const gancho = extractHook(copy);
  const consejos: string[] = [];
  let score = 40;
  const text = gancho.normalize("NFC");

  if (!text) {
    return {
      gancho: "",
      puntaje: 0,
      nivel: "debil",
      consejos: ["Escribe una primera línea que enganche."],
      tiene_cta: hasCta(copy),
    };
  }

  if (/\?/.test(text)) score += 15;
  if (
    /^\s*[\p{Extended_Pictographic}\s]*\d/u.test(text) ||
    /\d+\s+(razones|formas|errores|pasos|tips|secretos|cosas)/i.test(text)
  ) {
    score += 20;
  }
  if (CURIOSITY.test(text)) score += 15;
  else consejos.push("Agrega curiosidad: un error común, un secreto o un 'mira esto'.");
  if (URGENCY.test(text)) score += 8;
  if (SECOND_PERSON.test(text)) score += 10;
  else consejos.push("Háblale directo al cliente (tú, te, tu).");
  if (GENERIC_OPENERS.test(text)) {
    score -= 30;
    consejos.push("Evita abrir con saludos o 'les presentamos': nadie se detiene por eso.");
  }
  if (text.length >= VISIBLE_CHARS) {
    score -= 10;
    consejos.push("Acórtala: la primera línea debe leerse en 2 segundos.");
  }
  if (text.length < 15) {
    score -= 10;
    consejos.push("Es muy corta: promete un beneficio o una solución.");
  }

  const tiene_cta = hasCta(copy);
  if (!tiene_cta)
    consejos.push("Cierra con una llamada a la acción a WhatsApp (pide, aparta, cotiza).");

  const puntaje = Math.max(0, Math.min(100, score));
  return {
    gancho,
    puntaje,
    nivel: puntaje >= 70 ? "fuerte" : puntaje >= 45 ? "regular" : "debil",
    consejos: consejos.slice(0, 3),
    tiene_cta,
  };
}
