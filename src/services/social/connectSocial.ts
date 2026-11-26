import type { Red } from "@/lib/mock/types";
import { startSocialOAuthConnect } from "./oauth";
import { toast } from "sonner";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import {
  autoConnectInstagramFromFacebook,
  type OAuthConnectPublicResult,
} from "@/lib/api/oauth.functions";

// [VENTANA EMERGENTE — 2026-11-26] La autorización de Meta/Google/TikTok ya
// NO reemplaza a Publivende: antes se hacía window.location.href y el
// usuario perdía su lugar y su sesión de trabajo en la app. Ahora la
// autorización vive en una ventana popup; la pantalla de callback
// (OAuthCallbackView) ya avisaba por postMessage a la ventana principal
// (PUBLIVENDE_OAUTH_SUCCESS / PUBLIVENDE_OAUTH_ERROR) y se cerraba sola —
// lo que faltaba era abrirla como popup y ESCUCHAR ese aviso aquí.
// La ventana se abre vacía dentro del gesto del clic (si se abre tras un
// await, el navegador la bloquea) y se navega cuando la URL oficial llega.

export async function connectSocialNetwork(
  userId: string,
  red: Red,
  returnTo = "/configuracion",
  pageHint?: string,
): Promise<boolean> {
  const popup = window.open("", "publivende_oauth", "popup=yes,width=640,height=780");

  // 1. Si es Instagram y Facebook ya está conectado, vinculamos de inmediato usando la Fan Page
  if (red === "instagram") {
    try {
      const autoRes = await autoConnectInstagramFromFacebook({ data: { userId } });
      if (autoRes.ok && autoRes.account) {
        popup?.close();
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
          `¡Instagram (${autoRes.account.nombre_cuenta}) conectado automáticamente con tu Fan Page!`,
        );
        return true;
      } else if (!autoRes.ok && (autoRes as { noLinkedInstagram?: boolean }).noLinkedInstagram) {
        popup?.close();
        toast.error(autoRes.error, { duration: 12000 });
        return false;
      }
    } catch {
      /* continuar a autorización en la ventana emergente */
    }
  }

  // 2. Autorización completa de Meta/Google/TikTok, en la ventana emergente
  const result = await startSocialOAuthConnect(userId, red, returnTo, pageHint);
  if (!result.ok) {
    popup?.close();
    toast.error(result.error, { duration: 10000 });
    return false;
  }

  if (!popup) {
    // El navegador bloqueó la ventana: último recurso, redirección completa.
    toast.info("Redirigiendo a autorización oficial…");
    window.location.href = result.url;
    return true;
  }

  popup.location.href = result.url;
  toast.info("Completa la autorización en la ventana que se abrió…");

  // La promesa se resuelve cuando el callback avisa por postMessage, o
  // cuando la ventana se cierra (el usuario la cerró o terminó el flujo):
  // en ambos casos se relee el estado local, que el callback ya guardó
  // en el mismo origen.
  return await new Promise<boolean>((resolve) => {
    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    }
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as {
        type?: string;
        account?: OAuthConnectPublicResult;
        linkedAccount?: OAuthConnectPublicResult;
        error?: string;
      } | null;
      if (data?.type === "PUBLIVENDE_OAUTH_SUCCESS") {
        cleanup();
        window.dispatchEvent(new CustomEvent("publivende-db-change"));
        const extra = data.linkedAccount ? ` y ${data.linkedAccount.nombre_cuenta}` : "";
        toast.success(
          `${data.account?.nombre_cuenta ?? "Cuenta"}${extra} conectado correctamente`,
        );
        resolve(true);
      } else if (data?.type === "PUBLIVENDE_OAUTH_ERROR") {
        cleanup();
        toast.error(data.error ?? "No se pudo conectar la cuenta", { duration: 10000 });
        resolve(false);
      }
    }
    const timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        window.dispatchEvent(new CustomEvent("publivende-db-change"));
        resolve(true);
      }
    }, 800);
    window.addEventListener("message", onMessage);
  });
}
