import type { Red } from "@/lib/mock/types";

/** Constantes de presentación de las redes (sin lógica de publicación). */
export const RED_LABELS: Record<Red, string> = {
  facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
};
export const RED_LIMITS: Record<Red, number> = {
  facebook: 5000, instagram: 2200, tiktok: 2200, youtube: 5000,
};
export const RED_COLORS: Record<Red, string> = {
  facebook: "#1877F2", instagram: "#E4405F", tiktok: "#000000", youtube: "#FF0000",
};
export const REDES_ORDEN: Red[] = ["facebook", "instagram", "tiktok", "youtube"];
