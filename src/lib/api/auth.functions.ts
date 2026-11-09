import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isProductionMode } from "@/server/config";
import {
  authenticateUser,
  createUser,
  dbUserToProfile,
  findUserById,
  updateUserProfile,
  upsertOAuthAccount,
} from "@/server/auth/users";
import { createSessionToken, verifySessionToken } from "@/server/auth/crypto";
import type { Plan } from "@/lib/mock/types";

export const getProductionStatus = createServerFn({ method: "GET" }).handler(async () => ({
  production: isProductionMode(),
  features: {
    database: isProductionMode(),
    realPublish: isProductionMode(),
    realWhatsApp:
      !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      !!process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID,
    realAI: !!process.env.MEAI_API_KEY,
    realPayments: !!(process.env.STRIPE_SECRET_KEY || process.env.MERCADOPAGO_ACCESS_TOKEN),
  },
}));

async function requireSession(token: string) {
  const session = await verifySessionToken(token);
  if (!session) throw new Error("Sesión inválida o expirada");
  const user = await findUserById(session.userId);
  if (!user) throw new Error("Usuario no encontrado");
  return user;
}

export const authSignUp = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      nombre: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      codigo_pais: z.string(),
      celular: z.string(),
      nombre_negocio: z.string(),
      plan: z.enum(["free", "pro", "business"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Modo demo — configura DATABASE_URL y SESSION_SECRET" };
    }
    try {
      // Los planes de pago se activan solo cuando Stripe confirma la suscripción.
      const user = await createUser({ ...data, plan: "free" });
      const token = await createSessionToken(user.id, user.email);
      return { ok: true as const, user: dbUserToProfile(user), token };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return { ok: false as const, error: "Ya existe una cuenta con ese email" };
      }
      return { ok: false as const, error: msg };
    }
  });

export const authSignIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: false as const, error: "Modo demo — configura DATABASE_URL y SESSION_SECRET" };
    }
    const user = await authenticateUser(data.email, data.password);
    if (!user) return { ok: false as const, error: "Email o contraseña incorrectos" };
    const token = await createSessionToken(user.id, user.email);
    return { ok: true as const, user: dbUserToProfile(user), token };
  });

export const authGetSession = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    try {
      const user = await requireSession(data.token);
      return { ok: true as const, user: dbUserToProfile(user) };
    } catch {
      return { ok: false as const, error: "Sesión inválida" };
    }
  });

export const authUpdateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      patch: z.record(z.unknown()),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    // El plan solo cambia vía webhook de Stripe; is_admin solo vía scripts/set-admin.
    const { plan: _plan, is_admin: _isAdmin, password: _password, ...patch } =
      data.patch as Partial<import("@/lib/mock/types").Profile>;
    const user = await updateUserProfile(session.userId, patch);
    if (!user) return { ok: false as const, error: "No se pudo actualizar" };
    return { ok: true as const, user: dbUserToProfile(user) };
  });

