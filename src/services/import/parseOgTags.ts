export interface ParsedOgTags {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
}

const LOGIN_WALL_RE = [
  /inicia\s+sesi[oó]n/i,
  /log\s*in\s+or\s+sign\s+up/i,
  /see\s+posts,\s*photos\s+and\s+more/i,
  /ve\s+publicaciones,\s*fotos/i,
];

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function matchMeta(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(`property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, "i"),
    new RegExp(`name=["']twitter:${prop}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["'][^>]*name=["']twitter:${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return undefined;
}

export function parseOgTagsFromHtml(html: string): ParsedOgTags {
  return {
    title: matchMeta(html, "title"),
    description: matchMeta(html, "description"),
    image: matchMeta(html, "image"),
    type: matchMeta(html, "type"),
  };
}

export function isLoginWallText(...texts: (string | undefined)[]): boolean {
  const joined = texts.filter(Boolean).join(" ");
  return LOGIN_WALL_RE.some((re) => re.test(joined));
}

export function isUsefulOg(og: ParsedOgTags): boolean {
  if (isLoginWallText(og.title, og.description)) return false;
  const caption = pickCaption(og);
  return caption.length >= 8;
}

export function pickCaption(og: ParsedOgTags): string {
  const desc = og.description?.trim();
  const title = og.title?.trim();
  if (desc && !isLoginWallText(desc) && desc.length >= 8) return desc;
  if (title && !isLoginWallText(title) && title.length >= 4) return title;
  return "";
}

const FB_RESERVED = new Set([
  "share", "watch", "reel", "photo", "photos", "videos", "groups", "events",
  "pages", "profile.php", "people", "marketplace", "gaming", "login", "plugins",
]);

export function extractFacebookPageName(url: string): string | undefined {
  const m = url.match(/facebook\.com\/([^/?&#]+)/i);
  if (!m) return undefined;
  const slug = m[1].toLowerCase();
  if (FB_RESERVED.has(slug) || slug.startsWith("pfbid")) return undefined;
  return m[1];
}
