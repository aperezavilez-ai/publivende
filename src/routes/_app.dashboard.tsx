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
import { publishPostReal } from "@/lib/api/publish.functions";
import { connectSocialNetwork } from "@/services/social/connectSocial";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { RED_LABELS, RED_LIMITS, RED_COLORS, REDES_ORDEN } from "@/lib/redes";
import { PLAN_LIMITS, type Red, type Post, type PostAlcance } from "@/lib/mock/types";
import { resolveMediaForPublish } from "@/lib/publish-status";

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

  const maxPostsMes = user ? PLAN_LIMITS[user.plan].posts_mes : 10;
  const esIlimitado = user?.plan === "pro" || user?.plan === "business";
  const creditosRestantes = esIlimitado ? 9999 : Math.max(0, maxPostsMes - postsEsteMes);

  // Estados del flujo unificado
  const [sourceUrl, setSourceUrl] = useState(linkSearch ?? "");
  const [importing, setImporting] = useState(false);
  const [sourceMeta, setSourceMeta] = useState<SourceMetadata | null>(null);
  const [media, setMedia] = useState("");
  const [copy, setCopy] = useState("");
  const [copyPorRed, setCopyPorRed] = useState<Partial<Record<Red, string>>>({});
  const [variants, setVariants] = useState<Partial<Record<Red, NetworkVariant>>>({});
  const [activeTabRed, setActiveTabRed] = useState<Red>("facebook");

  // Redes seleccionadas
  const [selectedRedes, setSelectedRedes] = useState<Red[]>(["facebook", "instagram"]);
  const [whatsappSelected, setWhatsappSelected] = useState(true);

  // Alcance y segmentación
  const [alcanceNivel, setAlcanceNivel] = useState<AlcanceTipo>("local");
  const [detectedNicho, setDetectedNicho] = useState("");
  const [reachAnalysis, setReachAnalysis] = useState<ReachAIAnalysis | null>(null);
  const [reachPorRed, setReachPorRed] = useState<AlcancePorRedIA[]>([]);
  const [totalAlcance, setTotalAlcance] = useState<{ personas_min: number; personas_max: number }>({ personas_min: 0, personas_max: 0 });

  // Publicación
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [connectingRed, setConnectingRed] = useState<string | null>(null);

  // Auto-importar si viene en URL search
  useEffect(() => {
    if (linkSearch && !sourceMeta && !importing) {
      void procesarEnlace(linkSearch);
    }
  }, [linkSearch]);

  if (!user) return null;

  // Estado de conexión por red
  function estadoRed(red: Red) {
    const acc = accounts.find((a) => a.red === red);
    return {
      conectada: acc?.estado_conexion === "conectada",
      nombre: acc?.nombre_cuenta ?? null,
    };
  }

  // Conectar red mediante popup seguro de Fase B
  async function handleConnect(red: Red) {
    setConnectingRed(red);
    try {
      const res = await connectSocialNetwork(red);
      if (res.ok) {
        toast.success(`¡${RED_LABELS[red]} conectada con éxito!`);
      } else if (!res.cancelled) {
        toast.error(res.error ?? "No se pudo completar la conexión");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConnectingRed(null);
    }
  }

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

      // 2. Inferir nicho de mercado con IA
      const nicho = inferNichoFromText(baseCaption) || user.industria || "General";
      setDetectedNicho(nicho);

      // 3. Adaptar contenido automáticamente para cada red
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

      // 4. Calcular análisis de impacto y alcance proyectado
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

        toast.success("¡Enlace importado y adaptado automáticamente con IA!", {
          description: `Nicho: ${reachRes.analysis.nicho_label} · Alcance estimado: ${formatAlcanceNumero(total.personas_min)} a ${formatAlcanceNumero(total.personas_max)} personas.`,
        });
      } else {
        toast.success("¡Enlace importado y adaptado automáticamente con IA!", {
          description: `Nicho: ${nicho}`,
        });
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

  // Difundir Ahora (Publicación Real)
  async function ejecutarDifusion() {
    if (selectedRedes.length === 0 && !whatsappSelected) {
      toast.error("Selecciona al menos una red de destino para difundir");
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
            },
            notifyWhatsApp: whatsappSelected,
          },
        });

        if (!res.ok) {
          toast.error(res.error ?? "No se pudo completar la difusión", {
            description: "Revisa el estado de tus cuentas conectadas.",
          });
          return;
        }

        const serverPost = res.post as unknown as Post;
        const db = loadDB();
        const idx = db.posts.findIndex((p) => p.id === serverPost.id);
        if (idx >= 0) db.posts[idx] = { ...db.posts[idx], ...serverPost };
        else db.posts.push(serverPost);
        saveDB(db);

        const firstResult = Object.values(res.results || {})[0];
        if (firstResult && typeof firstResult === "object" && "post_url" in firstResult) {
          setPublishedUrl((firstResult as { post_url?: string }).post_url ?? null);
        }

        toast.success("🚀 ¡Publicación difundida con éxito!", {
          description: `Se distribuyó en ${selectedRedes.length} redes sociales${whatsappSelected ? " y WhatsApp" : ""}.`,
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
      toast.error((err as Error).message || "Error al difundir publicación");
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header con Saldo y Redes en tiempo real */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Plataforma de Difusión con IA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Cabina de Difusión
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.nombre_negocio ? `${user.nombre_negocio} · ` : ""}Pega un enlace y difunde en todas tus redes con 1 clic.
            </p>
          </div>

          {/* Saldo y Recarga */}
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 px-4">
            <CreditCard className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Saldo de Compartidas</div>
              <div className="text-sm font-bold text-white">
                {esIlimitado ? "Ilimitadas (Plan Pro)" : `${creditosRestantes} restantes`}
              </div>
            </div>
            <Link to="/configuracion">
              <Button size="sm" variant="outline" className="text-xs bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-200 ml-2">
                Recargar
              </Button>
            </Link>
          </div>
        </div>

        {/* Estado y Conexión Rápida de Redes */}
        <div className="pt-4">
          <div className="text-xs font-medium text-slate-400 mb-2.5">
            Tus Redes Sociales Conectadas:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_REDES.map((red) => {
              const st = estadoRed(red);
              const Icon = ICONS[red];
              const isConnecting = connectingRed === red;

              return (
                <div
                  key={red}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    st.conectada
                      ? "bg-slate-800/90 border-emerald-500/30 text-white"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: st.conectada ? RED_COLORS[red] : "#94a3b8" }} />
                    <div className="truncate text-xs">
                      <div className="font-semibold text-slate-200">{RED_LABELS[red]}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {st.conectada ? st.nombre ?? "Conectada" : "Sin conectar"}
                      </div>
                    </div>
                  </div>

                  {st.conectada ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full shrink-0">
                      <Check className="w-3 h-3" /> Lista
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isConnecting}
                      onClick={() => handleConnect(red)}
                      className="h-6 text-[11px] px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 shrink-0 font-medium cursor-pointer"
                    >
                      {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "+ Conectar"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Paso 1: Pega tu Enlace a Difundir */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
          <h2 className="text-base font-bold text-slate-900">Pega el enlace de tu publicación o producto</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Acepta enlaces de Facebook (post, foto, video), Instagram, TikTok, YouTube o tu tienda en línea.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void procesarEnlace();
              }}
              placeholder="https://facebook.com/share/p/... o enlace de tu negocio"
              className="pl-10 h-11 text-sm bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          <Button
            onClick={() => void procesarEnlace()}
            disabled={importing || !sourceUrl.trim()}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 shadow-sm transition-all"
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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="font-medium text-slate-700">Fuente detectada:</span>
            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-800">
              {SOURCE_LABELS[sourceMeta.platform]}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
              {sourceMeta.mediaType === "video" ? "Video detectado" : "Imagen detectada"}
            </Badge>
            {detectedNicho && (
              <Badge className="bg-emerald-600 text-white gap-1">
                <Sparkles className="w-3 h-3" /> Nicho: {detectedNicho}
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* 3. Paso 2: Vista previa del contenido y adaptación por IA */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Vista previa con Foto Real */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <h2 className="text-sm font-bold text-slate-900">Vista previa del contenido</h2>
            </div>

            {sourceMeta ? (
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
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                <Link2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Pega un enlace en el paso 1</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aquí verás en tiempo real la foto real y el texto adaptado para cada red.
                </p>
              </div>
            )}
          </Card>

          {/* Impacto y Alcance Estimado por IA */}
          {reachAnalysis && (
            <Card className="p-5 border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 shadow-sm">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Impacto Proyectado por IA
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-600" /> Personas Alcanzadas
                  </div>
                  <div className="text-base font-black text-blue-900 mt-0.5">
                    {formatAlcanceNumero(totalAlcance.personas_min)} – {formatAlcanceNumero(totalAlcance.personas_max)}
                  </div>
                </div>

                <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" /> Score de Afinidad
                  </div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {reachAnalysis.confianza}% Alta
                  </div>
                </div>
              </div>

              {/* Nichos detectados */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-700 mb-1">Nichos de mercado afines:</div>
                <div className="flex flex-wrap gap-1">
                  {reachAnalysis.mercados.slice(0, 5).map((m) => (
                    <Badge key={m} variant="secondary" className="text-[10px] bg-white border border-slate-200 text-slate-700">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Hashtags Virales */}
              {viralHashtags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200/50">
                  <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-pink-600" /> Hashtags optimizados:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {viralHashtags.map((h) => (
                      <span key={h} className="text-[10px] bg-pink-50 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Columna Derecha: Copys adaptados por Red + Cobertura + Difusión */}
        <div className="lg:col-span-7 space-y-5">
          {/* Adaptación de Textos por Red */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h2 className="text-sm font-bold text-slate-900">Texto adaptado para cada red</h2>
              </div>
              <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
                Optimizado con IA
              </Badge>
            </div>

            <Tabs value={activeTabRed} onValueChange={(v) => setActiveTabRed(v as Red)}>
              <TabsList className="grid grid-cols-4 w-full h-10 bg-slate-100 p-1 rounded-lg">
                {ALL_REDES.map((r) => {
                  const Icon = ICONS[r];
                  return (
                    <TabsTrigger
                      key={r}
                      value={r}
                      className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-md"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: RED_COLORS[r] }} />
                      <span className="hidden sm:inline">{RED_LABELS[r]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {ALL_REDES.map((r) => (
                <TabsContent key={r} value={r} className="mt-3 space-y-2">
                  <Textarea
                    rows={5}
                    value={copyPorRed[r] ?? copy}
                    onChange={(e) => setCopyPorRed({ ...copyPorRed, [r]: e.target.value })}
                    placeholder={`Escribe o ajusta el copy para ${RED_LABELS[r]}…`}
                    className="text-xs leading-relaxed border-slate-200 focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {(copyPorRed[r] ?? copy).length}/{RED_LIMITS[r]} caracteres
                    </span>
                    {variants[r]?.hook && (
                      <span className="text-blue-700 font-medium truncate max-w-xs">
                        Gancho: &quot;{variants[r]!.hook}&quot;
                      </span>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>

          {/* Cobertura Geográfica */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Cobertura y Alcance Territorial</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              ¿A qué nivel geográfico deseas dirigir esta difusión?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${active ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="text-xs">{c.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Redes de Destino Activas */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-slate-900">¿A dónde difundir ahora?</div>
              <span className="text-xs text-slate-500">
                {selectedRedes.length} redes seleccionadas
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_REDES.map((r) => {
                const Icon = ICONS[r];
                const sel = selectedRedes.includes(r);
                const st = estadoRed(r);

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRed(r)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sel
                        ? "border-blue-600 bg-blue-50/60 text-blue-950 font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${sel ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>
                      {sel && <Check className="w-3 h-3" />}
                    </div>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: RED_COLORS[r] }} />
                    <div className="truncate text-xs">
                      <div>{RED_LABELS[r]}</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {st.conectada ? st.nombre ?? "Conectada" : "Sin conectar"}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => setWhatsappSelected(!whatsappSelected)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  whatsappSelected
                    ? "border-emerald-600 bg-emerald-50/60 text-emerald-950 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${whatsappSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                  {whatsappSelected && <Check className="w-3 h-3" />}
                </div>
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="truncate text-xs">
                  <div>WhatsApp</div>
                  <div className="text-[9px] text-slate-400">Canal de difusión</div>
                </div>
              </button>
            </div>
          </Card>

          {/* 4. Paso 4: Botón Grande de Difusión */}
          <div className="pt-2">
            <Button
              onClick={() => void ejecutarDifusion()}
              disabled={publishing || (!copy.trim() && !media)}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black shadow-lg rounded-xl gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Publicando en tus redes…
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" /> DIFUNDIR AHORA EN {selectedRedes.length} REDES
                </>
              )}
            </Button>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
              <span>Costo: <b>1 compartida</b></span>
              <span>
                {esIlimitado ? "Saldo ilimitado" : `Saldo restante tras publicar: ${Math.max(0, creditosRestantes - 1)}`}
              </span>
            </div>

            {publishedUrl && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tu publicación ya está en vivo en tus redes.</span>
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
      </div>
    </div>
  );
}
