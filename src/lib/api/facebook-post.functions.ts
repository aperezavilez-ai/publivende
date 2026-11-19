import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseOgTagsFromHtml } from "@/services/import/parseOgTags";
import { extractFacebookPageName, isLoginWallText, pickCaption } from "@/services/import/parseOgTags";
import { verifySessionToken } from "@/server/auth/crypto";
import { getOAuthToken } from "@/server/auth/users";

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
    /story_fbid=(\d+)/,
    /[?&]fbid=(\d+)/,
    /\/videos\/(pfbid[\w-]+|\d+)/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

interface GraphPost {
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  attachments?: {
    data?: Array<{
      media?: { image?: { src?: string } };
      subattachments?: { data?: Array<{ media?: { image?: { src?: string } } }> };
    }>;
  };
}

function imageFromPost(post: GraphPost): string {
  if (post.full_picture) return post.full_picture;
  const att = post.attachments?.data?.[0];
  return (
    att?.media?.image?.src ??
    att?.subattachments?.data?.[0]?.media?.image?.src ??
    ""
  );
}

const POST_FIELDS =
  "message,full_picture,permalink_url,created_time,attachments{media,subattachments{media}}";

/**
 * Lee el post REAL desde Graph API con el token verdadero del usuario
 * (descifrado en servidor). Primero intenta el post exacto del link;
 * si no, busca entre los posts recientes de su página.
 */
async function fetchFromGraphApi(
  userToken: string,
  pageName: string,
  finalUrl: string,
  hintCaption?: string,
) {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
  };
  const page =
    pagesJson.data?.find(
      (p) => pageKey(p.name) === pageKey(pageName) || p.name.toLowerCase().includes(pageName.toLowerCase()),
    ) ?? pagesJson.data?.[0];
  if (!page?.access_token) return null;
  const pageToken = page.access_token;

  const toResult = (post: GraphPost) => ({
    caption: post.message ?? "",
    imageUrl: imageFromPost(post),
    title: post.message?.split("\n")[0]?.slice(0, 70),
    pageName: page.name,
  });

  // 1) El post exacto del link
  const postId = extractPostId(finalUrl);
  if (postId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${postId}?fields=${POST_FIELDS}&access_token=${encodeURIComponent(pageToken)}`,
      );
      const post = (await res.json()) as GraphPost & { error?: unknown };
      if (!post.error && (post.message || imageFromPost(post))) return toResult(post);
    } catch {
      /* se intenta la lista */
    }
  }

  // 2) Respaldo: posts recientes de la página, por permalink o por texto
  const postsRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/published_posts?fields=${POST_FIELDS}&limit=25&access_token=${encodeURIComponent(pageToken)}`,
  );
  const postsJson = (await postsRes.json()) as { data?: GraphPost[] };
  const posts = postsJson.data ?? [];
  const hint = hintCaption?.slice(0, 40).toLowerCase();
  const match =
    posts.find((p) => p.permalink_url && finalUrl.includes(p.permalink_url)) ??
    posts.find((p) => hint && p.message?.toLowerCase().includes(hint)) ??
    posts[0];

  if (!match?.message && !(match && imageFromPost(match))) return null;
  return toResult(match!);
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

    // Camino real: sesión → token verdadero descifrado en servidor → Graph API
    let userToken: string | null = null;
    if (data.token) {
      const session = await verifySessionToken(data.token);
      if (session) userToken = await getOAuthToken(session.userId, "facebook");
    }
    if (userToken) {
      try {
        const graphPost = await fetchFromGraphApi(userToken, data.pageName, finalUrl, scraped?.caption);
        if (graphPost) {
          return {
            ok: true as const,
            source: "graph_api" as const,
            finalUrl,
            caption: graphPost.caption,
            imageUrl: graphPost.imageUrl,
            title: graphPost.title,
            pageName: graphPost.pageName,
          };
        }
      } catch {
        /* cae a los respaldos */
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
      return {
        ok: true as const,
        source: "graph_api_partial" as const,
        finalUrl,
        caption: scraped.caption,
        imageUrl: scraped.imageUrl || "",
        title: scraped.title,
        pageName: slugFromUrl ?? data.pageName,
      };
    }

    return {
      ok: false as const,
      error: "No encontramos el post en tu página conectada. Verifica que el link sea de tu Fan Page.",
      finalUrl,
    };
  });
