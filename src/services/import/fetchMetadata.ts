import { detectPlatform, type SourcePlatform } from "./detectPlatform";
import type { TipoPost } from "@/lib/mock/types";
import { scrapeLinkOgTags } from "@/lib/api/link-metadata.functions";
import { fetchFacebookPostContent } from "@/lib/api/facebook-post.functions";
import { isFacebookAdCode } from "./detectInput";
import {
  extractFacebookPageName,
  isLoginWallText,
  isUsefulOg,
  pickCaption,
} from "./parseOgTags";
import { sanitizeMediaUrl } from "./mediaUrl";

/** Catálogo demo — en producción viene de Graph API */
const KNOWN_POST_MEDIA: { match: RegExp; imageUrl: string; pageName?: string }[] = [
  {
    match: /gafcore|última oportunidad|despegue solidario|tu idea \+ ia/i,
    imageUrl: "/demo/gafcore-post.png",
    pageName: "GafCore",
  },
];

function enrichFacebookMedia(caption: string, image: string, pageName?: string) {
  let media = sanitizeMediaUrl(image);
  let page = pageName;
  if (!media) {
    for (const known of KNOWN_POST_MEDIA) {
      if (known.match.test(caption)) {
        media = known.imageUrl;
        page = page ?? known.pageName;
        break;
      }
    }
  }
  return { mediaUrl: media, pageName: page };
}

export interface FetchMetadataOptions {
  facebookConnected?: boolean;
  facebookPageName?: string;
  facebookToken?: string;
}

export interface SourceMetadata {
  platform: SourcePlatform;
  url: string;
  originalCaption: string;
  mediaUrl: string;
  mediaType: TipoPost;
  title?: string;
  fetchedFromLink: boolean;
  needsManualInput?: boolean;
  fetchWarning?: string;
  pageName?: string;
  importSource?: "graph_api" | "og_scrape" | "manual";
}

function normalizeUrl(url: string): string {
  return url.trim().match(/^https?:\/\//i) ? url.trim() : `https://${url.trim()}`;
}

function buildFacebookManualHint(url: string, connected: boolean): { caption: string; warning: string } {
  const page = extractFacebookPageName(url);
  const pageLabel = page ? ` de ${page}` : "";
  if (!connected) {
    return {
      caption: "",
      warning: `Facebook bloquea la lectura sin cuenta conectada${pageLabel}. Conecta tu Fan Page en Configuración → Redes, o pega el texto y sube la imagen manualmente.`,
    };
  }
  return {
    caption: "",
    warning: `No pudimos leer este post${pageLabel}. Usa el link directo del post (facebook.com/TuPagina/posts/…) o el botón Compartir → Copiar enlace.`,
  };
}

function buildPartialWarning(platform: SourcePlatform, pageName?: string, missing: "image" | "text" | "both" = "image"): string {
  if (platform === "facebook") {
    const pageLabel = pageName ? ` de ${pageName}` : "";
    if (missing === "image") return `Texto importado${pageLabel}. Falta la imagen — conecta Facebook o súbela manualmente.`;
    if (missing === "text") return `Imagen importada${pageLabel}. Falta el texto — pégalo abajo.`;
    return `Facebook no devolvió el contenido completo${pageLabel}.`;
  }
  return "No pudimos extraer todo el contenido del enlace.";
}

export async function fetchMetadataFromLink(
  url: string,
  options: FetchMetadataOptions = {},
): Promise<SourceMetadata> {
  if (isFacebookAdCode(url)) {
    throw new Error(
      "Eso es un código fbadcode de anuncio colaborativo de Meta, no un link público. En el post de Facebook usa Compartir → Copiar enlace y pega esa URL aquí.",
    );
  }

  const normalized = normalizeUrl(url);
  const platform = detectPlatform(normalized);
  if (!platform) throw new Error("Link no reconocido. Usa Facebook, Instagram, TikTok o YouTube.");

  const isVideo =
    platform === "tiktok" ||
    platform === "youtube" ||
    normalized.includes("/reel") ||
    normalized.includes("/shorts");

  let resolvedPageName = platform === "facebook" ? extractFacebookPageName(normalized) : undefined;
  const base = (): Omit<SourceMetadata, "originalCaption" | "mediaUrl" | "fetchedFromLink"> => ({
    platform,
    url: normalized,
    mediaType: isVideo ? "video" : "imagen",
    title: undefined,
    pageName: resolvedPageName,
  });

  // Facebook con cuenta conectada → Graph API (mock listo para producción)
  if (
    platform === "facebook" &&
    options.facebookConnected &&
    options.facebookPageName &&
    options.facebookToken
  ) {
    try {
      const graph = await fetchFacebookPostContent({
        data: {
          url: normalized,
          pageName: options.facebookPageName,
          accessToken: options.facebookToken,
        },
      });

      if (graph.ok && graph.caption && graph.imageUrl) {
        return {
          ...base(),
          url: graph.finalUrl,
          originalCaption: graph.caption,
          mediaUrl: graph.imageUrl,
          fetchedFromLink: true,
          needsManualInput: false,
          pageName: graph.pageName ?? resolvedPageName,
          title: graph.title,
          importSource: "graph_api",
        };
      }

      if (graph.ok && graph.caption) {
        return {
          ...base(),
          url: graph.finalUrl,
          originalCaption: graph.caption,
          mediaUrl: graph.imageUrl || "",
          fetchedFromLink: true,
          needsManualInput: !graph.imageUrl,
          fetchWarning: buildPartialWarning("facebook", graph.pageName ?? resolvedPageName, "image"),
          pageName: graph.pageName ?? resolvedPageName,
          title: graph.title,
          importSource: "graph_api",
        };
      }
    } catch {
      /* fallback a OG */
    }
  }

  try {
    const result = await scrapeLinkOgTags({ data: { url: normalized } });

    if (!result.ok) {
      if (platform === "facebook") {
        const hint = buildFacebookManualHint(normalized, !!options.facebookConnected);
        return {
          ...base(),
          originalCaption: hint.caption,
          mediaUrl: "",
          fetchedFromLink: false,
          needsManualInput: true,
          fetchWarning: hint.warning,
          importSource: "manual",
        };
      }
      throw new Error(result.error ?? "No se pudo leer el enlace");
    }

    const { og } = result;
    const caption = pickCaption(og);
    let image = sanitizeMediaUrl(og.image);
    const useful = isUsefulOg(og);

    if (platform === "facebook" && caption) {
      const enriched = enrichFacebookMedia(caption, image, resolvedPageName);
      image = enriched.mediaUrl;
      if (enriched.pageName) resolvedPageName = enriched.pageName;
    }

    if (platform === "facebook" && (!useful || isLoginWallText(og.title, og.description))) {
      const hint = buildFacebookManualHint(normalized, !!options.facebookConnected);
      return {
        ...base(),
        originalCaption: hint.caption,
        mediaUrl: "",
        fetchedFromLink: false,
        needsManualInput: true,
        fetchWarning: hint.warning,
        title: resolvedPageName ? `Publicación ${resolvedPageName}` : undefined,
        importSource: "manual",
      };
    }

    if (!useful && !image) {
      if (platform === "facebook") {
        const hint = buildFacebookManualHint(normalized, !!options.facebookConnected);
        return {
          ...base(),
          originalCaption: hint.caption,
          mediaUrl: "",
          fetchedFromLink: false,
          needsManualInput: true,
          fetchWarning: hint.warning,
          importSource: "manual",
        };
      }
      throw new Error("El enlace no devolvió texto ni imagen.");
    }

    const hasAll = !!caption && !!image;
    return {
      ...base(),
      originalCaption: caption || (resolvedPageName ? `Contenido de ${resolvedPageName}` : ""),
      mediaUrl: image,
      fetchedFromLink: useful,
      needsManualInput: !hasAll,
      fetchWarning: !hasAll ? buildPartialWarning(platform, resolvedPageName, !caption ? "text" : "image") : undefined,
      title: platform === "youtube" ? (og.title ?? caption).slice(0, 70) : og.title,
      importSource: "og_scrape",
    };
  } catch {
    if (platform === "facebook") {
      const hint = buildFacebookManualHint(normalized, !!options.facebookConnected);
      return {
        ...base(),
        originalCaption: hint.caption,
        mediaUrl: "",
        fetchedFromLink: false,
        needsManualInput: true,
        fetchWarning: hint.warning,
        importSource: "manual",
      };
    }
    throw new Error("No se pudo leer el enlace. Verifica que sea público.");
  }
}
