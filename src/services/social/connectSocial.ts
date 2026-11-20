import type { Red } from "@/lib/mock/types";
import { startSocialOAuthConnect } from "./oauth";
import { toast } from "sonner";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import {
  autoConnectInstagramFromFacebook,
  type OAuthConnectPublicResult,
} from "@/lib/api/oauth.functions";

export async function connectSocialNetwork(
  userId: string,
  red: Red,
  returnTo = "/configuracion",
  pageHint?: string,
): Promise<boolean> {
  // Simplificación automática estilo GitHub: Si el usuario pulsa conectar Instagram y Facebook
  // ya está conectado, vinculamos Instagram al instante usando la misma autorización de Meta
  if (red === "instagram") {
    try {
      const autoRes = await autoConnectInstagramFromFacebook({ data: { userId } });
      if (autoRes.ok && autoRes.account) {
        const db = loadDB();
        const acc = db.social_accounts.find((a) => a.user_id === userId && a.red === "instagram");
        if (acc) {
          acc.estado_conexion = "conectada";
          acc.token_placeholder = "oauth_authenticated";
          acc.nombre_cuenta = autoRes.account.nombre_cuenta;
          acc.external_account_id = autoRes.account.external_account_id;
          acc.avatar = autoRes.account.avatar ?? "";
          acc.oauth_provider = autoRes.account.provider;
        } else {
          db.social_accounts.push({
            id: uid(),
            user_id: userId,
            red: "instagram",
            nombre_cuenta: autoRes.account.nombre_cuenta,
            avatar: autoRes.account.avatar ?? "",
            estado_conexion: "conectada",
            token_placeholder: "oauth_authenticated",
            external_account_id: autoRes.account.external_account_id,
            oauth_provider: autoRes.account.provider,
          });
        }
        saveDB(db);
        window.dispatchEvent(new CustomEvent("publivende-db-change"));
        toast.success(
          `¡Instagram (${autoRes.account.nombre_cuenta}) conectado automáticamente desde tu cuenta de Facebook!`,
        );
        return true;
      }
    } catch {
      /* continuar a popup OAuth */
    }
  }

  const result = await startSocialOAuthConnect(userId, red, returnTo, pageHint);
  if (!result.ok) {
    toast.error(result.error, { duration: 10000 });
    return false;
  }

  // Dimensiones óptimas para popup OAuth (Meta, Google, TikTok)
  const width = 640;
  const height = 740;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

  const popup = window.open(
    result.url,
    `publivende_oauth_${red}`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes`,
  );

  // Si el navegador bloqueó el popup, fallback automático a navegación completa
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    toast.info("Abriendo ventana de autorización…");
    window.location.href = result.url;
    return true;
  }

  // Si se abrió el popup, la ventana principal de PubliVende mantiene su sesión 100% activa
  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      if (checkTimer) clearInterval(checkTimer);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "PUBLIVENDE_OAUTH_SUCCESS") {
        resolved = true;
        cleanup();
        const account = event.data.account as OAuthConnectPublicResult;
        const linked = event.data.linkedAccount as OAuthConnectPublicResult | undefined;

        // Actualizar espejo local en db.social_accounts para refrescar la interfaz de inmediato
        try {
          const db = loadDB();
          const acc = db.social_accounts.find((a) => a.user_id === userId && a.red === red);
          if (acc) {
            acc.estado_conexion = "conectada";
            acc.token_placeholder = "oauth_authenticated";
            acc.nombre_cuenta = account.nombre_cuenta;
            acc.external_account_id = account.external_account_id;
            acc.token_expires_at = account.token_expires_at;
            acc.oauth_provider = account.provider;
            if (account.avatar) acc.avatar = account.avatar;
          } else {
            db.social_accounts.push({
              id: uid(),
              user_id: userId,
              red,
              nombre_cuenta: account.nombre_cuenta,
              avatar: account.avatar ?? "",
              estado_conexion: "conectada",
              token_placeholder: "oauth_authenticated",
              external_account_id: account.external_account_id,
              token_expires_at: account.token_expires_at,
              oauth_provider: account.provider,
            });
          }

          if (linked) {
            const linkedAcc = db.social_accounts.find(
              (a) => a.user_id === userId && a.red === linked.red,
            );
            if (linkedAcc) {
              linkedAcc.estado_conexion = "conectada";
              linkedAcc.token_placeholder = "oauth_authenticated";
              linkedAcc.nombre_cuenta = linked.nombre_cuenta;
              linkedAcc.external_account_id = linked.external_account_id;
              linkedAcc.token_expires_at = linked.token_expires_at;
              linkedAcc.oauth_provider = linked.provider;
              if (linked.avatar) linkedAcc.avatar = linked.avatar;
            } else {
              db.social_accounts.push({
                id: uid(),
                user_id: userId,
                red: linked.red,
                nombre_cuenta: linked.nombre_cuenta,
                avatar: linked.avatar ?? "",
                estado_conexion: "conectada",
                token_placeholder: "oauth_authenticated",
                external_account_id: linked.external_account_id,
                token_expires_at: linked.token_expires_at,
                oauth_provider: linked.provider,
              });
            }
          }

          saveDB(db);
          window.dispatchEvent(new CustomEvent("publivende-db-change"));
        } catch (e) {
          console.warn("Error actualizando espejo local:", e);
        }

        const label = linked
          ? `${account.nombre_cuenta} y ${linked.nombre_cuenta}`
          : account.nombre_cuenta;
        toast.success(`${label} conectado correctamente`);
        resolve(true);
      } else if (event.data?.type === "PUBLIVENDE_OAUTH_ERROR") {
        resolved = true;
        cleanup();
        toast.error(event.data.error || "No se pudo conectar la cuenta");
        resolve(false);
      }
    };

    window.addEventListener("message", handleMessage);

    // Monitorear si el usuario cerró la ventana emergente antes de autorizar
    const checkTimer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!resolved) {
          resolve(false);
        }
      }
    }, 800);
  });
}
