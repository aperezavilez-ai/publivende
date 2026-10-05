import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Radio, Megaphone, CheckCircle2, XCircle, ExternalLink, Sparkles, Rocket, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import {
  getPostDistribution,
  redistributePost,
  getMetaBoostForPost,
} from "@/lib/api/distribution.functions";
import { getBoostStatus, requestBoost } from "@/lib/api/red.functions";
import type { Post } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/distribuir")({
  component: Distribuir,
  validateSearch: (s: Record<string, unknown>) => ({
    post: typeof s.post === "string" ? s.post : undefined,
  }),
});

type BoostInfo = Extract<Awaited<ReturnType<typeof getBoostStatus>>, { ok: true }>;

const BOOST_ESTADO: Record<string, string> = {
  pendiente: "En revisión por el equipo PubliVende",
  publicado: "Publicado en la red PubliVende",
  rechazado: "No aprobado",
  error: "En revisión por el equipo PubliVende",
};

function Distribuir() {
  const { user } = useAuth();
  const { post: postId } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [distributions, setDistributions] = useState<Array<{
    channel_type: string;
    channel_name: string;
    status: string;
    error?: string | null;
  }>>([]);
  const [boostInfo, setBoostInfo] = useState<BoostInfo | null>(null);
  const [acepto, setAcepto] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [budget, setBudget] = useState("50");
  const [boostUrl, setBoostUrl] = useState<string | null>(null);

  async function load() {
    if (!postId) {
      setLoading(false);
      return;
    }
    const token = getSessionToken();
    if (!isProductionModeClient() || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [res, boost] = await Promise.all([
      getPostDistribution({ data: { token, postId } }),
      getBoostStatus({ data: { token, postId } }),
    ]);
    if (res.ok) {
      setPost(res.post);
      setDistributions(res.distributions);
    } else {
      toast.error(res.error ?? "No se pudo cargar");
    }
    setBoostInfo(boost.ok ? boost : null);
    setLoading(false);
  }

  async function pedirImpulso() {
    const token = getSessionToken();
    if (!postId || !token || !acepto) return;
    setBoosting(true);
    const res = await requestBoost({ data: { token, postId, acepto: true } });
    setBoosting(false);
    if (res.ok) {
      toast.success("Solicitud enviada. La IA ya revisó tu contenido.");
      await load();
    } else {
      toast.error(res.error ?? "No se pudo enviar la solicitud");
    }
  }

  useEffect(() => {
    void load();
  }, [postId]);

  async function redistribuir() {
    const token = getSessionToken();
    if (!postId || !token) return;
    setLoading(true);
    const res = await redistributePost({ data: { token, postId } });
    if (res.ok) {
      toast.success(`Distribuido en ${res.surfaces.filter((s) => s.ok).length} canales`);
      await load();
    } else {
      toast.error(res.error ?? "Error al redistribuir");
      setLoading(false);
    }
  }

  async function amplificar() {
    const token = getSessionToken();
    if (!postId || !token) return;
    const monto = Number(budget);
    if (!Number.isFinite(monto) || monto < 50) return toast.error("Mínimo $50 MXN/día");
    const res = await getMetaBoostForPost({ data: { token, postId, dailyBudgetMxn: monto } });
    if (res.ok) {
      setBoostUrl(res.boost_url);
      window.open(res.boost_url, "_blank", "noopener");
      toast.success(`Alcance estimado: ${res.estimated_reach.min.toLocaleString()}–${res.estimated_reach.max.toLocaleString()} personas/día`);
    } else {
      toast.error(res.error ?? "No se pudo preparar amplificación");
    }
  }

  if (!postId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Distribución</h1>
        <Card className="p-6 text-sm text-muted-foreground">
          Publica contenido desde <Link to="/publicar" className="text-primary underline">Crear publicación</Link> y
          verás aquí dónde se publicó y podrás impulsarlo en la red PubliVende.
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando distribución…</div>;
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">Publicación no encontrada.</Card>
      </div>
    );
  }

  const published = distributions.filter((d) => d.status === "published");
  const failed = distributions.filter((d) => d.status === "failed");

  const boost = boostInfo?.boost ?? null;
  const quota = boostInfo?.quota ?? null;
  const sinCupo = !!quota && quota.limite !== null && quota.usados >= quota.limite;
  const puedeImpulsar = post.estado === "publicado";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Distribución activa</h1>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.copy}</p>
          {post.nicho_label && (
            <Badge variant="secondary" className="mt-2 gap-1">
              <Sparkles className="w-3 h-3" />{post.nicho_label}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => void redistribuir()}>
          <Radio className="w-4 h-4 mr-1" /> Redistribuir
        </Button>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> Donde ya publicamos
        </h2>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay publicaciones exitosas. Conecta redes y redistribuye.</p>
        ) : (
          <div className="space-y-2">
            {published.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="font-medium">{d.channel_name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{d.channel_type}</Badge>
              </div>
            ))}
          </div>
        )}
        {failed.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-red-700">Errores</p>
            {failed.map((d, i) => (
              <div key={i} className="text-xs text-red-600 flex gap-2">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {d.channel_name}: {d.error}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 border-violet-200 bg-violet-50/50 dark:bg-violet-950/20">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Rocket className="w-4 h-4" /> Impulsar en la red PubliVende
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          PubliVende tiene cuentas oficiales por nicho en Facebook, Instagram, TikTok y YouTube. La IA revisa tu
          contenido, detecta su nicho y lo propone para la cuenta oficial donde está esa audiencia. Si se publica, lleva
          el link a tu WhatsApp y los clientes que lleguen se registran como tuyos. En Instagram sale como colaboración
          con tu cuenta si la tienes conectada.
        </p>

        {boost ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {boost.estado === "publicado" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : boost.estado === "rechazado" ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600" />
              )}
              <span className="font-medium">{BOOST_ESTADO[boost.estado] ?? boost.estado}</span>
              {boost.nicho && <Badge variant="secondary" className="text-[10px]">Nicho: {boost.nicho}</Badge>}
              {boost.ia_score !== null && (
                <Badge variant="outline" className="text-[10px]">Calificación IA: {boost.ia_score}/100</Badge>
              )}
            </div>
            {boost.ia_motivo && <p className="text-xs text-muted-foreground">{boost.ia_motivo}</p>}
            {boost.estado === "rechazado" && boost.motivo_rechazo && (
              <p className="text-xs text-red-700">Motivo: {boost.motivo_rechazo}</p>
            )}
            {boost.resultados.filter((r) => r.ok).map((r, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> {r.channel_name}
              </div>
            ))}
          </div>
        ) : !puedeImpulsar ? (
          <p className="text-xs text-muted-foreground">Cuando esta publicación esté publicada en tus redes podrás impulsarla.</p>
        ) : (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <Checkbox checked={acepto} onCheckedChange={(v) => setAcepto(v === true)} className="mt-0.5" />
              <span>
                Autorizo a PubliVende a publicar este contenido (texto, imagen o video) en sus cuentas oficiales,
                presentando a mi negocio y con el link a mi WhatsApp. Puedo pedir que se retire cuando quiera.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void pedirImpulso()}
                disabled={!acepto || boosting || sinCupo}
                className="bg-gradient-primary border-0"
              >
                <Rocket className="w-4 h-4 mr-1" /> {boosting ? "La IA está revisando…" : "Pedir impulso"}
              </Button>
              {quota && (
                <span className="text-xs text-muted-foreground">
                  {quota.limite === null
                    ? "Sin límite (administrador)"
                    : `${quota.usados} de ${quota.limite} impulso(s) usados este mes`}
                </span>
              )}
            </div>
            {sinCupo && (
              <p className="text-xs text-amber-700">Ya usaste los impulsos de tu plan este mes.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> Amplificar con Meta Ads
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Llega a personas que no te siguen. Presupuesto diario en MXN — abre Meta Ads para confirmar y pagar.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Presupuesto diario (MXN)</Label>
            <Input type="number" min={50} value={budget} onChange={(e) => setBudget(e.target.value)} className="w-32 h-9" />
          </div>
          <Button onClick={() => void amplificar()} className="bg-gradient-primary border-0">
            Amplificar en Facebook
          </Button>
          {boostUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={boostUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir Meta Ads
              </a>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
