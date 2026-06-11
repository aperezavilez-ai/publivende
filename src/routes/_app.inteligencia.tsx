import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Target, TrendingUp, Sparkles, ArrowRight, Globe, Lightbulb } from "lucide-react";
import { analizarCompetidor, COMPETIDORES_SUGERIDOS, type CompetitorSnapshot } from "@/services/competitive/mock";
import { setPublishDraft, setCampaignDraft } from "@/lib/draft";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inteligencia")({ component: Inteligencia });

function Inteligencia() {
  const navigate = useNavigate();
  const [dominio, setDominio] = useState("moda-latina.mx");
  const [snap, setSnap] = useState<CompetitorSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function analizar(d?: string) {
    const target = (d ?? dominio).trim();
    if (!target) return toast.error("Pon un dominio");
    setDominio(target);
    setLoading(true);
    const r = await analizarCompetidor(target);
    setSnap(r);
    setLoading(false);
    toast.success(`Análisis listo para ${target}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Target className="w-7 h-7 text-primary" /> Inteligencia Competitiva
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Espía qué keywords paga tu competencia y qué posts les funcionan</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="competidor.com" onKeyDown={(e) => e.key === "Enter" && analizar()} />
          <Button onClick={() => analizar()} disabled={loading} className="gap-2"><Search className="w-4 h-4" /> {loading ? "Analizando…" : "Analizar"}</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span className="text-muted-foreground">Prueba con:</span>
          {COMPETIDORES_SUGERIDOS.map((d) => (
            <button key={d} onClick={() => analizar(d)} className="text-primary hover:underline">{d}</button>
          ))}
        </div>
      </Card>

      {snap && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Authority Score" value={snap.authority.toString()} highlight={snap.authority >= 50} />
            <Kpi label="Tráfico mensual" value={snap.trafico_mensual.toLocaleString()} />
            <Kpi label="Keywords orgánico" value={snap.keywords_organico.toLocaleString()} />
            <Kpi label="Keywords Ads pagadas" value={snap.keywords_ads.toLocaleString()} />
          </div>

          <Tabs defaultValue="keywords">
            <TabsList>
              <TabsTrigger value="keywords">Top keywords</TabsTrigger>
              <TabsTrigger value="posts">Top posts</TabsTrigger>
              <TabsTrigger value="gap">Oportunidades (Gap)</TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="mt-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Por qué keywords aparece {snap.dominio}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2">Keyword</th><th>Posición</th><th>Volumen/mes</th><th>CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.top_keywords.map((k) => (
                      <tr key={k.kw} className="border-b last:border-0">
                        <td className="py-2 font-medium">{k.kw}</td>
                        <td><Badge variant={k.pos <= 3 ? "default" : "secondary"}>#{k.pos}</Badge></td>
                        <td className="text-muted-foreground">{k.volumen.toLocaleString()}</td>
                        <td className="text-muted-foreground">${k.cpc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="posts" className="mt-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Posts más virales de {snap.ig_handle}</h3>
                <div className="space-y-2">
                  {snap.top_posts.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded border">
                      <Badge variant="outline" className="capitalize">{p.red}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.copy}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.vistas.toLocaleString()} vistas · {p.engagement}% engagement
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => {
                        setPublishDraft({
                          copy: `💡 Inspirado en @${snap.ig_handle}: ${p.copy}`,
                          idea: p.copy,
                          openIa: true,
                        });
                        navigate({ to: "/publicar" });
                        toast.success("Post cargado para inspirarte");
                      }}><Sparkles className="w-3 h-3" /> Inspirarme</Button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="gap" className="mt-4">
              <Card className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Keywords donde tu competencia rankea y tú no</h3>
                    <p className="text-xs text-muted-foreground">Crea contenido o lanza campañas Google Ads para capturar este tráfico.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {snap.gap_keywords.map((g) => (
                    <div key={g.kw} className="flex items-center justify-between p-3 rounded border hover:bg-muted">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{g.kw}</p>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {g.volumen.toLocaleString()} búsquedas/mes · Dificultad {g.dificultad}/100
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => {
                        setCampaignDraft({
                          keywords: g.kw,
                          headline: g.kw.slice(0, 30),
                          nombre: `Campaña ${g.kw}`,
                          openWizard: true,
                        });
                        navigate({ to: "/anuncios" });
                        toast.success("Abriendo wizard con keyword precargada");
                      }}>
                        Crear campaña <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-4 bg-primary/5 border-primary/30">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <b>Quieres datos reales y monitoreo continuo?</b>
                <p className="text-muted-foreground mt-1">En la Fase 2 conectaremos <b>Semrush</b> (incluido como integración) para tracking diario de tu posición vs competidores, alertas automáticas y reportes históricos.</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Card>
  );
}
