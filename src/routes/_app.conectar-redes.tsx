import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RED_LABELS, REDES_ORDEN } from "@/lib/redes";
import { disconnectOAuthAccountServer } from "@/lib/api/oauth.functions";
import { connectSocialNetwork } from "@/services/social/connectSocial";
import { fetchOAuthProvidersStatus, oauthProviderLabel } from "@/services/social/oauth";
import { checkMetaPublishHealth } from "@/lib/api/meta-health.functions";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import type { Red } from "@/lib/mock/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/conectar-redes")({ component: ConectarRedes });

// [CONECTAR REDES — 2026-11-27] Pantalla propia para conectar las
// cuentas OFICIALES de PubliVende, con su botón en el menú izquierdo
// bajo la Cabina de Difusión. Antes esto vivía escondido dentro de
// Configuración y no se encontraba. La lógica de conexión es la
// misma que ya funcionaba ahí (connectSocialNetwork + salud de Meta
// + desconexión en el servidor); lo nuevo es el lugar y que las 4
// redes aparecen siempre, conectadas o no. El botón del menú lo
// ven todos: el administrador ve los controles de conectar y el
// cliente ve el estado real de las redes oficiales (él no conecta
// cuentas; su difusión sale por estas oficiales).
function ConectarRedes() {
  const { user } = useAuth();
  const accounts = useDB((db) => {
    const mine = db.social_accounts.filter((a) => a.user_id === user?.id);
    const byRed = new Map<string, (typeof mine)[0]>();
    for (const a of mine) {
      const prev = byRed.get(a.red);
      if (!prev || (a.estado_conexion === "conectada" && prev.estado_conexion !== "conectada")) {
        byRed.set(a.red, a);
      }
    }
    return Array.from(byRed.values());
  });
  const metricsSync = useDB((db) => db.metrics_sync ?? []);
  const [oauthReady, setOauthReady] = useState<{
    meta: boolean;
    google: boolean;
    tiktok: boolean;
  } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [fanPageHint, setFanPageHint] = useState(
    () =>
      (typeof localStorage !== "undefined" ? localStorage.getItem("pv_fan_page_hint") : null) ??
      user?.nombre_negocio ??
      "",
  );
  const [metaHealth, setMetaHealth] = useState<{
    page_name?: string;
    can_publish?: boolean;
    needs_reconnect?: boolean;
    wrong_app_page?: boolean;
    recommendations?: string[];
    debug_error?: string;
  } | null>(null);

  useEffect(() => {
    fetchOAuthProvidersStatus()
      .then(setOauthReady)
      .catch(() => setOauthReady({ meta: false, google: false, tiktok: false }));
  }, []);

  useEffect(() => {
    const token = getSessionToken();
    if (!isProductionModeClient() || !token || !user) return;
    void checkMetaPublishHealth({ data: { token } }).then((res) => {
      if (res.ok && "connected" in res && res.connected) {
        setMetaHealth({
          page_name: res.page_name,
          can_publish: res.can_publish,
          needs_reconnect: res.needs_reconnect,
          wrong_app_page: res.wrong_app_page,
          recommendations: res.recommendations,
          debug_error: res.debug_error,
        });
        if (res.can_publish && !res.needs_reconnect) {
          const db = loadDB();
          const fb = db.social_accounts.find((x) => x.user_id === user.id && x.red === "facebook");
          if (!fb) {
            db.social_accounts.push({
              id: uid(),
              user_id: user.id,
              red: "facebook",
              nombre_cuenta: res.page_name ?? "Facebook",
              avatar: "",
              estado_conexion: "conectada",
              token_placeholder: "oauth_authenticated",
              oauth_provider: "meta",
            });
            saveDB(db);
          } else if (
            fb.estado_conexion !== "conectada" ||
            (res.page_name && fb.nombre_cuenta !== res.page_name)
          ) {
            fb.estado_conexion = "conectada";
            if (res.page_name) fb.nombre_cuenta = res.page_name;
            saveDB(db);
          }
        }
      }
    });
  }, [user]);

  if (!user) return null;

  const oauthConfigured = !!(oauthReady?.meta || oauthReady?.google || oauthReady?.tiktok);

  async function onConnect(red: Red) {
    setConnecting(red);
    const hint =
      fanPageHint.trim() || [user!.nombre, user!.nombre_negocio].filter(Boolean).join(" ").trim();
    if (hint) localStorage.setItem("pv_fan_page_hint", hint);
    try {
      await connectSocialNetwork(user!.id, red, "/conectar-redes", hint || undefined);
    } catch (e) {
      toast.error((e as Error).message || "Error al conectar la red");
    } finally {
      setConnecting(null);
    }
    const token = getSessionToken();
    if (token && isProductionModeClient()) {
      const res = await checkMetaPublishHealth({ data: { token } });
      if (res.ok && "connected" in res && res.connected) {
        setMetaHealth({
          page_name: res.page_name,
          can_publish: res.can_publish,
          needs_reconnect: res.needs_reconnect,
          wrong_app_page: res.wrong_app_page,
          recommendations: res.recommendations,
          debug_error: res.debug_error,
        });
      }
    }
  }

  // Desconectar borra el token EN EL SERVIDOR (fila oauth_accounts) y
  // después refleja lo mismo en el espejo local. Igual que en
  // Configuración.
  async function onDisconnect(red: Red) {
    setDisconnecting(red);
    try {
      const token = getSessionToken();
      if (isProductionModeClient() && token) {
        const res = await disconnectOAuthAccountServer({ data: { token, red } });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo desconectar en el servidor");
          return;
        }
      }
      const db = loadDB();
      const acc = db.social_accounts.find((a) => a.user_id === user!.id && a.red === red);
      if (acc) {
        acc.estado_conexion = "desconectada";
        acc.token_placeholder = "";
        acc.external_account_id = undefined;
        acc.token_expires_at = undefined;
        acc.oauth_provider = undefined;
        saveDB(db);
      }
      toast.success("Desconectado: el token se eliminó del servidor");
    } finally {
      setDisconnecting(null);
    }
  }

  const porRed = new Map(accounts.map((a) => [a.red, a]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Conectar redes</h1>
        <p className="text-sm text-muted-foreground">
          {user.is_admin
            ? "Las cuentas oficiales de PubliVende. Desde aquí se difunden las publicaciones de todos los clientes; por eso conectarlas es tarea del administrador."
            : "Las cuentas oficiales de PubliVende: por estas redes sale tu difusión. Tú no necesitas conectar ninguna cuenta tuya."}
        </p>
      </div>

      {user.is_admin && oauthReady && !oauthConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900">
          <b>Falta configurar OAuth en el servidor.</b> Sin las llaves de Meta, Google y TikTok en el
          servidor, los botones de conectar no pueden abrir la autorización.
        </div>
      )}

      {user.is_admin ? (
      <div className="space-y-2">
        {REDES_ORDEN.map((red) => {
          const a = porRed.get(red);
          const isFb = red === "facebook";
          const fbLive = isFb && !!metaHealth?.can_publish && !metaHealth?.needs_reconnect;
          const isConectada = a?.estado_conexion === "conectada" || fbLive;
          const nombreMostrado =
            isFb && metaHealth?.page_name
              ? metaHealth.page_name
              : isConectada
                ? (a?.nombre_cuenta ?? "Conectada")
                : "Sin conectar";
          const sync = metricsSync.find((s) => s.red === red);

          return (
            <div
              key={red}
              className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {RED_LABELS[red]}
                  {isConectada && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-green-400 text-green-800 bg-green-50/80"
                    >
                      Conectado
                    </Badge>
                  )}
                  {isConectada && (a?.oauth_provider || isFb) && (
                    <Badge variant="outline" className="text-[10px]">
                      OAuth {a?.oauth_provider ?? "meta"}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{nombreMostrado}</div>
                {isConectada && sync?.reconectar && (
                  <div className="text-[11px] text-amber-600 flex items-center gap-2 mt-0.5">
                    Faltan permisos o el acceso expiró.
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => onConnect(red)}
                    >
                      Reconectar
                    </button>
                  </div>
                )}
                {!isConectada && (
                  <div className="text-[11px] text-amber-700">
                    Desconectada. Sin esto la publicación no sale en {red}.{" "}
                    {oauthProviderLabel(red)}
                  </div>
                )}
                {isConectada && !sync?.reconectar && (
                  <div className="text-[11px] text-green-700">Lista para publicar</div>
                )}
              </div>
              {isConectada ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disconnecting === red}
                  onClick={() => onDisconnect(red)}
                >
                  {disconnecting === red ? "Desconectando…" : "Desconectar"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={connecting === red || (oauthReady !== null && !oauthConfigured)}
                  onClick={() => onConnect(red)}
                >
                  {connecting === red ? "Conectando…" : "Conectar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      ) : (
      <div className="space-y-2">
        {REDES_ORDEN.map((red) => {
          const st = metricsSync.find((s) => s.red === red);
          const conectada = !!st?.conectada;
          return (
            <div
              key={red}
              className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {RED_LABELS[red]}
                  {conectada ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-green-400 text-green-800 bg-green-50/80"
                    >
                      Conectada
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-red-300 text-red-700 bg-red-50/80"
                    >
                      Sin conectar
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {conectada
                    ? "Lista para publicar — por aquí sale tu difusión"
                    : "PubliVende todavía no activa esta red"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
