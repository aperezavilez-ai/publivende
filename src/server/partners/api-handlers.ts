import { isProductionMode } from "@/server/config";
import { authenticatePartnerRequest, jsonResponse, partnerAuthErrorResponse, parseJsonBody } from "@/server/partners/auth";
import { upsertPartnerEndUser, getPartnerUserWithProfile } from "@/server/partners/users";
import { buildPartnerConnectPageUrl, buildPartnerWhatsAppOnboardUrl } from "@/server/partners/connect";
import { getConnectionStatusForUser } from "@/server/partners/admin";
import { buildPartnerOAuthStartUrl } from "@/server/partners/oauth";
import { notifyPartnerWebhook } from "@/server/partners/webhooks";
import { publishForUser, inferPostTipo } from "@/server/publish/service";
import type { Red } from "@/lib/mock/types";

function requireProduction() {
  if (!isProductionMode()) {
    return jsonResponse({ error: "API plataforma requiere DATABASE_URL y SESSION_SECRET" }, 503);
  }
  return null;
}

export async function handlePartnerUsersPost(request: Request) {
  const prodErr = requireProduction();
  if (prodErr) return prodErr;

  const auth = await authenticatePartnerRequest(request.headers.get("Authorization"));
  if (!auth) return partnerAuthErrorResponse();

  const body = await parseJsonBody<{
    external_user_id: string;
    nombre?: string;
    nombre_negocio?: string;
    celular?: string;
    codigo_pais?: string;
    metadata?: Record<string, unknown>;
  }>(request);

  if (!body.external_user_id?.trim()) {
    return jsonResponse({ error: "external_user_id requerido" }, 400);
  }

  const { partnerUser, user, created } = await upsertPartnerEndUser(auth.partner, body);

  if (created) {
    notifyPartnerWebhook(auth.partner, "user.created", partnerUser.externalUserId, {
      user_id: user.id,
      nombre: user.nombre,
      nombre_negocio: user.nombreNegocio,
    });
  }

  return jsonResponse({
    external_user_id: partnerUser.externalUserId,
    user_id: user.id,
    created,
    connect_url: buildPartnerConnectPageUrl(auth.partner, partnerUser.externalUserId),
  }, created ? 201 : 200);
}

export async function handlePartnerConnectionsGet(request: Request, externalId: string) {
  const prodErr = requireProduction();
  if (prodErr) return prodErr;

  const auth = await authenticatePartnerRequest(request.headers.get("Authorization"));
  if (!auth) return partnerAuthErrorResponse();

  const mapped = await getPartnerUserWithProfile(auth.partner.id, externalId);
  if (!mapped) return jsonResponse({ error: "Usuario no encontrado" }, 404);

  const connections = await getConnectionStatusForUser(mapped.user.id, {
    celular: mapped.user.celular,
    codigoPais: mapped.user.codigoPais,
    whatsappConfigurado: mapped.user.whatsappConfigurado,
  });

  return jsonResponse({
    external_user_id: externalId,
    user_id: mapped.user.id,
    connections,
  });
}

export async function handlePartnerConnectGet(request: Request) {
  const prodErr = requireProduction();
  if (prodErr) return prodErr;

  const auth = await authenticatePartnerRequest(request.headers.get("Authorization"));
  if (!auth) return partnerAuthErrorResponse();

  const url = new URL(request.url);
  const externalId = url.searchParams.get("external_user_id")?.trim();
  const platform = url.searchParams.get("platform")?.trim() ?? "whatsapp";
  const returnUrl = url.searchParams.get("return_url")?.trim() ?? undefined;

  if (!externalId) return jsonResponse({ error: "external_user_id requerido" }, 400);

  const { user } = await upsertPartnerEndUser(auth.partner, { external_user_id: externalId });

  if (platform === "whatsapp") {
    const wa = buildPartnerWhatsAppOnboardUrl(auth.partner, externalId, returnUrl);
    return jsonResponse({
      external_user_id: externalId,
      platform: "whatsapp",
      connect_url: wa?.connect_page_url,
      meta_onboard_url: wa?.meta_onboard_url,
    });
  }

  const red = platform as Red;
  const oauth = buildPartnerOAuthStartUrl(auth.partner, user.id, externalId, red, returnUrl);
  if (!oauth.ok) return jsonResponse({ error: oauth.error }, 400);

  return jsonResponse({
    external_user_id: externalId,
    platform: red,
    connect_url: oauth.url,
  });
}

export async function handlePartnerPublishPost(request: Request) {
  const prodErr = requireProduction();
  if (prodErr) return prodErr;

  const auth = await authenticatePartnerRequest(request.headers.get("Authorization"));
  if (!auth) return partnerAuthErrorResponse();

  const body = await parseJsonBody<{
    external_user_id: string;
    copy: string;
    redes?: Red[];
    media_url?: string;
    tipo?: "imagen" | "video" | "texto";
    copy_por_red?: Record<string, string>;
    notify_whatsapp?: boolean;
    programar?: string;
  }>(request);

  if (!body.external_user_id || !body.copy) {
    return jsonResponse({ error: "external_user_id y copy requeridos" }, 400);
  }

  const redes = body.redes?.length ? body.redes : (["instagram"] as Red[]);
  const tipo = body.tipo ?? inferPostTipo(body.media_url);

  if (redes.some((r) => r === "instagram" || r === "tiktok" || r === "youtube") && !body.media_url?.trim()) {
    return jsonResponse({ error: "media_url requerida para instagram, tiktok o youtube" }, 400);
  }

  const mapped = await getPartnerUserWithProfile(auth.partner.id, body.external_user_id);
  if (!mapped) return jsonResponse({ error: "Usuario no encontrado. Crea el usuario primero." }, 404);

  const connections = await getConnectionStatusForUser(mapped.user.id, {
    celular: mapped.user.celular,
    codigoPais: mapped.user.codigoPais,
    whatsappConfigurado: mapped.user.whatsappConfigurado,
  });

  const disconnected = redes.filter((red) => !connections.social[red]?.connected);
  if (disconnected.length && !body.programar) {
    return jsonResponse({
      error: `Redes no conectadas: ${disconnected.join(", ")}`,
      external_user_id: body.external_user_id,
      connections,
      connect_url: buildPartnerConnectPageUrl(auth.partner, body.external_user_id),
    }, 422);
  }

  const result = await publishForUser({
    userId: mapped.user.id,
    post: {
      tipo,
      media_url: body.media_url ?? "",
      copy: body.copy,
      copy_por_red: body.copy_por_red,
      redes,
      programar: body.programar,
    },
    notifyWhatsApp: body.notify_whatsapp,
  });

  const publishedCount = Object.keys(result.externalIds).length;
  const status = body.programar
    ? "scheduled"
    : publishedCount === redes.length
      ? "published"
      : publishedCount > 0
        ? "partial"
        : "failed";

  const webhookEvent = status === "failed" ? "publish.failed" : "publish.completed";
  notifyPartnerWebhook(auth.partner, webhookEvent, body.external_user_id, {
    status,
    post_id: result.post?.id,
    external_ids: result.externalIds,
    errors: result.errors,
    wa_sent: result.waSent,
    redes,
  });

  if (status === "failed") {
    return jsonResponse({
      ok: false,
      status,
      external_user_id: body.external_user_id,
      errors: result.errors,
      connections,
      connect_url: buildPartnerConnectPageUrl(auth.partner, body.external_user_id),
    }, 422);
  }

  return jsonResponse({
    ok: true,
    status,
    external_user_id: body.external_user_id,
    post_id: result.post?.id,
    tracking_slug: result.post?.tracking_slug,
    external_ids: result.externalIds,
    errors: result.errors,
    wa_sent: result.waSent,
    connections,
  }, body.programar ? 202 : 200);
}
