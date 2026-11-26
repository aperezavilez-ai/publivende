import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Rocket, Facebook, Instagram, Youtube, Music2, Trash2, Sparkles, CheckCircle2, XCircle, Clock, RefreshCw, Send,
  Zap, ShieldCheck, ArrowRight, Layers,
} from "lucide-react";
import { useAuth } from "@/lib/mock/auth";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getSessionToken } from "@/lib/production/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buildOAuthStartUrl } from "@/lib/api/oauth.functions";
import {
  redAdminOverview,
  redApproveBoost,
  redDeleteChannel,
  redGenerateHubPost,
  redPublishHubPost,
  redRejectBoost,
  redReviewBoost,
  redSyncAdminAccountsToHub,
  redUpdateChannel,
} from "@/lib/api/red.functions";
import type { Red } from "@/lib/mock/types";
import { getDiscoverySummary, runDiscoveryNow } from "@/lib/api/discovery.functions";

export const Route = createFileRoute("/_app/red")({
  beforeLoad: requirePlatformAdmin,
  component: RedPage,
});

type Overview = Extract<Awaited<ReturnType<typeof redAdminOverview>>, { ok: true }>;
type Channel = Overview["channels"][number];
type QueueItem = Overview["queue"][number];

const RED_ICON: Record<Red, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

const RED_NAME: Record<Red, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function RedPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendiente" | "publicado" | "rechazado" | "todos">("pendiente");
  const [modalConectarOpen, setModalConectarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const token = getSessionToken();
    if (!token) return setLoading(false);
    const res = await redAdminOverview({ data: { token } });
    if (res.ok) setData(res);
    else toast.error(res.error);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.is_admin) void load();
  }, [user?.is_admin]);

  async function conectar(red: Red) {
    const token = getSessionToken();
    if (!token || !user) return;
    const res = await buildOAuthStartUrl({ data: { red, userId: user.id, purpose: "hub", token } });
    if (!res.ok) return toast.error(res.error);
    window.location.href = res.url;
  }

  async function handleSyncAccounts() {
    const token = getSessionToken();
    if (!token) return;
    setSyncing(true);
    try {
      const res = await redSyncAdminAccountsToHub({ data: { token } });
      if (res.ok) {
        toast.success(`¡${res.synced.length} cuenta(s) vinculadas a la Red PubliVende!`, {
          description: res.synced.join(", "),
        });
        await load();
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  if (!user?.is_admin) return null;
  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando red…</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No se pudo cargar la red.</div>;

  const activas = data.channels.filter((c: Channel) => c.activo && c.estado_conexion === "conectada");
  const queue = data.queue.filter((q: QueueItem) =>
    filtro === "todos" ? true : filtro === "pendiente" ? q.estado === "pendiente" || q.estado === "error" : q.estado === filtro,
  );

  const fbCount = data.channels.filter((c) => c.red === "facebook" && c.activo).length;
  const igCount = data.channels.filter((c) => c.red === "instagram" && c.activo).length;
  const ytCount = data.channels.filter((c) => c.red === "youtube" && c.activo).length;
  const ttCount = data.channels.filter((c) => c.red === "tiktok" && c.activo).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado Principal Super Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Rocket className="w-6 h-6 text-blue-600" /> Cuentas Maestras · Red PubliVende
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-[10px]">
              SOLO SUPER ADMIN
            </Badge>
          </div>
          <p className="text-sm text-slate-600 max-w-3xl">
            Desde estas 4 cuentas oficiales se realiza la difusión masiva para todos los clientes de PubliVende.
            Cualquier post compartido desde la Cabina se distribuye a través de estas redes y las comunidades del Cerebro.
          </p>
          {!data.ia_activa && (
            <p className="text-xs text-amber-700 mt-2">
              El motor de IA está operando en modo heurístico base.
            </p>
          )}
        </div>

        {/* Botón Maestro Destacado: CONECTAR PUBLIVENDE */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="lg"
            onClick={() => setModalConectarOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-11 px-5 shadow-md flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            CONECTAR PUBLIVENDE
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => void handleSyncAccounts()}
            disabled={syncing}
            className="text-xs h-11 border-slate-300 bg-white hover:bg-slate-50"
            title="Importa las páginas de Meta autorizadas previamente en tu perfil de administrador"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar Cuentas"}
          </Button>
        </div>
      </div>

      {/* Modal Dialog para Conectar las 4 Redes */}
      <Dialog open={modalConectarOpen} onOpenChange={setModalConectarOpen}>
        <DialogContent className="max-w-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              Conectar Cuentas Oficiales de PubliVende
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Selecciona la red oficial que deseas vincular a la plataforma. Toda publicación que los clientes compartan saldrá desde estas cuentas centrales hacia el mundo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-3">
            {/* 1. Facebook */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:border-blue-400 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Facebook className="w-4 h-4 fill-white" />
                    </div>
                    <span>Facebook Oficial</span>
                  </div>
                  <Badge variant={fbCount > 0 ? "default" : "secondary"} className={fbCount > 0 ? "bg-emerald-600 text-white" : ""}>
                    {fbCount > 0 ? `${fbCount} activa(s)` : "Sin conectar"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Conecta la Fan Page oficial "Publivende" para difundir promociones, enlaces e imágenes de los clientes.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9"
                onClick={() => void conectar("facebook")}
              >
                <Facebook className="w-3.5 h-3.5 mr-1.5" />
                {fbCount > 0 ? "Reconectar / Cambiar Facebook" : "Conectar Facebook Oficial"}
              </Button>
            </div>

            {/* 2. Instagram */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:border-pink-400 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <span>Instagram Comercial</span>
                  </div>
                  <Badge variant={igCount > 0 ? "default" : "secondary"} className={igCount > 0 ? "bg-emerald-600 text-white" : ""}>
                    {igCount > 0 ? `${igCount} activa(s)` : "Sin conectar"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Conecta el Instagram Business oficial de PubliVende (asociado a la Fan Page) para posts y reels.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold text-xs h-9"
                onClick={() => void conectar("instagram")}
              >
                <Instagram className="w-3.5 h-3.5 mr-1.5" />
                {igCount > 0 ? "Reconectar / Cambiar Instagram" : "Conectar Instagram Oficial"}
              </Button>
            </div>

            {/* 3. TikTok */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:border-slate-800 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4" />
                    </div>
                    <span>TikTok Oficial</span>
                  </div>
                  <Badge variant={ttCount > 0 ? "default" : "secondary"} className={ttCount > 0 ? "bg-emerald-600 text-white" : ""}>
                    {ttCount > 0 ? `${ttCount} activa(s)` : "Sin conectar"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Conecta la cuenta oficial de TikTok para publicar videos y contenidos virales de la red.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full font-semibold text-xs h-9 border-slate-300"
                onClick={() => void conectar("tiktok")}
              >
                <Music2 className="w-3.5 h-3.5 mr-1.5" />
                {ttCount > 0 ? "Reconectar TikTok" : "Conectar TikTok Oficial"}
              </Button>
            </div>

            {/* 4. YouTube */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:border-red-400 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                      <Youtube className="w-4 h-4" />
                    </div>
                    <span>YouTube Oficial</span>
                  </div>
                  <Badge variant={ytCount > 0 ? "default" : "secondary"} className={ytCount > 0 ? "bg-emerald-600 text-white" : ""}>
                    {ytCount > 0 ? `${ytCount} activa(s)` : "Sin conectar"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Conecta el canal de YouTube de PubliVende para Shorts y videos promocionales.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full font-semibold text-xs h-9 border-slate-300 text-red-700 hover:text-red-800"
                onClick={() => void conectar("youtube")}
              >
                <Youtube className="w-3.5 h-3.5 mr-1.5" />
                {ytCount > 0 ? "Reconectar YouTube" : "Conectar YouTube Oficial"}
              </Button>
            </div>
          </div>

          {/* Sincronización Automática con Fan Page autorizada */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
            <div className="text-xs text-blue-950">
              <span className="font-bold">¿Ya autorizaste tu Fan Page en Meta antes?</span>
              <p className="text-[11px] text-blue-800">
                Sincroniza y activa tu página directamente a la Red Oficial sin volver a iniciar sesión.
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              disabled={syncing}
              onClick={() => void handleSyncAccounts()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", syncing && "animate-spin")} />
              {syncing ? "Sincronizando..." : "Sincronizar en 1 Clic"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tarjeta de Resumen de Cuentas Conectadas */}
      <Card className="p-5 space-y-4 border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Cuentas Oficiales Conectadas ({activas.length} activas de {data.channels.length})
            </h2>
            <p className="text-xs text-slate-500">
              Cada cuenta activa recibe y difunde publicaciones de los clientes según los nichos asignados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalConectarOpen(true)}
              className="font-semibold text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500 fill-amber-500" /> Conectar Red
            </Button>
          </div>
        </div>

        {data.channels.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Aún no hay cuentas oficiales conectadas</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Pulsa el botón de abajo para conectar la Fan Page de Facebook, Instagram Comercial, TikTok o YouTube de PubliVende.
            </p>
            <Button
              size="sm"
              onClick={() => setModalConectarOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300 fill-amber-300" />
              CONECTAR PUBLIVENDE
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.channels.map((c) => (
              <ChannelRow key={c.id} channel={c} onChange={load} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Solicitudes de impulso</h2>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <TabsList>
              <TabsTrigger value="pendiente">Por revisar</TabsTrigger>
              <TabsTrigger value="publicado">Publicadas</TabsTrigger>
              <TabsTrigger value="rechazado">Rechazadas</TabsTrigger>
              <TabsTrigger value="todos">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes en esta vista.</p>
        ) : (
          <div className="space-y-4">
            {queue.map((q: QueueItem) => (
              <BoostRow key={q.id} item={q} channels={activas} minScore={data.min_score} onChange={load} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Demanda por nicho</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Nichos de las solicitudes reales de los usuarios. Abre una cuenta oficial para los nichos con más demanda.
        </p>
        {data.demanda.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay solicitudes.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {data.demanda.map((d) => (
              <div key={d.nicho} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <span className="font-medium capitalize">{d.nicho}</span>
                <span className="text-xs text-muted-foreground">
                  {d.solicitudes} solicitud(es) · {d.publicadas} publicada(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DiscoveryCard />
    </div>
  );
}

function DiscoveryCard() {
  const [resumen, setResumen] = useState<Record<string, { total: number; miembros: number }> | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar() {
    const token = getSessionToken();
    if (!token) return;
    const res = await getDiscoverySummary({ data: { token } });
    if (res.ok) setResumen(res.porEstado);
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function descubrir() {
    const token = getSessionToken();
    if (!token) return;
    setBusy(true);
    const res = await runDiscoveryNow({ data: { token } });
    setBusy(false);
    if (res.ok) {
      toast.success(
        `Descubrimiento real: ${res.hallazgos} hallazgos (${res.nuevos} nuevos, ${res.actualizados} actualizados) vía ${res.provider}`,
      );
      await cargar();
    } else {
      toast.error(res.error);
    }
  }

  const descubiertos = resumen?.["descubierto"] ?? { total: 0, miembros: 0 };
  const catalogo = resumen?.["catalogo_sin_verificar"] ?? { total: 0, miembros: 0 };

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-1">Descubrimiento real por nicho</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Grupos y páginas públicos de Facebook encontrados de verdad en el índice web, con fuente y
        fecha de verificación. El catálogo sembrado a mano NO cuenta como alcance hasta ser verificado.
        La pasada automática corre cada lunes; también puedes lanzarla ahora.
      </p>
      <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
        <span>
          <strong>{descubiertos.total}</strong> descubiertos reales
          {descubiertos.miembros > 0 && (
            <span className="text-muted-foreground"> · {descubiertos.miembros.toLocaleString("es-MX")} miembros/seguidores observados</span>
          )}
        </span>
        <span className="text-muted-foreground">
          {catalogo.total} en catálogo sin verificar (no cuentan como alcance)
        </span>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void descubrir()}>
        <RefreshCw className="w-4 h-4 mr-1" /> {busy ? "Buscando en la red…" : "Buscar ahora en la red"}
      </Button>
    </Card>
  );
}

function ChannelRow({ channel, onChange }: { channel: Channel; onChange: () => Promise<void> }) {
  const Icon = RED_ICON[channel.red];
  const [nichos, setNichos] = useState(channel.nichos.join(", "));
  const [abierto, setAbierto] = useState(false);
  const [tema, setTema] = useState("");
  const [copy, setCopy] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"imagen" | "video">("imagen");
  const [busy, setBusy] = useState(false);

  async function guardar(patch: { nichos?: string[]; activo?: boolean }) {
    const token = getSessionToken();
    if (!token) return;
    const res = await redUpdateChannel({ data: { token, id: channel.id, ...patch } });
    if (res.ok) {
      toast.success("Guardado");
      await onChange();
    } else toast.error(res.error);
  }

  async function eliminar() {
    const token = getSessionToken();
    if (!token || !confirm(`¿Quitar ${channel.nombre} de la red?`)) return;
    const res = await redDeleteChannel({ data: { token, id: channel.id } });
    if (res.ok) await onChange();
    else toast.error(res.error);
  }

  async function generar() {
    const token = getSessionToken();
    if (!token) return;
    setBusy(true);
    const res = await redGenerateHubPost({ data: { token, channelId: channel.id, tema: tema || undefined } });
    setBusy(false);
    if (res.ok) setCopy(res.copy);
    else toast.error(res.error);
  }

  async function publicar() {
    const token = getSessionToken();
    if (!token || !copy.trim()) return;
    setBusy(true);
    const res = await redPublishHubPost({
      data: { token, channelId: channel.id, copy, mediaUrl: mediaUrl.trim() || undefined, mediaType },
    });
    setBusy(false);
    if (res.ok) {
      toast.success(`Publicado en ${channel.nombre}`);
      setCopy("");
      setTema("");
      setMediaUrl("");
    } else toast.error(res.error);
  }

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {channel.avatar ? (
          <img src={channel.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{channel.nombre}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="w-3 h-3" /> {RED_NAME[channel.red]}
            {channel.estado_conexion !== "conectada" && (
              <Badge variant="destructive" className="text-[10px]">Reconectar</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Activa</Label>
          <Switch checked={channel.activo} onCheckedChange={(v) => void guardar({ activo: v })} />
        </div>
        <Button size="icon" variant="ghost" onClick={() => void eliminar()} title="Quitar de la red">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {channel.error && <p className="text-xs text-red-600">{channel.error}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-56">
          <Label className="text-xs">Nichos (separados por coma; vacío = cualquier nicho)</Label>
          <Input
            value={nichos}
            onChange={(e) => setNichos(e.target.value)}
            placeholder="comida, restaurantes, postres"
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void guardar({ nichos: nichos.split(",").map((n) => n.trim()).filter(Boolean) })}
        >
          Guardar nichos
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAbierto(!abierto)}>
          <Sparkles className="w-4 h-4 mr-1" /> Contenido propio
        </Button>
      </div>
      {abierto && (
        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-56">
              <Label className="text-xs">Tema (opcional; si lo dejas vacío la IA elige)</Label>
              <Input value={tema} onChange={(e) => setTema(e.target.value)} className="h-9" />
            </div>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void generar()}>
              <Sparkles className="w-4 h-4 mr-1" /> Escribir con IA
            </Button>
          </div>
          <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={6} placeholder="Texto de la publicación" />
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-56">
              <Label className="text-xs">URL pública de imagen o video (Instagram, TikTok y YouTube la requieren)</Label>
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="h-9" placeholder="https://…" />
            </div>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as "imagen" | "video")}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="imagen">Imagen</option>
              <option value="video">Video</option>
            </select>
            <Button size="sm" disabled={busy || !copy.trim()} onClick={() => void publicar()}>
              <Send className="w-4 h-4 mr-1" /> Publicar ahora
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoostRow({
  item,
  channels,
  minScore,
  onChange,
}: {
  item: QueueItem;
  channels: Channel[];
  minScore: number;
  onChange: () => Promise<void>;
}) {
  const [copy, setCopy] = useState(item.copy_red ?? "");
  const [seleccion, setSeleccion] = useState<string[]>(item.canales);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = item.estado === "pendiente" || item.estado === "error";
  const mediaUrl = item.post?.media_url?.startsWith("http") ? item.post.media_url : null;

  async function run(action: "aprobar" | "revisar" | "rechazar") {
    const token = getSessionToken();
    if (!token) return;
    setBusy(true);
    const res =
      action === "aprobar"
        ? await redApproveBoost({ data: { token, id: item.id, copy, canales: seleccion } })
        : action === "revisar"
          ? await redReviewBoost({ data: { token, id: item.id } })
          : await redRejectBoost({ data: { token, id: item.id, motivo } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    if (action === "aprobar" && res.ok && "boost" in res) {
      const boost = res.boost as { resultados: Array<{ ok: boolean; channel_name: string; error?: string | null }>; copy_red?: string; canales?: string[] };
      const ok = boost.resultados.filter((r) => r.ok).length;
      if (ok) toast.success(`Publicado en ${ok} cuenta(s) oficial(es)`);
      else toast.error(boost.resultados.map((r) => `${r.channel_name}: ${r.error}`).join(" · ") || "No se publicó");
    }
    if (action === "revisar" && res.ok && "boost" in res) {
      const boost = res.boost as { copy_red?: string; canales?: string[] };
      setCopy(boost.copy_red ?? "");
      setSeleccion(boost.canales ?? []);
    }
    await onChange();
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {item.estado === "publicado" ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : item.estado === "rechazado" ? (
          <XCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Clock className="w-4 h-4 text-amber-600" />
        )}
        <span className="font-semibold">{item.usuario?.negocio ?? "Usuario"}</span>
        <span className="text-xs text-muted-foreground">{item.usuario?.email} · plan {item.usuario?.plan}</span>
        {item.nicho && <Badge variant="secondary" className="text-[10px]">{item.nicho}</Badge>}
        {item.ia_score !== null && (
          <Badge
            variant={item.ia_score >= minScore ? "default" : "outline"}
            className="text-[10px]"
          >
            {item.ia_fuente === "ia" ? "IA" : "Reglas"}: {item.ia_score}/100
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{new Date(item.created_at).toLocaleString()}</span>
      </div>

      <div className="grid md:grid-cols-[160px_1fr] gap-3">
        {mediaUrl ? (
          item.post?.tipo === "video" ? (
            <video src={mediaUrl} className="w-full rounded-md bg-black" controls muted />
          ) : (
            <img src={mediaUrl} alt="" className="w-full rounded-md object-cover" />
          )
        ) : (
          <div className="text-xs text-muted-foreground border rounded-md p-2">Sin imagen ni video</div>
        )}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-3">
            <span className="font-medium text-foreground">Publicación original:</span> {item.post?.copy}
          </p>
          {item.ia_motivo && <p className="text-xs italic">{item.ia_motivo}</p>}
          {editable ? (
            <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={5} />
          ) : (
            <p className="text-xs whitespace-pre-wrap border rounded-md p-2">{item.copy_red}</p>
          )}
        </div>
      </div>

      {editable && (
        <>
          <div className="flex flex-wrap gap-3">
            {channels.length === 0 && (
              <span className="text-xs text-amber-700">No hay cuentas oficiales activas. Activa una arriba.</span>
            )}
            {channels.map((c) => {
              const Icon = RED_ICON[c.red];
              return (
                <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={seleccion.includes(c.id)}
                    onCheckedChange={(v) =>
                      setSeleccion((s) => (v === true ? [...s, c.id] : s.filter((id) => id !== c.id)))
                    }
                  />
                  <Icon className="w-3 h-3" /> {c.nombre}
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy || !seleccion.length || !copy.trim()} onClick={() => void run("aprobar")}>
              <Rocket className="w-4 h-4 mr-1" /> Publicar en la red
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("revisar")}>
              <RefreshCw className="w-4 h-4 mr-1" /> Revisar de nuevo con IA
            </Button>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo para rechazar (lo verá el usuario)"
              className="h-8 text-xs flex-1 min-w-48"
            />
            <Button size="sm" variant="ghost" disabled={busy || motivo.trim().length < 3} onClick={() => void run("rechazar")}>
              Rechazar
            </Button>
          </div>
        </>
      )}

      {item.resultados.length > 0 && (
        <div className="space-y-1">
          {item.resultados.map((r: { ok: boolean; channel_name: string; error?: string | null }, i: number) => (
            <div key={i} className={`text-xs flex gap-1.5 ${r.ok ? "text-green-700" : "text-red-600"}`}>
              {r.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {r.channel_name}
              {!r.ok && r.error ? `: ${r.error}` : ""}
            </div>
          ))}
        </div>
      )}
      {item.estado === "rechazado" && item.motivo_rechazo && (
        <p className="text-xs text-red-700">Rechazada: {item.motivo_rechazo}</p>
      )}
    </div>
  );
}
