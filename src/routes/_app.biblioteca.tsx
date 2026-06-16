import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Trash2, Instagram, Facebook, Youtube, Music2,
  Hash, Radio, Sparkles, FileImage, Calendar, CheckCircle2, Clock, Pencil, MessageCircle, Copy, Send,
} from "lucide-react";
import { toast } from "sonner";
import type { Post, Red, EstadoPost } from "@/lib/mock/types";
import { RED_COLORS, RED_LABELS } from "@/services/social/mock";
import { broadcastPostLink } from "@/services/whatsapp/mock";
import { buildPostPageUrl } from "@/lib/whatsapp-post";
import { isProductionModeClient, getSessionToken } from "@/lib/production/session";
import { listCalendarPosts } from "@/lib/api/calendar.functions";

export const Route = createFileRoute("/_app/biblioteca")({ component: Biblio });

const ICONS: Record<Red, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
};

const ESTADO_LABELS: Record<EstadoPost, string> = {
  borrador: "Borrador",
  programado: "Programado",
  publicado: "Publicado",
  error: "Error",
};

const ESTADO_STYLES: Record<EstadoPost, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  programado: "bg-amber-100 text-amber-800 border-amber-200",
  publicado: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
};

function Biblio() {
  const { user } = useAuth();
  const localPosts = useDB((db) =>
    db.posts
      .filter((p) => p.user_id === user?.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );
  const [serverPosts, setServerPosts] = useState<Post[]>([]);
  const assets = useDB((db) => db.media_assets.filter((a) => a.user_id === user?.id));
  const waContactCount = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id).length);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("publicaciones");
  const posts = isProductionModeClient() ? serverPosts : localPosts;

  useEffect(() => {
    const token = getSessionToken();
    if (!isProductionModeClient() || !token) return;
    void listCalendarPosts({ data: { token } }).then((res) => {
      if (res.ok) setServerPosts(res.posts);
    });
  }, []);

  function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const db = loadDB();
    files.forEach((f) => {
      db.media_assets.push({
        id: uid(), user_id: user!.id, nombre: f.name,
        url: URL.createObjectURL(f),
        tipo: f.type.startsWith("video") ? "video" : "imagen",
        tags: [], created_at: new Date().toISOString(),
      });
    });
    saveDB(db);
    toast.success(`${files.length} archivo(s) subidos`);
  }

  function eliminarAsset(id: string) {
    const db = loadDB();
    db.media_assets = db.media_assets.filter((a) => a.id !== id);
    saveDB(db);
    toast.success("Archivo eliminado");
  }

  function eliminarPost(id: string) {
    const db = loadDB();
    db.posts = db.posts.filter((p) => p.id !== id);
    saveDB(db);
    toast.success("Publicación eliminada");
  }

  const filteredPosts = useMemo(() => {
    const term = q.toLowerCase();
    if (!term) return posts;
    return posts.filter((p) =>
      p.copy.toLowerCase().includes(term)
      || p.nicho_label?.toLowerCase().includes(term)
      || p.hashtags_virales?.some((h) => h.toLowerCase().includes(term))
      || p.redes_destino.some((r) => RED_LABELS[r].toLowerCase().includes(term)),
    );
  }, [posts, q]);

  const filteredAssets = assets.filter((a) => a.nombre.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Biblioteca</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tus publicaciones, hashtags virales y plan de distribución IA
          </p>
        </div>
        <Button asChild className="bg-gradient-primary border-0">
          <Link to="/publicar">+ Crear publicación</Link>
        </Button>
      </div>

      <Input
        placeholder="Buscar por copy, nicho o hashtag…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="publicaciones" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Publicaciones ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="archivos" className="gap-1.5">
            <FileImage className="w-3.5 h-3.5" />
            Archivos ({assets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publicaciones" className="mt-4 space-y-3">
          {filteredPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Aún no hay publicaciones guardadas</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Crea una publicación, adapta con IA y se guardará aquí con hashtags y canales de distribución.
              </p>
              <Button asChild className="mt-4 bg-gradient-primary border-0">
                <Link to="/publicar">Ir a Crear publicación</Link>
              </Button>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <PublicationCard
                key={post.id}
                post={post}
                waContactCount={waContactCount}
                onDelete={() => eliminarPost(post.id)}
                onBroadcast={async () => {
                  if (!user) return;
                  if (waContactCount === 0) return toast.error("No tienes contactos en WhatsApp CRM");
                  const { sent } = await broadcastPostLink(user.id, post.id);
                  toast.success(`Link enviado a ${sent} contacto${sent > 1 ? "s" : ""}`);
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="archivos" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Subir archivos
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={subir} />
              </label>
            </Button>
          </div>
          {filteredAssets.length === 0 ? (
            <Card className="p-12 text-center">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No hay archivos multimedia.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredAssets.map((a) => (
                <Card key={a.id} className="group relative overflow-hidden">
                  <img src={a.url} alt="" className="aspect-square object-cover w-full" />
                  <button
                    type="button"
                    onClick={() => eliminarAsset(a.id)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="p-2 text-xs truncate">{a.nombre}</div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublicationCard({
  post,
  waContactCount,
  onDelete,
  onBroadcast,
}: {
  post: Post;
  waContactCount: number;
  onDelete: () => void;
  onBroadcast: () => void;
}) {
  const fecha = post.fecha_publicacion ?? post.fecha_programada ?? post.created_at;
  const fechaLabel = new Date(fecha).toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-40 shrink-0 bg-muted">
          {post.media_url ? (
            <img src={post.media_url} alt="" className="w-full h-36 md:h-full object-cover" />
          ) : (
            <div className="w-full h-36 md:h-full flex items-center justify-center text-muted-foreground">
              <FileImage className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`text-[10px] border ${ESTADO_STYLES[post.estado]}`}>
                {post.estado === "publicado" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {post.estado === "programado" && <Clock className="w-3 h-3 mr-1" />}
                {post.estado === "borrador" && <Pencil className="w-3 h-3 mr-1" />}
                {ESTADO_LABELS[post.estado]}
              </Badge>
              {post.nicho_label && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Sparkles className="w-3 h-3" />{post.nicho_label}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fechaLabel}
              </span>
            </div>
            <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm line-clamp-2">{post.copy}</p>

          <div className="flex flex-wrap gap-1.5">
            {post.redes_destino.map((r) => {
              const Icon = ICONS[r];
              return (
                <Badge key={r} variant="outline" className="text-[10px] gap-1">
                  <Icon className="w-3 h-3" style={{ color: RED_COLORS[r] }} />
                  {RED_LABELS[r]}
                </Badge>
              );
            })}
          </div>

          {post.hashtags_virales && post.hashtags_virales.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-1">
                <Hash className="w-3 h-3" />Hashtags virales (IA)
              </p>
              <div className="flex flex-wrap gap-1">
                {post.hashtags_virales.map((h) => (
                  <Badge key={h} variant="outline" className="text-[9px] border-pink-200 text-pink-800">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {post.estado === "error" && post.schedule_meta?.schedule_error && (
            <div className="text-xs rounded border border-red-200 bg-red-50 text-red-800 px-2 py-1">
              Error automático: {post.schedule_meta.schedule_error}
            </div>
          )}

          {post.canales_distribucion && post.canales_distribucion.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
              <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                <Radio className="w-3 h-3" />
                Distribución IA — {post.total_canales ?? post.canales_distribucion.reduce((s, c) => s + c.cantidad, 0)} canales/grupos
              </p>
              <div className="grid sm:grid-cols-2 gap-1">
                {post.canales_distribucion.map((c, i) => {
                  const Icon = ICONS[c.red];
                  return (
                    <div key={`${c.red}-${c.canal}-${i}`} className="flex items-center gap-1.5 text-[10px]">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: RED_COLORS[c.red] }} />
                      <span className="font-medium truncate">{c.canal}</span>
                      <span className="text-muted-foreground shrink-0">×{c.cantidad}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {post.estado === "borrador" && (
            <Button asChild size="sm" variant="outline" className="h-8">
              <Link to="/publicar">Continuar editando</Link>
            </Button>
          )}

          {(post.estado === "publicado" || post.estado === "programado") && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onBroadcast}>
                <Send className="w-3 h-3" />
                Enviar a {waContactCount} contacto{waContactCount !== 1 ? "s" : ""} WA
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(buildPostPageUrl(post.tracking_slug));
                  toast.success("Link de publicación copiado");
                }}
              >
                <Copy className="w-3 h-3" />Copiar link
              </Button>
              {post.whatsapp_enviado_at && (
                <span className="text-[10px] text-muted-foreground self-center flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  Enviado a {post.whatsapp_broadcast_count ?? 0} contactos
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
