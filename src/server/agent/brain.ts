import OpenAI from "openai";
import { getMeaiKey, getMeaiModel } from "../config";
import { getDb, schema } from "../db";
import { eq, or, ilike } from "drizzle-orm";
import type { Red } from "@/lib/mock/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const key = getMeaiKey();
    if (!key) throw new Error("MEAI_API_KEY no configurada");
    client = new OpenAI({ apiKey: key, baseURL: "https://api.meai.cloud/v1" });
  }
  return client;
}

export interface BrainAgentDiagnosis {
  giroComercial: string;
  ofertaDetectada: string;
  ganchoPsicologico: string;
  publicoObjetivo: string;
}

export interface BrainAssignedCommunity {
  id?: string;
  nombre: string;
  plataforma: string;
  miembros: number;
  alcance: string;
  estado?: string;
  ciudad?: string;
  razonSeleccionada: string;
}

export interface BrainAgentOutput {
  diagnostico: BrainAgentDiagnosis;
  nichoAsignado: {
    id: string;
    nombre: string;
    afinidadScore: number;
    descripcion: string;
  };
  comunidadesObjetivo: BrainAssignedCommunity[];
  copyPorRed: Partial<Record<Red, string>>;
  hashtagsVirales: string[];
  alcanceEstimado: {
    personasMin: number;
    personasMax: number;
    scoreAfinidad: number;
    comunidadesActivas: number;
  };
}

/**
 * Consulta en el Banco de Cerebro (market_niches y brain_communities) en Supabase
 */
export async function queryBrainBank(input: {
  text: string;
  pageName?: string;
  ciudad?: string;
  estado?: string;
  alcanceNivel?: string;
}) {
  const db = getDb();
  const allNiches = await db.select().from(schema.marketNiches).where(eq(schema.marketNiches.activo, true));

  const textToScan = `${input.pageName ?? ""} ${input.text} ${input.ciudad ?? ""}`.toLowerCase();

  // Calcular score de coincidencia semántica por palabras clave
  let bestNiche = allNiches[0];
  let maxScore = -1;

  for (const n of allNiches) {
    let score = 0;
    const kws = Array.isArray(n.keywords) ? (n.keywords as string[]) : [];
    for (const kw of kws) {
      if (textToScan.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (textToScan.includes(n.id.toLowerCase())) score += 5;
    if (textToScan.includes(n.nombre.toLowerCase())) score += 5;

    if (score > maxScore) {
      maxScore = score;
      bestNiche = n;
    }
  }

  // Si no hubo coincidencia alta, tomar comercio_general o el mejor evaluado
  const nicheId = bestNiche?.id || "comercio_general";

  // Buscar comunidades asociadas a este nicho en el banco
  const communities = await db
    .select()
    .from(schema.brainCommunities)
    .where(eq(schema.brainCommunities.nicheId, nicheId));

  // Filtrar o priorizar por geografía
  const ciudadTarget = (input.ciudad || "").toLowerCase();
  const estadoTarget = (input.estado || "").toLowerCase();

  const matched = communities.sort((a, b) => {
    const aMatch = (a.ciudad && ciudadTarget.includes(a.ciudad.toLowerCase())) || (a.estado && estadoTarget.includes(a.estado.toLowerCase()));
    const bMatch = (b.ciudad && ciudadTarget.includes(b.ciudad.toLowerCase())) || (b.estado && estadoTarget.includes(b.estado.toLowerCase()));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return b.miembrosEstimados - a.miembrosEstimados;
  });

  return {
    niche: bestNiche,
    afinidadScore: Math.min(99, Math.max(80, 80 + maxScore * 2)),
    communities: matched.slice(0, 10),
  };
}

/**
 * Ejecutor del Agente Autónomo de PubliVende:
 * Analiza la oferta, consulta el Banco de Cerebro y genera el enrutamiento y copies listos.
 */
export async function executeBrainAgent(input: {
  copy: string;
  pageName?: string;
  mediaUrl?: string;
  ciudad?: string;
  estado?: string;
  alcanceNivel?: string;
}): Promise<BrainAgentOutput> {
  const bankResult = await queryBrainBank(input);
  const niche = bankResult.niche;

  const communitiesSummary = bankResult.communities.map((c) => ({
    nombre: c.nombre,
    plataforma: c.plataforma,
    miembros: c.miembrosEstimados,
    alcance: c.tipoAlcance,
    ciudad: c.ciudad ?? undefined,
    estado: c.estado,
  }));

  const ai = getClient();
  const prompt = `
Eres el Cerebro Agéntico de PubliVende (Sistema Autónomo de Difusión Masiva en Redes y Comunidades).
Tu tarea es analizar la publicación o producto del cliente, evaluar su potencial de viralidad y generar la estrategia de distribución en nuestra red de comunidades oficiales.

DATOS DEL CLIENTE / PUBLICACIÓN:
- Nombre del negocio / Fan Page: "${input.pageName ?? "Negocio en PubliVende"}"
- Ubicación: "${input.ciudad ?? "General"}, ${input.estado ?? "México"}" (Nivel deseado: ${input.alcanceNivel ?? "local"})
- Texto original / oferta:
"""
${input.copy}
"""

BANCO DE CEREBRO DISPONIBLE:
- Nicho clasificado: ${niche.nombre} (${niche.id})
- Audiencia objetivo: ${niche.audienciaObjetivo}
- Ángulo de gancho recomendado: ${niche.anguloGancho}
- Comunidades de difusión asignadas:
${communitiesSummary.map((c, i) => `${i + 1}. [${c.plataforma}] ${c.nombre} (${c.miembros.toLocaleString()} miembros - ${c.alcance})`).join("\n")}

INSTRUCCIONES:
Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura (sin markdown adicional):
{
  "diagnostico": {
    "giroComercial": "Definición concisa del giro (ej: Estudio de Tatuajes y Piercings, Llantera y Taller Mecánico, etc.)",
    "ofertaDetectada": "La oferta o propuesta clave detectada en el texto (ej: 10% a 50% de descuento en el Buen Fin con tiro al blanco)",
    "ganchoPsicologico": "Por qué la audiencia querrá interactuar (ej: Gamificación con dardos + urgencia temporal de descuentos)",
    "publicoObjetivo": "A quién va dirigida la difusión"
  },
  "copyPorRed": {
    "facebook": "Copy de alto impacto para Facebook, con gancho en la 1ra línea, beneficios, llamado a la acción claro y emojis estratégicos.",
    "instagram": "Copy visual y atractivo para Instagram con llamado a comentar o enviar DM / WhatsApp.",
    "tiktok": "Guion o copy ultra dinámico para video/post en TikTok con gancho de 3 segundos.",
    "youtube": "Copy descriptivo para YouTube / Shorts con enlaces y llamados a la acción."
  },
  "hashtagsVirales": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"],
  "razonesComunidades": [
    "Razón específica por la que cada comunidad asignada es ideal para esta oferta"
  ]
}
`;

  try {
    const res = await ai.chat.completions.create({
      model: getMeaiModel(),
      messages: [
        {
          role: "system",
          content: "Eres un estratega de distribución y marketing digital que responde únicamente en formato JSON válido.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const rawJson = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawJson);

    const mappedCommunities: BrainAssignedCommunity[] = bankResult.communities.map((c, i) => ({
      id: c.id,
      nombre: c.nombre,
      plataforma: c.plataforma,
      miembros: c.miembrosEstimados,
      alcance: c.tipoAlcance,
      estado: c.estado,
      ciudad: c.ciudad ?? undefined,
      razonSeleccionada:
        parsed.razonesComunidades?.[i] ||
        `Comunidad activa de ${c.miembrosEstimados.toLocaleString()} personas con alta afinidad al nicho de ${niche.nombre}.`,
    }));

    const totalMiembros = mappedCommunities.reduce((acc, c) => acc + c.miembros, 0);

    return {
      diagnostico: parsed.diagnostico || {
        giroComercial: niche.nombre,
        ofertaDetectada: input.copy.slice(0, 100),
        ganchoPsicologico: niche.anguloGancho || "Promoción por tiempo limitado",
        publicoObjetivo: niche.audienciaObjetivo || "Público interesado",
      },
      nichoAsignado: {
        id: niche.id,
        nombre: niche.nombre,
        afinidadScore: bankResult.afinidadScore,
        descripcion: niche.descripcion,
      },
      comunidadesObjetivo: mappedCommunities,
      copyPorRed: parsed.copyPorRed || {
        facebook: input.copy,
        instagram: input.copy,
      },
      hashtagsVirales:
        Array.isArray(parsed.hashtagsVirales) && parsed.hashtagsVirales.length > 0
          ? parsed.hashtagsVirales
          : (niche.hashtags as string[]),
      alcanceEstimado: {
        personasMin: Math.round(totalMiembros * 0.15),
        personasMax: Math.round(totalMiembros * 0.35),
        scoreAfinidad: bankResult.afinidadScore,
        comunidadesActivas: mappedCommunities.length,
      },
    };
  } catch (err) {
    console.error("Error en executeBrainAgent:", err);

    // Respaldo confiable si el LLM no responde
    const mappedCommunities: BrainAssignedCommunity[] = bankResult.communities.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      plataforma: c.plataforma,
      miembros: c.miembrosEstimados,
      alcance: c.tipoAlcance,
      estado: c.estado,
      ciudad: c.ciudad ?? undefined,
      razonSeleccionada: `Comunidad del banco oficial con ${c.miembrosEstimados.toLocaleString()} miembros afines a ${niche.nombre}.`,
    }));

    const totalMiembros = mappedCommunities.reduce((acc, c) => acc + c.miembros, 0) || 50000;

    return {
      diagnostico: {
        giroComercial: niche.nombre,
        ofertaDetectada: input.copy.slice(0, 120),
        ganchoPsicologico: niche.anguloGancho || "Oferta directa de valor",
        publicoObjetivo: niche.audienciaObjetivo || "Consumidores locales",
      },
      nichoAsignado: {
        id: niche.id,
        nombre: niche.nombre,
        afinidadScore: bankResult.afinidadScore,
        descripcion: niche.descripcion,
      },
      comunidadesObjetivo: mappedCommunities,
      copyPorRed: {
        facebook: input.copy,
        instagram: input.copy,
      },
      hashtagsVirales: (niche.hashtags as string[]) || ["#PubliVende", "#Promocion"],
      alcanceEstimado: {
        personasMin: Math.round(totalMiembros * 0.15),
        personasMax: Math.round(totalMiembros * 0.35),
        scoreAfinidad: bankResult.afinidadScore,
        comunidadesActivas: mappedCommunities.length,
      },
    };
  }
}
