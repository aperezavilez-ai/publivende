import type { Plan } from "@/lib/mock/types";

export interface PlanOffer {
  id: Plan;
  nombre: string;
  precio: string;
  precioNum: number;
  desc: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

// [PLANES VERDAD — 2026-11-26] Textos = lo que el sistema sí hace: el cliente
// pega su link y PubliVende lo difunde en las cuentas oficiales de su nicho
// (la «compartida»). Nada de redes del usuario, publicaciones ilimitadas,
// conversaciones contadas ni white-label. La cuota real vive en BOOST_LIMITS
// (src/lib/red/limits.ts) y debe coincidir con estos textos.
export const PLAN_OFFERS: PlanOffer[] = [
  {
    id: "free",
    nombre: "Free",
    precio: "$0",
    precioNum: 0,
    desc: "Para probar la plataforma",
    features: [
      "1 compartida de prueba",
      "Análisis de tu link y nicho con IA",
      "Difusión en las cuentas oficiales de tu nicho (hasta 4 redes)",
      "Seguimiento de clics en tu panel",
    ],
    cta: "Empezar gratis",
  },
  {
    id: "plus",
    nombre: "Plus",
    precio: "$149",
    precioNum: 149,
    desc: "Para negocios que empiezan a difundir",
    features: [
      "Todo lo de Free",
      "10 compartidas al mes",
      "Textos adaptados con IA para cada red",
      "≈ $15 por compartida",
    ],
    cta: "Elegir Plus",
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: "$399",
    precioNum: 399,
    desc: "Para creadores y pymes",
    features: [
      "Todo lo de Plus",
      "40 compartidas al mes",
      "Atribución de leads y ventas en Resultados",
      "Reporte PDF de resultados",
      "≈ $10 por compartida",
    ],
    cta: "Elegir Pro",
    highlight: true,
  },
  {
    id: "business",
    nombre: "Business",
    precio: "$999",
    precioNum: 999,
    desc: "Equipos y agencias",
    features: [
      "Todo lo de Pro",
      "Compartidas ilimitadas",
      "Vendedor IA de WhatsApp 24/7",
      "Prioridad en revisión de compartidas",
    ],
    cta: "Elegir Business",
  },
];

export function planLabel(plan: Plan): string {
  return PLAN_OFFERS.find((p) => p.id === plan)?.nombre ?? plan;
}

export function isValidPlan(v: unknown): v is Plan {
  return v === "free" || v === "plus" || v === "pro" || v === "business";
}
