import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Globe,
  ArrowRight,
  CheckCircle2,
  Zap,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  TrendingUp,
  FileDown,
  Layers,
  Bot,
  Calendar,
  Share2,
  Clock,
  Send,
  Loader2,
  Check,
  ChevronRight,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Red } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardView });

const OBJECTIVES = [
  { id: "ventas", label: "Ventas WhatsApp", icon: MessageCircle, desc: "Cierre directo de pedidos y catálogo" },
  { id: "alcance", label: "Crecimiento & Alcance", icon: TrendingUp, desc: "Viralidad orgánica y nuevos seguidores" },
  { id: "leads", label: "Captación de Leads", icon: Zap, desc: "Prospectos calificados para cotizaciones" },
  { id: "branding", label: "Posicionamiento", icon: Sparkles, desc: "Autoridad y confianza de marca" },
] as const;

function DashboardView() {
  const { user } = useAuth();
  const [businessUrl, setBusinessUrl] = useState("");
  const [selectedObjective, setSelectedObjective] = useState<typeof OBJECTIVES[number]["id"]>("ventas");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [strategyResult, setStrategyResult] = useState<{
    niche: string;
    summary: string;
    posts: Array<{
      day: string;
      red: Red;
      hook: string;
      copy: string;
      cta: string;
      approved: boolean;
    }>;
  } | null>(null);

  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));

  // Simulación guiada o ejecución en vivo del enlace
  const handleAnalyzeBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessUrl.trim()) {
      toast.error("Por favor introduce el enlace de tu negocio o producto");
      return;
    }

    setIsAnalyzing(true);
    setActiveStep("Conectando con el enlace e inspeccionando metadatos...");

    try {
      await new Promise((r) => setTimeout(r, 800));
      setActiveStep("Analizando propuesta de valor y catálogo comercial...");
      await new Promise((r) => setTimeout(r, 900));
      setActiveStep("Aplicando fórmulas de ganchos de alta conversión...");
      await new Promise((r) => setTimeout(r, 900));

      const cleanUrl = businessUrl.trim();
      const detectedNiche = cleanUrl.includes("moda") || cleanUrl.includes("tienda") || cleanUrl.includes("shop")
        ? "Moda y Retail"
        : cleanUrl.includes("comida") || cleanUrl.includes("rest") || cleanUrl.includes("tacos")
        ? "Gastronomía y Alimentos"
        : "Servicios y Comercio Local";

      setStrategyResult({
        niche: detectedNiche,
        summary: `Estrategia de crecimiento coordinada para ${cleanUrl.replace(/^https?:\/\//, "").slice(0, 30)}. La IA ha optimizado los copys para captación directa con cierre por WhatsApp.`,
        posts: [
          {
            day: "Lunes · 8:00 PM",
            red: "instagram",
            hook: "Lo que nadie te dice antes de comprar esto...",
            copy: `Si estás buscando la mejor calidad sin pagar de más, mira este detalle. Envíos garantizados a todo México 🇲🇽.`,
            cta: "Escríbenos por WhatsApp para enviarte el catálogo disponible hoy.",
            approved: false,
          },
          {
            day: "Miércoles · 7:30 PM",
            red: "facebook",
            hook: "3 razones por las que nuestros clientes no cambian de marca 👇",
            copy: `1. Atención personalizada al instante.\n2. Pagos 100% seguros con Mercado Pago.\n3. Envíos express. ¿Ya conocías nuestra nueva colección?`,
            cta: "Toca el enlace para chatear con nuestro asesor en WhatsApp.",
            approved: false,
          },
          {
            day: "Viernes · 6:00 PM",
            red: "tiktok",
            hook: "El producto más vendido de la semana en acción 🔥",
            copy: `Unboxing rápido de los favoritos de nuestros clientes. Pide el tuyo antes de que se agote el stock disponible.`,
            cta: "Link en bio directo a WhatsApp.",
            approved: false,
          },
        ],
      });

      toast.success("¡Estrategia coordinada con éxito por la IA!");
    } catch {
      toast.error("Error al procesar el enlace. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
      setActiveStep(null);
    }
  };

  const approvePost = (index: number) => {
    if (!strategyResult || !user) return;
    const postItem = strategyResult.posts[index];
    const db = loadDB();

    db.posts.push({
      id: uid(),
      user_id: user.id,
      tipo: "post",
      media_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
      copy: `${postItem.hook}\n\n${postItem.copy}\n\n📲 ${postItem.cta}`,
      redes_destino: [postItem.red],
      estado: "programado",
      tracking_slug: uid().slice(0, 8),
      alcance: { impresiones: 0, engagement_rate: 0 },
      fecha_creacion: new Date().toISOString(),
      fecha_publicacion: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
    });

    saveDB(db);

    const updated = [...strategyResult.posts];
    updated[index].approved = true;
    setStrategyResult({ ...strategyResult, posts: updated });
    toast.success("Publicación aprobada y guardada en el Calendario");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PubliVende AI — Informe de Coordinación", 14, 20);
    doc.setFontSize(10);
    doc.text(`Negocio: ${user?.nombre_negocio || "Mi Negocio"} | Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Métrica", "Valor", "Estado"]],
      body: [
        ["Canal WhatsApp", "Activo", "Vendedor IA 24/7"],
        ["Pasarela de Pagos", "Mercado Pago", "Activo"],
        ["Publicaciones Activas", `${posts.length} posts`, "Sincronizado"],
        ["Conversaciones CRM", `${contacts.length} clientes`, "Atendidos por IA"],
      ],
    });

    doc.save("publivende-reporte.pdf");
    toast.success("Reporte PDF descargado");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Hola, {user?.nombre?.split(" ")[0]} <span className="text-xl">👋</span>
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5 font-medium">
              Centro de Mando Activo
            </Badge>
          </div>
          <p className="text-xs text-zinc-400">
            {user?.nombre_negocio || "PubliVende"} · Coordinación autónoma con <span className="text-zinc-300 font-medium">MeAI Cloud</span> y cobros en <span className="text-sky-400 font-medium">Mercado Pago</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={exportPDF}
            variant="outline"
            size="sm"
            className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs gap-1.5 h-8"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </Button>
          <Link to="/calendario">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 h-8 shadow-lg shadow-violet-600/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ver Calendario</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Command Center Hero (Perplexity / Linear style) */}
      <Card className="relative overflow-hidden bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 border-zinc-800/90 p-6 md:p-8 shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 bg-violet-600/20 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>IA Coordinadora Autónoma</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            ¿Qué negocio o producto impulsamos hoy?
          </h2>

          <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Introduce el enlace de tu tienda, web o perfil social. La IA investigará tu nicho, redactará copys de alto impacto y preparará a tu vendedor de WhatsApp.
          </p>

          {/* Interactive URL Input Command Bar */}
          <form onSubmit={handleAnalyzeBusiness} className="pt-2 space-y-4">
            <div className="relative flex items-center shadow-xl rounded-xl bg-zinc-950/80 border border-zinc-700/80 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all p-1.5">
              <div className="pl-3 pr-2 text-zinc-400">
                <Globe className="w-5 h-5 text-violet-400" />
              </div>
              <Input
                type="text"
                placeholder="Pega el enlace de tu tienda, web o Instagram (ej: mitienda.com, instagram.com/minegocio)..."
                value={businessUrl}
                onChange={(e) => setBusinessUrl(e.target.value)}
                className="bg-transparent border-0 text-white placeholder:text-zinc-500 text-xs md:text-sm focus-visible:ring-0 shadow-none px-2 h-10"
              />
              <Button
                type="submit"
                disabled={isAnalyzing}
                className="bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs md:text-sm px-4 md:px-5 h-9 shrink-0 gap-1.5 shadow-md shadow-violet-600/30"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Coordinar con IA ⚡</span>
                  </>
                )}
              </Button>
            </div>

            {/* Objective Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-500 font-medium mr-1">Objetivo:</span>
              {OBJECTIVES.map((obj) => {
                const Icon = obj.icon;
                const isSelected = selectedObjective === obj.id;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => setSelectedObjective(obj.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-sm"
                        : "bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{obj.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Analysis Step Feedback */}
            {isAnalyzing && (
              <div className="flex items-center justify-center gap-2 text-xs text-violet-400 animate-pulse pt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{activeStep}</span>
              </div>
            )}
          </form>
        </div>
      </Card>

      {/* Generated Strategy Preview Card (If available) */}
      {strategyResult && (
        <Card className="bg-zinc-900/90 border-violet-500/40 p-6 space-y-4 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                  {strategyResult.niche}
                </Badge>
                <h3 className="text-base font-bold text-white">Estrategia Semanal Coordinada</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{strategyResult.summary}</p>
            </div>
            <Link to="/piloto">
              <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-800/60 text-xs gap-1.5 h-8">
                <span>Abrir en Piloto Automático</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {strategyResult.posts.map((post, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      {post.red === "instagram" && <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                      {post.red === "facebook" && <Facebook className="w-3.5 h-3.5 text-blue-400" />}
                      {post.red === "tiktok" && <Share2 className="w-3.5 h-3.5 text-teal-400" />}
                      {post.red.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-zinc-500">{post.day}</span>
                  </div>

                  <div className="text-xs font-semibold text-violet-300 leading-snug">
                    "{post.hook}"
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {post.copy}
                  </p>

                  <div className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{post.cta}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  {post.approved ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium py-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Programado</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => approvePost(idx)}
                      size="sm"
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprobar con 1 Clic</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grid: Canales Conectados & Timeline de la IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canales Autorizados (2 columnas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-400" />
              Canales & Canales de Distribución
            </h3>
            <Link to="/configuracion" className="text-xs text-violet-400 hover:underline">
              Gestionar accesos
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Instagram */}
            <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    Instagram Business
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400">Reels & Feed autorizados</div>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                Listo
              </Badge>
            </Card>

            {/* WhatsApp Business */}
            <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    WhatsApp Cloud API
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400">Vendedor IA activo (24/7)</div>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                Activo
              </Badge>
            </Card>

            {/* Facebook */}
            <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    Facebook Fanpage
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400">Página conectada</div>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                Listo
              </Badge>
            </Card>

            {/* Mercado Pago */}
            <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    Mercado Pago
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400">Links de cobro automáticos</div>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                Conectado
              </Badge>
            </Card>
          </div>
        </div>

        {/* Timeline de la IA Coordinadora (Activity Ledger) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            Acciones de la IA Coordinadora
          </h3>

          <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 rounded-xl space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-200">Motor MeAI Cloud listo</div>
                  <div className="text-zinc-400 text-[11px]">Claude Haiku 4.5 activo para copywriting y ventas.</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Hace 2 min</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-200">Vendedor WhatsApp disponible</div>
                  <div className="text-zinc-400 text-[11px]">Respuestas inteligentes con contexto comercial activadas.</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">En guardia 24/7</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-200">Pasarela Mercado Pago</div>
                  <div className="text-zinc-400 text-[11px]">Links de pago directos listos para adjuntar en DMs.</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Operativo</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60">
              <Link to="/piloto" className="text-[11px] text-violet-400 hover:text-violet-300 font-medium flex items-center justify-between">
                <span>Configurar reglas de piloto automático</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
