import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { FileDown, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, ArrowRight, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import {
  getResultadosServer,
  listMyPublishedPostsServer,
} from "@/lib/api/metrics.functions";
import type { ResultadosPaquete } from "@/server/metrics/resultados";
import { RED_LABELS } from "@/lib/redes";
import { MetricsSyncPanel } from "@/components/metrics/MetricsSyncPanel";

export const Route = createFileRoute("/_app/resultados")({ component: Resultados });

const fmt = (n: number | null | undefined) => (n == null ? "No disponible" : n.toLocaleString("es-MX"));
const money = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** Variación % contra el periodo anterior; null si no hay comparable. */
function deltaPct(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null || anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

function Kpi({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number | null }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {delta != null && (
        <div className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {delta >= 0 ? "+" : ""}{delta.toFixed(0)}% vs periodo anterior
        </div>
      )}
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

function Resultados() {
  const { user } = useAuth();
  const [dias, setDias] = useState(30);
  const [postId, setPostId] = useState<string>("todos");
  const [postsFiltro, setPostsFiltro] = useState<Array<{ id: string; copy: string }>>([]);
  const [paquete, setPaquete] = useState<ResultadosPaquete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [metricaGrafica, setMetricaGrafica] = useState<"vistas_totales" | "seguidores">("vistas_totales");
  const [orden, setOrden] = useState<{ clave: string; dir: 1 | -1 }>({ clave: "vistas", dir: -1 });

  const cargar = useCallback(async () => {
    const token = getSessionToken();
    if (!isProductionModeClient() || !token) {
      setError("Métricas muestra datos reales de tu difusión: requiere modo producción.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await getResultadosServer({
        data: { token, dias, postId: postId === "todos" ? undefined : postId },
      });
      if (res.ok) setPaquete(res.paquete);
      else setError(res.error);
      const lista = await listMyPublishedPostsServer({ data: { token } });
      if (lista.ok) setPostsFiltro(lista.posts);
    } catch {
      setError("No se pudieron cargar los resultados. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [dias, postId]);

  useEffect(() => { void cargar(); }, [cargar]);

  function descargarCsv() {
    if (!paquete) return;
    const filas: Array<Array<string | number>> = [
      ["Publicación", "Fecha", "Nicho", "Vistas", "Alcance", "Me gusta", "Comentarios", "Compartidos", "Interacciones", "Clics", "Conversaciones", "Ventas", "Ingresos MXN"],
      ...paquete.por_post.map((p) => [
        p.copy,
        p.fecha_publicacion ? new Date(p.fecha_publicacion).toLocaleDateString("es-MX") : "",
        p.nicho_label ?? "",
        p.vistas,
        p.alcance ?? "",
        p.likes,
        p.comentarios,
        p.compartidos,
        p.interacciones,
        p.clics ?? "",
        p.leads,
        p.ventas,
        p.ingresos,
      ]),
    ];
    const csv = "\uFEFF" + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "metricas-publivende.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Tabla de métricas descargada (CSV)");
  }

  async function descargarPdf() {
    const token = getSessionToken();
    if (!token) return toast.error("Sesión inválida");
    setDescargando(true);
    try {
      const qs = new URLSearchParams({ dias: String(dias) });
      if (postId !== "todos") qs.set("postId", postId);
      const res = await fetch(`/api/reporte-pdf?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "reporte-general-publivende.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Reporte general descargado");
    } catch {
      toast.error("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  if (!user) return null;

  const chartRedes = paquete?.por_red.map((r) => ({
    red: RED_LABELS[r.red],
    vistas: r.vistas,
    interacciones: r.interacciones,
  }));

  const porPostOrdenado = useMemo(() => {
    if (!paquete) return [];
    const arr = [...paquete.por_post];
    arr.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[orden.clave];
      const vb = (b as unknown as Record<string, unknown>)[orden.clave];
      const na = typeof va === "number" ? va : -1;
      const nb = typeof vb === "number" ? vb : -1;
      return (na - nb) * orden.dir;
    });
    return arr;
  }, [paquete, orden]);

  const thOrden = (clave: string, label: string) => (
    <th className="py-2 pr-3">
      <button
        type="button"
        onClick={() => setOrden((o) => ({ clave, dir: o.clave === clave ? (o.dir === 1 ? -1 : 1) : -1 }))}
        className="inline-flex items-center gap-1 hover:text-slate-800 uppercase"
      >
        {label}
        {orden.clave === clave ? (
          orden.dir === -1 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Métricas</h1>
          <p className="text-sm text-slate-500 mt-1">
            El rendimiento de tu difusión, medido desde las APIs oficiales de las redes de la Red PubliVende. Lo que una red no entrega se muestra como «No disponible».
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={descargarCsv} disabled={!paquete} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Descargar tabla (CSV)
          </Button>
          <Button onClick={descargarPdf} disabled={descargando || !paquete} className="gap-2">
            {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Descargar reporte general (PDF)
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={String(dias)} onValueChange={(v) => setDias(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        <Select value={postId} onValueChange={setPostId}>
          <SelectTrigger className="w-72 max-w-full"><SelectValue placeholder="Todas las publicaciones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las publicaciones (campaña = periodo)</SelectItem>
            {postsFiltro.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.copy}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {paquete?.frescura.metricas_at && (
          <span className="text-xs text-slate-500">
            Métricas actualizadas: {new Date(paquete.frescura.metricas_at).toLocaleString("es-MX")}
          </span>
        )}
      </div>

      <MetricsSyncPanel />

      {cargando && (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando métricas reales…
        </div>
      )}
      {error && (
        <Card className="p-5 border-amber-300 bg-amber-50 text-amber-900 flex gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </Card>
      )}

      {paquete && !cargando && (
        <>
          {!paquete.anterior && postId === "todos" && (
            <p className="text-xs text-slate-500">
              Sin comparación todavía: no hay publicaciones del periodo anterior para contrastar. La variación % contra el periodo anterior aparecerá en cuanto exista.
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Vistas" value={fmt(paquete.totales.vistas)} sub={`${paquete.totales.posts} publicaciones medidas`} delta={deltaPct(paquete.totales.vistas, paquete.anterior?.vistas)} />
            <Kpi label="Alcance" value={fmt(paquete.totales.alcance)} sub="Personas únicas alcanzadas" delta={deltaPct(paquete.totales.alcance, paquete.anterior?.alcance)} />
            <Kpi label="Interacciones" value={fmt(paquete.totales.interacciones)} sub={`${fmt(paquete.totales.likes)} me gusta · ${fmt(paquete.totales.comentarios)} comentarios · ${fmt(paquete.totales.compartidos)} compartidos`} delta={deltaPct(paquete.totales.interacciones, paquete.anterior?.interacciones)} />
            <Kpi label="Clics medidos" value={fmt(paquete.totales.clics)} sub="Enlaces /p/ y clics reportados por las redes" delta={deltaPct(paquete.totales.clics, paquete.anterior?.clics)} />
            <Kpi label="Conversaciones atribuidas" value={fmt(paquete.totales.leads)} sub="Leads de WhatsApp con post de origen" delta={deltaPct(paquete.totales.leads, paquete.anterior?.leads)} />
            <Kpi label="Ventas cerradas" value={fmt(paquete.totales.ventas_cerradas)} sub={money(paquete.totales.ingresos)} delta={deltaPct(paquete.totales.ventas_cerradas, paquete.anterior?.ventas_cerradas)} />
            <Kpi label="Seguidores" value={fmt(paquete.totales.seguidores)} sub="Suma de tus redes conectadas" />
            <Kpi label="Distribuciones" value={fmt(paquete.por_post.reduce((s, p) => s + p.distribuciones, 0))} sub="Salidas por la Red PubliVende" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="font-semibold mb-3">Por red</h2>
              <div className="space-y-3">
                {paquete.por_red.map((r) => (
                  <div key={r.red} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {RED_LABELS[r.red]}
                        {r.conectada
                          ? <Badge variant="outline" className="text-[10px] border-green-400 text-green-800 bg-green-50">Conectada</Badge>
                          : <Badge variant="outline" className="text-[10px] border-red-300 text-red-700 bg-red-50">Sin conectar</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        Vistas {fmt(r.vistas)} · Alcance {fmt(r.alcance)} · Interacciones {fmt(r.interacciones)} · Seguidores {fmt(r.seguidores)}
                      </div>
                      {r.error && <div className="text-xs text-amber-700">{r.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {chartRedes && (
                <div className="h-48 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRedes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="red" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="vistas" fill="#7c3aed" name="Vistas" />
                      <Bar dataKey="interacciones" fill="#059669" name="Interacciones" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-3">Evolución de la cuenta</h2>
              <div className="flex gap-1.5 mb-3">
                {(
                  [
                    { id: "vistas_totales", label: "Vistas por día" },
                    { id: "seguidores", label: "Seguidores" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetricaGrafica(m.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${metricaGrafica === m.id ? "bg-primary text-white border-primary" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {paquete.evolucion.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={paquete.evolucion}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey={metricaGrafica} stroke={metricaGrafica === "seguidores" ? "#059669" : "#7c3aed"} name={metricaGrafica === "seguidores" ? "Seguidores" : "Vistas del día"} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Aún no hay suficientes fotos diarias para la gráfica. La evolución aparece conforme el sincronizador guarda el historial de tu cuenta.
                </p>
              )}

              <h3 className="font-semibold mt-5 mb-2">Contra tu nicho</h3>
              {!paquete.benchmark && (
                <p className="text-sm text-slate-500">Sin comparativa todavía: se activa cuando tu nicho tenga negocios midiendo.</p>
              )}
              {paquete.benchmark && !paquete.benchmark.muestra_suficiente && (
                <p className="text-sm text-slate-500">
                  Nicho «{paquete.benchmark.nicho}»: van {paquete.benchmark.negocios} negocios en la muestra; la comparativa se publica cuando haya suficientes para no exponer a nadie.
                </p>
              )}
              {paquete.benchmark?.muestra_suficiente && (
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-500">Nicho «{paquete.benchmark.nicho}» · {paquete.benchmark.negocios} negocios</p>
                  {paquete.benchmark.comparaciones.map((c) => (
                    <div key={c.metrica} className="flex justify-between border-b border-slate-100 py-1">
                      <span>{c.etiqueta}</span>
                      <span className="font-medium">Tú {c.tu_valor} · Mediana {c.p50}</span>
                    </div>
                  ))}
                  {paquete.benchmark.comparaciones.length === 0 && (
                    <p className="text-slate-500">Sin métricas comparables todavía.</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Lo que falta por hacer</h2>
            {paquete.pendientes.length === 0 ? (
              <p className="text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Todo conectado y midiendo. Sigue publicando.
              </p>
            ) : (
              <div className="space-y-2">
                {paquete.pendientes.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3">
                    <div className="flex items-start gap-2 text-sm min-w-0">
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${p.nivel === "alta" ? "text-red-600" : p.nivel === "media" ? "text-amber-600" : "text-slate-400"}`} />
                      <span>{p.texto}</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="gap-1 shrink-0">
                      <Link to={p.accion_to as "/"}>{p.accion_label} <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 overflow-x-auto">
            <h2 className="font-semibold mb-3">Por publicación</h2>
            {paquete.por_post.length === 0 ? (
              <p className="text-sm text-slate-500">Sin publicaciones medidas en este periodo.</p>
            ) : (
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                    <th className="py-2 pr-3">Publicación</th>
                    {thOrden("vistas", "Vistas")}
                    {thOrden("alcance", "Alcance")}
                    {thOrden("likes", "Me gusta")}
                    {thOrden("comentarios", "Comentarios")}
                    {thOrden("compartidos", "Compartidos")}
                    {thOrden("interacciones", "Interacc.")}
                    {thOrden("clics", "Clics")}
                    {thOrden("leads", "Convers.")}
                    {thOrden("ventas", "Ventas")}
                    {thOrden("ingresos", "Ingresos")}
                  </tr>
                </thead>
                <tbody>
                  {porPostOrdenado.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 max-w-[280px]">
                        <div className="line-clamp-2">{p.copy}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.fecha_publicacion ? new Date(p.fecha_publicacion).toLocaleDateString("es-MX") : ""}
                          {p.nicho_label ? ` · ${p.nicho_label}` : ""} · /p/{p.tracking_slug}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium">{fmt(p.vistas)}</td>
                      <td className="py-2 pr-3">{fmt(p.alcance)}</td>
                      <td className="py-2 pr-3">{fmt(p.likes)}</td>
                      <td className="py-2 pr-3">{fmt(p.comentarios)}</td>
                      <td className="py-2 pr-3">{fmt(p.compartidos)}</td>
                      <td className="py-2 pr-3">{fmt(p.interacciones)}</td>
                      <td className="py-2 pr-3">{fmt(p.clics)}</td>
                      <td className="py-2 pr-3">{fmt(p.leads)}</td>
                      <td className="py-2 pr-3">{fmt(p.ventas)}</td>
                      <td className="py-2">{money(p.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
