import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { setPublishDraft } from "@/lib/draft";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { generateBrainPlanServer } from "@/lib/api/brain.functions";
import {
  AREA_LABELS,
  formatMoney,
  type Area,
  type BrainAction,
  type ComparisonRow,
  type Deficit,
  type Diagnosis,
} from "@/lib/brain/diagnose";
import type { HookInsight } from "@/lib/mock/types";
import { analyzeHook } from "@/lib/brain/hooks";
import { NICHES, upcomingSeasons } from "@/lib/brain/niches";
import { buildFallbackPlan, type BrainReport } from "@/lib/brain/plan";
import { saveBrainReport, useBrainReports, useDiagnosis } from "@/lib/brain/useDiagnosis";

export const Route = createFileRoute("/_app/diagnostico")({ component: Diagnostico });

const SEVERIDAD_STYLE: Record<
  Deficit["severidad"],
  { border: string; badge: string; label: string }
> = {
  alta: {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
    label: "Urgente",
  },
  media: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Importante",
  },
  baja: {
    border: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Mejora",
  },
};

const CONFIANZA_LABEL: Record<Diagnosis["confianza"], string> = {
  real: "Basado en tus métricas reales",
  mixta: "Parte con métricas reales",
  estimada: "Basado en referencias de tu nicho",
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Sano";
  if (score >= 50) return "Con fugas";
  return "En riesgo";
}

function Diagnostico() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const diagnosis = useDiagnosis();
  const reports = useBrainReports();
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id));
  const [generating, setGenerating] = useState(false);

  const latest = reports[reports.length - 1];
  const previous = reports.length >= 2 ? reports[reports.length - 2] : undefined;

  function goTo(action: BrainAction) {
    if (action.draft) setPublishDraft(action.draft);
    navigate({ to: action.to });
  }

  function usarEnPublicador(gancho: string, idea: string, cta?: string) {
    setPublishDraft({ copy: cta ? `${gancho}\n\n${cta}` : gancho, idea, openIa: true });
    navigate({ to: "/publicar" });
    toast.success("Gancho cargado en el publicador");
  }

  async function generarPlan() {
    if (!diagnosis || !user) return;
    setGenerating(true);
    try {
      const token = getSessionToken();
      if (isProductionModeClient() && token) {
        const res = await generateBrainPlanServer({ data: { token, diagnosis } });
        if (res.ok) {
          saveBrainReport(res.report);
          toast.success(
            res.report.plan.fuente === "ia" ? "Tu plan con IA está listo" : "Tu plan está listo",
          );
          return;
        }
        if ("report" in res && res.report) saveBrainReport(res.report);
        if (!("useLocal" in res)) {
          toast.message(res.error);
          return;
        }
      }
      const report: BrainReport = {
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        score: diagnosis.score,
        diagnosis,
        plan: buildFallbackPlan(diagnosis, user, productos),
      };
      saveBrainReport(report);
      toast.success("Tu plan está listo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el plan");
    } finally {
      setGenerating(false);
    }
  }

  if (!diagnosis || !user) return null;

  const urgentes = diagnosis.deficits.filter((d) => d.severidad === "alta").length;
  const baseline = latest && latest.score !== diagnosis.score ? latest : previous;
  const delta = baseline ? diagnosis.score - baseline.score : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" /> Diagnóstico IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lo que le está costando ventas a {user.nombre_negocio || "tu negocio"} y qué hacer esta
            semana.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{diagnosis.nicho_label}</Badge>
            <Badge
              variant="outline"
              className={diagnosis.confianza === "real" ? "border-green-400 text-green-800" : ""}
            >
              {CONFIANZA_LABEL[diagnosis.confianza]}
            </Badge>
          </div>
        </div>
        <Button
          onClick={generarPlan}
          disabled={generating}
          className="gap-2 bg-gradient-primary border-0"
        >
          <Sparkles className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
          {generating
            ? "Analizando tu negocio…"
            : latest
              ? "Actualizar plan con IA"
              : "Generar mi plan con IA"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs uppercase text-muted-foreground">Salud de tu marketing</div>
          <div className="flex items-end gap-3 mt-2">
            <span className={`text-5xl font-bold ${scoreColor(diagnosis.score)}`}>
              {diagnosis.score}
            </span>
            <span className="text-muted-foreground mb-1">/ 100</span>
          </div>
          <div className="text-sm mt-1">
            <span className="font-semibold">{scoreLabel(diagnosis.score)}</span>
            {urgentes > 0 && (
              <span className="text-muted-foreground"> · {urgentes} problemas urgentes</span>
            )}
          </div>
          {delta != null && delta !== 0 && (
            <div className={`text-xs mt-2 ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} puntos desde tu plan anterior
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          {(Object.keys(AREA_LABELS) as Area[]).map((a) => (
            <div key={a}>
              <div className="flex justify-between text-xs mb-1">
                <span>{AREA_LABELS[a]}</span>
                <span className="text-muted-foreground">
                  {diagnosis.areas[a].sin_datos ? "sin datos" : diagnosis.areas[a].score}
                </span>
              </div>
              <Progress value={diagnosis.areas[a].score} className="h-2" />
            </div>
          ))}
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          {diagnosis.kpis.dinero_en_riesgo > 0 ? (
            <>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Ventas en riesgo
              </div>
              <div className="text-3xl font-bold text-red-500 mt-2">
                {formatMoney(diagnosis.kpis.dinero_en_riesgo)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor estimado de {diagnosis.kpis.sin_responder} clientes sin respuesta y{" "}
                {diagnosis.kpis.seguimientos_pendientes} sin seguimiento (ticket promedio{" "}
                {formatMoney(diagnosis.kpis.ticket_promedio)}).
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1"
                onClick={() => navigate({ to: "/whatsapp" })}
              >
                Recuperarlas ahora <ArrowRight className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <div className="text-xs uppercase text-muted-foreground">Últimos 30 días</div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                <Kpi
                  label="Publicaciones"
                  value={`${diagnosis.kpis.posts_30d} / ${diagnosis.kpis.objetivo_30d}`}
                />
                <Kpi label="Vistas" value={diagnosis.kpis.vistas_30d.toLocaleString("es-MX")} />
                <Kpi label="Conversaciones" value={diagnosis.kpis.leads_30d.toString()} />
                <Kpi label="Ingresos" value={formatMoney(diagnosis.kpis.ingresos_30d)} />
              </div>
            </>
          )}
        </Card>
      </div>

      <Tabs defaultValue="problemas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="problemas">Qué te frena ({diagnosis.deficits.length})</TabsTrigger>
          <TabsTrigger value="plan">Plan de la semana</TabsTrigger>
          <TabsTrigger value="ganchos">Ganchos de tu nicho</TabsTrigger>
          <TabsTrigger value="temporadas">Horarios y temporadas</TabsTrigger>
          <TabsTrigger value="nicho">Tu nicho</TabsTrigger>
        </TabsList>

        <TabsContent value="problemas" className="space-y-3 mt-4">
          {diagnosis.deficits.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No detectamos fugas importantes. Mantén la constancia y repite lo que mejor te
              funciona.
            </Card>
          )}
          {diagnosis.deficits.map((d) => (
            <DeficitCard key={d.id} deficit={d} onAction={goTo} />
          ))}
          {diagnosis.fortalezas.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Lo que ya te funciona
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {diagnosis.fortalezas.map((f) => (
                  <div key={f.titulo} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{f.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.evidencia}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-4 mt-4">
          {!latest ? (
            <Card className="p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                La IA toma tu diagnóstico, tu catálogo y lo que funciona en {diagnosis.nicho_label}{" "}
                para armarte un plan concreto: qué publicar cada día, con qué gancho y a qué hora.
              </p>
              <Button onClick={generarPlan} disabled={generating} className="gap-2">
                <Sparkles className="w-4 h-4" /> Generar mi plan
              </Button>
            </Card>
          ) : (
            <PlanView report={latest} onUse={usarEnPublicador} />
          )}
        </TabsContent>

        <TabsContent value="ganchos" className="space-y-4 mt-4">
          <GanchosView diagnosis={diagnosis} report={latest} onUse={usarEnPublicador} />
        </TabsContent>

        <TabsContent value="temporadas" className="space-y-4 mt-4">
          <TemporadasView diagnosis={diagnosis} onUse={usarEnPublicador} />
        </TabsContent>

        <TabsContent value="nicho" className="space-y-4 mt-4">
          <ComparativoView diagnosis={diagnosis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const POSICION_STYLE: Record<ComparisonRow["posicion"], { label: string; className: string }> = {
  arriba: { label: "Arriba del nicho", className: "bg-green-100 text-green-800 border-green-200" },
  medio: { label: "En el promedio", className: "bg-amber-100 text-amber-800 border-amber-200" },
  abajo: { label: "Debajo del nicho", className: "bg-red-100 text-red-800 border-red-200" },
};

function ComparativoView({ diagnosis }: { diagnosis: Diagnosis }) {
  const c = diagnosis.comparativo;
  if (!c || !c.suficiente) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Users className="w-8 h-8 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {c && c.negocios > 0
            ? `Ya hay ${c.negocios} negocio${c.negocios === 1 ? "" : "s"} de ${diagnosis.nicho_label} en PubliVende.`
            : `Aún estamos reuniendo datos de negocios de ${diagnosis.nicho_label}.`}{" "}
          Mostramos la comparativa cuando hay al menos 5, para que nadie pueda ser identificado.
        </p>
      </Card>
    );
  }
  const fmt = (n: number, unidad: string) => `${n.toLocaleString("es-MX")}${unidad}`;

  return (
    <>
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Cómo te comparas con tu nicho
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Comparado de forma anónima con {c.negocios} negocios de {diagnosis.nicho_label} en PubliVende.
          "Los mejores" es el 25% que mejor lo hace.
        </p>
        <div className="space-y-3">
          {c.filas.map((f) => {
            const style = POSICION_STYLE[f.posicion];
            const top = f.mejor_si === "mayor" ? f.p75 : f.p25;
            return (
              <div key={f.metrica} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  <Badge variant="outline" className={style.className}>
                    {style.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                  <div>
                    <div className="text-muted-foreground">Tú</div>
                    <div className="text-base font-bold">{fmt(f.tuyo, f.unidad)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Negocio típico</div>
                    <div className="text-base font-semibold">{fmt(f.p50, f.unidad)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Los mejores</div>
                    <div className="text-base font-semibold text-green-700">{fmt(top, f.unidad)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <HookInsightsCard insights={c.ganchos} nicho={diagnosis.nicho_label} />
    </>
  );
}

function HookInsightsCard({ insights, nicho }: { insights: HookInsight[]; nicho: string }) {
  if (!insights.length) return null;
  return (
    <Card className="p-5">
      <h3 className="font-semibold flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500" /> Qué ganchos funcionan en {nicho}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Medido con publicaciones reales de negocios de tu nicho, frente a su propio promedio.
      </p>
      <div className="space-y-2">
        {insights.map((g) => (
          <div key={g.rasgo} className="flex items-center justify-between gap-3 text-sm">
            <span>{g.label}</span>
            <span className={`font-semibold ${g.lift >= 0 ? "text-green-700" : "text-red-600"}`}>
              {g.lift >= 0 ? "+" : ""}
              {Math.round(g.lift * 100)}% interacción
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function DeficitCard({
  deficit: d,
  onAction,
}: {
  deficit: Deficit;
  onAction: (a: BrainAction) => void;
}) {
  const style = SEVERIDAD_STYLE[d.severidad];
  return (
    <Card className={`p-4 border-l-4 ${style.border}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={style.badge}>
          {style.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{AREA_LABELS[d.area]}</span>
        {d.dinero != null && d.dinero > 0 && (
          <Badge variant="outline" className="border-red-300 text-red-700">
            ~{formatMoney(d.dinero)} en riesgo
          </Badge>
        )}
      </div>
      <h3 className="font-semibold mt-2">{d.titulo}</h3>
      <p className="text-sm text-muted-foreground mt-1">{d.evidencia}</p>
      <p className="text-sm mt-2">
        <span className="font-medium">Por qué importa: </span>
        {d.impacto}
      </p>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-muted/60 p-3">
        <div className="text-sm flex-1">
          <span className="font-semibold text-primary">Qué hacer: </span>
          {d.accion}
        </div>
        {d.cta && (
          <Button size="sm" className="gap-1 shrink-0" onClick={() => onAction(d.cta!)}>
            {d.cta.label} <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function PlanView({
  report,
  onUse,
}: {
  report: BrainReport;
  onUse: (gancho: string, idea: string, cta?: string) => void;
}) {
  const { plan } = report;
  return (
    <>
      <Card className="p-5 bg-gradient-primary text-white border-0">
        <div className="flex items-center justify-between text-xs uppercase opacity-80 mb-1">
          <span>Resumen de tu estratega</span>
          <span>
            {plan.fuente === "ia" ? "Generado con IA" : "Generado por reglas"} ·{" "}
            {new Date(report.created_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <p className="text-base font-medium">{plan.resumen}</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {plan.prioridades.map((p, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-primary" /> Prioridad {i + 1}
            </div>
            <h3 className="font-semibold mt-1">{p.titulo}</h3>
            <p className="text-xs text-muted-foreground mt-1">{p.por_que}</p>
            <ul className="mt-2 space-y-1 text-sm list-disc pl-4">
              {p.pasos.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" /> Qué publicar esta semana
        </h3>
        <div className="space-y-2">
          {plan.semana.map((d, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border p-3"
            >
              <div className="md:w-36 shrink-0">
                <div className="font-semibold text-sm">{d.dia}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {d.hora}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-1">
                  <Badge variant="secondary">{d.red}</Badge>
                  <Badge variant="outline">{d.formato}</Badge>
                </div>
                <div className="text-sm font-medium">“{d.gancho}”</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.idea}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onUse(d.gancho, d.idea, d.cta)}
              >
                Crear post
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function GanchosView({
  diagnosis,
  report,
  onUse,
}: {
  diagnosis: Diagnosis;
  report?: BrainReport;
  onUse: (gancho: string, idea: string, cta?: string) => void;
}) {
  const niche = NICHES[diagnosis.nicho];
  const [prueba, setPrueba] = useState("");
  const analisis = useMemo(() => (prueba.trim() ? analyzeHook(prueba) : null), [prueba]);
  const ganchos =
    report?.plan.ganchos ??
    niche.hooks.map((h) => ({ texto: h.plantilla, formula: h.formula, por_que: h.por_que }));

  return (
    <>
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" /> Prueba tu gancho
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          Escribe la primera línea de tu próximo post y mira qué tan fuerte es.
        </p>
        <Textarea
          value={prueba}
          onChange={(e) => setPrueba(e.target.value)}
          placeholder="Ej. ¿Sigues buscando vestido para la boda? Mira esto antes de comprar"
          rows={2}
        />
        {analisis && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <Progress value={analisis.puntaje} className="h-2 flex-1" />
              <span className={`text-sm font-semibold ${scoreColor(analisis.puntaje)}`}>
                {analisis.puntaje}/100 ·{" "}
                {analisis.nivel === "fuerte"
                  ? "Fuerte"
                  : analisis.nivel === "regular"
                    ? "Regular"
                    : "Débil"}
              </span>
            </div>
            {analisis.consejos.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                {analisis.consejos.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {diagnosis.comparativo?.suficiente && (
        <HookInsightsCard insights={diagnosis.comparativo.ganchos} nicho={niche.label} />
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {report ? "Ganchos escritos para tu negocio" : `Fórmulas que funcionan en ${niche.label}`}
        </h3>
        {!report && (
          <p className="text-xs text-muted-foreground mb-3">
            Genera tu plan con IA para recibirlos ya escritos con tus productos.
          </p>
        )}
        <div className="grid gap-2 md:grid-cols-2 mt-2">
          {ganchos.map((g, i) => (
            <div key={i} className="rounded-lg border p-3 flex flex-col gap-2">
              <Badge variant="outline" className="w-fit">
                {g.formula}
              </Badge>
              <div className="text-sm font-medium">“{g.texto}”</div>
              <div className="text-xs text-muted-foreground flex-1">{g.por_que}</div>
              <Button
                size="sm"
                variant="ghost"
                className="w-fit gap-1 px-2"
                onClick={() => onUse(g.texto, `${g.formula}: ${g.texto}`, niche.cta_tipico)}
              >
                Usar <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {diagnosis.ganchos_propios.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Tus ganchos que mejor funcionaron
          </h3>
          <div className="space-y-2">
            {diagnosis.ganchos_propios.map((h) => (
              <div
                key={h.post_id}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate">“{h.gancho}”</div>
                  <div className="text-xs text-muted-foreground">
                    {h.vistas.toLocaleString("es-MX")} vistas · {h.leads} conversaciones
                    {h.engagement != null && ` · ${h.engagement}% interacción`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onUse(h.gancho, `Repetir gancho ganador: ${h.gancho}`, niche.cta_tipico)
                  }
                >
                  Repetir
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {diagnosis.ganchos_a_mejorar.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Primeras líneas que conviene
            reescribir
          </h3>
          <div className="space-y-2">
            {diagnosis.ganchos_a_mejorar.map((h) => (
              <div key={h.post_id} className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground line-through decoration-red-400/60">
                  “{h.gancho}”
                </div>
                <div className="text-xs mt-1">{analyzeHook(h.gancho).consejos[0]}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function TemporadasView({
  diagnosis,
  onUse,
}: {
  diagnosis: Diagnosis;
  onUse: (gancho: string, idea: string, cta?: string) => void;
}) {
  const niche = NICHES[diagnosis.nicho];
  const temporadas = upcomingSeasons(diagnosis.nicho);
  const propios = diagnosis.mejores_horarios[0]?.fuente === "tus_datos";

  return (
    <>
      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Mejores horarios para publicar
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {propios
            ? "Calculados con las vistas y conversaciones de tus propias publicaciones."
            : `Referencia general para ${niche.label}. Se ajustarán a tu audiencia cuando tengas más publicaciones medidas.`}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {diagnosis.mejores_horarios.map((h, i) => (
            <div key={i} className="rounded-lg bg-muted p-3 text-sm">
              <div className="font-semibold">{h.dia}</div>
              <div className="text-muted-foreground">{h.hora}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" /> Fechas que vienen para tu negocio
        </h3>
        {temporadas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay fechas comerciales clave para tu nicho en las próximas semanas.
          </p>
        )}
        <div className="space-y-2">
          {temporadas.map((t) => {
            const dias = Math.ceil((t.fecha.getTime() - Date.now()) / 86400000);
            const empezar = dias <= t.preparar_dias;
            return (
              <div
                key={t.nombre}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{t.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · en{" "}
                      {Math.max(0, dias)} días
                    </span>
                    {empezar && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        Empieza a publicar ya
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.angulo}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() =>
                    onUse(
                      `${t.nombre} se acerca 👀`,
                      `Campaña de ${t.nombre}: ${t.angulo}`,
                      niche.cta_tipico,
                    )
                  }
                >
                  Preparar post
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Pilares de contenido para {niche.label}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {niche.pilares.map((p) => (
            <div
              key={p}
              className="rounded-lg border p-3 text-sm flex items-center justify-between gap-2"
            >
              <span>{p}</span>
              <Button size="sm" variant="ghost" onClick={() => onUse(p, p, niche.cta_tipico)}>
                Usar
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
