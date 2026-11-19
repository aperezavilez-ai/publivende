import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Globe, ArrowRight, CheckCircle2, MessageCircle, TrendingUp, Zap,
  Loader2, Bot, Play, Pause, FileDown, PlusSquare, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { useDiagnosis, useBrainReports, saveBrainReport } from "@/lib/brain/useDiagnosis";
import { generateBrainPlanServer } from "@/lib/api/brain.functions";
import {
  getAutopilotServer,
  saveAutopilotSettingsServer,
  generateAutopilotServer,
  approveAllAutopilotServer,
} from "@/lib/api/autopilot.functions";
import { RED_LABELS, REDES_ORDEN } from "@/lib/redes";
import type { Red } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/dashboard")({ component: Inicio });

const OBJECTIVES = [
  { id: "ventas", label: "Ventas WhatsApp", icon: MessageCircle },
  { id: "alcance", label: "Crecimiento & Alcance", icon: TrendingUp },
  { id: "leads", label: "Captación de Leads", icon: Zap },
  { id: "branding", label: "Posicionamiento", icon: Sparkles },
] as const;

type AutopilotState = Awaited<ReturnType<typeof getAutopilotServer>>;

function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessUrl, setBusinessUrl] = useState("");
  const [objective, setObjective] = useState<(typeof OBJECTIVES)[number]["id"]>("ventas");

  const accounts = useDB((db) => db.social_accounts.filter((a) => a.user_id === user?.id));
  const diagnosis = useDiagnosis();
  const reports = useBrainReports();
  const latestReport = reports[reports.length - 1];
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const [autopilot, setAutopilot] = useState<AutopilotState | null>(null);
  const [autopilotBusy, setAutopilotBusy] = useState(false);

  const token = getSessionToken();
  const produccion = isProductionModeClient() && !!token;

  useEffect(() => {
    if (!produccion || !token) return;
    getAutopilotServer({ data: { token } }).then(setAutopilot).catch(() => setAutopilot(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produccion]);

  if (!user) return null;

  const estadoRed = (red: Red) => {
    const acc = accounts.find((a) => a.red === red);
    return {
      conectada: acc?.estado_conexion === "conectada",
      nombre: acc?.nombre_cuenta ?? null,
    };
  };
  const redesConectadas = REDES_ORDEN.filter((r) => estadoRed(r).conectada).length;

  function coordinar() {
    const url = businessUrl.trim();
    if (!url) return toast.error("Pega el enlace de tu tienda, web o perfil social");
    // El flujo real vive en Publicar: ahí se lee el link, la IA investiga el
    // nicho y redacta los copys por red. Nada se simula en esta pantalla.
    navigate({ to: "/publicar", search: { link: url } });
  }

  async function generarPlan() {
    if (!diagnosis) return;
    setGeneratingPlan(true);
    try {
      if (produccion && token) {
        const res = await generateBrainPlanServer({ data: { token, diagnosis } });
        if (res.ok) {
          saveBrainReport(res.report);
          toast.success(res.report.plan.fuente === "ia" ? "Tu plan con IA está listo" : "Tu plan está listo");
          return;
        }
        if ("report" in res && res.report) {
          saveBrainReport(res.report);
          toast.message(res.error);
          return;
        }
        if (!("useLocal" in res)) {
          toast.error(res.error);
          return;
        }
      }
      toast.message("El plan con IA requiere modo producción", {
        description: "El diagnóstico por reglas de abajo ya refleja tus datos locales.",
      });
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function autopilotToggle() {
    if (!token || !autopilot?.ok) return;
    setAutopilotBusy(true);
    try {
      const s = autopilot.settings;
      const res = await saveAutopilotSettingsServer({
        data: {
          token,
          activo: !s.activo,
          modo: s.modo,
          posts_semana: s.posts_semana,
          redes: s.redes,
        },
      });
      if (res.ok) {
        setAutopilot({ ...autopilot, settings: res.settings });
        toast.success(res.settings.activo ? "Piloto automático activado" : "Piloto automático en pausa");
      } else toast.error(res.error);
    } finally {
      setAutopilotBusy(false);
    }
  }

  async function autopilotGenerar() {
    if (!token) return;
    setAutopilotBusy(true);
    try {
      const res = await generateAutopilotServer({ data: { token } });
      if (res.ok) {
        toast.success("Semana generada: revisa y aprueba los posts");
        const fresh = await getAutopilotServer({ data: { token } });
        setAutopilot(fresh);
      } else toast.error(res.error);
    } finally {
      setAutopilotBusy(false);
    }
  }

  async function autopilotAprobarTodo() {
    if (!token) return;
    setAutopilotBusy(true);
    try {
      const res = await approveAllAutopilotServer({ data: { token } });
      if (res.ok) {
        toast.success("Posts aprobados y programados");
        const fresh = await getAutopilotServer({ data: { token } });
        setAutopilot(fresh);
      } else toast.error(res.error);
    } finally {
      setAutopilotBusy(false);
    }
  }

  const autopilotPendientes = autopilot?.ok
    ? autopilot.posts.filter((p) => p.estado === "borrador").length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Hola, {user.nombre.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user.nombre_negocio || "Tu negocio"} · La IA coordina; tú solo pega el link.
        </p>
      </div>

      {/* Coordinadora */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <span className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">IA Coordinadora</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold">¿Qué negocio o producto impulsamos hoy?</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Pega el enlace de tu tienda, web o perfil social. La IA investiga tu nicho, redacta los copys
          de alto impacto por red y prepara tu vendedor de WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={businessUrl}
              onChange={(e) => setBusinessUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && coordinar()}
              placeholder="Pega el enlace de tu tienda, web o Instagram (ej: mitienda.com, instagram.com/tu.negocio)"
              className="pl-9 h-11"
            />
          </div>
          <Button onClick={coordinar} className="h-11 gap-2 shrink-0">
            Coordinar con IA <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-slate-500">Objetivo:</span>
          {OBJECTIVES.map((o) => {
            const Icon = o.icon;
            const active = objective === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setObjective(o.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {o.label}
              </button>
            );
          })}
          <Button asChild variant="ghost" size="sm" className="gap-1.5 ml-auto">
            <Link to="/publicar"><PlusSquare className="w-4 h-4" /> Crear publicación manual</Link>
          </Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Estado real de canales */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tus canales</h3>
            <Link to="/configuracion" className="text-xs text-blue-700 font-medium hover:underline">Gestionar accesos</Link>
          </div>
          <div className="space-y-2">
            {REDES_ORDEN.map((red) => {
              const st = estadoRed(red);
              return (
                <div key={red} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{RED_LABELS[red]}</div>
                    <div className="text-xs text-slate-500 truncate">{st.conectada ? st.nombre ?? "Cuenta conectada" : "Sin conectar"}</div>
                  </div>
                  {st.conectada
                    ? <Badge variant="outline" className="text-[10px] border-green-400 text-green-800 bg-green-50 shrink-0">Conectada</Badge>
                    : <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500 shrink-0">Sin conectar</Badge>}
                </div>
              );
            })}
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium">WhatsApp</div>
                <div className="text-xs text-slate-500">{user.whatsapp_configurado ? "Vendedor configurado" : "Sin configurar"}</div>
              </div>
              {user.whatsapp_configurado
                ? <Badge variant="outline" className="text-[10px] border-green-400 text-green-800 bg-green-50 shrink-0">Activo</Badge>
                : <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500 shrink-0">Sin configurar</Badge>}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {redesConectadas} de 4 redes conectadas. El estado sale de tus cuentas reales, no de una lista fija.
          </p>
        </Card>

        {/* Diagnóstico IA (acción) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Diagnóstico IA</h3>
            {diagnosis && (
              <Badge variant="secondary" className="text-xs">Score {Math.round(diagnosis.score)} · {diagnosis.nicho}</Badge>
            )}
          </div>
          {diagnosis ? (
            <>
              <p className="text-xs text-slate-500">
                Diagnóstico por reglas sobre tus datos reales (publicaciones, métricas y leads).
              </p>
              {diagnosis.fortalezas[0] && (
                <p className="text-sm mt-2 flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {diagnosis.fortalezas[0].titulo}</p>
              )}
              {diagnosis.deficits[0] && (
                <p className="text-sm mt-1.5 text-slate-600">A mejorar: {diagnosis.deficits[0].titulo}</p>
              )}
              {latestReport && (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-semibold mb-1">
                    Último plan {latestReport.plan.fuente === "ia" ? "(generado con IA)" : "(por reglas)"} · {new Date(latestReport.created_at).toLocaleDateString("es-MX")}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-3">{latestReport.plan.resumen}</p>
                </div>
              )}
              <Button onClick={generarPlan} disabled={generatingPlan} className="mt-3 gap-2" size="sm">
                {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {latestReport ? "Regenerar plan" : "Generar mi plan con IA"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500">Completa tu perfil y publica para activar el diagnóstico.</p>
          )}
        </Card>
      </div>

      {/* Piloto automático (acción) */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-sky-700" /> Piloto automático</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {!produccion
                ? "Disponible en modo producción: genera y programa tu semana sola."
                : autopilot?.ok
                  ? autopilot.settings.activo
                    ? `Activo · modo ${autopilot.settings.modo} · ${autopilot.settings.posts_semana} posts/semana${autopilotPendientes ? ` · ${autopilotPendientes} por aprobar` : ""}`
                    : "En pausa. Actívalo y la IA genera tu semana de contenido."
                  : "No se pudo leer su estado."}
            </p>
          </div>
          {produccion && autopilot?.ok && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={autopilot.settings.activo ? "outline" : "default"} onClick={autopilotToggle} disabled={autopilotBusy} className="gap-1.5">
                {autopilot.settings.activo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autopilot.settings.activo ? "Pausar" : "Activar"}
              </Button>
              <Button size="sm" variant="outline" onClick={autopilotGenerar} disabled={autopilotBusy}>
                Generar semana
              </Button>
              {autopilotPendientes > 0 && (
                <Button size="sm" onClick={autopilotAprobarTodo} disabled={autopilotBusy}>
                  Aprobar todo ({autopilotPendientes})
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Accesos a resultados */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-700" /> Resultados</h3>
            <p className="text-sm text-slate-500 mt-0.5">Lo importante, lo que falta por hacer y tu Reporte de Lanzamiento en PDF.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link to="/resultados"><FileDown className="w-4 h-4" /> Ver resultados</Link>
          </Button>
        </Card>
        <Card className="p-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Red PubliVende</h3>
            <p className="text-sm text-slate-500 mt-0.5">Impulsa tus posts en los canales de tu nicho desde Distribuir.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/distribuir">Ir a Distribuir</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
