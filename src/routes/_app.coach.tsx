import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Sparkles, Calendar, Clock, RefreshCw, MapPin } from "lucide-react";
import { generarPlanSemanal, HEATMAP_LATAM, type PlanSemanal } from "@/services/coach/mock";
import { setPublishDraft } from "@/lib/draft";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/coach")({ component: Coach });

const FRANJAS = ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const COLOR_MAP: Record<"win" | "warning" | "tip" | "idea", string> = {
  win: "border-l-green-500 bg-green-50 dark:bg-green-950/20",
  warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
  tip: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  idea: "border-l-primary bg-primary/5",
};

function Coach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const metrics = useDB((db) => db.post_metrics);
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const campaigns = useDB((db) => db.ad_campaigns.filter((c) => c.user_id === user?.id));
  const adMetrics = useDB((db) => db.ad_metrics);

  const [plan, setPlan] = useState<PlanSemanal | null>(null);
  const [loading, setLoading] = useState(true);
  const [ciudad, setCiudad] = useState("CDMX");

  async function cargar() {
    setLoading(true);
    const p = await generarPlanSemanal(posts, metrics, contacts, campaigns, adMetrics);
    setPlan(p);
    setLoading(false);
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" /> Coach IA Semanal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tu mentor de crecimiento personalizado, cada lunes con un plan accionable</p>
        </div>
        <Button onClick={() => { cargar(); toast.success("Plan actualizado"); }} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Regenerar
        </Button>
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan de la semana</TabsTrigger>
          <TabsTrigger value="ideas">Ideas de contenido</TabsTrigger>
          <TabsTrigger value="horarios">Horarios óptimos LATAM</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4 mt-4">
          {loading || !plan ? (
            <Card className="p-12 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground mt-3">Analizando tu semana…</p>
            </Card>
          ) : (
            <>
              <Card className="p-5 bg-gradient-primary text-white border-0">
                <div className="text-xs uppercase opacity-80 mb-1">Resumen semanal</div>
                <p className="text-base font-medium">{plan.resumen}</p>
              </Card>
              <div className="space-y-3">
                {plan.insights.map((ins, i) => (
                  <Card key={i} className={`p-4 border-l-4 ${COLOR_MAP[ins.tipo]}`}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{ins.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{ins.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{ins.detalle}</p>
                        <div className="mt-2 p-2 bg-card rounded border text-sm">
                          <span className="font-semibold text-primary">→ Acción: </span>{ins.accion}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="ideas" className="mt-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> 5 ideas frescas para esta semana</h3>
            <div className="space-y-2">
              {plan?.ideas_contenido.map((idea, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted">
                  <Badge variant="outline">#{i + 1}</Badge>
                  <span className="text-sm flex-1">{idea}</span>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setPublishDraft({ copy: idea, idea });
                    navigate({ to: "/publicar" });
                    toast.success("Idea cargada en el publicador");
                  }}>Usar →</Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 mt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Programa sugerido</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {plan?.horarios_optimos.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><span className="font-semibold text-sm">{h.dia}</span></div>
                  <Badge>{h.hora}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="horarios" className="mt-4 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Heatmap de conversión por ciudad LATAM</h3>
              <div className="flex gap-1 flex-wrap">
                {Object.keys(HEATMAP_LATAM).map((c) => (
                  <Button key={c} size="sm" variant={ciudad === c ? "default" : "outline"} onClick={() => setCiudad(c)}>{c}</Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Cuanto más oscuro, mayor % de leads que se convierten en venta cuando publicas en esa franja.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr><th className="text-left p-2 w-12"></th>{FRANJAS.map((f) => <th key={f} className="p-2 text-center font-normal">{f}</th>)}</tr>
                </thead>
                <tbody>
                  {DIAS.map((d, di) => (
                    <tr key={d}>
                      <td className="p-2 font-semibold">{d}</td>
                      {HEATMAP_LATAM[ciudad][di].map((v, fi) => (
                        <td key={fi} className="p-1">
                          <div className="rounded text-center text-[10px] py-2 font-semibold"
                            style={{ background: `hsl(262 83% ${100 - v * 0.55}% / ${0.15 + v / 130})`, color: v > 60 ? "white" : undefined }}>
                            {v}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 rounded bg-primary/5 text-sm">
              <b>💡 Mejor franja en {ciudad}:</b> los <b>viernes a las 9 PM</b> con hasta 95% de conversión. Programa ahí tus lanzamientos.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
