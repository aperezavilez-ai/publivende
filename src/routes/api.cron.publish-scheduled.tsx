import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret } from "@/server/config";
import { isProductionMode } from "@/server/config";
import { runDueScheduledPosts } from "@/server/schedule/runner";

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/publish-scheduled")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron publicaciones programadas</div>
  ),
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isProductionMode()) {
          return Response.json({ error: "Requiere DATABASE_URL" }, { status: 503 });
        }
        if (!verifyCron(request)) {
          return Response.json({ error: "No autorizado" }, { status: 401 });
        }

        const result = await runDueScheduledPosts();
        return Response.json({
          ok: true,
          processed: result.processed,
          results: result.results,
          at: new Date().toISOString(),
        });
      },
    },
  },
});
