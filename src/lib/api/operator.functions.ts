import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import {
  getOperatorLog,
  getOperatorOverview,
  runOperator,
} from "@/server/operator/engine";

/**
 * [OPERADOR IA DE PUBLIVENDE — Pieza 1, 2026-11-26]
 * Disparo manual y bitácora del operador de la casa para la página Red.
 * Solo super admin, mismo patrón de sesión que discovery.functions.ts.
 */

async function requireAdmin(token: string) {
  const session = await verifySessionToken(token);
  if (!session) throw new Error("Sesión inválida");
  const user = await findUserById(session.userId);
  if (!user) throw new Error("Sesión inválida");
  if (!user.isAdmin) throw new Error("Solo administradores");
  return user;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Error inesperado";
}

export const runOperatorNow = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    try {
      await requireAdmin(data.token);
      const res = await runOperator();
      return res;
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const getOperatorStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere modo producción" };
    try {
      await requireAdmin(data.token);
      const overview = await getOperatorOverview();
      const movimientos = await getOperatorLog(20);
      return { ok: true as const, ...overview, movimientos };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });
