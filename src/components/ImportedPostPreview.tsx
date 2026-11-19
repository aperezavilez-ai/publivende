import { useEffect, useState } from "react";
import { Facebook, Instagram, Music2, Youtube, Heart, MessageCircle, Share2, MoreHorizontal, Link2, ExternalLink } from "lucide-react";
import type { Red, TipoPost } from "@/lib/mock/types";
import type { SourcePlatform } from "@/services/import/detectPlatform";
import { RED_COLORS, RED_LABELS } from "@/lib/redes";
import { sanitizeMediaUrl, needsMediaProxy } from "@/services/import/mediaUrl";
import { proxyExternalMedia } from "@/lib/api/media-proxy.functions";

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
} as const;

function linkDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

interface ImportedPostPreviewProps {
  platform: SourcePlatform | Red;
  pageName?: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: TipoPost;
  /** Título OG del enlace compartido. */
  linkTitle?: string;
  /** Descripción OG del enlace compartido. */
  linkDescription?: string;
  /** URL que se compartirá en redes. */
  linkUrl?: string;
  compact?: boolean;
  className?: string;
}

export function ImportedPostPreview({
  platform,
  pageName,
  caption,
  mediaUrl,
  mediaType = "imagen",
  linkTitle,
  linkDescription,
  linkUrl,
  compact = false,
  className = "",
}: ImportedPostPreviewProps) {
  const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS] ?? Facebook;
  const color = RED_COLORS[platform as Red] ?? "#1877F2";
  const [displayUrl, setDisplayUrl] = useState(() => sanitizeMediaUrl(mediaUrl));
  const [mediaFailed, setMediaFailed] = useState(false);
  const [retryingProxy, setRetryingProxy] = useState(false);

  useEffect(() => {
    const clean = sanitizeMediaUrl(mediaUrl);
    setMediaFailed(false);
    setRetryingProxy(false);
    setDisplayUrl(clean);
  }, [mediaUrl]);

  async function handleMediaError() {
    // Si la imagen directa falló y es de un CDN con protección (fbcdn, etc.), intentar convertir a base64 vía proxy
    if (!retryingProxy && displayUrl && needsMediaProxy(displayUrl)) {
      setRetryingProxy(true);
      try {
        const res = await proxyExternalMedia({ data: { url: displayUrl } });
        if (res.ok && res.dataUrl) {
          setDisplayUrl(res.dataUrl);
          return;
        }
      } catch (err) {
        console.warn("Fallo el reintento por proxy de imagen:", err);
      }
    }
    console.warn("Error definitivo renderizando imagen de vista previa:", displayUrl);
    setMediaFailed(true);
  }


  const showMedia = !!displayUrl && !mediaFailed;
  const domain = linkDomain(linkUrl);
  const previewTitle = linkTitle?.trim() || pageName || RED_LABELS[platform as Red] || "Enlace compartido";
  const previewDescription = linkDescription?.trim() || caption.trim();
  const hasLinkPreview = !!(linkTitle || linkDescription || linkUrl);

  return (
    <div className={`rounded-xl border overflow-hidden bg-white dark:bg-card shadow-sm ${className}`}>
      <div className="flex items-center gap-2 p-3 border-b">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{pageName ?? RED_LABELS[platform as Red] ?? platform}</p>
          <p className="text-[10px] text-muted-foreground">Ahora · {RED_LABELS[platform as Red] ?? platform}</p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {showMedia && mediaType === "video" && (
        <video src={displayUrl} controls className={`w-full ${compact ? "max-h-48" : ""} object-cover bg-black`} />
      )}

      {showMedia && mediaType !== "video" && (
        <img
          src={displayUrl}
          alt=""
          referrerPolicy="no-referrer"
          className={`w-full ${compact ? "max-h-56" : "aspect-video"} object-cover bg-muted`}
          onError={handleMediaError}
        />
      )}

      {mediaFailed && (
        <div className="p-4 border-b bg-amber-50/70 dark:bg-amber-950/20 text-center space-y-1">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            La imagen del post no pudo cargarse directamente desde el enlace
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Puedes subir la imagen manualmente abajo para que se incluya al publicar en tus redes.
          </p>
        </div>
      )}

      {!showMedia && !mediaFailed && hasLinkPreview && (
        <div className={`border-b bg-muted/30 ${compact ? "" : ""}`}>
          <div className={`${compact ? "h-28" : "aspect-[1.91/1]"} bg-muted/60 flex items-center justify-center border-b`}>
            <Link2 className={`${compact ? "w-8 h-8" : "w-12 h-12"} text-muted-foreground/50`} />
          </div>
          <div className={`${compact ? "p-3" : "p-4"} space-y-1 bg-muted/20`}>
            {domain && (
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{domain}</p>
            )}
            <p className={`font-semibold leading-snug ${compact ? "text-sm line-clamp-2" : "text-base line-clamp-2"}`}>
              {previewTitle}
            </p>
            {previewDescription && (
              <p className={`text-muted-foreground whitespace-pre-wrap ${compact ? "text-xs line-clamp-3" : "text-sm line-clamp-4"}`}>
                {previewDescription}
              </p>
            )}
            {linkUrl && (
              <p className="text-[10px] text-primary truncate flex items-center gap-1 pt-1">
                <ExternalLink className="w-3 h-3 shrink-0" />
                {linkUrl}
              </p>
            )}
          </div>
        </div>
      )}

      {!showMedia && !mediaFailed && !hasLinkPreview && (
        <div
          className={`${compact ? "p-4" : "p-6 aspect-video flex flex-col justify-center"} bg-muted/40 text-foreground`}
        >
          <p className={`font-medium ${compact ? "text-sm" : "text-base"} text-muted-foreground`}>
            Sin vista previa del enlace. Pega el texto o sube la imagen del post.
          </p>
        </div>
      )}

      {caption && (
        <div className="p-3 space-y-2">
          <p className={`whitespace-pre-wrap ${compact ? "text-xs line-clamp-4" : "text-sm"}`}>
            <span className="font-semibold">{pageName ?? RED_LABELS[platform as Red]} </span>
            {caption}
          </p>
          <div className="flex items-center gap-4 text-muted-foreground pt-1">
            <Heart className="w-4 h-4" />
            <MessageCircle className="w-4 h-4" />
            <Share2 className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
