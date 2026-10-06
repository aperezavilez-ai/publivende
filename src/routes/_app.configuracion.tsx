import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { disconnectAccount, RED_LABELS } from "@/services/social/mock";
import { connectSocialNetwork } from "@/services/social/connectSocial";
import { fetchOAuthProvidersStatus, oauthProviderLabel } from "@/services/social/oauth";
import { checkMetaPublishHealth } from "@/lib/api/meta-health.functions";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { loadDB, saveDB } from "@/lib/mock/db";
import { PLAN_LIMITS } from "@/lib/mock/types";
import { planLabel, PLAN_OFFERS } from "@/lib/plans";
import { toast } from "sonner";
import { ArrowLeft, Copy, ExternalLink, Trash2 } from "lucide-react";
import { ConnectWhatsApp } from "@/components/whatsapp/ConnectWhatsApp";

export const Route = createFileRoute("/_app/configuracion")({ component: Conf });

function Conf() {
  const { user, updateUser, signOut, changePlan, openBillingPortal } = useAuth();
  const navigate = useNavigate();
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    const estado = new URLSearchParams(window.location.search).get("suscripcion");
    if (estado === "ok") toast.success("¡Pago recibido! Tu plan se activa en unos segundos.");
    else if (estado === "cancelada") toast.info("Pago cancelado. Tu plan no cambió.");
  }, []);
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
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id && p.estado === "publicado"));
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const reglas = useDB((db) => db.automation_rules.filter((r) => r.user_id === user?.id));
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id));
  const [oauthReady, setOauthReady] = useState<{
    meta: boolean;
    google: boolean;
    tiktok: boolean;
    appBaseUrl?: string;
    redirectUris?: { meta: string; google: string; tiktok: string };
    metaAppDomains?: string[];
  } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [fanPageHint, setFanPageHint] = useState(() =>
    (typeof localStorage !== "undefined" ? localStorage.getItem("pv_fan_page_hint") : null) ?? user?.nombre_negocio ?? "",
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
    fetchOAuthProvidersStatus().then(setOauthReady).catch(() => setOauthReady({ meta: false, google: false, tiktok: false }));
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
          let fb = db.social_accounts.find((x) => x.user_id === user.id && x.red === "facebook");
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
          } else if (fb.estado_conexion !== "conectada" || (res.page_name && fb.nombre_cuenta !== res.page_name)) {
            fb.estado_conexion = "conectada";
            if (res.page_name) fb.nombre_cuenta = res.page_name;
            saveDB(db);
          }
        }
      }
    });
  }, [user]);

  if (!user) return null;

  const isAdmin = !!user.is_admin;
  const oauthConfigured = !!(oauthReady?.meta || oauthReady?.google || oauthReady?.tiktok);

  async function onConnect(red: (typeof accounts)[0]["red"]) {
    setConnecting(red);
    const hint = fanPageHint.trim() || [user!.nombre, user!.nombre_negocio].filter(Boolean).join(" ").trim();
    if (hint) localStorage.setItem("pv_fan_page_hint", hint);
    await connectSocialNetwork(user!.id, red, "/configuracion", hint || undefined);
    setConnecting(null);
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
  const limits = PLAN_LIMITS[user.plan];
  const usado = { posts: posts.length, conv: contacts.length, reglas: reglas.length, prods: productos.length };

  async function runBilling(action: () => Promise<void>) {
    setBillingBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error((err as Error).message);
      setBillingBusy(false);
    }
  }

  function eliminar() {
    if (!confirm("¿Eliminar cuenta? Esta acción no se puede deshacer.")) return;
    const db = loadDB();
    db.profiles = db.profiles.filter((p) => p.id !== user!.id);
    db.session_user_id = null;
    saveDB(db); signOut(); navigate({ to: "/" });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Configuración</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigate({ to: "/dashboard" });
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Regresar
        </Button>
      </div>

      <Card className="p-5"><h2 className="font-semibold mb-3">Perfil y negocio</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Nombre</Label><Input value={user.nombre} onChange={(e) => updateUser({ nombre: e.target.value })} /></div>
          <div><Label>Negocio</Label><Input value={user.nombre_negocio} onChange={(e) => updateUser({ nombre_negocio: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={user.email} disabled /></div>
          <div><Label>WhatsApp</Label><Input value={`${user.codigo_pais} ${user.celular}`} onChange={(e) => updateUser({ celular: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">WhatsApp Business</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Conecta <b>tu</b> número. Tus clientes te escriben directo a tu WhatsApp — PubliVende genera los enlaces
          y textos al publicar.
        </p>
        <ConnectWhatsApp />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Conecta tus redes sociales</h2>
        <p className="text-xs text-muted-foreground mb-3">
          PubliVende publica directamente en <b>tu</b> Fan Page, Instagram, TikTok o canal de YouTube.
          Conecta cada red que quieras usar en <b>Publicar</b> — no necesitas ser desarrollador ni entrar a Meta for Developers.
        </p>

        {!isAdmin && (
          <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
            <p className="font-semibold">¿Cómo funciona?</p>
            <ol className="list-decimal pl-4 text-muted-foreground space-y-1">
              <li>Pulsa <b>Conectar</b> en Facebook, Instagram, TikTok o YouTube</li>
              <li>Inicia sesión con la cuenta que administra tu negocio</li>
              <li>Autoriza a PubliVende y elige tu Fan Page o perfil correcto</li>
              <li>En <b>Publicar</b>, pega tu link y pulsa <b>Publicar en tus redes</b></li>
            </ol>
            <p className="text-muted-foreground">
              Es el mismo modelo que Buffer o Metricool: una app de PubliVende, tus cuentas conectadas por OAuth.
            </p>
          </div>
        )}

        {isAdmin && oauthReady && !oauthConfigured && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900">
            <b>Falta configurar OAuth en el servidor.</b> Copia <code>.env.example</code> a <code>.env</code> y agrega
            META_APP_ID, GOOGLE_CLIENT_ID y/o TIKTOK_CLIENT_KEY. Reinicia <code>npm run dev</code>.
          </div>
        )}

        {!isAdmin && oauthReady && !oauthConfigured && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900">
            La publicación en redes no está disponible temporalmente. Contacta soporte si el problema persiste.
          </div>
        )}

        {metaHealth?.needs_reconnect && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50/90 p-3 text-xs text-red-900 space-y-2">
            <p className="font-semibold">Acción requerida para publicar</p>
            {metaHealth.page_name && (
              <p>Conectado a: <b>{metaHealth.page_name}</b></p>
            )}
            {metaHealth.recommendations?.map((r, i) => (
              <p key={i}>• {r}</p>
            ))}
            {metaHealth.debug_error && (
              <p className="text-[10px] opacity-80">Meta: {metaHealth.debug_error.slice(0, 200)}</p>
            )}
            <p className="font-medium">1. Escribe tu Fan Page abajo → 2. Desconecta Facebook → 3. Vuelve a Conectar</p>
          </div>
        )}

        {metaHealth?.can_publish && !metaHealth.needs_reconnect && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50/80 p-3 text-xs text-green-900">
            Listo para publicar en <b>{metaHealth.page_name}</b> ✓
          </div>
        )}

        <div className="mb-4 rounded-lg border p-3 space-y-2">
          <Label className="text-xs font-semibold">Nombre de tu Fan Page en Facebook</Label>
          <Input
            value={fanPageHint}
            onChange={(e) => setFanPageHint(e.target.value)}
            placeholder="Ej. Tacos Don Pepe"
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">
            {isAdmin
              ? "Como administrador puedes conectar la página oficial «Publivende» para manejar la cuenta de la plataforma."
              : "Al conectar Facebook, PubliVende sugerirá esta página. Elige la Fan Page de tu negocio."}
          </p>
        </div>

        {isAdmin && oauthReady?.meta && oauthReady.redirectUris && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs space-y-2">
            <p className="font-semibold text-blue-900">Checklist Meta — solo administrador de plataforma</p>
            <p className="text-blue-800">
              App ID: <code>1514804460108550</code> · Base URL activa: <code>{oauthReady.appBaseUrl}</code>
            </p>
            <div>
              <p className="font-medium text-blue-900 mb-1">App Domains</p>
              <ul className="list-disc pl-4 text-blue-800">
                {(oauthReady.metaAppDomains ?? ["publivende.mx", "www.publivende.mx"]).map((d) => (
                  <li key={d}><code>{d}</code></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-900 mb-1">Valid OAuth Redirect URIs</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="break-all text-[11px] bg-white/80 px-2 py-1 rounded border">{oauthReady.redirectUris.meta}</code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(oauthReady.redirectUris!.meta);
                    toast.success("Redirect URI copiada");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-blue-700 mt-1">
                Si la anterior no guarda en Meta, prueba también <code>https://publivende.mx/facebook/callback</code>
              </p>
            </div>
            <p className="text-blue-800">
              Activa <b>Client OAuth Login</b> y <b>Web OAuth Login</b>. Los clientes finales no ven esta sección.
            </p>
            <div>
              <p className="font-medium text-blue-900 mb-1">Si sale “Invalid Scopes” al conectar</p>
              <p className="text-blue-800">
                En Meta → <b>Casos de uso</b> → <b>Administrar todo en tu página</b> → <b>Personalizar</b> →{" "}
                <b>Permisos y funciones</b>, activa como <b>Listo para pruebas</b>:
              </p>
              <ul className="list-disc pl-4 text-blue-800 mt-1">
                <li><code>pages_show_list</code>, <code>pages_read_engagement</code></li>
                <li><code>pages_manage_posts</code> (publicar en tu página de Facebook)</li>
                <li><code>instagram_basic</code>, <code>instagram_content_publish</code> (Instagram → Casos de uso → Instagram API)</li>
                <li><code>read_insights</code>, <code>instagram_manage_insights</code> (métricas reales de alcance y vistas)</li>
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {accounts.map((a) => {
            const isFb = a.red === "facebook";
            const fbLive = isFb && !!metaHealth?.can_publish && !metaHealth?.needs_reconnect;
            const isConectada = a.estado_conexion === "conectada" || fbLive;
            const nombreMostrado = (isFb && metaHealth?.page_name)
              ? metaHealth.page_name
              : (isConectada ? a.nombre_cuenta : "Sin conectar");

            return (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                    {RED_LABELS[a.red]}
                    {isConectada && (
                      <Badge variant="outline" className="text-[10px] border-green-400 text-green-800 bg-green-50/80">
                        Conectado
                      </Badge>
                    )}
                    {isAdmin && isConectada && (a.oauth_provider || isFb) && (
                      <Badge variant="outline" className="text-[10px]">OAuth {a.oauth_provider ?? "meta"}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {nombreMostrado}
                  </div>
                  {isConectada && metricsSync.find((s) => s.red === a.red)?.reconectar && (
                    <div className="text-[11px] text-amber-600 flex items-center gap-2 mt-0.5">
                      Faltan permisos o el acceso expiró.
                      <button type="button" className="underline font-medium" onClick={() => onConnect(a.red)}>
                        Reconectar
                      </button>
                    </div>
                  )}
                  {!isConectada && (
                    <div className="text-[10px] text-muted-foreground">
                      {isAdmin ? oauthProviderLabel(a.red) : "Pulsa Conectar para vincular tu cuenta"}
                    </div>
                  )}
                </div>
                {isConectada ? (
                  <Button size="sm" variant="outline" onClick={() => { disconnectAccount(user.id, a.red); toast.success("Desconectado"); }}>
                    Desconectar
                  </Button>
                ) : (
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={connecting === a.red || (oauthReady !== null && !oauthConfigured)}
                  onClick={() => onConnect(a.red)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {connecting === a.red ? "Abriendo…" : "Conectar"}
                </Button>
              )}
            </div>
          );
        })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold">Uso de tu plan</h2>
          <Badge variant="secondary">{isAdmin ? "Administrador · sin límites" : `Plan ${planLabel(user.plan)}`}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {!isAdmin && PLAN_OFFERS.filter((p) => p.id !== "free" && p.id !== user.plan).map((p) => (
            <Button
              key={p.id}
              size="sm"
              className={p.highlight ? "bg-gradient-primary border-0" : ""}
              variant={p.highlight ? "default" : "outline"}
              disabled={billingBusy}
              onClick={() => runBilling(() => changePlan(p.id))}
            >
              Cambiar a {p.nombre} · {p.precio} MXN/mes
            </Button>
          ))}
          {!isAdmin && user.plan !== "free" && (
            <Button size="sm" variant="ghost" disabled={billingBusy} onClick={() => runBilling(openBillingPortal)}>
              Administrar suscripción
            </Button>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Publicaciones este mes", v: usado.posts, max: limits.posts_mes },
            { label: "Conversaciones WhatsApp", v: usado.conv, max: limits.conversaciones },
            { label: "Reglas automáticas", v: usado.reglas, max: limits.reglas },
            { label: "Productos en catálogo", v: usado.prods, max: limits.productos },
          ].map((u) => (
            <div key={u.label}>
              <div className="flex justify-between mb-1"><span>{u.label}</span><span className="text-muted-foreground">{u.v} / {u.max}</span></div>
              <Progress value={Math.min(100, (u.v / u.max) * 100)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-destructive">
        <h2 className="font-semibold text-destructive mb-2">Zona de peligro</h2>
        <p className="text-sm text-muted-foreground mb-3">Eliminar tu cuenta borrará todos tus datos. Esta acción no se puede deshacer.</p>
        <Button variant="destructive" onClick={eliminar}><Trash2 className="w-4 h-4 mr-1" />Eliminar cuenta</Button>
      </Card>
    </div>
  );
}
