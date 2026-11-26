import type { Plan, Red } from "@/lib/mock/types";

/**
 * [PLANES VERDAD — 2026-11-26] Tabla de COMPARTIDAS por plan: es el único
 * límite que el servidor hace cumplir (boostQuota en src/server/red/boost.ts).
 * 1 compartida = 1 impulso difundido por la Red PubliVende. business 9999 =
 * ilimitado práctico. La ventana de conteo NO es igual para todos: free es
 * DE POR VIDA y los planes pagos son por mes (ver boostWindowStart).
 * Los administradores no tienen límite.
 */
export const BOOST_LIMITS: Record<Plan, number> = { free: 1, plus: 10, pro: 40, business: 9999 };

/**
 * Inicio de la ventana de conteo de compartidas: null = de por vida (plan
 * free: su única compartida no se renueva cada mes); planes pagos = día 1
 * del mes en curso.
 */
export function boostWindowStart(plan: Plan, now: Date = new Date()): Date | null {
  if (plan === "free") return null;
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

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
