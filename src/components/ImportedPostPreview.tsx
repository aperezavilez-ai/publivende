import { useEffect, useState } from "react";
import { Facebook, Instagram, Music2, Youtube, Heart, MessageCircle, Share2, MoreHorizontal, Link2, ExternalLink } from "lucide-react";
import type { Red, TipoPost } from "@/lib/mock/types";
import type { SourcePlatform } from "@/services/import/detectPlatform";
import { RED_COLORS, RED_LABELS } from "@/services/social/mock";
import { needsMediaProxy, sanitizeMediaUrl } from "@/services/import/mediaUrl";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clean = sanitizeMediaUrl(mediaUrl);
    setMediaFailed(false);
    if (!clean) {
      setDisplayUrl("");
      return;
    }
    if (!needsMediaProxy(clean)) {
      setDisplayUrl(clean);
      return;
    }
    let cancelled = false;
    setLoading(true);
    proxyExternalMedia({ data: { url: clean } })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setDisplayUrl(res.dataUrl);
        else {
          setDisplayUrl("");
          setMediaFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUrl("");
          setMediaFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [mediaUrl]);

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

      {loading && (
        <div className={`${compact ? "h-40" : "aspect-video"} bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground`}>
          Cargando media del post…
        </div>
      )}

      {!loading && showMedia && mediaType === "video" && (
        <video src={displayUrl} controls className={`w-full ${compact ? "max-h-48" : ""} object-cover bg-black`} />
      )}

      {!loading && showMedia && mediaType !== "video" && (
        <img
          src={displayUrl}
          alt=""
          className={`w-full ${compact ? "max-h-56" : "aspect-video"} object-cover bg-muted`}
          onError={() => setMediaFailed(true)}
        />
      )}

      {!loading && !showMedia && hasLinkPreview && (
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

      {!loading && !showMedia && !hasLinkPreview && (
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
