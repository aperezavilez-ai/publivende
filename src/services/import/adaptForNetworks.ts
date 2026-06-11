import type { Red } from "@/lib/mock/types";
import type { Tono } from "@/services/ai/mock";
import { RED_LIMITS } from "@/services/social/mock";
import { getNicheHashtags } from "./nicheHashtags";
import type { SourceMetadata } from "./fetchMetadata";

export interface NetworkVariant {
  copy: string;
  hashtags: string[];
  title?: string;
  tags?: string[];
}

const CTAS = [
  "Escríbenos por WhatsApp 💜",
  "DM para pedidos 📱",
  "Link en bio 👆",
  "Comenta YO y te escribimos",
];

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3).trimEnd() + "…";
}

function stripHashtags(text: string): string {
  return text.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
}

function buildInstagram(caption: string, hashtags: string[], tono: Tono): string {
  const body = stripHashtags(caption);
  const hook = body.split(/[.!?]/)[0]?.trim() || body.slice(0, 80);
  const rest = body.slice(hook.length).trim();
  let copy = `✨ ${hook}${rest ? `\n\n${rest}` : ""}`;
  if (tono === "promocional") copy = `🔥 ${hook}\n\n${rest || "Aprovecha antes de que se agote."}`;
  copy += `\n\n${CTAS[0]}\n\n${hashtags.join(" ")}`;
  return truncate(copy, RED_LIMITS.instagram);
}

function buildFacebook(caption: string, hashtags: string[], tono: Tono): string {
  const body = stripHashtags(caption);
  let copy = `${body}\n\n¿Te gustaría que te enviemos más info? Déjanos un comentario 👇\n\n${CTAS[1]}`;
  if (tono === "profesional") copy = `${body}\n\nCalidad garantizada y atención personalizada.\n\n${CTAS[1]}`;
  copy += `\n\n${hashtags.slice(0, 5).join(" ")}`;
  return truncate(copy, RED_LIMITS.facebook);
}

function buildTikTok(caption: string, hashtags: string[]): string {
  const body = stripHashtags(caption).slice(0, 120);
  const tags = hashtags.slice(0, 8).join(" ");
  return truncate(`${body} ${tags}`, RED_LIMITS.tiktok);
}

function buildYouTube(caption: string, hashtags: string[], title?: string): NetworkVariant {
  const body = stripHashtags(caption);
  const ytTitle = truncate(title ?? body.split("|")[0]?.trim() ?? body.slice(0, 60), 70);
  const tags = hashtags.slice(0, 10);
  const description = truncate(
    `${body}\n\n🔗 Compra / WhatsApp en el link de arriba\n\nTags: ${tags.join(", ")}\n\n#Shorts #LATAM`,
    RED_LIMITS.youtube,
  );
  return {
    copy: description,
    hashtags: tags.map((t) => t.replace(/^#/, "")),
    title: ytTitle,
    tags,
  };
}

export async function adaptForNetworks(
  source: SourceMetadata,
  targets: Red[],
  industria: string,
  tono: Tono = "casual",
): Promise<Partial<Record<Red, NetworkVariant>>> {
  await new Promise((r) => setTimeout(r, 1100));

  const result: Partial<Record<Red, NetworkVariant>> = {};
  const base = source.originalCaption.trim();
  const contentHint = [base, source.title ?? "", source.pageName ?? ""].filter(Boolean).join(" ");

  for (const red of targets) {
    const hashtags = getNicheHashtags(industria, red, undefined, contentHint);

    if (red === "youtube") {
      result.youtube = buildYouTube(base, hashtags, source.title);
      continue;
    }
    if (red === "instagram") {
      result.instagram = { copy: buildInstagram(base, hashtags, tono), hashtags };
      continue;
    }
    if (red === "facebook") {
      result.facebook = { copy: buildFacebook(base, hashtags, tono), hashtags };
      continue;
    }
    if (red === "tiktok") {
      result.tiktok = { copy: buildTikTok(base, hashtags), hashtags };
    }
  }

  return result;
}

export function variantsToCopyMap(variants: Partial<Record<Red, NetworkVariant>>): Partial<Record<Red, string>> {
  const out: Partial<Record<Red, string>> = {};
  for (const [red, v] of Object.entries(variants) as [Red, NetworkVariant][]) {
    if (red === "youtube" && v.title) {
      out.youtube = `【${v.title}】\n\n${v.copy}`;
    } else {
      out[red] = v.copy;
    }
  }
  return out;
}
