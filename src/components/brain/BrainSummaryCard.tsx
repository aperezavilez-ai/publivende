import { Link } from "@tanstack/react-router";
import { ArrowRight, Stethoscope } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/brain/diagnose";
import { useDiagnosis } from "@/lib/brain/useDiagnosis";

/** Resumen del diagnóstico en el Dashboard: puntaje y las 2 fugas más urgentes. */
export function BrainSummaryCard() {
  const diagnosis = useDiagnosis();
  if (!diagnosis) return null;

  const top = diagnosis.deficits.slice(0, 2);
  const color =
    diagnosis.score >= 75
      ? "text-green-600"
      : diagnosis.score >= 50
        ? "text-amber-500"
        : "text-red-500";

  return (
    <Card className="p-5 border-primary/30">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 md:w-56 shrink-0">
          <div className="rounded-full bg-primary/10 p-3">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Salud de tu marketing</div>
            <div className={`text-3xl font-bold ${color}`}>
              {diagnosis.score}
              <span className="text-sm text-muted-foreground font-normal"> / 100</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1 text-sm">
          {top.length === 0 ? (
            <p className="text-muted-foreground">
              Sin fugas importantes. Sigue publicando con constancia.
            </p>
          ) : (
            top.map((d) => (
              <div key={d.id} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${d.severidad === "alta" ? "bg-red-500" : d.severidad === "media" ? "bg-amber-500" : "bg-blue-400"}`}
                />
                <span>
                  <span className="font-medium">{d.titulo}.</span>{" "}
                  <span className="text-muted-foreground">{d.accion}</span>
                </span>
              </div>
            ))
          )}
          {diagnosis.kpis.dinero_en_riesgo > 0 && (
            <p className="text-xs text-red-600 font-medium">
              ~{formatMoney(diagnosis.kpis.dinero_en_riesgo)} en ventas esperando respuesta o
              seguimiento.
            </p>
          )}
        </div>
        <Button asChild className="gap-1 shrink-0">
          <Link to="/diagnostico">
            Ver diagnóstico <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
