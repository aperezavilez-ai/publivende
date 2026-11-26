import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret, isProductionMode } from "@/server/config";
import { runDiscovery } from "@/server/discovery/engine";

/**
 * [FASE 1 — Descubrimiento real] Pasada semanal automática (lunes 05:00 UTC,
 * registrada en vercel.json): refresca el directorio de grupos y páginas
 * públicos por nicho desde el índice web. Sin proveedor de búsqueda
 * configurado, responde el error y no escribe nada.
 */

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/discovery")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron descubrimiento real por nicho</div>
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
        const res = await runDiscovery();
        return Response.json({ ...res, at: new Date().toISOString() }, { status: res.ok ? 200 : 503 });
      },
    },
  },
});
