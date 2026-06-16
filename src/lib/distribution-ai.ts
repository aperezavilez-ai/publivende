import type { Red, CanalDistribucion } from "@/lib/mock/types";
import type { PublishAlcance } from "@/lib/geo-targeting";
import type { NichoKey } from "@/lib/reach-ai";

const GRUPOS_FB_POR_NICHO: Record<NichoKey, number> = {
  moda: 14,
  ropa: 12,
  belleza: 10,
  comida: 18,
  fitness: 8,
  servicios: 6,
  tecnologia: 5,
  default: 8,
};

/**
 * Plan de distribución IA: cuántos grupos, canales y superficies usará por red.
 */
export function planificarDistribucionIA(
  redes: Red[],
  nicho: NichoKey,
  alcance: PublishAlcance,
): CanalDistribucion[] {
  const result: CanalDistribucion[] = [];
  const localBoost = alcance.tipo === "local" ? 1.35 : 1;
  const zona = alcance.ciudad ?? alcance.estado ?? alcance.pais ?? "tu zona";

  for (const red of redes) {
    switch (red) {
      case "facebook": {
        const grupos = Math.round(GRUPOS_FB_POR_NICHO[nicho] * localBoost);
        result.push(
          { red, canal: "Feed de página", cantidad: 1, descripcion: "Post principal en tu Fan Page" },
          {
            red,
            canal: "Grupos locales",
            cantidad: grupos,
            descripcion: `Grupos de compra/venta en ${zona} · nicho ${nicho}`,
          },
          { red, canal: "Marketplace", cantidad: 1, descripcion: "Listado en Marketplace" },
          { red, canal: "Stories", cantidad: 1, descripcion: "Story con enlace al post" },
        );
        break;
      }
      case "instagram":
        result.push(
          { red, canal: "Feed", cantidad: 1, descripcion: "Publicación en grid" },
          { red, canal: "Reels", cantidad: 1, descripcion: "Republicación como Reel" },
          { red, canal: "Stories", cantidad: 1, descripcion: "Story con sticker de enlace" },
        );
        if (nicho === "moda" || nicho === "belleza" || nicho === "comida" || nicho === "ropa") {
          result.push({
            red,
            canal: "Canales broadcast",
            cantidad: 2,
            descripcion: "Difusión a seguidores suscritos al canal",
          });
        }
        break;
      case "tiktok":
        result.push(
          { red, canal: "For You Page", cantidad: 1, descripcion: "Distribución algorítmica FYP" },
          { red, canal: "Seguidores", cantidad: 1, descripcion: "Feed de seguidores" },
        );
        if (nicho === "moda" || nicho === "comida" || nicho === "belleza" || nicho === "ropa") {
          result.push({
            red,
            canal: "TikTok Shop",
            cantidad: 1,
            descripcion: "Producto enlazado en el video",
          });
        }
        break;
      case "youtube":
        result.push(
          { red, canal: "Shorts", cantidad: 1, descripcion: "Short vertical en feed Shorts" },
          { red, canal: "Suscripciones", cantidad: 1, descripcion: "Feed de suscriptores" },
          { red, canal: "Community tab", cantidad: 1, descripcion: "Post en pestaña Comunidad" },
        );
        break;
    }
  }

  return result;
}

export function totalCanales(canales: CanalDistribucion[]): number {
  return canales.reduce((s, c) => s + c.cantidad, 0);
}
