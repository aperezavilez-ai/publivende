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
import { RED_LABELS } from "@/lib/redes";
import { disconnectOAuthAccountServer } from "@/lib/api/oauth.functions";
import { generarLinkCobro } from "@/lib/payments";
import { connectSocialNetwork } from "@/services/social/connectSocial";
import { fetchOAuthProvidersStatus, oauthProviderLabel } from "@/services/social/oauth";
import { checkMetaPublishHealth } from "@/lib/api/meta-health.functions";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
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
    try {
      await connectSocialNetwork(user!.id, red, "/configuracion", hint || undefined);
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
  const limits = PLAN_LIMITS[user.plan];
  const usado = { posts: posts.length, conv: contacts.length, prods: productos.length };

  // Real v2: desconectar borra el token EN EL SERVIDOR (fila oauth_accounts)
  // y después refleja lo mismo en el espejo local. Ya no es solo visual.
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  async function onDisconnect(red: (typeof accounts)[0]["red"]) {
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

  // Productos (viven aquí en el panel nuevo): CRUD local con sync al servidor
  // y links de cobro SOLO reales — sin proveedor, error claro.
  const [nuevoProd, setNuevoProd] = useState({ nombre: "", precio: "", descripcion: "" });
  const [cobroBusy, setCobroBusy] = useState<string | null>(null);
  function agregarProducto() {
    const precio = Number(nuevoProd.precio);
    if (!nuevoProd.nombre.trim() || !Number.isFinite(precio) || precio <= 0) {
      return toast.error("Escribe nombre y un precio válido");
    }
    const db = loadDB();
    db.productos.push({
      id: uid(),
      user_id: user!.id,
      nombre: nuevoProd.nombre.trim(),
      precio,
      moneda: "MXN",
      descripcion: nuevoProd.descripcion.trim(),
      imagen: "",
      link_pago: "",
      pago_provider: user!.pago_provider_default ?? undefined,
      activo: true,
    });
    saveDB(db);
    setNuevoProd({ nombre: "", precio: "", descripcion: "" });
    toast.success("Producto agregado");
  }
  function borrarProducto(id: string) {
    const db = loadDB();
    db.productos = db.productos.filter((p) => p.id !== id);
    saveDB(db);
  }
  async function linkCobroProducto(prodId: string) {
    const prod = productos.find((p) => p.id === prodId);
    if (!prod) return;
    setCobroBusy(prodId);
    try {
      const link = await generarLinkCobro({
        provider: prod.pago_provider ?? user!.pago_provider_default ?? "mercadopago",
        monto: prod.precio,
        moneda: prod.moneda || "MXN",
        descripcion: prod.nombre,
      });
      const db = loadDB();
      const row = db.productos.find((p) => p.id === prodId);
      if (row) { row.link_pago = link.url; saveDB(db); }
      toast.success("Link de cobro real generado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el link de cobro", { duration: 8000 });
    } finally {
      setCobroBusy(null);
    }
  }

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
        {isAdmin && (
          <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50/90 p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-blue-950 flex items-center gap-1.5 text-sm">
                👑 Cuentas Oficiales de Difusión PubliVende
              </span>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shadow-sm"
                onClick={() => navigate({ to: "/red" })}
              >
                Ir a Conectar PubliVende →
              </Button>
            </div>
            <p className="text-blue-900 leading-relaxed">
              Las 4 cuentas oficiales maestras de PubliVende (desde donde se difunden las publicaciones de todos los clientes hacia el mundo) se configuran en <b>Red PubliVende</b>. Las opciones de abajo son únicamente para conectar tus cuentas personales opcionales de negocio.
            </p>
          </div>
        )}

        <h2 className="font-semibold mb-1">Redes de tu Negocio (Opcional)</h2>
        <p className="text-xs text-muted-foreground mb-3">
          <b>PubliVende difunde tus publicaciones automáticamente a través de la Red Central Oficial PubliVende y comunidades aliadas.</b>{" "}
          Si deseas que tu publicación aparezca también en tus cuentas personales de tu negocio (tu Fan Page o perfiles de redes), puedes vincularlas aquí.
        </p>

        {!isAdmin && (
          <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
            <p className="font-semibold">¿Cómo funciona la sincronización con tu Fan Page?</p>
            <ol className="list-decimal pl-4 text-muted-foreground space-y-1">
              <li>Pulsa <b>Conectar</b> en Facebook, Instagram, TikTok o YouTube</li>
              <li>Inicia sesión con la cuenta que administra tu negocio</li>
              <li>Autoriza a PubliVende y elige tu Fan Page o perfil</li>
              <li>Al difundir en la Cabina, se publicará en la Red PubliVende y opcionalmente en tu página</li>
            </ol>
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
            La sincronización con redes personales no está disponible temporalmente. La difusión central de PubliVende sigue activa.
          </div>
        )}

        {metaHealth?.needs_reconnect && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50/90 p-3 text-xs text-red-900 space-y-2">
            <p className="font-semibold">Acción requerida para tu página personal</p>
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
            Listo para sincronizar en <b>{metaHealth.page_name}</b> ✓
          </div>
        )}

        <div className="mb-4 rounded-lg border p-3 space-y-2">
          <Label className="text-xs font-semibold">Nombre de tu Fan Page en Facebook (Personal de tu Negocio)</Label>
          <Input
            value={fanPageHint}
            onChange={(e) => setFanPageHint(e.target.value)}
            placeholder="Ej. Tacos Don Pepe"
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">
            Al conectar Facebook, PubliVende sugerirá esta página para tu negocio personal.
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
                    <div className="text-[11px] text-amber-700">
                      Desconectada. Sin esto la publicación no sale en {a.red}. {isAdmin ? oauthProviderLabel(a.red) : "Pulsa Conectar."}
                    </div>
                  )}
                  {isConectada && !metricsSync.find((s) => s.red === a.red)?.reconectar && (
                    <div className="text-[11px] text-green-700">Lista para publicar</div>
                  )}
                </div>
                {isConectada ? (
                  <Button size="sm" variant="outline" disabled={disconnecting === a.red} onClick={() => onDisconnect(a.red)}>
                    {disconnecting === a.red ? "Desconectando…" : "Desconectar"}
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
        <h2 className="font-semibold mb-1">Productos</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Tu catálogo para publicar y cobrar. Los links de cobro se generan con tu proveedor real
          (Stripe o Mercado Pago): si no está configurado, verás el error — nunca un link falso.
        </p>
        <div className="space-y-2 mb-4">
          {productos.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no tienes productos. Agrega el primero abajo.</p>
          )}
          {productos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
              <div className="min-w-0">
                <div className="font-medium text-sm">{p.nombre} · ${p.precio.toLocaleString("es-MX")} {p.moneda}</div>
                {p.link_pago
                  ? <a href={p.link_pago} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline break-all">{p.link_pago}</a>
                  : <div className="text-xs text-amber-700">Sin link de cobro todavía</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" disabled={cobroBusy === p.id} onClick={() => linkCobroProducto(p.id)}>
                  {cobroBusy === p.id ? "Generando…" : p.link_pago ? "Regenerar link" : "Generar link de cobro"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => borrarProducto(p.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-[1fr_140px] gap-2">
          <Input placeholder="Nombre del producto o servicio" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} />
          <Input type="number" placeholder="Precio MXN" value={nuevoProd.precio} onChange={(e) => setNuevoProd({ ...nuevoProd, precio: e.target.value })} />
        </div>
        <Input className="mt-2" placeholder="Descripción (opcional)" value={nuevoProd.descripcion} onChange={(e) => setNuevoProd({ ...nuevoProd, descripcion: e.target.value })} />
        <Button size="sm" className="mt-3" onClick={agregarProducto}>Agregar producto</Button>
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
              className={p.highlight ? "bg-primary border-0" : ""}
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
