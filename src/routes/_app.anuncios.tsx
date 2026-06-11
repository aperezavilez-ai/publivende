import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Sparkles, Eye, MousePointerClick, DollarSign, TrendingUp, Play, Pause, Trash2, Target, Globe, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { consumeCampaignDraft, type CampaignDraft } from "@/lib/draft";
import { createCampaign, updateCampaign, deleteCampaign, generarKeywordsIA, generarCopyIA, calcularROAS } from "@/services/ads/mock";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AdObjetivo, AdTipo } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/anuncios")({ component: Anuncios });

const OBJETIVOS: Record<AdObjetivo, { label: string; icon: string; desc: string }> = {
  mensajes_whatsapp: { label: "Mensajes a WhatsApp", icon: "💬", desc: "Lleva clientes a tu WhatsApp para vender 1 a 1" },
  ventas_link: { label: "Ventas con link de pago", icon: "🛒", desc: "Promociona productos con checkout directo" },
  trafico_catalogo: { label: "Tráfico a catálogo", icon: "👀", desc: "Aumenta visitas a tu tienda o catálogo" },
};
const TIPOS: Record<AdTipo, string> = {
  search: "Búsqueda",
  performance_max: "Performance Max",
  display: "Display / Remarketing",
};
const ESTADO_COLOR: Record<string, string> = {
  activa: "bg-green-500", pausada: "bg-amber-500", finalizada: "bg-gray-400", borrador: "bg-blue-400",
};

function Anuncios() {
  const { user } = useAuth();
  const campaigns = useDB((db) => db.ad_campaigns.filter((c) => c.user_id === user?.id));
  const metrics = useDB((db) => db.ad_metrics);
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id && p.estado === "publicado"));
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState<CampaignDraft | undefined>();

  useEffect(() => {
    const draft = consumeCampaignDraft();
    if (!draft?.openWizard) return;
    setWizardInitial(draft);
    setWizardOpen(true);
    toast.success("Wizard precargado con datos de inteligencia competitiva");
  }, []);

  // KPIs globales últimos 14 días
  const stats = useMemo(() => {
    const ids = new Set(campaigns.map((c) => c.id));
    const m = metrics.filter((x) => ids.has(x.campaign_id));
    const gasto = m.reduce((s, x) => s + x.gasto, 0);
    const monto = m.reduce((s, x) => s + x.monto_atribuido, 0);
    return {
      gasto, monto,
      impresiones: m.reduce((s, x) => s + x.impresiones, 0),
      clics: m.reduce((s, x) => s + x.clics, 0),
      conversiones: m.reduce((s, x) => s + x.conversiones, 0),
      roas: calcularROAS(gasto, monto),
    };
  }, [campaigns, metrics]);

  // serie diaria
  const serie = useMemo(() => {
    const ids = new Set(campaigns.map((c) => c.id));
    const byDay: Record<string, { fecha: string; gasto: number; conversiones: number }> = {};
    metrics.filter((m) => ids.has(m.campaign_id)).forEach((m) => {
      byDay[m.fecha] ??= { fecha: m.fecha.slice(5), gasto: 0, conversiones: 0 };
      byDay[m.fecha].gasto += m.gasto;
      byDay[m.fecha].conversiones += m.conversiones;
    });
    return Object.values(byDay).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [campaigns, metrics]);

  // top campañas por ROAS
  const ranked = useMemo(() => {
    return campaigns.map((c) => {
      const m = metrics.filter((x) => x.campaign_id === c.id);
      const gasto = m.reduce((s, x) => s + x.gasto, 0);
      const monto = m.reduce((s, x) => s + x.monto_atribuido, 0);
      return {
        ...c,
        gasto, monto,
        impresiones: m.reduce((s, x) => s + x.impresiones, 0),
        clics: m.reduce((s, x) => s + x.clics, 0),
        conversiones: m.reduce((s, x) => s + x.conversiones, 0),
        roas: calcularROAS(gasto, monto),
      };
    }).sort((a, b) => b.roas - a.roas);
  }, [campaigns, metrics]);

  async function toggleEstado(id: string, estado: string) {
    await updateCampaign(id, { estado: estado === "activa" ? "pausada" : "activa" });
    toast.success(estado === "activa" ? "Campaña pausada" : "Campaña activada");
  }
  async function eliminar(id: string) {
    await deleteCampaign(id);
    toast.success("Campaña eliminada");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" /> Anuncios — Google Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Promociona tu negocio y atribuye ventas de WhatsApp a tus campañas</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva campaña
        </Button>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="campañas">Campañas ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="keywords">Keywords IA</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi icon={<DollarSign className="w-4 h-4" />} label="Gasto 14d" value={`$${stats.gasto.toFixed(0)}`} />
            <Kpi icon={<Eye className="w-4 h-4" />} label="Impresiones" value={stats.impresiones.toLocaleString()} />
            <Kpi icon={<MousePointerClick className="w-4 h-4" />} label="Clics" value={stats.clics.toLocaleString()} />
            <Kpi icon={<Target className="w-4 h-4" />} label="Conversiones" value={stats.conversiones.toString()} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="ROAS" value={`${stats.roas}×`} highlight={stats.roas >= 2} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Gasto diario (MXN)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="fecha" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="gasto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Conversiones diarias</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="fecha" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="conversiones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Top campañas por ROAS</h3>
            <div className="space-y-2">
              {ranked.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground">{OBJETIVOS[c.objetivo].label} · {TIPOS[c.tipo]}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">Gasto: <b className="text-foreground">${c.gasto.toFixed(0)}</b></span>
                    <span className="text-muted-foreground">Ventas: <b className="text-foreground">${c.monto.toFixed(0)}</b></span>
                    <Badge variant={c.roas >= 2 ? "default" : "secondary"}>ROAS {c.roas}×</Badge>
                  </div>
                </div>
              ))}
              {ranked.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aún no tienes campañas. Crea la primera 🚀</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="campañas" className="mt-4 space-y-3">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Aún no tienes campañas creadas</p>
              <Button onClick={() => setWizardOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Crear primera campaña</Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {ranked.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${ESTADO_COLOR[c.estado]}`} />
                        <span className="text-xs text-muted-foreground capitalize">{c.estado}</span>
                      </div>
                      <h3 className="font-semibold truncate">{c.nombre}</h3>
                      <p className="text-xs text-muted-foreground">{OBJETIVOS[c.objetivo].icon} {OBJETIVOS[c.objetivo].label}</p>
                    </div>
                    <div className="flex gap-1">
                      {c.estado !== "borrador" && c.estado !== "finalizada" && (
                        <Button size="icon" variant="ghost" onClick={() => toggleEstado(c.id, c.estado)}>
                          {c.estado === "activa" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => eliminar(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div><div className="font-bold">{c.impresiones.toLocaleString()}</div><div className="text-muted-foreground">Impr.</div></div>
                    <div><div className="font-bold">{c.clics.toLocaleString()}</div><div className="text-muted-foreground">Clics</div></div>
                    <div><div className="font-bold">${c.gasto.toFixed(0)}</div><div className="text-muted-foreground">Gasto</div></div>
                    <div><div className="font-bold text-primary">{c.roas}×</div><div className="text-muted-foreground">ROAS</div></div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    Presupuesto diario: <b className="text-foreground">${c.presupuesto_diario} {c.moneda}</b> · {c.paises.join(", ")}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <KeywordExplorer industria={user?.industria ?? "moda"} />
        </TabsContent>
      </Tabs>

      {wizardOpen && (
        <CampaignWizard
          posts={posts}
          industria={user?.industria ?? "moda"}
          userId={user!.id}
          initial={wizardInitial}
          onClose={() => { setWizardOpen(false); setWizardInitial(undefined); }}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function KeywordExplorer({ industria }: { industria: string }) {
  const [desc, setDesc] = useState("");
  const [kws, setKws] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  async function generar() {
    setLoading(true);
    const r = await generarKeywordsIA(industria, desc);
    setKws(r);
    setLoading(false);
    toast.success("Keywords generadas con IA");
  }
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Generador de keywords IA</h3>
        <p className="text-sm text-muted-foreground mt-1">Describe tu producto o servicio y te sugerimos keywords en español LATAM optimizadas para Google Ads.</p>
      </div>
      <Textarea rows={3} placeholder="Ej: vestidos de fiesta para mujer, envíos a todo México…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <Button onClick={generar} disabled={loading || !desc} className="gap-2">
        <Wand2 className="w-4 h-4" /> {loading ? "Generando…" : "Sugerir keywords"}
      </Button>
      {kws.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Sugerencias:</div>
          <div className="flex flex-wrap gap-2">
            {kws.map((k) => <Badge key={k} variant="secondary" className="text-sm py-1">{k}</Badge>)}
          </div>
          <p className="text-xs text-muted-foreground">💡 Tip: úsalas como concordancia amplia modificada para campañas de Búsqueda.</p>
        </div>
      )}
    </Card>
  );
}

function CampaignWizard({ posts, industria, userId, initial, onClose }: { posts: any[]; industria: string; userId: string; initial?: CampaignDraft; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    nombre: initial?.nombre ?? "",
    objetivo: "mensajes_whatsapp" as AdObjetivo,
    tipo: "performance_max" as AdTipo,
    presupuesto_diario: 200,
    paises: ["MX"],
    ciudades: "CDMX, Guadalajara, Monterrey",
    edad_min: 18,
    edad_max: 45,
    intereses: "moda, compras online",
    keywords: initial?.keywords ?? "",
    headline: initial?.headline ?? "",
    descripcion: "",
    cta: "Comprar ahora",
    post_id: "",
  });

  const update = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));

  async function autoCopy() {
    const p = posts.find((x) => x.id === data.post_id);
    const r = await generarCopyIA(data.objetivo, p?.copy?.slice(0, 30) ?? "tu producto");
    update("headline", r.headline);
    update("descripcion", r.descripcion);
    update("cta", r.cta);
    toast.success("Copy generado con IA");
  }
  async function autoKw() {
    const r = await generarKeywordsIA(industria, data.nombre || data.descripcion);
    update("keywords", r.join(", "));
    toast.success("Keywords sugeridas");
  }

  async function lanzar(estado: "activa" | "borrador") {
    if (!data.nombre) { toast.error("Ponle un nombre a la campaña"); return; }
    await createCampaign({
      user_id: userId,
      nombre: data.nombre,
      objetivo: data.objetivo,
      tipo: data.tipo,
      estado,
      presupuesto_diario: data.presupuesto_diario,
      moneda: "MXN",
      paises: data.paises,
      ciudades: data.ciudades.split(",").map((s) => s.trim()).filter(Boolean),
      edad_min: data.edad_min,
      edad_max: data.edad_max,
      intereses: data.intereses.split(",").map((s) => s.trim()).filter(Boolean),
      keywords: data.keywords.split(",").map((s) => s.trim()).filter(Boolean),
      headline: data.headline,
      descripcion: data.descripcion,
      cta: data.cta,
      post_id: data.post_id || undefined,
      fecha_inicio: new Date().toISOString(),
    });
    toast.success(estado === "activa" ? "🚀 Campaña lanzada" : "Borrador guardado");
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva campaña Google Ads — Paso {step} de 3</DialogTitle>
        </DialogHeader>
        <Progress value={(step / 3) * 100} className="mb-4" />

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nombre de la campaña</Label>
              <Input value={data.nombre} onChange={(e) => update("nombre", e.target.value)} placeholder="Ej: Promo Día de las Madres" />
            </div>
            <div>
              <Label className="mb-2 block">Objetivo</Label>
              <div className="grid gap-2">
                {(Object.keys(OBJETIVOS) as AdObjetivo[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => update("objetivo", o)}
                    className={`text-left p-3 rounded-lg border-2 transition ${data.objetivo === o ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="font-semibold text-sm">{OBJETIVOS[o].icon} {OBJETIVOS[o].label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{OBJETIVOS[o].desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de campaña</Label>
                <Select value={data.tipo} onValueChange={(v) => update("tipo", v as AdTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPOS) as AdTipo[]).map((t) => <SelectItem key={t} value={t}>{TIPOS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Presupuesto diario (MXN)</Label>
                <Input type="number" value={data.presupuesto_diario} onChange={(e) => update("presupuesto_diario", Number(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4" /> Audiencia</div>
            <div>
              <Label>País</Label>
              <Select value={data.paises[0]} onValueChange={(v) => update("paises", [v])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MX">🇲🇽 México</SelectItem>
                  <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="AR">🇦🇷 Argentina</SelectItem>
                  <SelectItem value="PE">🇵🇪 Perú</SelectItem>
                  <SelectItem value="CL">🇨🇱 Chile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ciudades (separadas por coma)</Label>
              <Input value={data.ciudades} onChange={(e) => update("ciudades", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Edad mínima</Label>
                <Input type="number" value={data.edad_min} onChange={(e) => update("edad_min", Number(e.target.value))} />
              </div>
              <div>
                <Label>Edad máxima</Label>
                <Input type="number" value={data.edad_max} onChange={(e) => update("edad_max", Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Intereses (separados por coma)</Label>
              <Input value={data.intereses} onChange={(e) => update("intereses", e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Keywords</Label>
                <Button size="sm" variant="outline" onClick={autoKw} className="h-7 gap-1 text-xs"><Sparkles className="w-3 h-3" /> Sugerir IA</Button>
              </div>
              <Textarea rows={2} value={data.keywords} onChange={(e) => update("keywords", e.target.value)} placeholder="vestido mujer, moda latina, envío gratis…" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Creativo</div>
            <div>
              <Label>Reutilizar post de la Biblioteca (opcional)</Label>
              <Select value={data.post_id} onValueChange={(v) => update("post_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sin post asociado" /></SelectTrigger>
                <SelectContent>
                  {posts.slice(0, 10).map((p) => <SelectItem key={p.id} value={p.id}>{p.copy.slice(0, 50)}…</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={autoCopy} className="gap-1 text-xs"><Wand2 className="w-3 h-3" /> Generar copy con IA</Button>
            </div>
            <div>
              <Label>Título (headline)</Label>
              <Input value={data.headline} onChange={(e) => update("headline", e.target.value)} maxLength={30} />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{data.headline.length}/30</div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea rows={3} value={data.descripcion} onChange={(e) => update("descripcion", e.target.value)} maxLength={90} />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{data.descripcion.length}/90</div>
            </div>
            <div>
              <Label>Call to action</Label>
              <Select value={data.cta} onValueChange={(v) => update("cta", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comprar ahora">Comprar ahora</SelectItem>
                  <SelectItem value="Escribir a WhatsApp">Escribir a WhatsApp</SelectItem>
                  <SelectItem value="Ver catálogo">Ver catálogo</SelectItem>
                  <SelectItem value="Conocer más">Conocer más</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="p-3 bg-muted/50">
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Vista previa</div>
              <div className="text-primary text-sm font-semibold">{data.headline || "Tu título aquí"}</div>
              <div className="text-xs text-muted-foreground mt-1">{data.descripcion || "Tu descripción aquí"}</div>
              <div className="mt-2"><Badge>{data.cta}</Badge></div>
            </Card>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step > 1 ? "Atrás" : "Cancelar"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => lanzar("borrador")}>Guardar borrador</Button>
              <Button onClick={() => lanzar("activa")} className="gap-1"><Megaphone className="w-4 h-4" /> Lanzar</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
