import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HookMeter } from "@/components/brain/HookMeter";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { useBrainReports, useDiagnosis } from "@/lib/brain/useDiagnosis";
import { NICHES } from "@/lib/brain/niches";
import { RED_LABELS } from "@/services/social/mock";
import {
  AUTOPILOT_LIMITS,
  DEFAULT_AUTOPILOT,
  fallbackCopy,
  planAutopilotSlots,
} from "@/lib/autopilot/planner";
import {
  approveAllAutopilotServer,
  approveAutopilotPostServer,
  discardAutopilotPostServer,
  generateAutopilotServer,
  getAutopilotServer,
  saveAutopilotSettingsServer,
  updateAutopilotPostServer,
} from "@/lib/api/autopilot.functions";
import type { AutopilotSettings, Post, Red, ScheduleMeta } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/piloto")({ component: Piloto });

const ALL_REDES: Red[] = ["facebook", "instagram", "tiktok", "youtube"];
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_DEMO_UPLOAD_BYTES = 4 * 1024 * 1024;
const DAY = 86400000;

const isAutopilot = (p: Post) => !!p.schedule_meta?.autopilot;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/** Refleja en la base local lo que cambió en el servidor (calendario, dashboard). */
function mirrorPosts(userId: string, posts: Post[], removedIds: string[] = [], replaceAll = false) {
  const db = loadDB();
  const ids = new Set(posts.map((p) => p.id));
  const removed = new Set(removedIds);
  db.posts = db.posts.filter((p) => {
    if (ids.has(p.id) || removed.has(p.id)) return false;
    if (replaceAll && p.user_id === userId && isAutopilot(p) && p.estado !== "publicado")
      return false;
    return true;
  });
  db.posts.push(...posts);
  saveDB(db);
}

function fmtFecha(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ServerState {
  settings: AutopilotSettings;
  posts: Post[];
  connected: Red[];
}

function Piloto() {
  const { user } = useAuth();
  const prod = isProductionModeClient();
  const diagnosis = useDiagnosis();
  const reports = useBrainReports();
  const localSettings = useDB((db) => (user ? db.autopilot_settings?.[user.id] : undefined));
  const localPosts = useDB((db) =>
    db.posts.filter(
      (p) =>
        p.user_id === user?.id &&
        isAutopilot(p) &&
        new Date(p.fecha_programada ?? 0).getTime() > Date.now() - DAY,
    ),
  );
  const localConnected = useDB((db) =>
    db.social_accounts
      .filter((a) => a.user_id === user?.id && a.estado_conexion === "conectada")
      .map((a) => a.red),
  );
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id));

  const [server, setServer] = useState<ServerState | null>(null);
  const [loading, setLoading] = useState(prod);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<AutopilotSettings>(DEFAULT_AUTOPILOT);
  const [dirty, setDirty] = useState(false);

  const plan = user?.plan ?? "free";
  const limits = AUTOPILOT_LIMITS[plan] ?? AUTOPILOT_LIMITS.free;
  const settings = (prod ? server?.settings : localSettings) ?? DEFAULT_AUTOPILOT;
  const posts = useMemo(
    () => (prod ? (server?.posts ?? []) : localPosts),
    [prod, server?.posts, localPosts],
  );
  const connected = prod ? (server?.connected ?? []) : localConnected;

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!prod || !token || !user) return;
    try {
      const res = await getAutopilotServer({ data: { token } });
      if (res.ok) {
        setServer({ settings: res.settings, posts: res.posts, connected: res.connected });
        mirrorPosts(user.id, res.posts, [], true);
      } else if (!("useLocal" in res)) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el piloto");
    } finally {
      setLoading(false);
    }
  }, [prod, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) {
      setDraft({
        ...settings,
        redes: settings.redes.length
          ? settings.redes
          : connected.filter((r) => ALL_REDES.includes(r)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, connected.join(","), dirty]);

  const pendientes = useMemo(
    () =>
      posts.filter(
        (p) => p.schedule_meta?.autopilot?.estado === "pendiente" && p.estado === "borrador",
      ),
    [posts],
  );
  const programados = useMemo(
    () =>
      posts.filter(
        (p) => p.schedule_meta?.autopilot?.estado === "aprobado" || p.estado !== "borrador",
      ),
    [posts],
  );

  function patch(update: Partial<AutopilotSettings>) {
    setDraft((d) => ({ ...d, ...update }));
    setDirty(true);
  }

  async function guardar(): Promise<boolean> {
    if (!user) return false;
    const input = {
      activo: draft.activo,
      modo: limits.modos.includes(draft.modo) ? draft.modo : "aprobar",
      posts_semana: Math.min(limits.max_posts, draft.posts_semana),
      redes: draft.redes,
    } as const;
    if (input.activo && !input.redes.length) {
      toast.error("Elige al menos una red");
      return false;
    }
    setBusy("save");
    try {
      const token = getSessionToken();
      if (prod && token) {
        const res = await saveAutopilotSettingsServer({ data: { token, ...input } });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        setServer((s) => (s ? { ...s, settings: res.settings } : s));
      } else {
        const db = loadDB();
        db.autopilot_settings = {
          ...db.autopilot_settings,
          [user.id]: { ...input, ultima_generacion: settings.ultima_generacion ?? null },
        };
        saveDB(db);
      }
      setDirty(false);
      toast.success(input.activo ? "Piloto automático guardado" : "Piloto automático en pausa");
      return true;
    } finally {
      setBusy(null);
    }
  }

  function generarLocal() {
    if (!user || !diagnosis) return;
    const latest = reports[reports.length - 1];
    const fresh = latest && Date.now() - new Date(latest.created_at).getTime() < 8 * DAY;
    const db = loadDB();
    const now = Date.now();
    db.posts = db.posts.filter(
      (p) =>
        !(
          p.user_id === user.id &&
          isAutopilot(p) &&
          new Date(p.fecha_programada ?? 0).getTime() > now &&
          (p.schedule_meta?.autopilot?.estado === "pendiente" ||
            p.schedule_meta?.autopilot?.aprobado_por === "auto")
        ),
    );
    const aprobados = db.posts.filter(
      (p) =>
        p.user_id === user.id &&
        p.schedule_meta?.autopilot?.estado === "aprobado" &&
        new Date(p.fecha_programada ?? 0).getTime() > now,
    ).length;
    const slots = planAutopilotSlots({
      diagnosis,
      settings: draft,
      productos,
      connected: localConnected.length ? localConnected : draft.redes,
      planSemana: fresh ? latest.plan.semana : undefined,
      yaProgramadas: aprobados,
    });
    const niche = NICHES[diagnosis.nicho];
    const auto = draft.modo === "automatico" && limits.modos.includes("automatico");
    for (const slot of slots) {
      const autoPublish = auto && !slot.requiere_media;
      const meta: ScheduleMeta = {
        autopilot: {
          estado: autoPublish ? "aprobado" : "pendiente",
          aprobado_por: autoPublish ? "auto" : undefined,
          fuente: "reglas",
          formula: slot.formula,
          requiere_media: slot.requiere_media,
          generado_at: new Date().toISOString(),
        },
      };
      db.posts.push({
        id: uid(),
        user_id: user.id,
        tipo: slot.tipo,
        media_url: slot.media_url,
        copy: fallbackCopy(slot, niche, user),
        redes_destino: slot.redes,
        estado: autoPublish ? "programado" : "borrador",
        fecha_programada: slot.fecha,
        tracking_slug: Math.random().toString(36).slice(2, 10),
        created_at: new Date().toISOString(),
        nicho_label: niche.label,
        schedule_meta: meta,
      });
    }
    db.autopilot_settings = {
      ...db.autopilot_settings,
      [user.id]: { ...draft, ultima_generacion: new Date().toISOString() },
    };
    saveDB(db);
    toast.success(
      slots.length
        ? `Listas ${slots.length} publicaciones (modo demo)`
        : "Tu semana ya está cubierta",
    );
  }

  async function generar() {
    if (!user) return;
    if (!draft.activo) {
      toast.error("Activa el piloto automático primero");
      return;
    }
    if (dirty && !(await guardar())) return;
    setBusy("generate");
    try {
      const token = getSessionToken();
      if (prod && token) {
        const res = await generateAutopilotServer({ data: { token } });
        if (!res.ok) {
          toast.message(res.error);
          return;
        }
        setServer((s) =>
          s
            ? {
                ...s,
                posts: res.posts,
                settings: { ...s.settings, ultima_generacion: new Date().toISOString() },
              }
            : s,
        );
        mirrorPosts(user.id, res.posts, [], true);
        toast.success(
          res.fuente === "ia"
            ? "La IA escribió tu semana; revísala y apruébala"
            : "Tu semana está lista",
        );
      } else {
        generarLocal();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar la semana");
    } finally {
      setBusy(null);
    }
  }

  function updateLocal(postId: string, update: (p: Post) => Post | null) {
    const db = loadDB();
    db.posts = db.posts.flatMap((p) => {
      if (p.id !== postId) return [p];
      const next = update(p);
      return next ? [next] : [];
    });
    saveDB(db);
  }

  function replaceServerPost(post: Post) {
    setServer((s) => (s ? { ...s, posts: s.posts.map((p) => (p.id === post.id ? post : p)) } : s));
    if (user) mirrorPosts(user.id, [post]);
  }

  async function guardarCopy(post: Post, copy: string) {
    setBusy(`copy-${post.id}`);
    try {
      const token = getSessionToken();
      if (prod && token) {
        const res = await updateAutopilotPostServer({ data: { token, post_id: post.id, copy } });
        if (!res.ok) return toast.error(res.error);
        replaceServerPost(res.post);
      } else {
        updateLocal(post.id, (p) => ({ ...p, copy, copy_por_red: undefined }));
      }
      toast.success("Texto guardado");
    } finally {
      setBusy(null);
    }
  }

  async function aprobar(post: Post, file?: File) {
    if (file && file.size > (prod ? MAX_UPLOAD_BYTES : MAX_DEMO_UPLOAD_BYTES)) {
      toast.error(`El archivo pesa más de ${prod ? 30 : 4} MB`);
      return;
    }
    setBusy(`approve-${post.id}`);
    try {
      const dataUrl = file ? await readAsDataUrl(file) : undefined;
      const token = getSessionToken();
      if (prod && token) {
        const res = await approveAutopilotPostServer({
          data: { token, post_id: post.id, media_data_url: dataUrl },
        });
        if (!res.ok) return toast.error(res.error);
        replaceServerPost(res.post);
      } else {
        const meta = post.schedule_meta?.autopilot;
        if (meta?.requiere_media && !dataUrl && !post.media_url) {
          return toast.error(
            meta.requiere_media === "video"
              ? "Sube el video antes de aprobar"
              : "Sube una foto antes de aprobar",
          );
        }
        updateLocal(post.id, (p) => ({
          ...p,
          estado: "programado",
          media_url: dataUrl ?? p.media_url,
          tipo: file ? (file.type.startsWith("video/") ? "video" : "imagen") : p.tipo,
          schedule_meta: {
            ...p.schedule_meta,
            autopilot: {
              ...p.schedule_meta!.autopilot!,
              estado: "aprobado",
              aprobado_por: "cliente",
              requiere_media: undefined,
            },
          },
        }));
      }
      toast.success(`Programada para el ${fmtFecha(post.fecha_programada)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo aprobar");
    } finally {
      setBusy(null);
    }
  }

  async function aprobarTodo() {
    setBusy("approve-all");
    try {
      const token = getSessionToken();
      if (prod && token) {
        const res = await approveAllAutopilotServer({ data: { token } });
        if (!res.ok) return toast.error(res.error);
        setServer((s) => (s ? { ...s, posts: res.posts } : s));
        if (user) mirrorPosts(user.id, res.posts, [], true);
        toast.success(
          `${res.aprobados} aprobadas${res.omitidos ? `; ${res.omitidos} necesitan foto/video o reconectar la red` : ""}`,
        );
      } else {
        const listas = pendientes.filter((p) => !p.schedule_meta?.autopilot?.requiere_media);
        for (const p of listas) {
          updateLocal(p.id, (x) => ({
            ...x,
            estado: "programado",
            schedule_meta: {
              ...x.schedule_meta,
              autopilot: {
                ...x.schedule_meta!.autopilot!,
                estado: "aprobado",
                aprobado_por: "cliente",
              },
            },
          }));
        }
        toast.success(`${listas.length} aprobadas`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function descartar(post: Post) {
    setBusy(`discard-${post.id}`);
    try {
      const token = getSessionToken();
      if (prod && token) {
        const res = await discardAutopilotPostServer({ data: { token, post_id: post.id } });
        if (!res.ok) return toast.error(res.error);
        setServer((s) => (s ? { ...s, posts: s.posts.filter((p) => p.id !== post.id) } : s));
        if (user) mirrorPosts(user.id, [], [post.id]);
      } else {
        updateLocal(post.id, () => null);
      }
      toast.success("Publicación descartada");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando piloto automático…
      </div>
    );
  }

  const sinRedes = !connected.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" /> Piloto automático
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          La IA escribe y programa tus publicaciones de la semana con los ganchos de tu nicho, en
          los horarios donde más te ven.
          {!prod && " (Modo demo: las publicaciones no salen a las redes.)"}
        </p>
      </div>

      <Card className="p-4 md:p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{draft.activo ? "Encendido" : "Apagado"}</div>
            <p className="text-xs text-muted-foreground">
              {draft.activo
                ? "Cada semana preparamos tus publicaciones automáticamente."
                : "Enciéndelo para que la IA llene tu semana."}
            </p>
          </div>
          <Switch checked={draft.activo} onCheckedChange={(v) => patch({ activo: v })} />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">¿Cómo quieres trabajar?</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ modo: "aprobar" })}
              className={`rounded-lg border p-3 text-left text-sm transition ${draft.modo === "aprobar" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <div className="font-semibold">Yo apruebo cada post</div>
              <div className="text-xs text-muted-foreground">
                Revisas, editas y apruebas antes de que salga.
              </div>
            </button>
            <button
              type="button"
              disabled={!limits.modos.includes("automatico")}
              onClick={() => patch({ modo: "automatico" })}
              className={`rounded-lg border p-3 text-left text-sm transition disabled:opacity-60 ${draft.modo === "automatico" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <div className="font-semibold flex items-center gap-2">
                100% automático
                {!limits.modos.includes("automatico") && <Badge variant="outline">Pro</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                Se publica solo; tú solo grabas los videos.
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Publicaciones por semana</span>
            <span className="font-semibold">{Math.min(draft.posts_semana, limits.max_posts)}</span>
          </div>
          <Slider
            min={1}
            max={limits.max_posts}
            step={1}
            value={[Math.min(draft.posts_semana, limits.max_posts)]}
            onValueChange={([v]) => patch({ posts_semana: v })}
          />
          {plan === "free" && (
            <p className="text-xs text-muted-foreground">
              Free incluye hasta 3 por semana.{" "}
              <Link to="/configuracion" className="underline">
                Sube a Pro
              </Link>{" "}
              para 7 y modo automático.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Redes</div>
          <div className="flex flex-wrap gap-2">
            {ALL_REDES.map((red) => {
              const ok = connected.includes(red) || !prod;
              const on = draft.redes.includes(red);
              return (
                <button
                  key={red}
                  type="button"
                  disabled={!ok}
                  onClick={() =>
                    patch({
                      redes: on ? draft.redes.filter((r) => r !== red) : [...draft.redes, red],
                    })
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {RED_LABELS[red]}
                  {!ok && " · conectar"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Facebook e Instagram salen con la foto de tus productos. Para TikTok y YouTube la IA te
            dice qué grabar y tú subes el video.
          </p>
          {sinRedes && prod && (
            <p className="text-xs text-amber-700">
              Conecta tus redes en{" "}
              <Link to="/configuracion" className="underline">
                Configuración
              </Link>{" "}
              para usar el piloto.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void guardar()} disabled={!dirty || !!busy}>
            {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </Button>
          <Button onClick={() => void generar()} disabled={!!busy || !draft.activo}>
            {busy === "generate" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {posts.length ? "Regenerar semana" : "Generar mi semana"}
          </Button>
          {settings.ultima_generacion && (
            <span className="text-xs text-muted-foreground self-center">
              Última vez: {fmtFecha(settings.ultima_generacion)}
            </span>
          )}
        </div>
      </Card>

      {pendientes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Por aprobar ({pendientes.length})</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void aprobarTodo()}
              disabled={!!busy}
            >
              <CheckCircle2 className="w-4 h-4" /> Aprobar todo lo listo
            </Button>
          </div>
          {pendientes.map((post) => (
            <PendingCard
              key={post.id}
              post={post}
              busy={busy}
              onSave={(copy) => void guardarCopy(post, copy)}
              onApprove={(file) => void aprobar(post, file)}
              onDiscard={() => void descartar(post)}
            />
          ))}
        </section>
      )}

      {programados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Programadas</h2>
          {programados.map((post) => (
            <Card key={post.id} className="p-3 flex items-start gap-3">
              {post.media_url && post.tipo === "imagen" ? (
                <img
                  src={post.media_url}
                  alt=""
                  className="w-14 h-14 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded bg-muted grid place-items-center shrink-0">
                  {post.tipo === "video" ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <CalendarClock className="w-5 h-5" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium capitalize">{fmtFecha(post.fecha_programada)}</span>
                  <Badge variant={post.estado === "publicado" ? "default" : "outline"}>
                    {post.estado === "publicado"
                      ? "Publicada"
                      : post.estado === "error"
                        ? "Error"
                        : "Programada"}
                  </Badge>
                  {post.redes_destino.map((r) => (
                    <Badge key={r} variant="secondary">
                      {RED_LABELS[r]}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm mt-1 line-clamp-2 whitespace-pre-line">{post.copy}</p>
                {post.schedule_meta?.schedule_error && (
                  <p className="text-xs text-red-600 mt-1">{post.schedule_meta.schedule_error}</p>
                )}
              </div>
              {post.estado === "programado" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void descartar(post)}
                  disabled={!!busy}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </Card>
          ))}
        </section>
      )}

      {!posts.length && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aún no hay publicaciones del piloto. Enciéndelo, elige tus redes y toca{" "}
          <b>Generar mi semana</b>.
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Los seguimientos por WhatsApp a clientes que no te han escrito en 24 horas requieren
        plantillas aprobadas por Meta, por eso el piloto solo publica en redes sociales.
      </p>
    </div>
  );
}

function PendingCard({
  post,
  busy,
  onSave,
  onApprove,
  onDiscard,
}: {
  post: Post;
  busy: string | null;
  onSave: (copy: string) => void;
  onApprove: (file?: File) => void;
  onDiscard: () => void;
}) {
  const [copy, setCopy] = useState(post.copy);
  useEffect(() => setCopy(post.copy), [post.copy]);
  const meta = post.schedule_meta?.autopilot;
  const falta = meta?.requiere_media;
  const changed = copy.trim() !== post.copy.trim();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold capitalize text-sm">{fmtFecha(post.fecha_programada)}</span>
        {post.redes_destino.map((r) => (
          <Badge key={r} variant="secondary">
            {RED_LABELS[r]}
          </Badge>
        ))}
        <Badge variant="outline">
          {meta?.fuente === "ia" ? "Escrito por IA" : "Plantilla del nicho"}
        </Badge>
        {meta?.formula && <span className="text-muted-foreground">Gancho: {meta.formula}</span>}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        {post.media_url && post.tipo === "imagen" && (
          <img
            src={post.media_url}
            alt=""
            className="w-full md:w-40 h-40 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={6} />
          <HookMeter copy={copy} />
        </div>
      </div>

      {falta && (
        <p className="text-xs text-amber-700">
          {falta === "video"
            ? "Graba el video que indica el texto (15-30 s) y súbelo para aprobar."
            : "Sube una foto para esta publicación."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {changed && (
          <Button size="sm" variant="outline" onClick={() => onSave(copy)} disabled={!!busy}>
            Guardar texto
          </Button>
        )}
        {falta ? (
          <Button size="sm" asChild disabled={!!busy || changed}>
            <label className="cursor-pointer">
              {busy === `approve-${post.id}` ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Subir {falta === "video" ? "video" : "foto"} y aprobar
              <input
                type="file"
                className="hidden"
                accept={falta === "video" ? "video/*" : "image/*"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onApprove(file);
                }}
              />
            </label>
          </Button>
        ) : (
          <Button size="sm" onClick={() => onApprove()} disabled={!!busy || changed}>
            {busy === `approve-${post.id}` ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Aprobar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDiscard} disabled={!!busy}>
          <Trash2 className="w-4 h-4" /> Descartar
        </Button>
      </div>
      {changed && (
        <p className="text-xs text-muted-foreground">Guarda el texto antes de aprobar.</p>
      )}
    </Card>
  );
}
