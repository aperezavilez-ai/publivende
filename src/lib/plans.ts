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

export const PLAN_OFFERS: PlanOffer[] = [
  {
    id: "free",
    nombre: "Free",
    precio: "$0",
    precioNum: 0,
    desc: "Para probar la plataforma",
    features: ["1 red social", "10 publicaciones/mes", "50 conversaciones WhatsApp", "2 reglas automáticas"],
    cta: "Empezar gratis",
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: "$399",
    precioNum: 399,
    desc: "Para creadores y pymes",
    features: [
      "4 redes sociales",
      "Publicaciones ilimitadas",
      "500 conversaciones WhatsApp",
      "10 reglas automáticas",
      "IA para captions",
      "Atribución a ventas",
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
      "Conversaciones ilimitadas",
      "Vendedor IA 24/7",
      "Automatizaciones avanzadas",
      "Reportes white-label",
    ],
    cta: "Elegir Business",
  },
];

export function planLabel(plan: Plan): string {
  return PLAN_OFFERS.find((p) => p.id === plan)?.nombre ?? plan;
}

export function isValidPlan(v: unknown): v is Plan {
  return v === "free" || v === "pro" || v === "business";
}
