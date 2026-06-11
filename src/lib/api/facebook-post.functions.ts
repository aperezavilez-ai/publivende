import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseOgTagsFromHtml } from "@/services/import/parseOgTags";
import { extractFacebookPageName, isLoginWallText, pickCaption } from "@/services/import/parseOgTags";

const BOT_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

/** Posts demo por página — en producción viene de Meta Graph API. */
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

async function fetchFromGraphApi(
  accessToken: string,
  pageName: string,
  finalUrl: string,
  hintCaption?: string,
) {
  if (accessToken.startsWith("mock_token_")) return null;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`,
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
  };
  const page = pagesJson.data?.find(
    (p) => pageKey(p.name) === pageKey(pageName) || p.name.toLowerCase().includes(pageName.toLowerCase()),
  ) ?? pagesJson.data?.[0];
  if (!page) return null;

  const postsRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/published_posts?fields=message,full_picture,permalink_url,created_time&limit=10&access_token=${page.access_token}`,
  );
  const postsJson = (await postsRes.json()) as {
    data?: Array<{ message?: string; full_picture?: string; permalink_url?: string }>;
  };
  const posts = postsJson.data ?? [];
  const hint = hintCaption?.slice(0, 40).toLowerCase();
  const match =
    posts.find((p) => hint && p.message?.toLowerCase().includes(hint)) ??
    posts.find((p) => finalUrl && p.permalink_url && finalUrl.includes(p.permalink_url)) ??
    posts[0];

  if (!match?.message) return null;
  return {
    caption: match.message,
    imageUrl: match.full_picture ?? "",
    title: match.message.split("\n")[0]?.slice(0, 70),
    pageName: page.name,
  };
}

export const fetchFacebookPostContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
      pageName: z.string().min(1),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const finalUrl = await resolveUrl(data.url);
    const slugFromUrl = extractFacebookPageName(finalUrl);
    const slugFromAccount = pageKey(data.pageName);
    const isShareLink = /facebook\.com\/share\/p\//i.test(finalUrl);

    const scraped = await scrapeOg(finalUrl);
    const graphPost = await fetchFromGraphApi(
      data.accessToken,
      data.pageName,
      finalUrl,
      scraped?.caption,
    );
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

    if (catalog && accountMatches && data.accessToken.startsWith("mock_token_")) {
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
        imageUrl: scraped.imageUrl || catalog?.imageUrl || "",
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
