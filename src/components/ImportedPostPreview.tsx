import { useEffect, useState } from "react";
import { Facebook, Instagram, Music2, Youtube, Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
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

interface ImportedPostPreviewProps {
  platform: SourcePlatform | Red;
  pageName?: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: TipoPost;
  compact?: boolean;
  className?: string;
}

export function ImportedPostPreview({
  platform,
  pageName,
  caption,
  mediaUrl,
  mediaType = "imagen",
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
  const lines = caption.trim().split("\n").filter(Boolean);
  const headline = lines[0] ?? "Post importado";
  const body = lines.slice(1).join("\n");

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
        <div className={`${compact ? "h-40" : "aspect-square"} bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground`}>
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
          className={`w-full ${compact ? "max-h-56" : "aspect-square"} object-cover bg-muted`}
          onError={() => setMediaFailed(true)}
        />
      )}

      {!loading && !showMedia && (
        <div
          className={`${compact ? "p-4" : "p-6 aspect-square flex flex-col justify-center"} bg-gradient-to-br from-violet-600/90 to-indigo-800/90 text-white`}
        >
          <p className={`font-bold ${compact ? "text-base" : "text-xl"} leading-tight`}>{headline}</p>
          {body && <p className={`mt-2 opacity-90 whitespace-pre-wrap ${compact ? "text-xs" : "text-sm"}`}>{body}</p>}
          {mediaFailed && (
            <p className="text-[10px] mt-3 opacity-75">Imagen no disponible — conecta la red o usa link directo del post.</p>
          )}
        </div>
      )}

      {(showMedia || compact) && caption && (
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
