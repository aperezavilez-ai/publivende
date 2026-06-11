import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RECETAS } from "@/lib/recetas";
import { Star, Download, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MarketplaceReceta } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/recetas")({ component: Recetas });

const RATINGS_KEY = "publivende_market_ratings";
function loadMyRatings(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? "{}"); } catch { return {}; }
}
function saveMyRatings(r: Record<string, number>) {
  localStorage.setItem(RATINGS_KEY, JSON.stringify(r));
}

interface RecetaForm {
  id?: string;
  titulo: string;
  industria: string;
  emoji: string;
  descripcion: string;
  precio: number;
}
const EMPTY_FORM: RecetaForm = { titulo: "", industria: "", emoji: "✨", descripcion: "", precio: 99 };

function Recetas() {
  const { user, updateUser } = useAuth();
  const marketplace = useDB((db) => db.marketplace_recetas);
  const [editing, setEditing] = useState<RecetaForm | null>(null);
  const [myRatings, setMyRatings] = useState<Record<string, number>>(loadMyRatings);

  function aplicar(rid: string) {
    if (!user) return;
    const r = RECETAS.find((x) => x.id === rid)!;
    const db = loadDB();
    const now = new Date().toISOString();
    r.posts.forEach((p) => {
      db.posts.push({
        id: uid(), user_id: user.id, tipo: "imagen", media_url: p.imagen,
        copy: p.copy, redes_destino: p.redes, estado: "borrador",
        tracking_slug: slug(), created_at: now,
      });
    });
    r.reglas.forEach((rg) => {
      db.automation_rules.push({
        id: uid(), user_id: user.id, nombre: rg.nombre,
        disparador: rg.palabra_clave ? "palabra_clave" : "mensaje_nuevo",
        palabra_clave: rg.palabra_clave, respuesta: rg.respuesta, activa: true,
      });
    });
    r.productos.forEach((p) => {
      db.productos.push({
        id: uid(), user_id: user.id, nombre: p.nombre, precio: p.precio,
        moneda: "MXN", descripcion: p.nombre, imagen: "", link_pago: "https://mpago.la/demo",
        slug_publico: slug() + "-" + p.nombre.toLowerCase().replace(/\s+/g, "-"),
        activo: true,
      });
    });
    saveDB(db);
    updateUser({ industria: r.industria });
    toast.success(`Receta "${r.industria}" aplicada 🎉`);
  }

  function descargarMarket(id: string) {
    if (!user) return;
    const db = loadDB();
    const r = db.marketplace_recetas.find((x) => x.id === id);
    if (!r) return;
    r.descargas += 1;
    const now = new Date().toISOString();
    const img = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800";
    db.posts.push({
      id: uid(), user_id: user.id, tipo: "imagen", media_url: img,
      copy: `${r.emoji} ${r.titulo} — ${r.descripcion}`,
      redes_destino: ["instagram", "facebook"], estado: "borrador",
      tracking_slug: slug(), created_at: now,
    });
    db.automation_rules.push({
      id: uid(), user_id: user.id,
      nombre: `Bienvenida ${r.industria}`,
      disparador: "mensaje_nuevo",
      respuesta: `¡Hola {nombre}! Gracias por tu interés en "${r.titulo}". ¿En qué te ayudamos? 💜`,
      activa: true,
    });
    db.productos.push({
      id: uid(), user_id: user.id,
      nombre: r.titulo.slice(0, 40),
      precio: r.precio,
      moneda: "MXN",
      descripcion: r.descripcion,
      imagen: img,
      link_pago: "https://mpago.la/demo",
      activo: true,
    });
    saveDB(db);
    updateUser({ industria: r.industria.toLowerCase().split(/\s+/)[0] });
    toast.success(`"${r.titulo}" importada — revisa Borradores, Automatizaciones y Productos`);
  }

  function despublicar(id: string) {
    const db = loadDB();
    db.marketplace_recetas = db.marketplace_recetas.filter((x) => x.id !== id);
    saveDB(db);
    toast.success("Receta retirada del Marketplace");
  }

  function guardar(form: RecetaForm) {
    if (!user) return;
    if (form.titulo.trim().length < 3) return toast.error("El título debe tener al menos 3 caracteres");
    if (form.precio < 0 || Number.isNaN(form.precio)) return toast.error("Precio inválido");
    if (form.industria.trim().length < 2) return toast.error("Define la industria");

    const db = loadDB();
    if (form.id) {
      const r = db.marketplace_recetas.find((x) => x.id === form.id);
      if (r) {
        r.titulo = form.titulo; r.industria = form.industria; r.emoji = form.emoji || "✨";
        r.descripcion = form.descripcion; r.precio = form.precio;
      }
      toast.success("Receta actualizada");
    } else {
      db.marketplace_recetas.unshift({
        id: uid(), autor_id: user.id, autor_nombre: user.nombre,
        titulo: form.titulo, industria: form.industria,
        emoji: form.emoji || "✨", descripcion: form.descripcion,
        precio: form.precio, descargas: 0, rating: 0, votos: 0,
        publicada: new Date().toISOString(),
      });
      toast.success("Tu receta se publicó en el Marketplace");
    }
    saveDB(db);
    setEditing(null);
  }

  function rate(receta: MarketplaceReceta, stars: number) {
    if (!user || receta.autor_id === user.id) return;
    const prev = myRatings[receta.id];
    const db = loadDB();
    const r = db.marketplace_recetas.find((x) => x.id === receta.id);
    if (!r) return;
    const votos = r.votos ?? 0;
    if (prev) {
      // reemplaza voto
      const total = r.rating * votos - prev + stars;
      r.rating = +(total / votos).toFixed(1);
    } else {
      const total = r.rating * votos + stars;
      r.votos = votos + 1;
      r.rating = +(total / r.votos).toFixed(1);
    }
    saveDB(db);
    const next = { ...myRatings, [receta.id]: stars };
    setMyRatings(next); saveMyRatings(next);
    toast.success(`Tu calificación: ${stars}⭐`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Recetas LATAM</h1>
        <p className="text-sm text-muted-foreground">Plantillas listas para tu industria + marketplace de la comunidad.</p>
      </div>

      <Tabs defaultValue="oficiales">
        <TabsList>
          <TabsTrigger value="oficiales">Recetas oficiales</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace ({marketplace.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="oficiales" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RECETAS.map((r) => (
              <Card key={r.id} className="p-5 hover:shadow-elegant transition">
                <div className="text-4xl mb-2">{r.emoji}</div>
                <h3 className="font-bold text-lg">{r.industria}</h3>
                <p className="text-sm text-muted-foreground mb-4">{r.descripcion}</p>
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  <div>📸 {r.posts.length} publicaciones</div>
                  <div>🤖 {r.reglas.length} reglas</div>
                  <div>🛍️ {r.productos.length} productos</div>
                </div>
                <Button className="w-full bg-gradient-primary border-0" onClick={() => aplicar(r.id)}>Aplicar receta</Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="mt-4 space-y-4">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/30 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold">¿Tienes una receta que funciona?</div>
              <div className="text-xs text-muted-foreground">Publícala y gana el 70% por cada descarga.</div>
            </div>
            <Button onClick={() => setEditing({ ...EMPTY_FORM, industria: user?.industria ?? "" })} className="gap-1">
              <Upload className="w-4 h-4" />Publicar nueva
            </Button>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {marketplace.map((r) => {
              const isMine = r.autor_id === user?.id;
              const myRating = myRatings[r.id];
              return (
                <Card key={r.id} className="p-4 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{r.emoji}</div>
                    <div className="flex gap-1">
                      {isMine && <Badge className="text-[10px] bg-primary">Mía</Badge>}
                      <Badge variant="outline" className="text-[10px]">{r.industria}</Badge>
                    </div>
                  </div>
                  <h3 className="font-bold mt-2">{r.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex-1">{r.descripcion}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.rating || "—"}
                      {r.votos ? <span className="opacity-60">({r.votos})</span> : null}
                    </span>
                    <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{r.descargas}</span>
                    <span className="ml-auto truncate">por {r.autor_nombre}</span>
                  </div>

                  {!isMine && (
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => rate(r, s)} aria-label={`Calificar ${s}`}>
                          <Star className={`w-4 h-4 ${myRating && s <= myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                        </button>
                      ))}
                      {myRating && <span className="text-[10px] text-muted-foreground self-center ml-1">Tu voto: {myRating}⭐</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                    <div className="text-lg font-bold text-primary">${r.precio} <span className="text-xs text-muted-foreground font-normal">MXN</span></div>
                    {isMine ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditing({
                          id: r.id, titulo: r.titulo, industria: r.industria, emoji: r.emoji,
                          descripcion: r.descripcion, precio: r.precio,
                        })}><Pencil className="w-3 h-3" />Editar</Button>
                        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => despublicar(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => descargarMarket(r.id)}>Obtener</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <RecetaFormDialog form={editing} onClose={() => setEditing(null)} onSave={guardar} />
    </div>
  );
}

function RecetaFormDialog({ form, onClose, onSave }: { form: RecetaForm | null; onClose: () => void; onSave: (f: RecetaForm) => void }) {
  const [draft, setDraft] = useState<RecetaForm>(form ?? EMPTY_FORM);
  useEffect(() => { if (form) setDraft(form); }, [form]);
  return (
    <Dialog open={!!form} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form?.id ? "Editar receta" : "Publicar receta"}</DialogTitle></DialogHeader>
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <div>
                <Label className="text-xs">Emoji</Label>
                <Input value={draft.emoji} maxLength={2} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} className="text-center text-xl" />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Pack Black Friday Moda" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Industria</Label>
                <Input value={draft.industria} onChange={(e) => setDraft({ ...draft, industria: e.target.value })} placeholder="Moda, Comida…" />
              </div>
              <div>
                <Label className="text-xs">Precio (MXN)</Label>
                <Input type="number" min={0} value={draft.precio} onChange={(e) => setDraft({ ...draft, precio: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea rows={3} value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} placeholder="Qué incluye: posts, reglas, productos…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => onSave(draft)}>{form.id ? "Guardar cambios" : "Publicar"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
