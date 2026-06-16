import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  completeWhatsAppConnect,
  confirmWhatsAppPhoneServer,
  disconnectWhatsAppConnect,
  disconnectWhatsAppLinkServer,
  getWhatsAppAccountStatus,
  getWhatsAppConnectConfig,
} from "@/lib/api/whatsapp.functions";
import {
  buildHostedOnboardUrl,
  buildWaMeUrl,
  formatWhatsAppDisplay,
  META_POST_MESSAGE_ORIGINS,
} from "@/lib/whatsapp-connect";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { useAuth } from "@/lib/mock/auth";

type WaMode = "none" | "link" | "api";

interface WaSessionData {
  wabaId: string;
  phoneNumberId: string;
  code?: string;
}

export function ConnectWhatsApp() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [metaAppId, setMetaAppId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [mode, setMode] = useState<WaMode>("none");
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [codigoPais, setCodigoPais] = useState("+52");
  const [celular, setCelular] = useState("");
  const sessionRef = useRef<WaSessionData | null>(null);
  const popupRef = useRef<Window | null>(null);

  const applyAccount = useCallback(
    (account: {
      connected: boolean;
      mode?: WaMode;
      displayPhoneNumber?: string;
      verifiedName?: string;
    }) => {
      setMode(account.connected ? (account.mode ?? "link") : "none");
      setDisplayPhone(account.displayPhoneNumber ?? null);
      setVerifiedName(account.verifiedName ?? null);
      if (account.connected !== user?.whatsapp_configurado) {
        updateUser({ whatsapp_configurado: account.connected });
      }
    },
    [updateUser, user?.whatsapp_configurado],
  );

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setCodigoPais(user.codigo_pais || "+52");
    setCelular(user.celular?.replace(/\D/g, "") ?? "");

    const token = getSessionToken();
    if (!isProductionModeClient() || !token) {
      const linked = !!(user.whatsapp_configurado && user.celular.replace(/\D/g, "").length >= 10);
      setMode(linked ? "link" : "none");
      if (linked) {
        setDisplayPhone(formatWhatsAppDisplay(user.codigo_pais, user.celular));
      }
      setLoading(false);
      return;
    }

    const res = await getWhatsAppAccountStatus({ data: { token } });
    if (res.ok) applyAccount(res.account);
    setLoading(false);
  }, [user, applyAccount]);

  useEffect(() => {
    getWhatsAppConnectConfig()
      .then((cfg) => {
        setMetaAppId(cfg.metaAppId ?? null);
        setConfigId(cfg.configId ?? null);
      })
      .catch(() => {});

    refreshStatus();
  }, [refreshStatus]);

  const finishApiConnect = useCallback(
    async (code: string, wabaId: string, phoneNumberId: string) => {
      const token = getSessionToken();
      if (!token) {
        toast.error("Inicia sesión de nuevo");
        return;
      }

      const result = await completeWhatsAppConnect({
        data: { token, code, wabaId, phoneNumberId },
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      applyAccount(result.account);
      toast.success("WhatsApp API conectada");
    },
    [applyAccount],
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!META_POST_MESSAGE_ORIGINS.some((o) => event.origin === o)) return;

      let data: {
        type?: string;
        event?: string;
        data?: { code?: string; phone_number_id?: string; waba_id?: string };
      };

      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && data.data) {
        sessionRef.current = {
          wabaId: data.data.waba_id ?? "",
          phoneNumberId: data.data.phone_number_id ?? "",
          code: data.data.code,
        };

        const { code, wabaId, phoneNumberId } = sessionRef.current;
        if (code && wabaId && phoneNumberId) {
          popupRef.current?.close();
          setConnecting(false);
          void finishApiConnect(code, wabaId, phoneNumberId);
        }
      }

      if (data.event === "CANCEL" || data.event === "ERROR") {
        setConnecting(false);
        popupRef.current?.close();
        if (data.event === "ERROR") toast.error("Meta no pudo completar la conexión");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [finishApiConnect]);

  async function onConnectNumber() {
    const digits = celular.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Ingresa tu celular con 10 dígitos");
      return;
    }

    setConnecting(true);
    updateUser({ celular: digits, codigo_pais: codigoPais, whatsapp_configurado: true });

    const token = getSessionToken();
    if (isProductionModeClient() && token) {
      const res = await confirmWhatsAppPhoneServer({
        data: { token, celular: digits, codigo_pais: codigoPais },
      });
      setConnecting(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      applyAccount(res.account);
    } else {
      setMode("link");
      setDisplayPhone(formatWhatsAppDisplay(codigoPais, digits));
      setConnecting(false);
    }

    toast.success("WhatsApp conectado con tu número");
  }

  function onConnectApi() {
    if (!metaAppId) {
      toast.error("META_APP_ID no configurado en el servidor");
      return;
    }

    setConnecting(true);
    sessionRef.current = null;

    const url = buildHostedOnboardUrl(metaAppId, configId ?? undefined);
    popupRef.current = window.open(url, "meta_whatsapp_onboard", "width=800,height=700,scrollbars=yes");

    if (!popupRef.current) {
      setConnecting(false);
      toast.error("Permite ventanas emergentes para conectar con Meta");
      return;
    }

    const poll = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(poll);
        setConnecting(false);
      }
    }, 500);
  }

  async function onDisconnect() {
    const token = getSessionToken();
    if (!token && !isProductionModeClient()) {
      setMode("none");
      updateUser({ whatsapp_configurado: false });
      toast.success("WhatsApp desconectado");
      return;
    }
    if (!token) return;
    if (!confirm("¿Desconectar WhatsApp de PubliVende?")) return;

    setConnecting(true);
    if (mode === "api") await disconnectWhatsAppConnect({ data: { token } });
    else await disconnectWhatsAppLinkServer({ data: { token } });
    setConnecting(false);
    setMode("none");
    setDisplayPhone(null);
    setVerifiedName(null);
    updateUser({ whatsapp_configurado: false });
    toast.success("WhatsApp desconectado");
  }

  const testWaUrl = celular.length >= 10 ? buildWaMeUrl(codigoPais, celular, "Hola, prueba desde PubliVende") : null;
  const connected = mode !== "none";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando WhatsApp…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MessageCircle className="w-4 h-4 text-green-600" />
        {connected ? (
          <Badge variant="outline" className="text-green-700 border-green-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        ) : (
          <Badge variant="outline">Sin conectar</Badge>
        )}
        {mode === "link" && (
          <Badge variant="secondary" className="text-[10px]">
            Enlaces wa.me
          </Badge>
        )}
        {mode === "api" && (
          <Badge variant="secondary" className="text-[10px]">
            API Meta
          </Badge>
        )}
      </div>

      {connected && displayPhone && (
        <p className="text-sm">
          <span className="text-muted-foreground">Tu número: </span>
          <b>{verifiedName ? `${verifiedName} · ` : ""}{displayPhone}</b>
        </p>
      )}

      {!connected && (
        <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-end">
          <div className="w-24">
            <Label className="text-xs">País</Label>
            <Input value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} placeholder="+52" />
          </div>
          <div>
            <Label className="text-xs">Tu celular WhatsApp Business</Label>
            <Input
              value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))}
              placeholder="6674912221"
              maxLength={15}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <>
            <Button
              size="sm"
              disabled={connecting}
              onClick={onConnectNumber}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
              Conectar mi WhatsApp
            </Button>
            {metaAppId && (
              <Button size="sm" variant="outline" disabled={connecting} onClick={onConnectApi} className="gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Conectar API Meta (opcional)
              </Button>
            )}
          </>
        ) : (
          <>
            {testWaUrl && (
              <Button size="sm" variant="outline" asChild className="gap-1">
                <a href={testWaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Probar enlace wa.me
                </a>
              </Button>
            )}
            {mode === "link" && metaAppId && (
              <Button size="sm" variant="outline" disabled={connecting} onClick={onConnectApi} className="gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Activar envío automático (API)
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={connecting} onClick={onDisconnect} className="gap-1">
              <Unplug className="w-3.5 h-3.5" />
              Desconectar
            </Button>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p>
          <b>Conectar mi WhatsApp</b> — usa tu número real. Al publicar, tus clientes te escriben por{" "}
          <code>wa.me</code> directo a tu celular. <b>No requiere Meta.</b>
        </p>
        <p>
          <b>API Meta (opcional)</b> — envío automático masivo y respuestas por API. Si tu número ya está en
          WhatsApp Business, Meta puede pedir migración con coexistencia.
        </p>
      </div>
    </div>
  );
}
