import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildPostWhatsAppLink } from "@/lib/whatsapp-post";
import { RED_LABELS } from "@/services/social/mock";
import { MessageCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/p/$slug")({
  component: PublicacionPage,
});

function PublicacionPage() {
  const { slug } = Route.useParams();
  const match = useDB((db) => db.posts.find((p) => p.tracking_slug === slug));
  const owner = useDB((db) =>
    match ? db.profiles.find((p) => p.id === match.user_id) : undefined,
  );

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold">Publicación no encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">
            El enlace puede haber expirado o no existe en este dispositivo.
          </p>
          <Button asChild className="mt-4"><Link to="/">Ir al inicio</Link></Button>
        </Card>
      </div>
    );
  }

  const waLink = owner ? buildPostWhatsAppLink(owner, match) : null;

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
        {match.media_url && (
          <img src={match.media_url} alt="" className="w-full rounded-xl object-cover max-h-[420px] bg-muted" />
        )}
        <Card className="p-5 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{match.copy}</p>
          <div className="flex flex-wrap gap-1.5">
            {match.redes_destino.map((r) => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{RED_LABELS[r]}</span>
            ))}
          </div>
          {match.source_url && (
            <a
              href={match.source_url}
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

        {match.hashtags_virales && match.hashtags_virales.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {match.hashtags_virales.map((h) => (
              <span key={h} className="text-[10px] text-muted-foreground">{h}</span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
