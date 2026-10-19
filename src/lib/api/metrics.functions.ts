import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { getDb, schema } from "@/server/db";
import { verifySessionToken } from "@/server/auth/crypto";
import { getMetricsSyncStatus, syncUserMetrics } from "@/server/metrics/sync";
import { mergeRealMetrics } from "@/server/sync/user-data";
import type { DB, WaContact } from "@/lib/mock/types";

/** Evita que el botón dispare ráfagas de llamadas a las APIs de las redes (tienen cuotas). */
const MANUAL_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

async function realMetricsFor(userId: string) {
  const contacts = await getDb()
    .select({ id: schema.whatsappContacts.id, postOrigenId: schema.whatsappContacts.postOrigenId })
    .from(schema.whatsappContacts)
    .where(eq(schema.whatsappContacts.userId, userId));
  const data: Partial<DB> = {
    post_metrics: [],
    whatsapp_contacts: contacts.map(
      (c: typeof contacts[number]) => ({ id: c.id, post_origen_id: c.postOrigenId ?? undefined }) as WaContact,
    ),
  };
  await mergeRealMetrics(userId, data);
  return {
    post_metrics: data.post_metrics ?? [],
    account_snapshots: data.account_snapshots ?? [],
    metrics_sync: data.metrics_sync ?? [],
  };
}

export const syncMyMetricsServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode())
      return { ok: false as const, error: "Disponible solo con cuentas reales conectadas" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const status = await getMetricsSyncStatus(session.userId);
    const lastSync = Math.max(0, ...status.map((s) => (s.synced_at ? Date.parse(s.synced_at) : 0)));
    const wait = MANUAL_SYNC_COOLDOWN_MS - (Date.now() - lastSync);
    if (wait > 0) {
      return {
        ok: false as const,
        error: `Las métricas se actualizaron hace poco. Intenta en ${Math.ceil(wait / 60000)} min.`,
        metrics: await realMetricsFor(session.userId),
      };
    }

    const summary = await syncUserMetrics(session.userId);
    return { ok: true as const, summary, metrics: await realMetricsFor(session.userId) };
  });
