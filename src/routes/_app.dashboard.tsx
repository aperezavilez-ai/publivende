import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Radio, Sparkles, Link2, Upload, Wand2, Globe, MapPin, Users, Hash,
  ArrowRight, CheckCircle2, MessageCircle, Instagram, Facebook, Youtube, Music2,
  CreditCard, AlertTriangle, Loader2, Share2, ExternalLink, Zap, ChevronRight,
  TrendingUp, BarChart3, Check, RefreshCw
} from "lucide-react";
import { ImportedPostPreview } from "@/components/ImportedPostPreview";
import { sanitizeMediaUrl } from "@/services/import/mediaUrl";
import {
  fetchMetadataFromLink, normalizeImportInput, isFacebookAdCode,
  repurposeFromLink, detectPlatform, SOURCE_LABELS, type SourceMetadata, type NetworkVariant
} from "@/services/import";
import { inferNichoFromText } from "@/services/import/inferNiche";
import {
  analizarAlcanceIA, formatAlcanceNumero, totalAlcanceIA, type ReachAIAnalysis, type AlcancePorRedIA
} from "@/lib/reach-ai";
import {
  hashtagsFromVariants, hashtagsFromAlcanceIA, mergeHashtagMaps, pickViralHashtags
} from "@/lib/hashtags-ai";
import { analizarConCerebroIA } from "@/lib/api/brain-agent.functions";
import type { BrainAgentOutput } from "@/server/agent/brain";
import { publishPostReal } from "@/lib/api/publish.functions";
import { getMyBoostQuota } from "@/lib/api/red.functions";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { RED_LABELS, RED_LIMITS, RED_COLORS, REDES_ORDEN } from "@/lib/redes";
import { BOOST_LIMITS } from "@/lib/red/limits";
import { type Red, type Post, type PostAlcance } from "@/lib/mock/types";
import { resolveMediaForPublish } from "@/lib/publish-status";
import { getDashboardDraft, saveDashboardDraft, clearDashboardDraft } from "@/lib/draft";

export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: (s: Record<string, unknown>): { link?: string } => ({
    link: typeof s.link === "string" ? s.link : undefined,
  }),
  component: CabinaDifusion,
});

const ALL_REDES: Red[] = ["facebook", "instagram", "tiktok", "youtube"];
const ICONS: Record<Red, typeof Instagram> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
};

type AlcanceTipo = "local" | "estatal" | "nacional" | "global";

function CabinaDifusion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { link: linkSearch } = Route.useSearch();

  // Cuentas y saldo en tiempo real
  const accounts = useDB((db) => db.social_accounts.filter((a) => a.user_id === user?.id));
  const postsEsteMes = useDB((db) =>
    db.posts.filter((p) => {
      if (p.user_id !== user?.id || p.estado === "borrador") return false;
      const d = new Date(p.fecha_publicacion ?? p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  );

  const fbAccount = accounts.find((a) => a.red === "facebook");
  const fbConnected = fbAccount?.estado_conexion === "conectada";

  // [PLANES VERDAD — 2026-11-26] El saldo es de COMPARTIDAS (BOOST_LIMITS,
  // la tabla que el servidor hace cumplir al pedir el impulso). En
  // producción las usadas vienen de la misma fuente que usa la pantalla de
  // Red (boostQuota vía getMyBoostQuota); en demo se usa el conteo local de
  // posts del mes como aproximación visible.
  const limiteCompartidas = user ? BOOST_LIMITS[user.plan] : 1;
  const [cuotaServidor, setCuotaServidor] = useState<{ usados: number; limite: number | null } | null>(null);
  useEffect(() => {
    const token = getSessionToken();
    if (!token || !isProductionModeClient()) return;
    getMyBoostQuota({ data: { token } })
      .then((r) => { if (r.ok) setCuotaServidor(r.quota); })
      .catch(() => { /* sin cuota del servidor se muestra el límite del plan */ });
  }, []);
  const compartidasUsadas = cuotaServidor?.usados ?? postsEsteMes;
  const esIlimitado = limiteCompartidas >= 9999 || (cuotaServidor != null && cuotaServidor.limite === null);
  const creditosRestantes = esIlimitado ? 9999 : Math.max(0, limiteCompartidas - compartidasUsadas);

  // Recuperar borrador automático persistente de localStorage (evita perder trabajo al recargar)
  const initialDraft = useMemo(() => getDashboardDraft(), []);

  // Estados del flujo unificado
  const [sourceUrl, setSourceUrl] = useState(linkSearch ?? initialDraft?.sourceUrl ?? "");
  const [importing, setImporting] = useState(false);
  const [sourceMeta, setSourceMeta] = useState<SourceMetadata | null>(initialDraft?.sourceMeta ?? null);
  const [media, setMedia] = useState(initialDraft?.media ?? "");
  const [copy, setCopy] = useState(initialDraft?.copy ?? "");
  const [copyPorRed, setCopyPorRed] = useState<Partial<Record<Red, string>>>(initialDraft?.copyPorRed ?? {});
  const [variants, setVariants] = useState<Partial<Record<Red, NetworkVariant>>>(initialDraft?.variants ?? {});
  const [activeTabRed, setActiveTabRed] = useState<Red>((initialDraft?.activeTabRed as Red) || "facebook");

  // Redes seleccionadas
  const [selectedRedes, setSelectedRedes] = useState<Red[]>((initialDraft?.selectedRedes as Red[]) || ["facebook", "instagram"]);
  const [whatsappSelected, setWhatsappSelected] = useState(initialDraft?.whatsappSelected ?? true);

  // Alcance y segmentación
  const [alcanceNivel, setAlcanceNivel] = useState<AlcanceTipo>((initialDraft?.alcanceNivel as AlcanceTipo) || "local");
  const [detectedNicho, setDetectedNicho] = useState(initialDraft?.detectedNicho ?? "");
  const [brainResult, setBrainResult] = useState<BrainAgentOutput | null>(initialDraft?.brainResult ?? null);
  const [reachAnalysis, setReachAnalysis] = useState<ReachAIAnalysis | null>(initialDraft?.reachAnalysis ?? null);
  const [reachPorRed, setReachPorRed] = useState<AlcancePorRedIA[]>(initialDraft?.reachPorRed ?? []);
  const [totalAlcance, setTotalAlcance] = useState<{ personas_min: number; personas_max: number }>(initialDraft?.totalAlcance ?? { personas_min: 0, personas_max: 0 });

  // Indicador de borrador activo restaurado
  const [hasDraftRestored, setHasDraftRestored] = useState(
    Boolean(initialDraft?.sourceUrl || initialDraft?.copy || initialDraft?.media || initialDraft?.brainResult)
  );

  // Publicación
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);


  // Auto-guardado en localStorage en tiempo real (anti-pérdida por F5 o navegación)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDashboardDraft({
        sourceUrl,
        sourceMeta,
        media,
        copy,
        copyPorRed,
        variants,
        activeTabRed,
        selectedRedes,
        whatsappSelected,
        alcanceNivel,
        detectedNicho,
        brainResult,
        reachAnalysis,
        reachPorRed,
        totalAlcance,
      });
      if (sourceUrl || copy || media || brainResult) {
        setHasDraftRestored(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    sourceUrl,
    sourceMeta,
    media,
    copy,
    copyPorRed,
    variants,
    activeTabRed,
    selectedRedes,
    whatsappSelected,
    alcanceNivel,
    detectedNicho,
    brainResult,
    reachAnalysis,
    reachPorRed,
    totalAlcance,
  ]);

  function handleDescartarBorrador() {
    clearDashboardDraft();
    setSourceUrl("");
    setSourceMeta(null);
    setMedia("");
    setCopy("");
    setCopyPorRed({});
    setVariants({});
    setDetectedNicho("");
    setBrainResult(null);
    setReachAnalysis(null);
    setReachPorRed([]);
    setTotalAlcance({ personas_min: 0, personas_max: 0 });
    setHasDraftRestored(false);
    toast.info("Borrador limpiado. Listo para empezar una nueva difusión.");
  }

  // Auto-importar si viene en URL search
  useEffect(() => {
    if (linkSearch && !sourceMeta && !importing) {
      void procesarEnlace(linkSearch);
    }
  }, [linkSearch]);

  if (!user) return null;

  // [FLUJO SIN REDES DEL CLIENTE — 2026-11-26] Se retiraron estadoRed y
  // handleConnect (conexión de redes del cliente por popup): el cliente
  // nunca conecta sus cuentas; la difusión sale por la Red PubliVende.

  // Flujo integral: Leer link + Extraer foto + Adaptar IA + Calcular Nicho y Alcance
  async function procesarEnlace(urlOverride?: string) {
    const raw = (urlOverride ?? sourceUrl).trim();
    if (!raw) {
      toast.error("Pega un enlace de Facebook, Instagram, TikTok o YouTube");
      return;
    }
    if (isFacebookAdCode(raw)) {
      toast.error("Eso es un código de anuncio de Meta, no un enlace. En Facebook pulsa: Compartir → Copiar enlace.");
      return;
    }
    const parsed = normalizeImportInput(raw);
    if (!parsed?.url) {
      toast.error("Enlace no reconocido. Utiliza un link de Facebook, Instagram, TikTok o YouTube.");
      return;
    }

    setImporting(true);
    setPublishedUrl(null);
    try {
      const url = parsed.url;
      // 1. Obtener metadatos y foto real
      const meta = await fetchMetadataFromLink(url, {
        facebookConnected: fbConnected,
        facebookPageName: fbAccount?.nombre_cuenta,
        facebookToken: fbAccount?.token_placeholder,
      });

      setSourceMeta(meta);
      setSourceUrl(url);

      const cleanMedia = sanitizeMediaUrl(meta.mediaUrl);
      setMedia(cleanMedia);

      const baseCaption = meta.originalCaption || "";
      setCopy(baseCaption);

      // 2. Invocar Cerebro Agéntico con Banco de Nichos y Comunidades
      let brainActivated = false;
      try {
        const brainRes = await analizarConCerebroIA({
          data: {
            copy: baseCaption || meta.title || "Promoción especial de negocio",
            pageName: meta.pageName ?? fbAccount?.nombre_cuenta ?? user.nombre_negocio,
            mediaUrl: cleanMedia,
            ciudad: user.ciudad || undefined,
            estado: "México",
            alcanceNivel,
          },
        });

        if (brainRes.ok && brainRes.brain) {
          const b = brainRes.brain;
          setBrainResult(b);
          setDetectedNicho(b.nichoAsignado.nombre);

          // Sincronizar copies para cada red desde el Cerebro Agéntico
          const newCopyPorRed: Partial<Record<Red, string>> = {};
          for (const r of ALL_REDES) {
            if (b.copyPorRed[r]) {
              newCopyPorRed[r] = b.copyPorRed[r]!;
            }
          }
          if (newCopyPorRed[activeTabRed]) {
            setCopy(newCopyPorRed[activeTabRed]!);
          } else if (newCopyPorRed.facebook) {
            setCopy(newCopyPorRed.facebook);
          }
          setCopyPorRed(newCopyPorRed);

          setTotalAlcance({
            personas_min: b.alcanceEstimado.personasMin,
            personas_max: b.alcanceEstimado.personasMax,
          });

          toast.success("🧠 ¡Cerebro Agéntico activó la distribución!", {
            description: `Giro: ${b.diagnostico.giroComercial} · ${b.comunidadesObjetivo.length} comunidades asignadas (${formatAlcanceNumero(b.alcanceEstimado.personasMin)} a ${formatAlcanceNumero(b.alcanceEstimado.personasMax)} personas).`,
          });
          brainActivated = true;
        }
      } catch (agentErr) {
        console.warn("Fallo al conectar con Cerebro Agéntico, usando fallback adaptativo:", agentErr);
      }

      // 3. Fallback en caso de que no responda el agente
      if (!brainActivated) {
        const nicho = inferNichoFromText(baseCaption) || user.industria || "General";
        setDetectedNicho(nicho);

        const targetRedes = selectedRedes.length > 0 ? selectedRedes : ALL_REDES;
        const sourceForAdapt: SourceMetadata = {
          platform: meta.platform,
          url: meta.url,
          originalCaption: baseCaption,
          mediaUrl: cleanMedia,
          mediaType: meta.mediaType ?? "imagen",
          title: meta.title,
          fetchedFromLink: meta.fetchedFromLink,
          pageName: meta.pageName ?? fbAccount?.nombre_cuenta,
        };

        const repurposed = await repurposeFromLink(url, targetRedes, nicho, "casual", sourceForAdapt);
        setVariants(repurposed.variants);
        const newCopyPorRed: Partial<Record<Red, string>> = {};
        for (const r of targetRedes) {
          if (repurposed.variants[r]?.text) {
            newCopyPorRed[r] = repurposed.variants[r]!.text;
          }
        }
        setCopyPorRed(newCopyPorRed);

        const alcanceGeo = {
          tipo: (alcanceNivel === "global" ? "global" : "local") as "global" | "local",
          nivel: (alcanceNivel === "global" ? "global" : alcanceNivel === "nacional" ? "nacional" : alcanceNivel === "estatal" ? "estado" : "municipios") as "global" | "nacional" | "estado" | "municipios",
          pais: "México",
          estado: user.ciudad ? undefined : "General",
          ciudad: user.ciudad || undefined,
        };

        const reachRes = analizarAlcanceIA({
          alcance: alcanceGeo,
          redes: targetRedes,
          industria: nicho,
          source: meta,
          copyPorRed: newCopyPorRed,
          fuente: "link_ia",
        });

        if (reachRes) {
          setReachAnalysis(reachRes.analysis);
          setReachPorRed(reachRes.por_red);
          const total = totalAlcanceIA(reachRes.por_red);
          setTotalAlcance(total);
        }
        toast.success("¡Enlace importado y adaptado automáticamente con IA!");
      }
    } catch (err) {
      toast.error((err as Error).message || "Error al procesar el enlace");
    } finally {
      setImporting(false);
    }
  }

  // Toggle de redes de destino
  function toggleRed(r: Red) {
    if (selectedRedes.includes(r)) {
      if (selectedRedes.length === 1 && !whatsappSelected) {
        toast.error("Debes mantener al menos una red seleccionada");
        return;
      }
      setSelectedRedes(selectedRedes.filter((x) => x !== r));
    } else {
      setSelectedRedes([...selectedRedes, r]);
    }
  }

  // Compartir Publicación (Publicación Real)
  async function ejecutarDifusion() {
    if (selectedRedes.length === 0 && !whatsappSelected) {
      toast.error("Selecciona al menos una red de destino para compartir");
      return;
    }
    if (!copy.trim() && !media) {
      toast.error("Primero importa un enlace o escribe un texto para publicar");
      return;
    }
    if (!esIlimitado && creditosRestantes <= 0) {
      toast.error("No tienes saldo de compartidas disponible", {
        description: "Recarga tu saldo o mejora tu plan para seguir publicando.",
      });
      return;
    }

    setPublishing(true);
    setPublishedUrl(null);
    try {
      let publishMedia = media;
      const sessionToken = getSessionToken();
      if (isProductionModeClient() && sessionToken && publishMedia && !publishMedia.startsWith("http")) {
        const resolved = await resolveMediaForPublish(publishMedia, sessionToken);
        if (resolved) publishMedia = resolved;
      }

      const alcanceGeo: PostAlcance = {
        tipo: alcanceNivel === "global" ? "global" : "local",
        nivel: alcanceNivel === "global" ? "global" : alcanceNivel === "nacional" ? "nacional" : alcanceNivel === "estatal" ? "estado" : "municipios",
        pais: "México",
        ciudad: user?.ciudad || undefined,
      };

      if (isProductionModeClient() && sessionToken) {
        const res = await publishPostReal({
          data: {
            token: sessionToken,
            post: {
              tipo: sourceMeta?.mediaType ?? "imagen",
              media_url: publishMedia,
              copy: copyPorRed[activeTabRed] || copy || "Publicación difundida con PubliVende",
              copy_por_red: copyPorRed,
              source_url: sourceUrl || undefined,
              alcance: alcanceGeo,
              redes: selectedRedes,
              nicho_label: brainResult?.nichoAsignado?.nombre ?? detectedNicho,
              canales_distribucion: brainResult?.comunidadesObjetivo ?? [],
              hashtags_virales: brainResult?.hashtagsVirales ?? viralHashtags,
            },
            notifyWhatsApp: whatsappSelected,
          },
        });

        if (!res.ok) {
          toast.error(res.error ?? "No se pudo completar la difusión", {
            description: "Revisa el estado de la Red PubliVende.",
          });
          return;
        }

        const serverPost = res.post as unknown as Post;
        const db = loadDB();
        const idx = db.posts.findIndex((p) => p.id === serverPost.id);
        if (idx >= 0) db.posts[idx] = { ...db.posts[idx], ...serverPost };
        else db.posts.push(serverPost);
        saveDB(db);

        const commCount = brainResult?.comunidadesObjetivo?.length || 0;
        toast.success("🚀 ¡Publicación difundida con éxito!", {
          description: `Se distribuyó en la Red Oficial PubliVende (${selectedRedes.length} redes${commCount > 0 ? ` + ${commCount} comunidades del Banco de Cerebro` : ""}${whatsappSelected ? " y WhatsApp" : ""}).`,
          duration: 9000,
        });
      } else {
        // Modo local/demo
        const db = loadDB();
        const demoPost: Post = {
          id: uid(),
          user_id: user.id,
          tipo: "imagen",
          media_url: publishMedia,
          copy: copy,
          copy_por_red: copyPorRed,
          redes: selectedRedes,
          estado: "publicado",
          created_at: new Date().toISOString(),
          fecha_publicacion: new Date().toISOString(),
        };
        db.posts.push(demoPost);
        saveDB(db);
        toast.success("¡Difusión simulada completada exitosamente!");
      }
    } catch (err) {
      toast.error((err as Error).message || "Error al compartir publicación");
    } finally {
      setPublishing(false);
    }
  }

  // Hashtags sugeridos por IA
  const viralHashtags = useMemo(() => {
    return pickViralHashtags(
      mergeHashtagMaps(
        hashtagsFromVariants(variants, selectedRedes),
        hashtagsFromAlcanceIA(
          reachPorRed,
          selectedRedes,
          detectedNicho || "General",
          copy,
        ),
      ),
    ).slice(0, 10);
  }, [variants, selectedRedes, reachPorRed, detectedNicho, copy]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* [REESTRUCTURA DISEÑO — 2026-11-27] Encabezado sin caja: título
          grande, subtítulo y el saldo como tarjeta compacta a la derecha.
          Solo cambia la estructura visual; la lógica es la misma. */}
      <header>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                Plataforma de Difusión con IA
              </span>
            </div>
            <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground mt-2">
              Cabina de Difusión
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {user.nombre_negocio ? `${user.nombre_negocio} · ` : ""}Pega tu link y PubliVende lo difunde con IA en sus comunidades oficiales y redes.
            </p>
          </div>

          {/* Saldo y Recarga */}
          <div className="flex items-center gap-3.5 bg-card border border-border rounded-2xl px-4 py-3 shadow-soft shrink-0">
            <CreditCard className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Saldo de Compartidas</div>
              <div className="text-base font-extrabold text-foreground leading-snug">
                {esIlimitado ? "Ilimitadas" : `${creditosRestantes} de ${limiteCompartidas} restantes`}
              </div>
            </div>
            <Link to="/configuracion">
              <Button size="sm" className="text-xs ml-1">
                Recargar
              </Button>
            </Link>
          </div>
        </div>

        {/* [FLUJO SIN REDES DEL CLIENTE — 2026-11-26] Se retiraron las
            tarjetas de estado/conexión de redes DEL CLIENTE (con su botón
            «+ Conectar» por popup): el cliente nunca conecta sus cuentas.
            En su lugar, el estado de la Red PubliVende y su saldo de
            compartidas del plan. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-5 text-[13px]">
          <span className="text-muted-foreground">Difusión centralizada: tu link sale por las cuentas oficiales de tu nicho. No necesitas conectar tus cuentas.</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Red PubliVende Activa
          </span>
        </div>
        <div className="text-[13px] text-muted-foreground mt-1">
          {esIlimitado
            ? "Compartidas ilimitadas en tu plan."
            : user?.plan === "free"
              ? `Compartida gratuita: ${compartidasUsadas} de ${limiteCompartidas} usada (es de por vida, no se renueva cada mes).`
              : `Compartidas de este mes: ${compartidasUsadas} de ${limiteCompartidas} usadas.`}
        </div>
        <div className="border-b border-border mt-5" />
      </header>

      {/* Indicador de Borrador Guardado Automáticamente */}
      {hasDraftRestored && Boolean(sourceUrl || copy || media || brainResult) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-emerald-900 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <span className="font-semibold text-emerald-800">Borrador activo protegido:</span>{" "}
              <span>Tu contenido y adaptaciones se guardan en tiempo real. Aunque recargues la página (F5) o salgas del navegador, tus avances no se perderán.</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDescartarBorrador}
            className="text-xs shrink-0 border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 font-medium"
          >
            Limpiar y empezar nuevo
          </Button>
        </div>
      )}

      {/* Paso 1: Pega tu Enlace a Difundir */}
      <Card className="p-6 border-border shadow-soft">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="bg-accent text-accent-foreground text-[10px] font-extrabold tracking-[0.1em] rounded-full px-2.5 py-1">PASO 1</span>
          <h2 className="text-base font-bold text-foreground">Pega el enlace de tu publicación o producto</h2>
        </div>
        <p className="text-[13px] text-muted-foreground mb-5">
          Acepta enlaces de Facebook (post, foto, video), Instagram, TikTok, YouTube o tu tienda en línea.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void procesarEnlace();
              }}
              placeholder="https://facebook.com/share/p/... o enlace de tu negocio"
              className="pl-11 h-12 text-sm bg-white border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            onClick={() => void procesarEnlace()}
            disabled={importing || !sourceUrl.trim()}
            className="h-12 px-6 bg-primary hover:bg-primary/90 text-white font-semibold text-sm gap-2 shadow-soft transition-all"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando con IA…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Analizar y Adaptar con IA
              </>
            )}
          </Button>
        </div>

        {sourceMeta && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground pt-4 border-t border-border">
            <span className="font-medium text-foreground">Fuente detectada:</span>
            <Badge variant="outline" className="bg-muted border-border text-foreground text-xs px-2.5 py-1 rounded-full">
              {SOURCE_LABELS[sourceMeta.platform]}
            </Badge>
            <Badge variant="outline" className="bg-accent border-primary/25 text-accent-foreground text-xs px-2.5 py-1 rounded-full">
              {sourceMeta.mediaType === "video" ? "Video detectado" : "Imagen detectada"}
            </Badge>
            {detectedNicho && (
              <Badge className="bg-accent text-accent-foreground border border-primary/25 gap-1 text-xs px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" /> Nicho: {detectedNicho}
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Paso 2 + Paso 3: Vista previa y Texto adaptado */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-5 p-6 border-border shadow-soft">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="bg-accent text-accent-foreground text-[10px] font-extrabold tracking-[0.1em] rounded-full px-2.5 py-1">PASO 2</span>
            <h2 className="text-base font-bold text-foreground">Vista previa del contenido</h2>
          </div>

          {sourceMeta ? (
            <div className="space-y-3">
              <ImportedPostPreview
                platform={sourceMeta.platform}
                pageName={sourceMeta.pageName ?? fbAccount?.nombre_cuenta ?? user.nombre_negocio}
                caption={copyPorRed[activeTabRed] || copy || sourceMeta.originalCaption}
                mediaUrl={media}
                mediaType={sourceMeta.mediaType}
                linkTitle={sourceMeta.title}
                linkDescription={sourceMeta.linkDescription}
                linkUrl={sourceMeta.url}
              />
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {media ? "Imagen lista para compartir" : "Sin imagen detectada"}
                </span>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        if (dataUrl) {
                          setMedia(dataUrl);
                          toast.success("Foto del post actualizada correctamente");
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary bg-accent hover:bg-accent/70 border border-primary/25 px-3.5 py-2 rounded-[10px] transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {media ? "Cambiar foto" : "Subir foto"}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center bg-muted">
              <Link2 className="w-9 h-9 mx-auto text-muted-foreground mb-2.5" />
              <p className="text-sm font-semibold text-foreground">Pega un enlace en el paso 1</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aquí verás en tiempo real la foto real y el texto adaptado para cada red.
              </p>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-7 p-6 border-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-accent text-accent-foreground text-[10px] font-extrabold tracking-[0.1em] rounded-full px-2.5 py-1">PASO 3</span>
              <h2 className="text-base font-bold text-foreground">Texto adaptado para cada red</h2>
            </div>
            <Badge variant="outline" className="text-[11px] border-border text-muted-foreground rounded-full px-2.5 py-1">
              Optimizado con IA
            </Badge>
          </div>

          <Tabs value={activeTabRed} onValueChange={(v) => setActiveTabRed(v as Red)}>
            <TabsList className="grid grid-cols-4 w-full h-11 bg-muted p-1 rounded-xl">
              {ALL_REDES.map((r) => {
                const Icon = ICONS[r];
                return (
                  <TabsTrigger
                    key={r}
                    value={r}
                    className="text-[13px] font-medium flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-soft data-[state=active]:font-semibold rounded-lg"
                  >
                    <Icon className="w-4 h-4" style={{ color: RED_COLORS[r] }} />
                    <span className="hidden sm:inline">{RED_LABELS[r]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {ALL_REDES.map((r) => (
              <TabsContent key={r} value={r} className="mt-4 space-y-2">
                <Textarea
                  rows={5}
                  value={copyPorRed[r] ?? copy}
                  onChange={(e) => setCopyPorRed({ ...copyPorRed, [r]: e.target.value })}
                  placeholder={`Escribe o ajusta el copy para ${RED_LABELS[r]}…`}
                  className="text-sm leading-relaxed border-input focus:border-primary rounded-xl"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {(copyPorRed[r] ?? copy).length}/{RED_LIMITS[r]} caracteres
                  </span>
                  {variants[r]?.hook && (
                    <span className="text-primary font-medium truncate max-w-xs">
                      Gancho: &quot;{variants[r]!.hook}&quot;
                    </span>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>

      {/* Cerebro Agéntico / Impacto: banda ancha a 3 columnas */}
      {brainResult ? (
        <Card className="p-6 border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[10px] bg-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </span>
              <div>
                <div className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Cerebro Agéntico PubliVende
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[13px] text-muted-foreground">Diagnóstico y comunidades para tu publicación</div>
              </div>
            </div>
            <Badge className="bg-accent text-accent-foreground border border-primary/20 text-xs font-bold rounded-full px-3 py-1.5 shrink-0">
              {brainResult.nichoAsignado.afinidadScore}% Afinidad
            </Badge>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-6">
            {/* Columna 1: Métricas */}
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Personas Alcanzadas
                </div>
                <div className="text-[22px] leading-tight font-extrabold text-foreground mt-1.5">
                  {formatAlcanceNumero(brainResult.alcanceEstimado.personasMin)} – {formatAlcanceNumero(brainResult.alcanceEstimado.personasMax)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" /> Comunidades del Banco
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">
                  {brainResult.comunidadesObjetivo.length} Oficiales
                </div>
              </div>
            </div>

            {/* Columna 2: Diagnóstico Estratégico de la Oferta */}
            <div className="space-y-4 md:border-l md:border-border md:pl-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block">Giro Comercial</span>
                <span className="text-sm text-foreground font-semibold">{brainResult.diagnostico.giroComercial}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block">Oferta Detectada</span>
                <span className="text-sm text-foreground">{brainResult.diagnostico.ofertaDetectada}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block">Gancho Psicológico</span>
                <span className="text-sm text-amber-700 font-medium">{brainResult.diagnostico.ganchoPsicologico}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block">Público Objetivo</span>
                <span className="text-sm text-foreground/80">{brainResult.diagnostico.publicoObjetivo}</span>
              </div>
            </div>

            {/* Columna 3: Comunidades Oficiales Asignadas por el Banco */}
            <div className="md:border-l md:border-border md:pl-8">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Comunidades Asignadas
                </span>
                <span className="text-[11px] text-muted-foreground font-medium text-right">
                  {brainResult.nichoAsignado.nombre}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto pr-1 mt-1 divide-y divide-border">
                {brainResult.comunidadesObjetivo.map((c, i) => (
                  <div key={c.id || i} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-foreground text-[13px] leading-tight">
                        {c.nombre}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {c.miembros.toLocaleString()} miembros
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="text-emerald-700 font-medium capitalize">[{c.plataforma}]</span>
                      <span>Alcance {c.alcance}</span>
                      {c.ciudad && <span>· {c.ciudad}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 italic">
                      &quot;{c.razonSeleccionada}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hashtags Virales del Banco */}
          {brainResult.hashtagsVirales?.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" /> Hashtags Virales Asignados:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brainResult.hashtagsVirales.slice(0, 8).map((h) => (
                  <span key={h} className="text-[11px] bg-accent text-accent-foreground border border-primary/20 px-2 py-1 rounded-md font-mono">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : reachAnalysis ? (
        <Card className="p-6 border-border bg-card shadow-soft">
          <div className="flex items-center gap-3 pb-5 border-b border-border">
            <span className="w-10 h-10 rounded-[10px] bg-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </span>
            <div>
              <div className="text-base font-extrabold text-foreground">Impacto Proyectado por IA</div>
              <div className="text-[13px] text-muted-foreground">Estimación según tu nicho y tu cobertura</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Personas Alcanzadas
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-foreground mt-1.5">
                {formatAlcanceNumero(totalAlcance.personas_min)} – {formatAlcanceNumero(totalAlcance.personas_max)}
              </div>
            </div>

            <div className="md:border-l md:border-border md:pl-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Score de Afinidad
              </div>
              <div className="text-[22px] leading-tight font-extrabold text-emerald-700 mt-1.5">
                {reachAnalysis.confianza}% Alta
              </div>
            </div>

            {/* Nichos detectados */}
            <div className="md:border-l md:border-border md:pl-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Nichos de mercado afines</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reachAnalysis.mercados.slice(0, 5).map((m) => (
                  <Badge key={m} variant="secondary" className="text-[11px] bg-muted border border-border text-foreground rounded-full px-2.5 py-1">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Hashtags Virales */}
          {viralHashtags.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" /> Hashtags optimizados:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {viralHashtags.map((h) => (
                  <span key={h} className="text-[11px] bg-accent text-accent-foreground border border-primary/20 px-2 py-1 rounded-md">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {/* Cobertura + Redes de destino */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Cobertura Geográfica */}
        <Card className="p-6 border-border shadow-soft">
          <div className="flex items-center gap-2.5 mb-1.5">
            <MapPin className="w-4.5 h-4.5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Cobertura y Alcance Territorial</h2>
          </div>
          <p className="text-[13px] text-muted-foreground mb-4">
            ¿A qué nivel geográfico deseas dirigir esta difusión?
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "local", label: "Local", desc: user.ciudad || "Mi ciudad", icon: MapPin },
              { id: "estatal", label: "Estatal", desc: "Todo el estado", icon: MapPin },
              { id: "nacional", label: "Nacional", desc: "Todo el país", icon: Globe },
              { id: "global", label: "Global", desc: "Internacional", icon: Globe },
            ].map((c) => {
              const Icon = c.icon;
              const active = alcanceNivel === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAlcanceNivel(c.id as AlcanceTipo)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? "bg-accent/60 border-primary ring-1 ring-primary/25"
                      : "bg-white border-border hover:bg-muted"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${active ? "bg-accent" : "bg-muted"}`}>
                    <Icon className={`w-4.5 h-4.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${active ? "text-accent-foreground" : "text-foreground"}`}>{c.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{c.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Redes de Destino Activas */}
        <Card className="p-6 border-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-bold text-foreground">¿En qué redes compartir?</div>
            <span className="text-[13px] text-muted-foreground">
              {selectedRedes.length} redes seleccionadas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {ALL_REDES.map((r) => {
              const Icon = ICONS[r];
              const sel = selectedRedes.includes(r);

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRed(r)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    sel
                      ? "border-primary bg-accent/60 ring-1 ring-primary/25"
                      : "border-border bg-white hover:bg-muted"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary text-white" : "border-input"}`}>
                    {sel && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <Icon className="w-5 h-5 shrink-0" style={{ color: RED_COLORS[r] }} />
                  <div className="truncate">
                    <div className="text-sm font-semibold leading-tight text-foreground">{RED_LABELS[r]}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Red PubliVende
                    </div>
                  </div>
                </button>
              );
            })}

            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => setWhatsappSelected(!whatsappSelected)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                whatsappSelected
                  ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600/25"
                  : "border-border bg-white hover:bg-muted"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${whatsappSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-input"}`}>
                {whatsappSelected && <Check className="w-3.5 h-3.5" />}
              </div>
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="truncate">
                <div className="text-sm font-semibold leading-tight text-foreground">WhatsApp</div>
                <div className="text-[11px] text-muted-foreground">Canal de difusión</div>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Paso 4: Botón Grande de Difusión */}
      <div>
        <Button
          onClick={() => void ejecutarDifusion()}
          disabled={publishing || (!copy.trim() && !media)}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white text-base font-extrabold shadow-elegant rounded-xl gap-2 cursor-pointer transition-all"
        >
          {publishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Compartiendo en la Red PubliVende…
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" /> Compartir en la Red PubliVende {brainResult ? `· ${selectedRedes.length} redes + ${brainResult.comunidadesObjetivo.length} comunidades` : `· ${selectedRedes.length} redes`}
            </>
          )}
        </Button>
        <div className="flex items-center justify-between text-[13px] text-muted-foreground mt-2.5 px-1">
          <span>Costo: <b className="text-foreground">1 compartida</b></span>
          <span>
            {esIlimitado ? "Saldo ilimitado" : `Saldo restante tras publicar: ${Math.max(0, creditosRestantes - 1)}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1.5">
          Difusión multicanal centralizada: se distribuye a través de la infraestructura y comunidades oficiales de PubliVende.
        </p>

        {publishedUrl && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tu publicación ya está en vivo en la Red PubliVende.</span>
            </div>
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline flex items-center gap-1 hover:text-emerald-700"
            >
              Ver en vivo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
