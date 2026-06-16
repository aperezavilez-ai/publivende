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
    realAI: !!process.env.OPENAI_API_KEY,
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
      const user = await createUser(data);
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
    const user = await updateUserProfile(session.userId, data.patch as Partial<import("@/lib/mock/types").Profile>);
    if (!user) return { ok: false as const, error: "No se pudo actualizar" };
    return { ok: true as const, user: dbUserToProfile(user) };
  });

export const saveOAuthTokenServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      red: z.enum(["facebook", "instagram", "tiktok", "youtube"]),
      account: z.object({
        nombre_cuenta: z.string(),
        access_token: z.string(),
        external_account_id: z.string().optional(),
        token_expires_at: z.string().optional(),
        avatar: z.string().optional(),
        oauth_provider: z.enum(["meta", "google", "tiktok"]).optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Modo demo" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };
    await upsertOAuthAccount(session.userId, {
      red: data.red,
      nombre_cuenta: data.account.nombre_cuenta,
      access_token: data.account.access_token,
      external_account_id: data.account.external_account_id,
      token_expires_at: data.account.token_expires_at,
      avatar: data.account.avatar,
      oauth_provider: data.account.oauth_provider,
    });
    return { ok: true as const };
  });
