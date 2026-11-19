import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RED_LABELS } from "@/lib/redes";
import { resolveTrackingPost } from "@/lib/api/tracking.functions";
import { MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import type { Red } from "@/lib/mock/types";

export const Route = createFileRoute("/p/$slug")({
  component: PublicacionPage,
});

type TrackingData = Awaited<ReturnType<typeof resolveTrackingPost>>;

function PublicacionPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // La resolución y el registro del clic ocurren en el servidor (BD real).
    resolveTrackingPost({
      data: {
        slug,
        referer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    })
      .then(setData)
      .catch(() => setData({ ok: false, error: "Publicación no encontrada" }));
  }, [slug]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold">Publicación no encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">
            El enlace puede haber expirado o la publicación ya no existe.
          </p>
          <Button asChild className="mt-4"><Link to="/">Ir al inicio</Link></Button>
        </Card>
      </div>
    );
  }

  const { post, owner } = data;
  // El mensaje lleva el link /p/<slug> y la ref: el webhook de WhatsApp
  // atribuye el lead a este post (resolvePostFromTextServer).
  const waLink = owner
    ? `https://wa.me/${(owner.codigo_pais + owner.celular).replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola! Vi tu publicación /p/${post.tracking_slug} (ref: ${post.tracking_slug})`,
      )}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <p className="text-xs text-muted-foreground">Publicación</p>
          <p className="font-semibold">{owner?.nombre_negocio ?? "PubliVende"}</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/">PubliVende</Link></Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {post.media_url && (
          <img src={post.media_url} alt="" className="w-full rounded-xl object-cover max-h-[420px] bg-muted" />
        )}
        <Card className="p-5 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.copy}</p>
          <div className="flex flex-wrap gap-1.5">
            {post.redes_destino.map((r) => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{RED_LABELS[r as Red] ?? r}</span>
            ))}
          </div>
          {post.source_url && (
            <a
              href={post.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Ver contenido original
            </a>
          )}
        </Card>

        {waLink && (
          <Button asChild className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white border-0 h-12 gap-2">
            <a href={waLink} target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5" />
              Preguntar por WhatsApp
            </a>
          </Button>
        )}

        {post.hashtags_virales && post.hashtags_virales.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags_virales.map((h) => (
              <span key={h} className="text-[10px] text-muted-foreground">{h}</span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
