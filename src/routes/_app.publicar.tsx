import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { publishPost, RED_LABELS, RED_LIMITS, RED_COLORS } from "@/services/social/mock";
import { publishPostReal } from "@/lib/api/publish.functions";
import { broadcastPostLink } from "@/services/whatsapp/mock";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { generateCaptions, type Tono } from "@/services/ai/mock";
import {
  repurposeFromLink, detectPlatform, SOURCE_LABELS, fetchMetadataFromLink,
  normalizeImportInput, isFacebookAdCode, type SourceMetadata, type NetworkVariant,
} from "@/services/import";
import { Link } from "@tanstack/react-router";
import { predict } from "@/lib/prediction";
import {
  analizarAlcanceIA,
  formatAlcanceNumero,
  totalAlcanceIA,
  type ReachAIAnalysis,
} from "@/lib/reach-ai";
import { planificarDistribucionIA, totalCanales } from "@/lib/distribution-ai";
import {
  hashtagsFromAlcanceIA,
  hashtagsFromVariants,
  mergeHashtagMaps,
  pickViralHashtags,
} from "@/lib/hashtags-ai";
import { saveDraftPost } from "@/lib/save-draft-post";
import {
  Upload, Sparkles, FolderOpen, Instagram, Facebook, Youtube, Music2,
  Heart, MessageCircle as MC, Send, TrendingUp, FlaskConical, Eye, DollarSign,
  MessageSquare, Link2, Wand2, PenLine, Globe, MapPin, Users, BarChart3, AlertTriangle,
  Hash, Radio, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { consumePublishDraft } from "@/lib/draft";
import { MunicipioCombobox } from "@/components/MunicipioCombobox";
import { ImportedPostPreview } from "@/components/ImportedPostPreview";
import { sanitizeMediaUrl } from "@/services/import/mediaUrl";
import {
  GEO_PAISES,
  estadosDePais,
  ciudadesDeEstado,
  findPaisByNombre,
  formatAlcanceLabel,
  paisFromCodigoTelefono,
  ubicacionInicialMexico,
  type AlcanceTipo,
  type PublishAlcance,
} from "@/lib/geo-targeting";
import type { Red, PostAlcance } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/publicar")({
  component: Publicar,
  validateSearch: (s: Record<string, unknown>) => ({
    link: typeof s.link === "string" ? s.link : undefined,
  }),
});

const ICONS: Record<Red, typeof Instagram> = { instagram: Instagram, facebook: Facebook, tiktok: Music2, youtube: Youtube };
const ALL_REDES: Red[] = ["instagram", "facebook", "tiktok", "youtube"];
const WA_COLOR = "#25D366";

type PublishMode = "manual" | "link";

function Publicar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { link: linkFromCalendar } = Route.useSearch();
  const accounts = useDB((db) => db.social_accounts.filter((a) => a.user_id === user?.id));
  const fbAccount = accounts.find((a) => a.red === "facebook");
  const fbConnected = fbAccount?.estado_conexion === "conectada";
  const assets = useDB((db) => db.media_assets.filter((a) => a.user_id === user?.id));
  const db = useDB((d) => d);

  const [publishMode, setPublishMode] = useState<PublishMode>("link");
  const [media, setMedia] = useState("");
  const [copy, setCopy] = useState("");
  const [copyPorRed, setCopyPorRed] = useState<Partial<Record<Red, string>>>({});
  const [variants, setVariants] = useState<Partial<Record<Red, NetworkVariant>>>({});
  const [sourceMeta, setSourceMeta] = useState<SourceMetadata | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [activeRedTab, setActiveRedTab] = useState<Red>("instagram");
  const [redes, setRedes] = useState<Red[]>([]);
  const [programar, setProgramar] = useState(false);
  const [fecha, setFecha] = useState("");
  const [iaOpen, setIaOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [tono, setTono] = useState<Tono>("casual");
  const [emojis, setEmojis] = useState(true);
  const [hashtags, setHashtags] = useState(true);
  const [cta, setCta] = useState(true);
  const [gens, setGens] = useState<string[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [adaptLoading, setAdaptLoading] = useState(false);
  const [reachFuente, setReachFuente] = useState<ReachAIAnalysis["fuente"] | null>(null);
  const [draftPostId, setDraftPostId] = useState<string | undefined>();
  const [whatsappSelected, setWhatsappSelected] = useState(true);
  const waContactCount = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id).length);

  useEffect(() => {
    if (linkFromCalendar) {
      setPublishMode("link");
      setSourceUrl(linkFromCalendar);
      toast.message("Link cargado desde calendario", { description: "Importa y adapta, o programa la publicación." });
    }
  }, [linkFromCalendar]);

  useEffect(() => {
    const draft = consumePublishDraft();
    if (!draft) return;
    if (draft.copy) setCopy(draft.copy);
    if (draft.media) setMedia(draft.media);
    if (draft.idea) setIdea(draft.idea);
    if (draft.openIa) setIaOpen(true);
    toast.success("Contenido precargado");
  }, []);

  const [abMode, setAbMode] = useState(false);
  const [copyB, setCopyB] = useState("");
  const [mediaB, setMediaB] = useState("");
  const [abMetric, setAbMetric] = useState<"vistas" | "mensajes_generados" | "engagement">("mensajes_generados");

  const paisInicial = paisFromCodigoTelefono(user?.codigo_pais ?? "+52");
  const mxInicial = ubicacionInicialMexico(user?.ciudad);
  const [alcanceTipo, setAlcanceTipo] = useState<AlcanceTipo>("local");
  const [paisSel, setPaisSel] = useState(paisInicial.nombre);
  const [estadoSel, setEstadoSel] = useState(mxInicial.estado);
  const [ciudadSel, setCiudadSel] = useState(mxInicial.ciudad);
  const [radioKm, setRadioKm] = useState(25);

  const paisGeo = findPaisByNombre(paisSel) ?? paisInicial;
  const estadosOpts = estadosDePais(paisGeo);
  const ciudadesOpts = useMemo(() => {
    const base = estadoSel ? ciudadesDeEstado(paisGeo, estadoSel) : [];
    if (ciudadSel && !base.includes(ciudadSel)) return [ciudadSel, ...base];
    return base;
  }, [paisGeo, estadoSel, ciudadSel]);

  const alcanceActual: PublishAlcance = useMemo(() => {
    if (alcanceTipo === "global") return { tipo: "global" };
    return {
      tipo: "local",
      pais: paisSel,
      pais_codigo: paisGeo.codigo,
      estado: estadoSel,
      ciudad: ciudadSel,
      radio_km: radioKm,
    };
  }, [alcanceTipo, paisSel, paisGeo.codigo, estadoSel, ciudadSel, radioKm]);

  function buildPostAlcance(): PostAlcance {
    return { ...alcanceActual };
  }

  function onPaisChange(nombre: string) {
    const p = findPaisByNombre(nombre);
    if (!p) return;
    setPaisSel(nombre);
    if (p.codigo === "MX") {
      const u = ubicacionInicialMexico(user?.ciudad);
      setEstadoSel(u.estado);
      setCiudadSel(u.ciudad);
      return;
    }
    const est = estadosDePais(p)[0] ?? "";
    setEstadoSel(est);
    setCiudadSel(ciudadesDeEstado(p, est)[0] ?? "");
  }

  function onEstadoChange(est: string) {
    setEstadoSel(est);
    setCiudadSel(ciudadesDeEstado(paisGeo, est)[0] ?? "");
  }

  function toggleRed(r: Red) {
    setRedes((rs) => rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]);
  }
  function selectAllDestinos() {
    setRedes([...ALL_REDES]);
    setWhatsappSelected(true);
    toast.success("Todas las redes + WhatsApp seleccionadas");
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) {
    const f = e.target.files?.[0]; if (!f) return; setter(URL.createObjectURL(f));
  }
  async function generar() {
    if (!idea) return toast.error("Escribe una idea");
    setIaLoading(true);
    setGens(await generateCaptions({ idea, tono, emojis, hashtags, cta }));
    setIaLoading(false);
  }

  async function importarLink() {
    const raw = sourceUrl.trim();
    if (!raw) return toast.error("Pega un link de Facebook, Instagram, TikTok o YouTube");
    if (isFacebookAdCode(raw)) {
      return toast.error("Eso es un código fbadcode de Meta, no un link. En Facebook: Compartir → Copiar enlace.", { duration: 9000 });
    }
    const parsed = normalizeImportInput(raw);
    if (!parsed?.url) return toast.error("Link no reconocido. Usa FB, IG, TikTok o YouTube.");
    const url = parsed.url;
    setImportLoading(true);
    try {
      const meta = await fetchMetadataFromLink(url, {
        facebookConnected: fbConnected,
        facebookPageName: fbAccount?.nombre_cuenta,
        facebookToken: fbAccount?.token_placeholder,
      });
      setSourceMeta(meta);
      setSourceUrl(url);
      setMedia(sanitizeMediaUrl(meta.mediaUrl));
      setCopy(meta.originalCaption);
      setCopyPorRed({});
      setVariants({});
      if (redes.length === 0) setRedes([...ALL_REDES]);
      setReachFuente(null);
      if (meta.importSource === "graph_api" && !meta.needsManualInput) {
        toast.success(`Post importado vía Facebook conectado (${fbAccount?.nombre_cuenta}). Texto e imagen listos.`);
      } else if (meta.needsManualInput) {
        toast.warning(meta.fetchWarning ?? "Completa texto o imagen manualmente.", { duration: 9000 });
      } else {
        toast.success(`Contenido importado desde ${SOURCE_LABELS[meta.platform]}. Adapta con IA para medir alcance por nicho.`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImportLoading(false);
    }
  }

  async function adaptarConIA() {
    if (!sourceMeta && !sourceUrl.trim()) return toast.error("Primero importa un link");
    if (redes.length === 0) return toast.error("Selecciona al menos una red destino");
    const caption = copy.trim() || sourceMeta?.originalCaption?.trim() || "";
    if (caption.length < 10) {
      return toast.error("Pega el texto real del post original (mín. 10 caracteres). Facebook no permite leerlo automáticamente.");
    }
    if (!media) return toast.error("Sube la imagen o video del post original antes de adaptar.");
    setAdaptLoading(true);
    try {
      const url = sourceMeta?.url ?? sourceUrl.trim();
      const platform = sourceMeta?.platform ?? detectPlatform(url);
      if (!platform) throw new Error("Link no reconocido");
      const sourceForAdapt: SourceMetadata = {
        platform,
        url: sourceMeta?.url ?? url,
        originalCaption: caption,
        mediaUrl: media,
        mediaType: sourceMeta?.mediaType ?? "imagen",
        title: sourceMeta?.title,
        fetchedFromLink: sourceMeta?.fetchedFromLink ?? false,
        pageName: sourceMeta?.pageName,
      };
      const result = await repurposeFromLink(url, redes, user?.industria ?? "general", tono, sourceForAdapt);
      setSourceMeta(result.source);
      setMedia(result.source.mediaUrl);
      setVariants(result.variants);
      setCopyPorRed(result.copyPorRed);
      const first = redes[0];
      if (first) setActiveRedTab(first);
      setReachFuente("link_ia");
      const hashtags_por_red = hashtagsFromVariants(result.variants, redes);
      const hashtags_virales = pickViralHashtags(hashtags_por_red);
      const iaAlcance = analizarAlcanceIA({
        alcance: alcanceActual,
        redes,
        calidadScore: prediccion?.score ?? 65,
        industria: user?.industria ?? "general",
        source: result.source,
        copyPorRed: result.copyPorRed,
        fuente: "link_ia",
      });
      const canales_distribucion = planificarDistribucionIA(
        redes,
        iaAlcance?.analysis.nicho ?? "default",
        alcanceActual,
      );
      const saved = saveDraftPost({
        user_id: user!.id,
        draft_id: draftPostId,
        tipo: result.source.mediaType ?? "imagen",
        media_url: result.source.mediaUrl || media,
        copy: result.copyPorRed[redes[0]!] ?? caption,
        copy_por_red: result.copyPorRed,
        source_url: result.source.url,
        redes,
        alcance: buildPostAlcance(),
        hashtags_por_red,
        hashtags_virales,
        canales_distribucion,
        nicho_label: iaAlcance?.analysis.nicho_label,
        total_canales: totalCanales(canales_distribucion),
      });
      setDraftPostId(saved.id);
      toast.success(`IA adaptó el contenido y lo guardó en Biblioteca (${redes.length} red${redes.length > 1 ? "es" : ""})`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdaptLoading(false);
    }
  }

  function updateCopyRed(red: Red, text: string) {
    setCopyPorRed((prev) => ({ ...prev, [red]: text }));
  }

  function getPreviewCopy(red: Red): string {
    if (publishMode === "link" && copyPorRed[red]) return copyPorRed[red]!;
    return copy;
  }

  const linkAdaptado = publishMode === "link" && Object.keys(copyPorRed).length > 0;

  const prediccion = useMemo(() => {
    if (!user) return null;
    if (publishMode === "link") {
      if (!linkAdaptado) return null;
      const previewCopy = copyPorRed[redes[0] ?? "instagram"] ?? "";
      if (!previewCopy.trim()) return null;
      return predict(db, user.id, {
        copy: previewCopy, redes, hasMedia: !!media,
        programar: programar && fecha ? new Date(fecha).toISOString() : undefined,
        hasCTA: true,
      });
    }
    const previewCopy = copy;
    if (!previewCopy && !media && redes.length === 0) return null;
    return predict(db, user.id, {
      copy: previewCopy, redes, hasMedia: !!media,
      programar: programar && fecha ? new Date(fecha).toISOString() : undefined,
      hasCTA: cta,
    });
  }, [db, user, copy, copyPorRed, publishMode, linkAdaptado, redes, media, programar, fecha, cta]);

  const puedeMedirAlcanceIA = useMemo(() => {
    if (redes.length === 0) return false;
    if (publishMode === "link") {
      return reachFuente === "link_ia" && Object.keys(copyPorRed).length > 0;
    }
    return copy.trim().length >= 20 && !!media;
  }, [redes.length, publishMode, reachFuente, copyPorRed, copy, media]);

  const alcanceIA = useMemo(() => {
    if (!puedeMedirAlcanceIA) return null;
    const fuente: ReachAIAnalysis["fuente"] = publishMode === "link" ? "link_ia" : "manual";
    return analizarAlcanceIA({
      alcance: alcanceActual,
      redes,
      calidadScore: prediccion?.score ?? 65,
      industria: user?.industria ?? "general",
      source: sourceMeta,
      copyPorRed: publishMode === "link" ? copyPorRed : undefined,
      copyManual: publishMode === "manual" ? copy : undefined,
      fuente,
    });
  }, [
    puedeMedirAlcanceIA, alcanceActual, redes, prediccion?.score, user?.industria,
    sourceMeta, copyPorRed, publishMode, copy,
  ]);

  useEffect(() => {
    if (publishMode === "manual" && redes.length > 0 && copy.trim().length >= 20 && media) {
      setReachFuente("manual");
    }
  }, [publishMode, redes.length, copy, media]);

  const alcancePorRed = alcanceIA?.por_red ?? [];
  const reachAnalysis = alcanceIA?.analysis ?? null;
  const totalAlcance = useMemo(() => totalAlcanceIA(alcancePorRed), [alcancePorRed]);
  const maxPersonasRed = useMemo(
    () => Math.max(...alcancePorRed.map((r) => r.personas_max), 1),
    [alcancePorRed],
  );

  const distribucionIA = useMemo(() => {
    if (!redes.length) return null;
    const nicho = reachAnalysis?.nicho ?? "default";
    return planificarDistribucionIA(redes, nicho, alcanceActual);
  }, [redes, reachAnalysis?.nicho, alcanceActual]);

  const totalCanalesIA = useMemo(
    () => (distribucionIA ? totalCanales(distribucionIA) : 0),
    [distribucionIA],
  );

  function buildPublishMeta() {
    const contentHint = [
      sourceMeta?.originalCaption ?? "",
      copy,
      ...Object.values(copyPorRed),
    ].filter(Boolean).join(" ");

    const hashtags_por_red = mergeHashtagMaps(
      hashtagsFromVariants(variants, redes),
      alcanceIA
        ? hashtagsFromAlcanceIA(alcanceIA.por_red, redes, user?.industria ?? "general", contentHint)
        : {},
    );

    const hashtags_virales = pickViralHashtags(hashtags_por_red);
    const canales_distribucion = distribucionIA ?? planificarDistribucionIA(
      redes,
      reachAnalysis?.nicho ?? "default",
      alcanceActual,
    );

    return {
      hashtags_por_red,
      hashtags_virales,
      canales_distribucion,
      nicho_label: reachAnalysis?.nicho_label,
      total_canales: totalCanales(canales_distribucion),
    };
  }

  async function publicar() {
    if (!user) return;
    if (redes.length === 0 && !whatsappSelected) return toast.error("Selecciona al menos una red o WhatsApp");
    if (!programar && !media && !(publishMode === "link" && sourceUrl)) {
      return toast.error("Sube una imagen o video, o pega un link");
    }

    const isLinkMode = publishMode === "link" && Object.keys(copyPorRed).length > 0;
    const primaryCopy = isLinkMode
      ? (copyPorRed[redes[0]] ?? copy)
      : copy;

    if (!primaryCopy && !programar) return toast.error("Agrega un copy o adapta con IA");
    if (programar && publishMode === "link" && sourceUrl && !primaryCopy) {
      // Programación solo con link — se adaptará en el cron
    } else if (!primaryCopy) {
      return toast.error("Agrega un copy o adapta con IA");
    }
    if (alcanceTipo === "local") {
      if (!paisSel || !estadoSel || !ciudadSel) {
        return toast.error("Completa país, estado y ciudad para alcance local");
      }
    }

    const alcance = buildPostAlcance();
    const meta = buildPublishMeta();

    if (abMode) {
      if (!copyB) return toast.error("Agrega el copy de la variante B");
      const finalMediaB = mediaB || media;
      const a = await publishPost({ user_id: user.id, tipo: "imagen", media_url: media, copy: primaryCopy, redes, copy_por_red: isLinkMode ? copyPorRed : undefined, source_url: sourceMeta?.url, alcance });
      const b = await publishPost({ user_id: user.id, tipo: "imagen", media_url: finalMediaB, copy: copyB, redes, alcance });
      const cur = loadDB();
      cur.ab_experiments = cur.ab_experiments ?? [];
      cur.ab_experiments.push({
        id: uid(), user_id: user.id,
        nombre: `Experimento ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
        variante_a_post_id: a.id, variante_b_post_id: b.id, metric: abMetric,
        inicio: new Date().toISOString(),
        fin_estimado: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estado: "corriendo",
      });
      saveDB(cur);
      toast.success("Experimento A/B lanzado 🧪 — ganador en 24h");
      navigate({ to: "/experimentos" });
      return;
    }

    const scheduleMeta =
      programar && fecha
        ? {
            auto_repurpose: publishMode === "link" && !!sourceUrl && !linkAdaptado,
            notify_whatsapp: whatsappSelected,
            tono: tono as "casual" | "profesional" | "formal",
          }
        : undefined;

    const published = await publishPost({
      user_id: user.id,
      tipo: sourceMeta?.mediaType ?? "imagen",
      media_url: media,
      copy: primaryCopy || "⏰ Compartida programada",
      copy_por_red: isLinkMode ? copyPorRed : undefined,
      source_url: (sourceMeta?.url ?? sourceUrl) || undefined,
      redes,
      alcance,
      programar: programar && fecha ? new Date(fecha).toISOString() : undefined,
      draft_id: draftPostId,
      schedule_meta: scheduleMeta,
      ...meta,
    });

    let realPublishErrors: string[] = [];
    const sessionToken = getSessionToken();
    if (isProductionModeClient() && sessionToken) {
      const real = await publishPostReal({
        data: {
          token: sessionToken,
          post: {
            id: published.id,
            draft_id: draftPostId,
            tipo: sourceMeta?.mediaType ?? "imagen",
            media_url: media,
            copy: primaryCopy || "⏰ Compartida programada",
            copy_por_red: isLinkMode ? copyPorRed : undefined,
            source_url: (sourceMeta?.url ?? sourceUrl) || undefined,
            alcance,
            redes,
            programar: programar && fecha ? new Date(fecha).toISOString() : undefined,
            tracking_slug: published.tracking_slug,
            schedule_meta: scheduleMeta,
            ...meta,
          },
          notifyWhatsApp: programar ? false : whatsappSelected,
        },
      });
      if (real.ok) {
        if (real.errors?.length) realPublishErrors = real.errors;
        if (real.waSent) {
          toast.success(`WhatsApp real: ${real.waSent} contacto${real.waSent > 1 ? "s" : ""} notificados`);
        }
      } else if (!real.useLocal && real.error && !programar) {
        toast.warning(`Redes reales: ${real.error}`);
      }
    } else if (whatsappSelected && !programar) {
      if (waContactCount === 0) {
        toast.message("Sin contactos en CRM", {
          description: "Publicación guardada. Cuando tengas contactos en WhatsApp CRM, podrás enviarles el link desde Biblioteca.",
        });
      } else {
        const { sent } = await broadcastPostLink(user.id, published.id);
        toast.success(`Link enviado a ${sent} contacto${sent > 1 ? "s" : ""} por WhatsApp CRM`);
      }
    }

    if (realPublishErrors.length) {
      toast.message("Algunas redes no publicaron", { description: realPublishErrors.join(" · ") });
    }

    const n = redes.length + (whatsappSelected && !programar ? 1 : 0);
    toast.success(
      programar
        ? "Publicación programada 📅 — aparece en Calendario"
        : n > 1
          ? `¡Publicado en ${n} destinos! Guardado en Biblioteca 🎉`
          : "¡Publicado! Guardado en Biblioteca 🎉",
    );
    navigate({ to: programar ? "/calendario" : "/biblioteca" });
  }

  function charCountFor(red: Red): number {
    return (publishMode === "link" ? copyPorRed[red] : copy)?.length ?? copy.length;
  }
  const overLimit = (r: Red) => charCountFor(r) > RED_LIMITS[r];
  const scoreColor = prediccion ? (prediccion.score >= 70 ? "text-green-600" : prediccion.score >= 50 ? "text-amber-600" : "text-red-600") : "";

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Crear publicación</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-card border rounded-lg p-1 text-sm">
            <button
              onClick={() => { setPublishMode("link"); setIaOpen(false); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${publishMode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Link2 className="w-4 h-4" /> Desde link
            </button>
            <button
              onClick={() => { setPublishMode("manual"); setReachFuente(null); setCopyPorRed({}); setVariants({}); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${publishMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <PenLine className="w-4 h-4" /> Manual
            </button>
          </div>
          {publishMode === "manual" && (
            <label className="flex items-center gap-2 text-sm bg-card border rounded-lg px-3 py-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              <span className="font-medium">Modo A/B</span>
              <Switch checked={abMode} onCheckedChange={setAbMode} />
            </label>
          )}
        </div>
      </div>

      {publishMode === "link" && (
        <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/20">
          <Label className="font-semibold mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Repurpose Express — pega tu publicación original
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Pega el <b>link público</b> del post (Compartir → Copiar enlace). No uses el código <code className="text-[10px]">fbadcode-…</code> de anuncios colaborativos.
          </p>
          <div className="mb-3 rounded-lg border p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-muted-foreground">Auto-publicación (opcional)</span>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link to="/configuracion">Gestionar conexiones</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_REDES.map((r) => {
                const acc = accounts.find((a) => a.red === r);
                const ok = acc?.estado_conexion === "conectada";
                const Icon = ICONS[r];
                return (
                  <Badge
                    key={r}
                    variant="outline"
                    className={`gap-1 ${ok ? "border-green-400 text-green-800 bg-green-50/80" : "text-muted-foreground"}`}
                  >
                    <Icon className="w-3 h-3" />
                    {RED_LABELS[r]}
                    {ok ? ` · ${acc?.nombre_cuenta}` : " · copiar/pegar OK"}
                  </Badge>
                );
              })}
            </div>
            {sourceMeta?.platform === "facebook" && !fbConnected && (
              <p className="text-amber-800 dark:text-amber-200">
                Para jalar posts de Facebook con imagen, conecta tu Fan Page en <Link to="/configuracion" className="underline font-medium">Configuración</Link> y vuelve a importar.
              </p>
            )}
            {sourceMeta?.platform === "facebook" && fbConnected && sourceMeta.importSource === "graph_api" && (
              <p className="text-green-800 dark:text-green-200 flex items-center gap-1">
                <Facebook className="w-3.5 h-3.5" />
                Importación automática vía {fbAccount?.nombre_cuenta}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://facebook.com/share/p/… o instagram.com/reel/…"
              onKeyDown={(e) => e.key === "Enter" && importarLink()}
            />
            <Button onClick={importarLink} disabled={importLoading} variant="outline" className="shrink-0">
              {importLoading ? "Importando…" : "Importar"}
            </Button>
          </div>
          {sourceMeta?.fetchWarning && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/90 dark:bg-amber-950/30 p-3 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-900 dark:text-amber-100">{sourceMeta.fetchWarning}</p>
            </div>
          )}
          {sourceMeta && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">Origen: {SOURCE_LABELS[sourceMeta.platform]}</Badge>
              <Badge variant="outline">{sourceMeta.mediaType === "video" ? "Video" : "Imagen"}</Badge>
              {sourceMeta.fetchedFromLink ? (
                <Badge variant="outline" className="text-green-700 border-green-300">Contenido del link</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300">Requiere copy manual</Badge>
              )}
              {sourceMeta.originalCaption && (
                <span className="text-muted-foreground truncate max-w-md">{sourceMeta.originalCaption.slice(0, 80)}…</span>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={adaptarConIA}
              disabled={adaptLoading || (!sourceMeta && !sourceUrl.trim())}
              className="bg-gradient-primary border-0 gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {adaptLoading ? "Adaptando con IA…" : `Adaptar con IA${redes.length ? ` (${redes.length} red${redes.length > 1 ? "es" : ""})` : ""}`}
            </Button>
            <Select value={tono} onValueChange={(v) => setTono(v as Tono)}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["casual", "profesional", "divertido", "promocional", "inspirador"] as Tono[]).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {publishMode === "link" ? (
            <Card className="p-5">
              <Label className="font-semibold mb-3 block flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Vista previa del post importado
              </Label>
              {sourceMeta ? (
                <ImportedPostPreview
                  platform={sourceMeta.platform}
                  pageName={sourceMeta.pageName ?? fbAccount?.nombre_cuenta}
                  caption={copy || sourceMeta.originalCaption}
                  mediaUrl={media}
                  mediaType={sourceMeta.mediaType}
                  linkTitle={sourceMeta.title}
                  linkDescription={sourceMeta.linkDescription}
                  linkUrl={sourceMeta.url}
                />
              ) : (
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center bg-primary/5">
                  <Link2 className="w-8 h-8 mx-auto text-primary/60" />
                  <p className="text-sm font-medium mt-2">Pega el link arriba y pulsa Importar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verás aquí cómo se verá el post en la red de origen.
                  </p>
                </div>
              )}
              {sourceMeta?.needsManualInput && !media && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs space-y-2">
                  <p className="text-amber-900">No se pudo jalar la imagen del link. Respaldo manual:</p>
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e, setMedia)} />
                      <Upload className="w-3.5 h-3.5 mr-1.5 inline" />Subir imagen del post
                    </label>
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-5">
              <Label className="font-semibold mb-3 block">Contenido {abMode && "— Variante A"}</Label>
              {media ? (
                <div className="relative">
                  <img src={media} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <Button size="sm" variant="secondary" onClick={() => setMedia("")} className="absolute top-2 right-2">Cambiar</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Sube imagen o video</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <Button asChild size="sm" variant="outline"><label className="cursor-pointer"><input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e, setMedia)} />Subir archivo</label></Button>
                    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><FolderOpen className="w-4 h-4 mr-1" />Biblioteca</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Tu biblioteca</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                          {assets.length === 0 && <p className="col-span-3 text-sm text-muted-foreground py-8 text-center">Tu biblioteca está vacía.</p>}
                          {assets.map((a) => (
                            <button key={a.id} onClick={() => { setMedia(a.url); setPickerOpen(false); }}>
                              <img src={a.url} alt="" className="aspect-square object-cover rounded-md hover:ring-2 ring-primary" />
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </Card>
          )}

          {publishMode === "link" && sourceMeta?.needsManualInput && !linkAdaptado && (
            <Card className="p-5 border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10">
              <Label className="font-semibold mb-2 block flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Respaldo — texto del post
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Solo si el link no trajo el texto. Con la red conectada esto no debería hacer falta.
              </p>
              <Textarea
                rows={4}
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Pega el texto del post si no se importó…"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                {copy.trim().length}/10 caracteres mínimos · {media ? "✓ media lista" : "○ esperando imagen del link"}
              </p>
            </Card>
          )}

          {publishMode === "link" && linkAdaptado ? (
            <Card className="p-5">
              <Label className="font-semibold mb-3 block">Copy adaptado por red</Label>
              <Tabs value={activeRedTab} onValueChange={(v) => setActiveRedTab(v as Red)}>
                <TabsList className="w-full flex-wrap h-auto">
                  {redes.map((r) => {
                    const Icon = ICONS[r];
                    return (
                      <TabsTrigger key={r} value={r} className="gap-1 text-xs">
                        <Icon className="w-3 h-3" />{RED_LABELS[r]}
                        {overLimit(r) && <span className="text-destructive">!</span>}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {redes.map((r) => (
                  <TabsContent key={r} value={r} className="mt-3 space-y-2">
                    {r === "youtube" && variants.youtube?.title && (
                      <div>
                        <Label className="text-xs">Título YouTube</Label>
                        <Input value={variants.youtube.title} readOnly className="text-sm bg-muted/50" />
                      </div>
                    )}
                    <Textarea
                      rows={6}
                      value={copyPorRed[r] ?? ""}
                      onChange={(e) => updateCopyRed(r, e.target.value)}
                      placeholder={`Copy para ${RED_LABELS[r]}…`}
                    />
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={overLimit(r) ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {charCountFor(r)}/{RED_LIMITS[r]} caracteres
                      </span>
                      {variants[r]?.hashtags && (
                        <span className="text-muted-foreground">
                          · {variants[r]!.hashtags.length} hashtags de nicho
                        </span>
                      )}
                    </div>
                    {variants[r]?.hashtags && (
                      <div className="flex flex-wrap gap-1">
                        {variants[r]!.hashtags.slice(0, 12).map((h) => (
                          <Badge key={h} variant="outline" className="text-[10px]">{h}</Badge>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          ) : publishMode === "manual" ? (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Copy {abMode && "— Variante A"}</Label>
                <Dialog open={iaOpen} onOpenChange={setIaOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Sparkles className="w-4 h-4" />Generar con IA</Button></DialogTrigger>
                  <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Generador IA de captions</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Idea o producto</Label><Input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ej: blusa floral nueva talla M" /></div>
                      <div><Label>Tono</Label>
                        <Select value={tono} onValueChange={(v) => setTono(v as Tono)}><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{(["casual", "profesional", "divertido", "promocional", "inspirador"] as Tono[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-2"><Switch checked={emojis} onCheckedChange={setEmojis} />Emojis</label>
                        <label className="flex items-center gap-2"><Switch checked={hashtags} onCheckedChange={setHashtags} />Hashtags</label>
                        <label className="flex items-center gap-2"><Switch checked={cta} onCheckedChange={setCta} />CTA</label>
                      </div>
                      <Button onClick={generar} disabled={iaLoading} className="w-full bg-gradient-primary border-0">{iaLoading ? "Generando…" : "Generar 3 opciones"}</Button>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {gens.map((g, i) => (
                          <button key={i} onClick={() => { setCopy(g); setIaOpen(false); toast.success("Caption aplicado"); }} className="w-full p-3 text-left text-sm rounded-lg border hover:border-primary hover:bg-accent">{g}</button>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Textarea rows={5} value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Escribe tu mensaje…" />
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {ALL_REDES.map(r => (
                  <span key={r} className={overLimit(r) ? "text-destructive font-semibold" : "text-muted-foreground"}>
                    {RED_LABELS[r]}: {charCountFor(r)}/{RED_LIMITS[r]}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}

          {abMode && publishMode === "manual" && (
            <Card className="p-5 border-primary/40 border-2 bg-primary/5">
              <Label className="font-semibold mb-3 block flex items-center gap-2"><FlaskConical className="w-4 h-4" />Variante B</Label>
              {mediaB ? (
                <div className="relative mb-3">
                  <img src={mediaB} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <Button size="sm" variant="secondary" onClick={() => setMediaB("")} className="absolute top-2 right-2">Cambiar</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                  <Button asChild size="sm" variant="outline"><label className="cursor-pointer"><input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e, setMediaB)} />Subir imagen B (opcional)</label></Button>
                  <p className="text-[10px] text-muted-foreground mt-1">Si no subes, se usa la misma imagen que A</p>
                </div>
              )}
              <Textarea rows={4} value={copyB} onChange={(e) => setCopyB(e.target.value)} placeholder="Copy alternativo para probar…" />
              <div className="mt-3">
                <Label className="text-xs">Métrica de éxito</Label>
                <Select value={abMetric} onValueChange={(v) => setAbMetric(v as typeof abMetric)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensajes_generados">DMs generados</SelectItem>
                    <SelectItem value="vistas">Vistas</SelectItem>
                    <SelectItem value="engagement">Engagement %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-semibold">Redes destino</Label>
              <Button size="sm" variant="outline" onClick={selectAllDestinos} className="h-7 text-xs">
                Todas (5)
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_REDES.map((r) => {
                const acc = accounts.find((a) => a.red === r);
                const Icon = ICONS[r];
                const sel = redes.includes(r);
                const connected = acc?.estado_conexion === "conectada";
                return (
                  <button key={r} onClick={() => toggleRed(r)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm ${sel ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}>
                    <Icon className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="font-medium">{RED_LABELS[r]}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {acc ? (connected ? acc.nombre_cuenta : "Copy listo — conectar para auto-publicar") : "Disponible"}
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setWhatsappSelected((v) => !v)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm col-span-2 ${whatsappSelected ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-border hover:border-green-400/50"}`}
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium">WhatsApp CRM</div>
                  <div className="text-[10px] text-muted-foreground">
                    {user?.whatsapp_configurado
                      ? `${waContactCount} contacto${waContactCount !== 1 ? "s" : ""} · envía link de la publicación`
                      : "Configura tu número · broadcast a contactos"}
                  </div>
                </div>
              </button>
            </div>
          </Card>

          {!abMode && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Programar</Label>
                </div>
                <Switch checked={programar} onCheckedChange={setProgramar} />
              </div>
              {programar && <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
              {programar && whatsappSelected && (
                <p className="text-[11px] text-muted-foreground pt-2 border-t">
                  WhatsApp CRM se enviará automáticamente a la hora programada si está seleccionado arriba.
                </p>
              )}
            </Card>
          )}

          <Button onClick={publicar} size="lg" className="w-full bg-gradient-primary border-0 shadow-elegant">
            {abMode ? "Lanzar experimento A/B" : programar ? "Programar publicación" : (() => {
              const parts = redes.length ? `${redes.length} red${redes.length > 1 ? "es" : ""}` : "";
              const wa = whatsappSelected ? "WhatsApp" : "";
              const label = [parts, wa].filter(Boolean).join(" + ");
              return label ? `Publicar en ${label}` : "Publicar ahora";
            })()}
          </Button>
        </div>

        <div className="space-y-4">
          {publishMode === "link" && !linkAdaptado && (
            <Card className="p-5 border-dashed border-primary/40 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <Label className="font-semibold">Predicción y alcance pendientes</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                En modo <b>Desde link</b>, la predicción y el alcance por red se calculan <b>después</b> de pegar el texto real, subir la media y pulsar <b>Adaptar con IA</b>.
                El botón «Generar con IA» del modo Manual no aplica aquí.
              </p>
            </Card>
          )}

          {prediccion && (
            <Card className="p-5 bg-gradient-to-br from-primary/10 via-pink-500/5 to-amber-500/10 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <Label className="font-semibold">Predicción IA</Label>
                </div>
                <div className={`text-2xl font-bold ${scoreColor}`}>{prediccion.score}<span className="text-xs">/100</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-card rounded-lg p-2 text-center">
                  <Eye className="w-4 h-4 mx-auto text-muted-foreground" />
                  <div className="text-sm font-bold mt-1">{prediccion.vistas_min.toLocaleString()}–{prediccion.vistas_max.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">vistas</div>
                </div>
                <div className="bg-card rounded-lg p-2 text-center">
                  <MessageSquare className="w-4 h-4 mx-auto text-muted-foreground" />
                  <div className="text-sm font-bold mt-1">{prediccion.dms_min}–{prediccion.dms_max}</div>
                  <div className="text-[10px] text-muted-foreground">DMs estimados</div>
                </div>
                <div className="bg-card rounded-lg p-2 text-center">
                  <DollarSign className="w-4 h-4 mx-auto text-green-600" />
                  <div className="text-sm font-bold mt-1 text-green-700">${prediccion.ingreso_min.toLocaleString()}–${prediccion.ingreso_max.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{prediccion.ventas_min}–{prediccion.ventas_max} ventas</div>
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                {prediccion.motivos.slice(0, 5).map((m, i) => <div key={i} className="text-muted-foreground">{m}</div>)}
              </div>
              <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                Basado en tu histórico ({prediccion.benchmark_vistas} vistas promedio/post)
              </div>
            </Card>
          )}

          <Card className="p-5 border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-sky-50/40 dark:from-blue-950/20 dark:to-sky-950/10">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <Label className="font-semibold">Alcance de la publicación</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Define si tu post se muestra a todo el mundo o solo cerca de tu negocio (útil para promos locales y delivery).
            </p>

            <div className="flex bg-muted/60 rounded-lg p-1 mb-4">
              <button
                type="button"
                onClick={() => setAlcanceTipo("global")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md transition ${alcanceTipo === "global" ? "bg-background shadow font-medium text-blue-700" : "text-muted-foreground"}`}
              >
                <Globe className="w-4 h-4" /> Global
              </button>
              <button
                type="button"
                onClick={() => setAlcanceTipo("local")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md transition ${alcanceTipo === "local" ? "bg-background shadow font-medium text-blue-700" : "text-muted-foreground"}`}
              >
                <MapPin className="w-4 h-4" /> Local
              </button>
            </div>

            {alcanceTipo === "global" ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-center">
                <Globe className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium">Alcance mundial</p>
                <p className="text-xs text-muted-foreground mt-1">Tu publicación puede verse en cualquier país donde esté activa la red.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">País</Label>
                    <Select value={paisSel} onValueChange={onPaisChange}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GEO_PAISES.map((p) => (
                          <SelectItem key={p.codigo} value={p.nombre}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Estado / región</Label>
                    <Select value={estadoSel} onValueChange={onEstadoChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
                      <SelectContent>
                        {estadosOpts.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Ciudad / municipio
                      {ciudadesOpts.length > 0 && (
                        <span className="text-muted-foreground font-normal"> ({ciudadesOpts.length})</span>
                      )}
                    </Label>
                    <MunicipioCombobox
                      value={ciudadSel}
                      onChange={setCiudadSel}
                      options={ciudadesOpts}
                      placeholder="Buscar municipio…"
                      disabled={!estadoSel}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Radio de alcance</Label>
                    <span className="text-sm font-bold text-blue-600">{radioKm} km</span>
                  </div>
                  <div className="alcance-slider">
                    <Slider
                      min={5}
                      max={150}
                      step={5}
                      value={[radioKm]}
                      onValueChange={([v]) => setRadioKm(v)}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>5 km</span>
                    <span>Barrio</span>
                    <span>Ciudad</span>
                    <span>150 km</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-200/50">
                    <div
                      className="shrink-0 rounded-full border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center transition-all"
                      style={{ width: `${28 + radioKm / 4}px`, height: `${28 + radioKm / 4}px` }}
                    >
                      <MapPin className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="text-xs">
                      <span className="font-medium text-blue-800 dark:text-blue-200">Zona estimada: </span>
                      <span className="text-muted-foreground">
                        {ciudadSel || "Tu ciudad"}, {estadoSel} — personas dentro de {radioKm} km
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-blue-200/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Alcance por red (IA + nicho)
                </Label>
              </div>

              {redes.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Selecciona al menos una red en <b>Redes destino</b> para ver el alcance estimado.
                </div>
              ) : publishMode === "link" && !puedeMedirAlcanceIA ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 p-4 text-xs space-y-2">
                  <p className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {sourceMeta ? "Link detectado — falta analizar con IA" : "Importa tu link primero"}
                  </p>
                  <p className="text-muted-foreground">
                    {sourceMeta
                      ? `Origen: ${SOURCE_LABELS[sourceMeta.platform]}. Pulsa «Adaptar con IA» para medir alcance real por nicho en ${redes.map((r) => RED_LABELS[r]).join(", ")}.`
                      : "Pega el link, importa y adapta con IA. El alcance se calcula según el nicho de mercado de cada red."}
                  </p>
                </div>
              ) : !puedeMedirAlcanceIA ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Escribe tu copy (mín. 20 caracteres) y sube media para estimar alcance en {redes.map((r) => RED_LABELS[r]).join(", ")}.
                </div>
              ) : (
                <>
                  {reachAnalysis && (
                    <div className="rounded-lg border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-violet-600 text-[10px] gap-1">
                          <Sparkles className="w-3 h-3" />Nicho: {reachAnalysis.nicho_label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{reachAnalysis.confianza}% confianza</Badge>
                        {reachAnalysis.origen_plataforma && (
                          <Badge variant="secondary" className="text-[10px]">
                            Desde {SOURCE_LABELS[reachAnalysis.origen_plataforma]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{reachAnalysis.resumen}</p>
                      <div className="flex flex-wrap gap-1">
                        {reachAnalysis.mercados.map((m) => (
                          <Badge key={m} variant="outline" className="text-[9px] font-normal">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {alcancePorRed.map((item) => {
                      const Icon = ICONS[item.red];
                      const pctBar = Math.round((item.personas_max / maxPersonasRed) * 100);
                      return (
                        <div key={item.red} className="rounded-lg border border-blue-300 bg-white/80 shadow-sm p-2.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="w-4 h-4 shrink-0" style={{ color: RED_COLORS[item.red] }} />
                            <span className="text-xs font-medium flex-1">{RED_LABELS[item.red]}</span>
                            <Badge variant="secondary" className="text-[9px] h-5 px-1.5">
                              Afinidad {item.afinidad_nicho}%
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.mercados_red.map((m) => (
                              <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">{m}</span>
                            ))}
                          </div>
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1 text-xs">
                              <Users className="w-3 h-3 text-blue-600" />
                              <span className="font-bold text-blue-700">
                                {formatAlcanceNumero(item.personas_min)}–{formatAlcanceNumero(item.personas_max)}
                              </span>
                              <span className="text-muted-foreground">personas</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatAlcanceNumero(item.impresiones_min)}–{formatAlcanceNumero(item.impresiones_max)} imp.
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                              style={{ width: `${pctBar}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.hashtags_nicho.slice(0, 4).map((h) => (
                              <span key={h} className="text-[9px] text-muted-foreground">{h}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-600/10 border border-blue-300/40 text-xs">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Total en {redes.length} red{redes.length > 1 ? "es" : ""}
                    </span>
                    <span className="font-bold text-blue-700">
                      {formatAlcanceNumero(totalAlcance.personas_min)}–{formatAlcanceNumero(totalAlcance.personas_max)} personas
                    </span>
                  </div>

                  {distribucionIA && totalCanalesIA > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                          <Radio className="w-3.5 h-3.5" />
                          Distribución IA
                        </Label>
                        <Badge className="bg-emerald-600 text-[10px]">
                          {totalCanalesIA} canales/grupos
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        La IA republicará tu contenido en estos canales según tu nicho y zona.
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {distribucionIA.map((c, i) => {
                          const Icon = ICONS[c.red];
                          return (
                            <div key={`${c.red}-${c.canal}-${i}`} className="flex items-start gap-2 text-[10px]">
                              <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: RED_COLORS[c.red] }} />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{c.canal}</span>
                                <span className="text-muted-foreground"> ×{c.cantidad}</span>
                                <p className="text-muted-foreground truncate">{c.descripcion}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(Object.keys(variants).length > 0 || alcancePorRed.length > 0) && (
                    <div className="rounded-lg border border-pink-200 bg-pink-50/60 dark:bg-pink-950/20 p-3 space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-pink-800 dark:text-pink-200">
                        <Hash className="w-3.5 h-3.5" />
                        Hashtags virales (IA)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {pickViralHashtags(
                          mergeHashtagMaps(
                            hashtagsFromVariants(variants, redes),
                            hashtagsFromAlcanceIA(
                              alcancePorRed,
                              redes,
                              user?.industria ?? "general",
                              [sourceMeta?.originalCaption, copy, ...Object.values(copyPorRed)].filter(Boolean).join(" "),
                            ),
                          ),
                        ).map((h) => (
                          <Badge key={h} variant="outline" className="text-[9px] border-pink-300 text-pink-800">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    La IA detectó el nicho del {publishMode === "link" ? "link" : "contenido"}, ajustó el alcance por afinidad de cada red
                    ({alcanceTipo === "local" ? `${radioKm} km en ${ciudadSel}` : "alcance global"}) y mercados donde se compartirá.
                    Con APIs de Meta/TikTok/Google se reemplaza por audiencia real.
                  </p>
                </>
              )}
            </div>

            <Badge variant="outline" className="mt-3 text-[10px] gap-1 border-blue-200 text-blue-700">
              {alcanceTipo === "global" ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {formatAlcanceLabel(alcanceActual)}
            </Badge>
          </Card>

          <div className="pt-2 border-t">
            <Label className="font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              Vista previa por red
            </Label>
          </div>
          {redes.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Selecciona al menos una red para ver la vista previa.</Card>}
          {redes.map((r) => (
            <Card key={r} className="overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b flex-wrap" style={{ background: RED_COLORS[r] + "11" }}>
                {(() => { const I = ICONS[r]; return <I className="w-4 h-4" />; })()}
                <span className="text-xs font-semibold">{RED_LABELS[r]}</span>
                <Badge variant="outline" className="text-[9px] h-5 gap-0.5 border-blue-200 text-blue-700 bg-blue-50/80">
                  {alcanceTipo === "global" ? <Globe className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                  {alcanceTipo === "global" ? "Global" : `${radioKm} km`}
                </Badge>
                {publishMode === "link" && copyPorRed[r] && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">Adaptado IA</Badge>
                )}
              </div>
              {publishMode === "link" && sourceMeta ? (
                <ImportedPostPreview
                  platform={r}
                  pageName={user?.nombre_negocio}
                  caption={getPreviewCopy(r) || copy || sourceMeta.originalCaption}
                  mediaUrl={media}
                  mediaType={sourceMeta.mediaType}
                  linkTitle={sourceMeta.title}
                  linkDescription={sourceMeta.linkDescription}
                  linkUrl={sourceMeta.url}
                  compact
                  className="border-0 rounded-none shadow-none"
                />
              ) : (
                <>
                  {media && <img src={media} alt="" className="w-full aspect-square object-cover" />}
                  <div className="p-3">
                    <div className="flex gap-3 mb-2 text-muted-foreground"><Heart className="w-4 h-4" /><MC className="w-4 h-4" /><Send className="w-4 h-4" /></div>
                    <p className="text-sm whitespace-pre-wrap">{getPreviewCopy(r) || <span className="text-muted-foreground">Tu copy aparecerá aquí…</span>}</p>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
