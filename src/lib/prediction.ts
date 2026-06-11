import type { DB, Red } from "@/lib/mock/types";

export interface PredictInput {
  copy: string;
  redes: Red[];
  hasMedia: boolean;
  programar?: string; // ISO
  hasCTA?: boolean;
}

export interface Prediction {
  vistas_min: number;
  vistas_max: number;
  dms_min: number;
  dms_max: number;
  ventas_min: number;
  ventas_max: number;
  ingreso_min: number;
  ingreso_max: number;
  score: number; // 0-100 calidad del post
  motivos: string[];
  benchmark_vistas: number;
}

const CTA_RX = /(comenta|escr[ií]beme|dm|whats?app|link|compra|env[ií]o|info|precio)/i;

export function predict(db: DB, userId: string, input: PredictInput): Prediction {
  const myPosts = db.posts.filter((p) => p.user_id === userId && p.estado === "publicado");
  const myMetrics = db.post_metrics.filter((m) => myPosts.some((p) => p.id === m.post_id));
  const myContacts = db.whatsapp_contacts.filter((c) => c.user_id === userId && c.post_origen_id);

  const totalVistas = myMetrics.reduce((s, m) => s + m.vistas, 0);
  const totalDMs = myMetrics.reduce((s, m) => s + m.mensajes_generados, 0);
  const leadsToVentaRate = (() => {
    const leads = myContacts.length || 1;
    const ganados = myContacts.filter((c) => c.etapa === "ganado").length;
    return ganados / leads;
  })();
  const ticketProm = (() => {
    const ganados = myContacts.filter((c) => c.etapa === "ganado" && c.monto_venta);
    if (!ganados.length) return 350; // fallback MXN
    return ganados.reduce((s, c) => s + (c.monto_venta ?? 0), 0) / ganados.length;
  })();

  const avgVistasPorRed = myMetrics.length ? totalVistas / myMetrics.length : 600;
  const dmRate = totalVistas ? totalDMs / totalVistas : 0.003;

  // Score de calidad
  const motivos: string[] = [];
  let score = 50;
  if (input.hasMedia) { score += 15; motivos.push("✓ Tiene imagen/video"); } else { score -= 20; motivos.push("⚠ Sin media visual"); }
  const len = input.copy.trim().length;
  if (len === 0) { score -= 30; motivos.push("⚠ Copy vacío"); }
  else if (len < 40) { score -= 8; motivos.push("⚠ Copy muy corto (<40 caracteres)"); }
  else if (len > 80 && len < 600) { score += 10; motivos.push("✓ Copy con buena longitud"); }
  else if (len >= 600) { score -= 5; motivos.push("⚠ Copy muy largo"); }
  if (CTA_RX.test(input.copy) || input.hasCTA) { score += 10; motivos.push("✓ Incluye llamada a la acción"); } else { score -= 5; motivos.push("⚠ Sin CTA claro"); }
  if (input.copy.match(/#\w+/g)?.length) { score += 5; motivos.push("✓ Hashtags presentes"); }
  if (input.copy.match(/[\p{Emoji_Presentation}\u{1F300}-\u{1FAFF}]/u)) { score += 3; motivos.push("✓ Usa emojis"); }
  if (input.redes.length >= 3) { score += 5; motivos.push("✓ Multi-canal (3+ redes)"); }
  if (input.programar) {
    const d = new Date(input.programar);
    const h = d.getHours();
    if ((h >= 12 && h <= 14) || (h >= 19 && h <= 21)) { score += 7; motivos.push("✓ Horario de alta actividad"); }
    else { motivos.push("ℹ Considera publicar 12-14h o 19-21h"); }
  }
  score = Math.max(5, Math.min(98, score));

  const factor = 0.4 + (score / 100) * 1.4; // 0.4x – 1.78x
  const vistasBase = avgVistasPorRed * input.redes.length * factor;
  const vistas_min = Math.round(vistasBase * 0.75);
  const vistas_max = Math.round(vistasBase * 1.25);
  const dms_min = Math.round(vistas_min * dmRate);
  const dms_max = Math.round(vistas_max * dmRate * 1.3);
  const ventas_min = Math.round(dms_min * leadsToVentaRate * 0.7);
  const ventas_max = Math.round(dms_max * leadsToVentaRate * 1.1);
  const ingreso_min = Math.round(ventas_min * ticketProm);
  const ingreso_max = Math.round(ventas_max * ticketProm);

  return {
    vistas_min, vistas_max, dms_min, dms_max, ventas_min, ventas_max,
    ingreso_min, ingreso_max, score: Math.round(score), motivos,
    benchmark_vistas: Math.round(avgVistasPorRed),
  };
}
