import type { Post, PostMetric, WaContact, AdCampaign, AdMetric } from "@/lib/mock/types";

export interface CoachInsight {
  icon: string;
  titulo: string;
  detalle: string;
  accion: string;
  tipo: "win" | "warning" | "tip" | "idea";
}

export interface PlanSemanal {
  resumen: string;
  insights: CoachInsight[];
  ideas_contenido: string[];
  horarios_optimos: { dia: string; hora: string }[];
}

export async function generarPlanSemanal(
  posts: Post[],
  metrics: PostMetric[],
  contacts: WaContact[],
  campaigns: AdCampaign[],
  adMetrics: AdMetric[],
): Promise<PlanSemanal> {
  await new Promise((r) => setTimeout(r, 700));

  // Top post de la semana
  const ultimaSem = Date.now() - 7 * 86400000;
  const recientes = posts.filter((p) => p.fecha_publicacion && +new Date(p.fecha_publicacion) > ultimaSem);
  const ranked = recientes.map((p) => {
    const v = metrics.filter((m) => m.post_id === p.id).reduce((s, m) => s + m.vistas, 0);
    return { p, v };
  }).sort((a, b) => b.v - a.v);
  const top = ranked[0];

  // Tasa cierre
  const ganadas = contacts.filter((c) => c.etapa === "ganado").length;
  const total = contacts.length;
  const tasa = total > 0 ? Math.round((ganadas / total) * 100) : 0;

  // ROAS
  const totGasto = adMetrics.reduce((s, m) => s + m.gasto, 0);
  const totMonto = adMetrics.reduce((s, m) => s + m.monto_atribuido, 0);
  const roas = totGasto > 0 ? +(totMonto / totGasto).toFixed(2) : 0;

  const insights: CoachInsight[] = [];

  if (top) {
    insights.push({
      icon: "🏆", tipo: "win",
      titulo: `Tu mejor post: "${top.p.copy.slice(0, 40)}..."`,
      detalle: `${top.v.toLocaleString()} vistas — ${Math.round(top.v / Math.max(1, ranked[1]?.v ?? 1) * 10) / 10}× sobre el promedio.`,
      accion: "Duplicar este formato esta semana. Publicar 3 variaciones del mismo concepto.",
    });
  }

  if (tasa > 0) {
    insights.push({
      icon: tasa >= 30 ? "📈" : "⚠️",
      tipo: tasa >= 30 ? "win" : "warning",
      titulo: `Tasa de cierre WhatsApp: ${tasa}%`,
      detalle: tasa >= 30 ? "Excelente conversión, por encima del promedio LATAM (22%)." : "Por debajo del promedio (22%). Tu equipo tarda en responder o el primer mensaje no engancha.",
      accion: tasa >= 30 ? "Aumentar volumen de leads con +1 campaña de Google Ads." : "Activar la regla de bienvenida y responder en menos de 5 min.",
    });
  }

  if (campaigns.length > 0) {
    insights.push({
      icon: roas >= 2 ? "💰" : "🔧",
      tipo: roas >= 2 ? "win" : "warning",
      titulo: `ROAS de campañas: ${roas}×`,
      detalle: roas >= 2 ? `Ganas $${roas} por cada $1 invertido. Estás escalando bien.` : "Por debajo de 2×. Revisa creativos y segmentación.",
      accion: roas >= 2 ? `Subir presupuesto 30% en las campañas con ROAS > 3×.` : "Pausar campañas con ROAS < 1× y probar nuevo headline IA.",
    });
  }

  insights.push({
    icon: "🎯", tipo: "tip",
    titulo: "Tu audiencia compra entre 8-10pm",
    detalle: "Tus posts publicados en esa franja generan 2.3× más mensajes WhatsApp.",
    accion: "Programa los próximos 5 Reels a las 8:30pm hora local.",
  });

  insights.push({
    icon: "💡", tipo: "idea",
    titulo: "Falta contenido de prueba social",
    detalle: "Solo el 8% de tus posts son reseñas o testimonios. Esos rinden 4× más en CTR.",
    accion: "Pide a 3 clientes ganados una reseña en video por WhatsApp esta semana.",
  });

  return {
    resumen: `Esta semana publicaste ${recientes.length} posts, generaste ${contacts.filter((c) => +new Date(c.fecha_creacion) > ultimaSem).length} leads nuevos y cerraste $${contacts.filter((c) => c.etapa === "ganado").reduce((s, c) => s + (c.monto_venta ?? 0), 0).toLocaleString()} MXN.`,
    insights,
    ideas_contenido: [
      "Detrás de cámaras del proceso de empaque 📦",
      "Cliente desempaca su pedido en video 🎥",
      "Top 3 productos más pedidos esta semana 🏆",
      "Pregunta a tu audiencia: ¿qué color sigue? 🎨",
      "Reel rápido: cómo lo uso yo en mi día 💜",
    ],
    horarios_optimos: [
      { dia: "Lunes", hora: "8:30 PM" },
      { dia: "Miércoles", hora: "1:00 PM" },
      { dia: "Jueves", hora: "9:00 PM" },
      { dia: "Sábado", hora: "11:00 AM" },
    ],
  };
}

// Heatmap de horarios óptimos LATAM por ciudad
export const HEATMAP_LATAM: Record<string, number[][]> = {
  // 7 días x 6 franjas (6am, 9am, 12pm, 3pm, 6pm, 9pm) — valores 0-100 = % conversión
  "CDMX":     [[20,40,55,30,75,90],[15,35,50,28,70,85],[18,38,52,32,78,92],[22,42,58,35,80,88],[25,45,60,38,82,95],[30,50,65,42,70,75],[28,48,62,40,68,72]],
  "Bogotá":   [[18,38,50,28,72,88],[16,36,48,26,68,82],[20,40,52,30,75,90],[22,42,55,32,78,86],[24,44,58,36,80,92],[35,55,65,45,75,80],[32,52,62,42,70,76]],
  "Buenos Aires":[[15,35,48,25,70,92],[14,34,46,24,68,90],[16,36,50,28,72,93],[18,38,52,30,75,88],[22,42,55,32,78,95],[40,60,70,50,80,85],[38,58,68,48,78,82]],
  "Lima":     [[16,36,52,28,72,85],[14,34,50,26,70,82],[18,38,54,30,75,88],[20,40,56,32,78,86],[24,44,60,36,82,90],[30,50,64,42,72,76],[28,48,62,40,70,74]],
  "Santiago": [[15,35,50,28,68,82],[13,33,48,26,66,80],[17,37,52,30,72,85],[19,39,54,32,75,84],[22,42,58,36,78,88],[28,48,62,42,68,72],[26,46,60,40,66,70]],
};
