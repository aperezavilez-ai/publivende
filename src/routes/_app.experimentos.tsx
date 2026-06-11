import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, FlaskConical, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ABExperiment, Post, PostMetric } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/experimentos")({
  ssr: false,
  component: Experimentos,
});

function Experimentos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { experiments, posts, metrics } = useDB((db) => ({
    experiments: (db.ab_experiments ?? []).filter((e) => e.user_id === user?.id),
    posts: db.posts,
    metrics: db.post_metrics,
  }));

  const sorted = useMemo(
    () => [...experiments].sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio)),
    [experiments],
  );

  function calcMetric(postId: string, metric: ABExperiment["metric"], allMetrics: PostMetric[]) {
    const m = allMetrics.filter((x) => x.post_id === postId);
    if (metric === "engagement") {
      const v = m.reduce((s, x) => s + x.vistas, 0) || 1;
      const eng = m.reduce((s, x) => s + x.likes + x.comentarios + x.compartidos, 0);
      return Math.round((eng / v) * 10000) / 100;
    }
    return m.reduce((s, x) => s + (x[metric] as number), 0);
  }

  function declararGanador(expId: string) {
    const db = loadDB();
    const e = (db.ab_experiments ?? []).find((x) => x.id === expId);
    if (!e) return;
    const a = calcMetric(e.variante_a_post_id, e.metric, db.post_metrics);
    const b = calcMetric(e.variante_b_post_id, e.metric, db.post_metrics);
    e.ganador = a > b ? "A" : b > a ? "B" : "empate";
    e.estado = "finalizado";
    saveDB(db);
    toast.success(`Ganador: variante ${e.ganador}`);
  }

  function tiempoRestante(fin: string) {
    const ms = +new Date(fin) - Date.now();
    if (ms <= 0) return "Listo para declarar ganador";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m restantes`;
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">A/B testing de contenido</h1>
          <p className="text-sm text-muted-foreground">Publica dos variantes y deja que los datos decidan al ganador en 24 horas.</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center">
          <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Aún no tienes experimentos. Crea uno desde la pantalla de publicar activando &quot;Modo A/B&quot;.</p>
          <Button onClick={() => navigate({ to: "/publicar" })}>Crear publicación A/B</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((e) => (
            <ExperimentCard
              key={e.id}
              experiment={e}
              posts={posts}
              metrics={metrics}
              calcMetric={calcMetric}
              tiempoRestante={tiempoRestante}
              onDeclararGanador={declararGanador}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentCard({
  experiment: e,
  posts,
  metrics,
  calcMetric,
  tiempoRestante,
  onDeclararGanador,
}: {
  experiment: ABExperiment;
  posts: Post[];
  metrics: PostMetric[];
  calcMetric: (postId: string, metric: ABExperiment["metric"], allMetrics: PostMetric[]) => number;
  tiempoRestante: (fin: string) => string;
  onDeclararGanador: (id: string) => void;
}) {
  const pa = posts.find((p) => p.id === e.variante_a_post_id);
  const pb = posts.find((p) => p.id === e.variante_b_post_id);
  const va = calcMetric(e.variante_a_post_id, e.metric, metrics);
  const vb = calcMetric(e.variante_b_post_id, e.metric, metrics);
  const total = va + vb || 1;
  const pctA = Math.round((va / total) * 100);
  const pctB = 100 - pctA;
  const finalizado = e.estado === "finalizado";
  const puedeFinalizar = !finalizado && Date.now() >= +new Date(e.fin_estimado);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold">{e.nombre}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Clock className="w-3 h-3" />
            {finalizado ? "Finalizado" : tiempoRestante(e.fin_estimado)} · Métrica: {e.metric}
          </div>
        </div>
        {finalizado && e.ganador && e.ganador !== "empate" && (
          <Badge className="gap-1 bg-amber-500"><Trophy className="w-3 h-3" />Ganó {e.ganador}</Badge>
        )}
        {finalizado && e.ganador === "empate" && <Badge variant="secondary">Empate</Badge>}
        {puedeFinalizar && <Button size="sm" onClick={() => onDeclararGanador(e.id)}>Declarar ganador</Button>}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {[{ key: "A" as const, p: pa, v: va, pct: pctA }, { key: "B" as const, p: pb, v: vb, pct: pctB }].map((side) => (
          <div key={side.key} className={`p-3 rounded-lg border-2 ${finalizado && e.ganador === side.key ? "border-amber-500 bg-amber-50" : "border-border"}`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Variante {side.key}</span>
              <span>{side.v} {e.metric === "engagement" ? "%" : ""}</span>
            </div>
            {side.p && (
              <div className="flex gap-2">
                <img src={side.p.media_url} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                <p className="text-xs line-clamp-3 text-muted-foreground">{side.p.copy}</p>
              </div>
            )}
            <div className="mt-2 h-2 bg-muted rounded overflow-hidden">
              <div className={`h-full ${finalizado && e.ganador === side.key ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${side.pct}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{side.pct}% del total</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
