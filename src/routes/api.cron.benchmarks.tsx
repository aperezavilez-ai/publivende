import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret, isProductionMode } from "@/server/config";
import { computeNicheBenchmarks, refreshStaleKpis } from "@/server/brain/benchmarks";

/** Margen para no exceder el tiempo máximo de la función serverless (deja tiempo para agregar). */
const KPI_BUDGET_MS = 35_000;
const MAX_KPI_USERS = 60;

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/benchmarks")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron comparativas por nicho</div>
  ),
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isProductionMode()) {
          return Response.json({ error: "Requiere base de datos" }, { status: 503 });
        }
        if (!verifyCron(request)) {
          return Response.json({ error: "No autorizado" }, { status: 401 });
        }

        const refreshed = await refreshStaleKpis(Date.now() + KPI_BUDGET_MS, MAX_KPI_USERS);
        const nichos = await computeNicheBenchmarks();
        return Response.json({ ok: true, refreshed, nichos, at: new Date().toISOString() });
      },
    },
  },
});
