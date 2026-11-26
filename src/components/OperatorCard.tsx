import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Play, RefreshCw } from "lucide-react";
import { getSessionToken } from "@/lib/production/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOperatorStatus, runOperatorNow } from "@/lib/api/operator.functions";

/**
 * [OPERADOR IA DE PUBLIVENDE — Pieza 1, 2026-11-26]
 * Tarjeta del operador de la casa en la página Red: modo (IA o reglas),
 * cuentas oficiales que cubre a diario, bitácora de sus posts con estado
 * real y botón para ejecutarlo ahora. La pasada automática corre a diario
 * por cron; esto es solo el espejo y el disparo manual.
 */

type Status = Extract<Awaited<ReturnType<typeof getOperatorStatus>>, { ok: true }>;
type Movimiento = Status["movimientos"][number];

const ESTADO_STYLE: Record<string, string> = {
  programado: "bg-amber-50 text-amber-800 border-amber-300",
  publicado: "bg-emerald-50 text-emerald-800 border-emerald-300",
  error: "bg-red-50 text-red-800 border-red-300",
  borrador: "bg-slate-50 text-slate-700 border-slate-300",
};

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function OperatorCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar() {
    const token = getSessionToken();
    if (!token) return;
    const res = await getOperatorStatus({ data: { token } });
    if (res.ok) setStatus(res);
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function ejecutar() {
    const token = getSessionToken();
    if (!token) return;
    setBusy(true);
    const res = await runOperatorNow({ data: { token } });
    setBusy(false);
    if (res.ok) {
      if (res.motivo) toast.info(res.motivo);
      else
        toast.success(
          `Operador: ${res.creados} post(s) programados para hoy` +
            (res.omitidos ? ` · ${res.omitidos} ya existían` : "") +
            (res.saltadas.length ? ` · ${res.saltadas.length} cuenta(s) omitidas` : ""),
        );
      await cargar();
    } else {
      toast.error(res.error);
    }
  }

  const movimientos: Movimiento[] = status?.movimientos ?? [];

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-600" /> Operador IA de Publivende
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        El crecimiento de la casa en automático: cada día genera un post propio por cuenta oficial
        activa — valor para su nicho e invitación a publicar con PubliVende — y lo deja programado
        para las 10:00 (hora CDMX). La pasada automática corre a diario; también puedes ejecutarlo ahora.
      </p>

      {status && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <Badge
            variant="outline"
            className={status.iaActiva ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"}
          >
            {status.iaActiva ? "Motor de IA activo" : "Modo reglas (plantillas por nicho)"}
          </Badge>
          <span className="text-muted-foreground">
            {status.cuentas.length
              ? `Cubre ${status.cuentas.length} cuenta(s) oficial(es) activa(s)`
              : "Sin cuentas cubiertas"}
          </span>
        </div>
      )}

      {status && status.cuentas.length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          El Operador no tiene dónde publicar todavía.{" "}
          <strong>Activa una cuenta oficial en esta misma página</strong> (sección «Cuentas Oficiales
          Conectadas») y empezará a publicar a diario en ella.
        </p>
      )}

      {status && status.cuentas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {status.cuentas.map((c) => (
            <span key={c.id} className="text-xs border rounded-full px-2.5 py-1 bg-slate-50">
              {c.nombre} · {c.red} · hoy: <strong>{c.nichoHoy}</strong>
              {!c.aceptaTexto && <span className="text-amber-700"> · requiere imagen/video</span>}
            </span>
          ))}
        </div>
      )}

      {movimientos.length > 0 && (
        <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 mb-3 divide-y divide-slate-100">
          {movimientos.map((m) => (
            <div key={m.id} className="px-3 py-2 text-xs space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{m.cuenta}</span>
                <span className="text-muted-foreground">{m.nicho}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {m.fuente === "ia" ? "IA" : "reglas"}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ESTADO_STYLE[m.estado] ?? ""}`}>
                  {m.estado}
                </Badge>
                <span className="text-muted-foreground ml-auto">
                  {m.estado === "publicado" ? fechaCorta(m.fechaPublicacion) : `prog. ${fechaCorta(m.fechaProgramada)}`}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2">{m.copy}</p>
              {m.error && <p className="text-red-700">{m.error}</p>}
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" disabled={busy} onClick={() => void ejecutar()}>
        {busy ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
        {busy ? "Ejecutando…" : "Ejecutar ahora"}
      </Button>
    </Card>
  );
}
