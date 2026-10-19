import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { getDb, schema } from "@/server/db";
import { getMetaOAuthConfig } from "@/lib/oauth/config.server";

export const checkMetaPublishHealth = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) {
      return { ok: true as const, mode: "demo" as const };
    }

    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.oauthAccounts)
      .where(eq(schema.oauthAccounts.userId, session.userId));
    const fb = rows.find((r: typeof rows[number]) => r.red === "facebook");

    if (!fb?.accessToken) {
      return {
        ok: true as const,
        connected: false as const,
        message: "Conecta Facebook en Configuración",
      };
    }

    const cfg = getMetaOAuthConfig();
    const scopes: string[] = [];
    let canPublish = false;
    let debugError: string | undefined;

    if (cfg) {
      const debugRes = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(fb.accessToken)}&access_token=${encodeURIComponent(`${cfg.appId}|${cfg.appSecret}`)}`,
      );
      const debugJson = (await debugRes.json()) as {
        data?: { scopes?: string[]; is_valid?: boolean; error?: { message?: string } };
      };
      if (debugJson.data?.scopes) scopes.push(...debugJson.data.scopes);
      canPublish = scopes.includes("pages_manage_posts");
      if (!debugJson.data?.is_valid) debugError = "Token inválido o expirado";
    }

    const draftRes = await fetch(`https://graph.facebook.com/v21.0/${fb.externalAccountId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "[PubliVende] Verificación de permisos — no publicado",
        published: false,
        access_token: fb.accessToken,
      }),
    });
    const draftJson = (await draftRes.json()) as { id?: string; error?: { message?: string; code?: number } };
    const publishTestOk = !!draftJson.id;
    if (!publishTestOk && draftJson.error?.message) {
      debugError = draftJson.error.message;
    }

    const [owner] = await db
      .select({ isAdmin: schema.users.isAdmin })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);
    // La página «Publivende» es la cuenta oficial de la plataforma: solo el administrador la puede usar.
    const wrongAppPage = !owner?.isAdmin && /publivende/i.test(fb.nombreCuenta);

    return {
      ok: true as const,
      connected: true as const,
      page_name: fb.nombreCuenta,
      page_id: fb.externalAccountId,
      scopes,
      can_publish: canPublish && publishTestOk,
      publish_test_ok: publishTestOk,
      wrong_app_page: wrongAppPage,
      needs_reconnect: wrongAppPage || !canPublish || !publishTestOk,
      debug_error: debugError,
      recommendations: [
        wrongAppPage
          ? "Reconecta Facebook y elige la Fan Page de tu negocio, no la página oficial de PubliVende."
          : null,
        !canPublish
          ? "Falta el permiso pages_manage_posts: actívalo en developers.facebook.com → tu app → Casos de uso → Administrar todo en tu página, y vuelve a conectar Facebook aceptando todos los permisos."
          : null,
        !publishTestOk
          ? "Vuelve a autorizar Facebook con todos los permisos de publicación."
          : null,
      ].filter(Boolean) as string[],
    };
  });
