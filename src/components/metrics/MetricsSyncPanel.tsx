import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB } from "@/lib/mock/db";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { syncMyMetricsServer } from "@/lib/api/metrics.functions";
import { RED_LABELS } from "@/services/social/mock";
import type { AccountSnapshot, MetricsSyncStatus, PostMetric, Red } from "@/lib/mock/types";

type RealMetrics = {
  post_metrics: PostMetric[];
  account_snapshots: AccountSnapshot[];
  metrics_sync: MetricsSyncStatus[];
};

function applyRealMetrics(m: RealMetrics) {
  const db = loadDB();
  const key = (x: PostMetric) => `${x.post_id}|${x.red}`;
  const real = new Set(m.post_metrics.map(key));
  db.post_metrics = [...db.post_metrics.filter((x) => !real.has(key(x))), ...m.post_metrics];
  db.account_snapshots = m.account_snapshots;
  db.metrics_sync = m.metrics_sync;
  saveDB(db);
}

function haceCuanto(iso?: string | null): string {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

/** Crecimiento de seguidores contra la foto más cercana a hace `dias` días. */
function crecimiento(snaps: AccountSnapshot[], dias: number): number | null {
  if (snaps.length < 2) return null;
  const last = snaps[snaps.length - 1];
  const target = Date.parse(last.fecha) - dias * 86400000;
  const base = [...snaps].reverse().find((s) => Date.parse(s.fecha) <= target) ?? snaps[0];
  if (base === last) return null;
  return last.seguidores - base.seguidores;
}

export function MetricsSyncPanel() {
  const status = useDB((db) => db.metrics_sync ?? []);
  const snapshots = useDB((db) => db.account_snapshots ?? []);
  const realCount = useDB((db) => db.post_metrics.filter((m) => m.fuente === "real").length);
  const [busy, setBusy] = useState(false);
  const production = isProductionModeClient();

  async function actualizar() {
    const token = getSessionToken();
    if (!token) return;
    setBusy(true);
    try {
      const res = await syncMyMetricsServer({ data: { token } });
      if ("metrics" in res && res.metrics) applyRealMetrics(res.metrics);
      if (!res.ok) {
        toast.message(res.error);
        return;
      }
      const actualizadas = res.summary.redes.reduce((s, r) => s + r.actualizadas, 0);
      const conProblema = res.summary.redes.filter((r) => r.reconectar);
      if (conProblema.length) {
        toast.warning(
          `Reconecta ${conProblema.map((r) => RED_LABELS[r.red]).join(", ")} para leer todas las métricas`,
        );
      } else {
        toast.success(`Métricas actualizadas: ${actualizadas} publicaciones`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron actualizar las métricas");
    } finally {
      setBusy(false);
    }
  }

  if (!production) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Estás viendo métricas de ejemplo. Con tus redes conectadas en producción, aquí verás vistas,
        alcance e interacciones reales de cada publicación.
      </Card>
    );
  }

  const ultima = status.reduce<string | null>(
    (acc, s) => (s.synced_at && (!acc || s.synced_at > acc) ? s.synced_at : acc),
    null,
  );

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Métricas reales de tus redes</h2>
          <p className="text-xs text-muted-foreground">
            {realCount} publicaciones medidas · última lectura {haceCuanto(ultima)} · se actualizan
            solas cada 6 h
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={actualizar} disabled={busy} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Leyendo redes…" : "Actualizar métricas"}
        </Button>
      </div>

      {status.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Conecta tus redes en{" "}
          <Link to="/configuracion" className="underline">
            Configuración
          </Link>{" "}
          para empezar a medir.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {status.map((s) => {
            const snaps = snapshots.filter((x) => x.red === s.red);
            const seguidores = snaps[snaps.length - 1]?.seguidores;
            const delta = crecimiento(snaps, 30);
            return (
              <div key={s.red} className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{RED_LABELS[s.red as Red]}</span>
                  {s.reconectar ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                </div>
                {seguidores != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{seguidores.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">seguidores</span>
                    {delta != null && delta !== 0 && (
                      <span
                        className={`flex items-center gap-0.5 text-xs ${delta > 0 ? "text-success" : "text-destructive"}`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {delta > 0 ? "+" : ""}
                        {delta.toLocaleString()} en 30 días
                      </span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">Leído {haceCuanto(s.synced_at)}</div>
                {s.error && (
                  <div className="text-xs text-amber-600">
                    {s.error}
                    {s.reconectar && (
                      <>
                        {" "}
                        <Link to="/configuracion" className="underline font-medium">
                          Reconectar
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
