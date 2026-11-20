import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseOgTagsFromHtml } from "@/services/import/parseOgTags";
import { extractFacebookPageName, isLoginWallText, pickCaption } from "@/services/import/parseOgTags";
import { verifySessionToken } from "@/server/auth/crypto";
import { getOAuthAccount } from "@/server/auth/users";
import { getFreshOAuthAccount } from "@/server/auth/token-refresh";
import { ensurePublicMediaUrl } from "@/server/publish/host-media";

const BOT_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

/** Posts demo por página — solo modo demo (token mock del cliente). */
const PAGE_POSTS: Record<string, { caption: string; imageUrl: string; title?: string }> = {
  gafcore: {
    caption:
      "Última Oportunidad\n¡Última llamada para el despegue solidario! El periodo de inscripción cierra en 48 horas. Tu idea + IA = Realidad. No te quedes atrás → www.gafcore.com",
    imageUrl: "/demo/gafcore-post.png",
    title: "Última Oportunidad — GafCore",
  },
};

function pageKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function resolveUrl(url: string): Promise<string> {
  for (const agent of BOT_AGENTS) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": agent, Accept: "text/html" },
      });
      return res.url;
    } catch {
      /* siguiente agente */
    }
  }
  return url;
}

async function scrapeOg(url: string) {
  for (const agent of BOT_AGENTS) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": agent, Accept: "text/html" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const og = parseOgTagsFromHtml(html);
      const caption = pickCaption(og);
      const image = og.image && !og.image.includes("hsts-pixel") ? og.image : "";
      if (caption && !isLoginWallText(caption, og.title)) {
        return { caption, imageUrl: image, title: og.title };
      }
    } catch {
      /* siguiente */
    }
  }
  return null;
}

/** Extrae el id del post de la URL ya resuelta (posts/pfbid…, story_fbid, fbid). */
function extractPostId(url: string): string | null {
  const patterns = [
    /\/posts\/(pfbid[\w-]+|\d+)/i,
    /story_fbid=(pfbid[\w-]+|\d+)/i,
    /[?&]fbid=(pfbid[\w-]+|\d+)/i,
    /\/videos\/(pfbid[\w-]+|\d+)/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

interface GraphPost {
  id?: string;
  message?: string;
  full_picture?: string;
  picture?: string;
  permalink_url?: string;
  attachments?: {
    data?: Array<{
      type?: string;
      title?: string;
      url?: string;
      media?: { image?: { src?: string; height?: number; width?: number }; source?: string };
      subattachments?: { data?: Array<{ media?: { image?: { src?: string } } }> };
    }>;
  };
}

function imageFromPost(post: GraphPost): string {
  if (post.full_picture && !post.full_picture.includes("pixel")) return post.full_picture;
  const atts = post.attachments?.data ?? [];
  for (const att of atts) {
    if (att?.media?.image?.src && !att.media.image.src.includes("pixel")) {
      return att.media.image.src;
    }
    const subs = att?.subattachments?.data ?? [];
    for (const sub of subs) {
      if (sub?.media?.image?.src && !sub.media.image.src.includes("pixel")) {
        return sub.media.image.src;
      }
    }
  }
  if (post.picture && !post.picture.includes("pixel")) return post.picture;
  return "";
}

const POST_FIELDS =
  "message,full_picture,picture,permalink_url,created_time,attachments{media{image},subattachments{media{image}},type,title,url}";

interface GraphPage {
  id: string;
  name: string;
  username?: string;
  access_token: string;
}

type GraphOutcome =
  | { post: { caption: string; imageUrl: string; title?: string; pageName: string } }
  | { diag: string };

/**
 * Lee el post REAL desde Graph API con el token verdadero del usuario
 * (el mismo que usa el publicador: getFreshOAuthAccount). La página dueña
 * del post se identifica desde el propio link (username), no desde la
 * cuenta conectada: el usuario puede importar posts de cualquiera de sus
 * páginas. Si algo falla, devuelve el motivo (diag) en vez de silencio.
 */
async function fetchFromGraphApi(
  userToken: string,
  connectedPageName: string,
  finalUrl: string,
  hintCaption?: string,
): Promise<GraphOutcome> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,username,access_token&access_token=${encodeURIComponent(userToken)}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: GraphPage[];
    error?: { message?: string };
  };
  if (pagesJson.error) {
    return { diag: `Meta rechazó tu conexión de Facebook: ${pagesJson.error.message ?? "token inválido"}. Reconecta Facebook en Configuración → Redes.` };
  }
  const pages = pagesJson.data ?? [];
  if (!pages.length) return { diag: "Tu conexión de Facebook no devolvió ninguna página." };

  const slug = extractFacebookPageName(finalUrl);
  const ownerPage =
    (slug ? pages.find((p) => p.username && pageKey(p.username) === pageKey(slug)) : undefined) ??
    (slug ? pages.find((p) => pageKey(p.name) === pageKey(slug)) : undefined);
  const connectedPage =
    pages.find(
      (p) => pageKey(p.name) === pageKey(connectedPageName) || p.name.toLowerCase().includes(connectedPageName.toLowerCase()),
    ) ?? pages[0];

  const toResult = (post: GraphPost, pageName: string) => ({
    caption: post.message ?? "",
    imageUrl: imageFromPost(post),
    title: post.message?.split("\n")[0]?.slice(0, 70),
    pageName,
  });

  // 1) El post exacto del link, probando los tokens con acceso probable
  const postId = extractPostId(finalUrl);
  if (postId) {
    const tokens = [
      ...new Set(
        [ownerPage?.access_token, userToken, connectedPage.access_token].filter(
          (t): t is string => !!t,
        ),
      ),
    ];
    for (const token of tokens) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${postId}?fields=${POST_FIELDS}&access_token=${encodeURIComponent(token)}`,
        );
        const post = (await res.json()) as GraphPost & { error?: unknown };
        if (!post.error && (post.message || imageFromPost(post))) {
          return { post: toResult(post, ownerPage?.name ?? connectedPage.name) };
        }
      } catch {
        /* siguiente token */
      }
    }
  }

  // 2) Respaldo: posts recientes de la página dueña (o la conectada)
  const listPage = ownerPage ?? connectedPage;
  const postsRes = await fetch(
    `https://graph.facebook.com/v21.0/${listPage.id}/published_posts?fields=${POST_FIELDS}&limit=25&access_token=${encodeURIComponent(listPage.access_token)}`,
  );
  const postsJson = (await postsRes.json()) as { data?: GraphPost[]; error?: { message?: string } };
  if (postsJson.error) {
    return { diag: `Meta no dejó leer los posts de ${listPage.name}: ${postsJson.error.message ?? "sin acceso"}.` };
  }
  const posts = postsJson.data ?? [];
  const hint = hintCaption?.slice(0, 40).toLowerCase();
  const match =
    posts.find((p) => p.permalink_url && finalUrl.includes(p.permalink_url)) ??
    posts.find((p) => hint && p.message?.toLowerCase().includes(hint));

  if (!match) {
    return {
      diag: `El post del link no está entre los 25 recientes de ${listPage.name}. Si es de otra página tuya, conecta esa página o usa su link directo (Compartir → Copiar enlace).`,
    };
  }
  return { post: toResult(match, listPage.name) };
}

export const fetchFacebookPostContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
      pageName: z.string().min(1),
      /** Sesión del usuario: con ella el servidor usa su token real de Facebook. */
      token: z.string().optional(),
      /** Legado demo: solo se usa si trae un token mock (modo demo). */
      accessToken: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const finalUrl = await resolveUrl(data.url);
    const slugFromUrl = extractFacebookPageName(finalUrl);
    const slugFromAccount = pageKey(data.pageName);
    const isShareLink = /facebook\.com\/share\/p\//i.test(finalUrl);

    const scraped = await scrapeOg(finalUrl);

    // Camino real: sesión → token verdadero (la misma fuente del publicador)
    let diag: string | undefined;
    if (data.token) {
      const session = await verifySessionToken(data.token);
      if (!session) {
        diag = "Tu sesión expiró: sal y vuelve a entrar para importar con tu cuenta de Facebook.";
      } else {
        const fresh = await getFreshOAuthAccount(session.userId, "facebook");
        const acc = fresh ?? (await getOAuthAccount(session.userId, "facebook"));
        const userToken = acc?.accessToken ?? null;
        if (!userToken) {
          diag = "No hay una conexión de Facebook activa en tu cuenta. Conéctala en Configuración → Redes.";
        } else {
          try {
            const outcome = await fetchFromGraphApi(userToken, data.pageName, finalUrl, scraped?.caption);
            if ("post" in outcome) {
              let finalImageUrl = outcome.post.imageUrl;
              if (finalImageUrl?.startsWith("http")) {
                try {
                  const hosted = await ensurePublicMediaUrl(session.userId, finalImageUrl);
                  if (hosted) finalImageUrl = hosted;
                } catch {
                  /* fallback a URL directa */
                }
              }
              return {
                ok: true as const,
                source: "graph_api" as const,
                finalUrl,
                caption: outcome.post.caption,
                imageUrl: finalImageUrl,
                title: outcome.post.title,
                pageName: outcome.post.pageName,
              };
            }
            diag = outcome.diag;
          } catch {
            diag = "Meta no respondió al leer el post. Intenta de nuevo en un momento.";
          }
        }
      }
    }

    // Modo demo: catálogo fijo, solo con token mock del cliente
    const catalog =
      (slugFromUrl ? PAGE_POSTS[pageKey(slugFromUrl)] : undefined) ??
      PAGE_POSTS[slugFromAccount] ??
      (isShareLink ? PAGE_POSTS.gafcore : undefined);

    const accountMatches =
      !slugFromUrl ||
      isShareLink ||
      pageKey(slugFromUrl) === slugFromAccount ||
      data.pageName.toLowerCase().includes(slugFromUrl.toLowerCase()) ||
      slugFromUrl.toLowerCase().includes(slugFromAccount);

    if (catalog && accountMatches && data.accessToken?.startsWith("mock_token_")) {
      return {
        ok: true as const,
        source: "graph_api" as const,
        finalUrl,
        caption: catalog.caption,
        imageUrl: catalog.imageUrl,
        title: catalog.title,
        pageName: slugFromUrl ?? data.pageName,
      };
    }

    if (scraped?.caption) {
      let finalImageUrl = scraped.imageUrl || "";
      if (finalImageUrl.startsWith("http")) {
        try {
          const session = data.token ? await verifySessionToken(data.token) : null;
          const uid = session?.userId ?? "imported";
          const hosted = await ensurePublicMediaUrl(uid, finalImageUrl);
          if (hosted) finalImageUrl = hosted;
        } catch {
          /* fallback a URL directa */
        }
      }
      return {
        ok: true as const,
        source: "graph_api_partial" as const,
        finalUrl,
        caption: scraped.caption,
        imageUrl: finalImageUrl,
        title: scraped.title,
        pageName: slugFromUrl ?? data.pageName,
        diag,
      };
    }

    return {
      ok: false as const,
      error:
        diag ??
        "No encontramos el post en tu página conectada. Verifica que el link sea de tu Fan Page.",
      finalUrl,
      diag,
    };
  });
