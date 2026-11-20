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
  // 1. Si es Instagram y Facebook ya está conectado, vinculamos de inmediato usando la Fan Page
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
          `¡Instagram (${autoRes.account.nombre_cuenta}) conectado automáticamente con tu Fan Page!`,
        );
        return true;
      } else if (!autoRes.ok && (autoRes as { noLinkedInstagram?: boolean }).noLinkedInstagram) {
        toast.error(autoRes.error, { duration: 12000 });
        return false;
      }
    } catch {
      /* continuar a redirección OAuth */
    }
  }

  // 2. Si requiere autorización completa de Meta/Google/TikTok, redirigir directamente
  const result = await startSocialOAuthConnect(userId, red, returnTo, pageHint);
  if (!result.ok) {
    toast.error(result.error, { duration: 10000 });
    return false;
  }

  // Redirección directa estándar (evita que el navegador bloquee popups o quede en 'Abriendo...')
  toast.info("Redirigiendo a autorización oficial…");
  window.location.href = result.url;
  return true;
}
