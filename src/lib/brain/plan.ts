import type { Producto, Profile } from "@/lib/mock/types";
import { AREA_LABELS, type Area, type Diagnosis } from "./diagnose";
import { fillHook, NICHES, upcomingSeasons } from "./niches";

export interface BrainHook {
  texto: string;
  formula: string;
  por_que: string;
}

export interface BrainDayPlan {
  dia: string;
  hora: string;
  red: string;
  formato: string;
  gancho: string;
  idea: string;
  cta: string;
}

export interface BrainPriority {
  titulo: string;
  por_que: string;
  pasos: string[];
}

export interface BrainPlan {
  resumen: string;
  prioridades: BrainPriority[];
  semana: BrainDayPlan[];
  ganchos: BrainHook[];
  fuente: "ia" | "reglas";
  generado_at: string;
}

export interface BrainReport {
  id: string;
  user_id: string;
  created_at: string;
  score: number;
  diagnosis: Diagnosis;
  plan: BrainPlan;
}

const RED_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function weakestArea(d: Diagnosis): Area {
  return (
    (Object.keys(d.areas) as Area[])
      .filter((a) => !d.areas[a].sin_datos)
      .sort((a, b) => d.areas[a].score - d.areas[b].score)[0] ?? "constancia"
  );
}

/** Plan armado solo con reglas: se usa en modo demo o si la IA no está disponible. */
export function buildFallbackPlan(
  d: Diagnosis,
  profile: Pick<Profile, "ciudad" | "publico_objetivo" | "nombre_negocio">,
  productos: Array<Pick<Producto, "nombre" | "precio" | "activo">>,
): BrainPlan {
  const niche = NICHES[d.nicho];
  const activos = productos.filter((p) => p.activo);
  const vars = (i: number) => {
    const p = activos.length ? activos[i % activos.length] : undefined;
    return {
      producto: p?.nombre,
      precio: p?.precio,
      ciudad: profile.ciudad,
      publico: profile.publico_objetivo,
      negocio: profile.nombre_negocio,
    };
  };

  const ganchos: BrainHook[] = niche.hooks.slice(0, 8).map((h, i) => ({
    texto: fillHook(h.plantilla, vars(i)),
    formula: h.formula,
    por_que: h.por_que,
  }));

  const redes = d.kpis.redes_conectadas.length ? d.kpis.redes_conectadas : niche.redes_prioritarias;
  const dias = Math.min(7, Math.max(3, Math.round(niche.frecuencia_semanal)));
  const temporada = upcomingSeasons(d.nicho)[0];
  const semana: BrainDayPlan[] = Array.from({ length: dias }, (_, i) => {
    const horario = d.mejores_horarios[i % d.mejores_horarios.length];
    const h = niche.hooks[i % niche.hooks.length];
    const usarTemporada = temporada && i === dias - 1;
    return {
      dia: horario?.dia ?? `Día ${i + 1}`,
      hora: horario?.hora ?? "8:00 PM",
      red: RED_LABEL[redes[i % redes.length]] ?? redes[i % redes.length],
      formato:
        i % 2 === 0
          ? niche.formato_estrella === "video"
            ? "Video corto"
            : "Imagen"
          : "Carrusel / imagen",
      gancho: fillHook(h.plantilla, vars(i)),
      idea: usarTemporada
        ? `${temporada.nombre}: ${temporada.angulo}`
        : niche.pilares[i % niche.pilares.length],
      cta: niche.cta_tipico,
    };
  });

  const prioridades: BrainPriority[] = d.deficits.slice(0, 3).map((def) => ({
    titulo: def.titulo,
    por_que: def.impacto,
    pasos: [def.accion, ...(def.cta ? [`En PubliVende: ${def.cta.label}.`] : [])],
  }));

  const debil = weakestArea(d);
  const dinero =
    d.kpis.dinero_en_riesgo > 0
      ? ` Tienes cerca de $${d.kpis.dinero_en_riesgo.toLocaleString("es-MX")} en conversaciones sin atender.`
      : "";
  const resumen =
    d.deficits.length === 0
      ? `Tu marketing está sano (${d.score}/100). Mantén la constancia y duplica lo que mejor te funciona.`
      : `Tu salud de marketing es ${d.score}/100. El área que más te frena es ${AREA_LABELS[debil].toLowerCase()}.${dinero} Enfócate esta semana en: ${d.deficits[0].titulo.toLowerCase()}.`;

  return {
    resumen,
    prioridades,
    semana,
    ganchos,
    fuente: "reglas",
    generado_at: new Date().toISOString(),
  };
}

/** Versión reducida del diagnóstico para el prompt (menos tokens, sin datos personales de clientes). */
export function compactDiagnosis(d: Diagnosis) {
  return {
    nicho: d.nicho_label,
    score: d.score,
    confianza_datos: d.confianza,
    areas: Object.fromEntries(
      (Object.keys(d.areas) as Area[]).map((a) => [
        AREA_LABELS[a],
        d.areas[a].sin_datos ? "sin datos" : d.areas[a].score,
      ]),
    ),
    kpis: d.kpis,
    problemas: d.deficits
      .slice(0, 8)
      .map((x) => ({ severidad: x.severidad, problema: x.titulo, evidencia: x.evidencia })),
    fortalezas: d.fortalezas.map((f) => `${f.titulo}: ${f.evidencia}`),
    mejores_horarios: d.mejores_horarios,
    ganchos_que_funcionaron: d.ganchos_propios
      .slice(0, 3)
      .map((h) => ({ gancho: h.gancho, vistas: h.vistas, leads: h.leads })),
    ganchos_debiles: d.ganchos_a_mejorar.slice(0, 3).map((h) => h.gancho),
    comparativa_nicho: d.comparativo?.suficiente
      ? {
          negocios_comparados: d.comparativo.negocios,
          metricas: d.comparativo.filas.map((f) => ({
            metrica: f.label,
            tuyo: f.tuyo,
            mediana_nicho: f.p50,
            mejor_cuartil: f.mejor_si === "mayor" ? f.p75 : f.p25,
            posicion: f.posicion,
          })),
          rasgos_de_gancho: d.comparativo.ganchos.map(
            (g) => `${g.label}: ${g.lift >= 0 ? "+" : ""}${Math.round(g.lift * 100)}% de interacción`,
          ),
        }
      : undefined,
  };
}
