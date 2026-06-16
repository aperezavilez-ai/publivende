import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCallback, useEffect, useState } from "react";
import { RED_COLORS, RED_LABELS } from "@/services/social/mock";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { listCalendarPosts, scheduleLinkPost, cancelScheduledPost } from "@/lib/api/calendar.functions";
import { getDueLocalScheduledPosts, runLocalScheduledPost } from "@/lib/schedule-local";
import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import { toast } from "sonner";
import { Plus, Link2, MessageCircle, Instagram, Facebook, Youtube, Music2, Trash2, ExternalLink } from "lucide-react";
import type { Post, Red } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/calendario")({ component: Calendario });

const ALL_REDES: Red[] = ["instagram", "facebook", "tiktok", "youtube"];
const ICONS: Record<Red, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
};

function linkHost(url?: string) {
  if (!url) return "Sin link";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 28) + "…";
  }
}

function Calendario() {
  const { user } = useAuth();
  const localPosts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const waContactCount = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id).length);
  const [serverPosts, setServerPosts] = useState<Post[]>([]);
  const [mes, setMes] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickDay, setPickDay] = useState<number | null>(null);
  const [form, setForm] = useState({
    source_url: "",
    fecha: "",
    hora: "10:00",
    redes: [] as Red[],
    whatsapp: true,
  });
  const [saving, setSaving] = useState(false);

  const useServer = isProductionModeClient();
  const posts = useServer ? serverPosts : localPosts;

  const loadServer = useCallback(async () => {
    const token = getSessionToken();
    if (!token || !useServer) return;
    const res = await listCalendarPosts({ data: { token } });
    if (res.ok) setServerPosts(res.posts);
  }, [useServer]);

  useEffect(() => {
    loadServer();
  }, [loadServer]);

  useEffect(() => {
    if (!user || useServer) return;
    const tick = async () => {
      const due = getDueLocalScheduledPosts(user.id);
      for (const p of due) {
        const r = await runLocalScheduledPost(p, user.id);
        if (r.ok) toast.success("Compartida programada publicada automáticamente");
        else if (r.error) toast.error(r.error);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [user, useServer]);

  const first = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  const cells = Array.from({ length: offset + dias }, (_, i) => (i < offset ? null : i - offset + 1));

  function postsDia(d: number) {
    return posts.filter((p) => {
      const f = p.fecha_programada ?? p.fecha_publicacion;
      if (!f) return false;
      const dt = new Date(f);
      return dt.getMonth() === mes.getMonth() && dt.getFullYear() === mes.getFullYear() && dt.getDate() === d;
    });
  }

  function openSchedule(day: number) {
    const y = mes.getFullYear();
    const m = String(mes.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setPickDay(day);
    setForm((f) => ({ ...f, fecha: `${y}-${m}-${d}` }));
    setDialogOpen(true);
  }

  function toggleRed(r: Red) {
    setForm((f) => ({
      ...f,
      redes: f.redes.includes(r) ? f.redes.filter((x) => x !== r) : [...f.redes, r],
    }));
  }

  async function onSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.source_url.trim()) return toast.error("Pega el link del post original");
    if (!form.redes.length && !form.whatsapp) return toast.error("Selecciona al menos una red o WhatsApp");

    const fecha_programada = new Date(`${form.fecha}T${form.hora}`).toISOString();
    if (new Date(fecha_programada) <= new Date()) return toast.error("La fecha debe ser futura");

    setSaving(true);
    const token = getSessionToken();

    if (useServer && token) {
      const res = await scheduleLinkPost({
        data: {
          token,
          source_url: form.source_url.trim(),
          fecha_programada,
          redes: form.redes,
          notify_whatsapp: form.whatsapp,
        },
      });
      setSaving(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Compartida programada — se publicará automáticamente");
      setDialogOpen(false);
      loadServer();
      return;
    }

    const db = loadDB();
    db.posts.push({
      id: uid(),
      user_id: user.id,
      tipo: "imagen",
      media_url: "",
      copy: "⏰ Compartida programada — se adaptará automáticamente",
      source_url: form.source_url.trim(),
      redes_destino: form.redes,
      estado: "programado",
      fecha_programada,
      tracking_slug: slug(),
      created_at: new Date().toISOString(),
      schedule_meta: {
        auto_repurpose: true,
        notify_whatsapp: form.whatsapp,
        tono: "casual",
      },
    });
    saveDB(db);
    setSaving(false);
    toast.success("Compartida programada (demo local)");
    setDialogOpen(false);
  }

  async function onCancel(postId: string) {
    const token = getSessionToken();
    if (useServer && token) {
      const res = await cancelScheduledPost({ data: { token, post_id: postId } });
      if (!res.ok) return toast.error(res.error);
      loadServer();
    } else {
      const db = loadDB();
      db.posts = db.posts.filter((p) => p.id !== postId);
      saveDB(db);
    }
    toast.success("Programación cancelada");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programa compartidas con link — el sistema importa, adapta con IA y publica solo a la hora indicada.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            className="px-3 py-1 rounded border"
          >
            ←
          </button>
          <div className="font-semibold capitalize w-40 text-center">
            {mes.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            className="px-3 py-1 rounded border"
          >
            →
          </button>
        </div>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground mb-2">
          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
            <div key={i} className="text-center py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => (
            <div
              key={i}
              className={`min-h-24 border rounded p-1 text-xs ${d ? "hover:bg-muted/40 cursor-pointer" : "bg-muted/20"}`}
              onClick={() => d && openSchedule(d)}
            >
              {d && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{d}</span>
                    <Plus className="w-3 h-3 text-muted-foreground opacity-60" />
                  </div>
                  <div className="space-y-0.5">
                    {postsDia(d).slice(0, 4).map((p) => {
                      const isScheduled = p.estado === "programado";
                      const wa = p.schedule_meta?.notify_whatsapp;
                      const firstRed = p.redes_destino[0];
                      return (
                        <div
                          key={p.id}
                          className="truncate px-1 py-0.5 rounded text-white text-[10px] flex items-center gap-0.5"
                          style={{
                            background: firstRed ? RED_COLORS[firstRed] : wa ? "#25D366" : "#7c3aed",
                          }}
                          title={p.source_url ?? p.copy}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isScheduled ? "⏰" : p.estado === "error" ? "✕" : "✓"}
                          {p.schedule_meta?.auto_repurpose ? (
                            <Link2 className="w-2.5 h-2.5 shrink-0" />
                          ) : null}
                          {linkHost(p.source_url)}
                          {wa && <MessageCircle className="w-2.5 h-2.5 shrink-0 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Próximas programadas</h2>
        {posts.filter((p) => p.estado === "programado").length === 0 ? (
          <p className="text-sm text-muted-foreground">Haz clic en un día del calendario para programar una compartida con link.</p>
        ) : (
          <div className="space-y-2">
            {posts
              .filter((p) => p.estado === "programado")
              .sort((a, b) => +new Date(a.fecha_programada!) - +new Date(b.fecha_programada!))
              .map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 border rounded-lg p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{linkHost(p.source_url)}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.fecha_programada &&
                        new Date(p.fecha_programada).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.redes_destino.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                          {RED_LABELS[r]}
                        </Badge>
                      ))}
                      {p.schedule_meta?.notify_whatsapp && (
                        <Badge variant="outline" className="text-[10px] border-green-400 text-green-700">
                          WhatsApp
                        </Badge>
                      )}
                      {p.schedule_meta?.auto_repurpose && (
                        <Badge variant="secondary" className="text-[10px]">
                          Auto IA
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/publicar" search={{ link: p.source_url ?? "" }}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Revisar
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onCancel(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Programar compartida {pickDay ? `— ${pickDay}/${mes.getMonth() + 1}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSchedule} className="space-y-4">
            <div>
              <Label>Link del post original</Label>
              <Input
                placeholder="https://facebook.com/share/p/…"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                A la hora programada importamos el link, adaptamos con IA y publicamos automáticamente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Redes destino</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_REDES.map((r) => {
                  const Icon = ICONS[r];
                  const sel = form.redes.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRed(r)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs ${sel ? "border-primary bg-accent" : "border-border"}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {RED_LABELS[r]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, whatsapp: !f.whatsapp }))}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs col-span-2 ${form.whatsapp ? "border-green-500 bg-green-50" : "border-border"}`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                  WhatsApp CRM ({waContactCount} contactos)
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Guardando…" : "Programar compartida automática"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
