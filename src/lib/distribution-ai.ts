import type { Red, CanalDistribucion } from "@/lib/mock/types";

/** Superficies donde PubliVende publica de verdad, en las cuentas conectadas del usuario. */
export function planificarDistribucionIA(redes: Red[]): CanalDistribucion[] {
  const result: CanalDistribucion[] = [];

  for (const red of redes) {
    switch (red) {
      case "facebook":
        result.push({ red, canal: "Feed de tu página", cantidad: 1, descripcion: "Post en tu Fan Page con link rastreable a WhatsApp" });
        break;
      case "instagram":
        result.push({ red, canal: "Feed / Reels", cantidad: 1, descripcion: "Imagen en el feed o video como Reel" });
        break;
      case "tiktok":
        result.push({ red, canal: "Video", cantidad: 1, descripcion: "Video en tu cuenta; el algoritmo lo muestra en Para ti" });
        break;
      case "youtube":
        result.push({ red, canal: "Shorts", cantidad: 1, descripcion: "Video vertical en tu canal como Short" });
        break;
    }
  }

  return result;
}

export function totalCanales(canales: CanalDistribucion[]): number {
  return canales.reduce((s, c) => s + c.cantidad, 0);
}
