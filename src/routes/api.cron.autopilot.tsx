import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret, isProductionMode } from "@/server/config";
import { findUserById } from "@/server/auth/users";
import { findUsersDueForAutopilot, generateAutopilotWeek } from "@/server/autopilot/generate";

/** Margen para no exceder el tiempo máximo de la función serverless. */
const TIME_BUDGET_MS = 45_000;
const USERS_PER_RUN = 15;

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/autopilot")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron piloto automático</div>
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
        const userIds = await findUsersDueForAutopilot(USERS_PER_RUN);
        const results: Array<{ userId: string; posts?: number; fuente?: string; error?: string }> =
          [];
        for (const userId of userIds) {
          if (Date.now() - started > TIME_BUDGET_MS) break;
          try {
            const user = await findUserById(userId);
            if (!user) continue;
            const res = await generateAutopilotWeek(user, { manual: false });
            results.push(
              res.ok
                ? { userId, posts: res.posts.length, fuente: res.fuente }
                : { userId, error: res.error },
            );
          } catch (err) {
            results.push({ userId, error: err instanceof Error ? err.message : "Error" });
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
