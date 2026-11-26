import { createFileRoute } from "@tanstack/react-router";
import { getCronSecret, isProductionMode } from "@/server/config";
import { runOperator } from "@/server/operator/engine";

/**
 * [OPERADOR IA DE PUBLIVENDE — Pieza 1, 2026-11-26] Pasada diaria
 * automática (13:30 UTC, registrada en vercel.json): el operador genera
 * el post propio del día por cuenta oficial activa y lo deja programado
 * para las 16:00 UTC; el cron publish-scheduled lo publica a su hora.
 * Sin cuentas oficiales activas responde ok con 0 creados y el motivo.
 */

function verifyCron(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/operator")({
  component: () => (
    <div className="p-8 text-center text-muted-foreground">Cron operador IA de Publivende</div>
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
        const res = await runOperator();
        return Response.json({ ...res, at: new Date().toISOString() }, { status: res.ok ? 200 : 503 });
      },
    },
  },
});
