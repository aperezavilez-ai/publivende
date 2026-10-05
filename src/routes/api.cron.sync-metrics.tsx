import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret, isProductionMode } from "@/server/config";
import { findUsersDueForMetrics, syncUserMetrics } from "@/server/metrics/sync";
import { findUserById } from "@/server/auth/users";
import { computeServerDiagnosis } from "@/server/brain/server-diagnosis";

/** Margen para no exceder el tiempo máximo de la función serverless. */
const TIME_BUDGET_MS = 45_000;
const USERS_PER_RUN = 20;

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/sync-metrics")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron métricas de redes</div>
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

        const started = Date.now();
        const userIds = await findUsersDueForMetrics(USERS_PER_RUN);
        const results: Array<{ userId: string; redes: number; error?: string }> = [];
        for (const userId of userIds) {
          if (Date.now() - started > TIME_BUDGET_MS) break;
          try {
            const summary = await syncUserMetrics(userId);
            results.push({ userId, redes: summary.redes.length });
            const user = await findUserById(userId);
            if (user) {
              await computeServerDiagnosis(user).catch((err) =>
                console.error("[cron sync-metrics] diagnóstico", userId, err),
              );
            }
          } catch (err) {
            results.push({ userId, redes: 0, error: err instanceof Error ? err.message : "Error" });
          }
        }

        return Response.json({
          ok: true,
          pending: userIds.length - results.length,
          results,
          at: new Date().toISOString(),
        });
      },
    },
  },
});
