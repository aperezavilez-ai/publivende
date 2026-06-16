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
import { loadDB, saveDB } from "@/lib/mock/db";
import { PLAN_LIMITS } from "@/lib/mock/types";
import { planLabel } from "@/lib/plans";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { ConnectWhatsApp } from "@/components/whatsapp/ConnectWhatsApp";

export const Route = createFileRoute("/_app/configuracion")({ component: Conf });

function Conf() {
  const { user, updateUser, signOut } = useAuth();
  const navigate = useNavigate();
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
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id && p.estado === "publicado"));
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const reglas = useDB((db) => db.automation_rules.filter((r) => r.user_id === user?.id));
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id));
  const [oauthReady, setOauthReady] = useState<{ meta: boolean; google: boolean; tiktok: boolean } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchOAuthProvidersStatus().then(setOauthReady).catch(() => setOauthReady({ meta: false, google: false, tiktok: false }));
  }, []);

  if (!user) return null;

  async function onConnect(red: (typeof accounts)[0]["red"]) {
    setConnecting(red);
    await connectSocialNetwork(user!.id, red, "/configuracion");
    setConnecting(null);
  }
  const limits = PLAN_LIMITS[user.plan];
  const usado = { posts: posts.length, conv: contacts.length, reglas: reglas.length, prods: productos.length };

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
        <h2 className="font-semibold mb-1">Auto-publicación en redes (opcional)</h2>
        <p className="text-xs text-muted-foreground mb-3">
          No es necesario para usar PubliVende. Conecta solo si quieres que publiquemos directo en tus perfiles.
          Para empezar, basta con pegar links en <b>Publicar</b>.
        </p>
        {oauthReady && !oauthReady.meta && !oauthReady.google && !oauthReady.tiktok && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900">
            <b>Falta configurar OAuth en el servidor.</b> Copia <code>.env.example</code> a <code>.env</code> y agrega
            META_APP_ID, GOOGLE_CLIENT_ID y/o TIKTOK_CLIENT_KEY. Reinicia <code>npm run dev</code>.
          </div>
        )}
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="min-w-0">
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {RED_LABELS[a.red]}
                  {a.estado_conexion === "conectada" && a.oauth_provider && (
                    <Badge variant="outline" className="text-[10px]">OAuth {a.oauth_provider}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{a.nombre_cuenta}</div>
                {a.estado_conexion !== "conectada" && (
                  <div className="text-[10px] text-muted-foreground">{oauthProviderLabel(a.red)}</div>
                )}
              </div>
              {a.estado_conexion === "conectada" ? (
                <Button size="sm" variant="outline" onClick={() => { disconnectAccount(user.id, a.red); toast.success("Desconectado"); }}>
                  Desconectar
                </Button>
              ) : (
                <Button size="sm" className="gap-1" disabled={connecting === a.red} onClick={() => onConnect(a.red)}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {connecting === a.red ? "Abriendo…" : "Conectar"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold">Uso de tu plan</h2>
          <Badge variant="secondary">Plan {planLabel(user.plan)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Para cambiar de paquete, contacta soporte o crea una cuenta nueva desde la{" "}
          <a href="/#precios" className="text-primary underline">página de planes</a>.
        </p>
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
