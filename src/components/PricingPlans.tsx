import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { PLAN_OFFERS } from "@/lib/plans";
import type { Plan } from "@/lib/mock/types";

interface PricingPlansProps {
  /** Si true, los botones van a registro con el plan seleccionado */
  signupLinks?: boolean;
  /** Plan actual del usuario (solo lectura en configuración) */
  currentPlan?: Plan;
  compact?: boolean;
}

export function PricingPlans({ signupLinks = true, currentPlan, compact = false }: PricingPlansProps) {
  return (
    <div className={`grid gap-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
      {PLAN_OFFERS.map((p) => {
        const isCurrent = currentPlan === p.id;
        return (
          <Card
            key={p.id}
            className={`p-6 relative flex flex-col ${p.highlight ? "border-primary shadow-elegant md:scale-105 z-10" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}
          >
            {p.highlight && !isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Más popular
              </div>
            )}
            {isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Tu plan actual
              </div>
            )}
            <h3 className="font-bold text-xl">{p.nombre}</h3>
            <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
            <div className="mt-4">
              <span className="text-4xl font-extrabold">{p.precio}</span>
              <span className="text-muted-foreground"> MXN/mes</span>
            </div>
            <ul className="mt-6 space-y-2.5 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {signupLinks && !isCurrent ? (
              <Link
                to="/auth"
                search={{ mode: "signup", plan: p.id }}
                className="block mt-6"
              >
                <Button
                  className={`w-full ${p.highlight ? "bg-gradient-primary border-0 shadow-elegant" : ""}`}
                  variant={p.highlight ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
            ) : isCurrent ? (
              <div className="mt-6 text-center text-xs text-success font-medium">Activo en tu cuenta</div>
            ) : (
              <a href="/#precios" className="block mt-6">
                <Button variant="outline" className="w-full">Ver planes</Button>
              </a>
            )}
          </Card>
        );
      })}
    </div>
  );
}
