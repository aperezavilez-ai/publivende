import type { Plan, Red } from "@/lib/mock/types";

/** Impulsos al mes en la red oficial PubliVende por plan (los administradores no tienen límite). */
export const BOOST_LIMITS: Record<Plan, number> = { free: 1, pro: 4, business: 12 };

/** Puntaje mínimo de la revisión IA para publicar sin cambios en las cuentas oficiales. */
export const BOOST_MIN_SCORE = 60;

/** Qué tipo de contenido acepta cada red al publicar por API. */
export function redAcceptsMedia(red: Red, mediaType: "imagen" | "video" | "texto"): boolean {
  if (red === "facebook") return true;
  if (red === "instagram") return mediaType !== "texto";
  return mediaType === "video";
}

export function normalizeNicho(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
