import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseOgTagsFromHtml } from "@/services/import/parseOgTags";

const BOT_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Twitterbot/1.0",
];

export const scrapeLinkOgTags = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    let lastError = "No se pudo leer el enlace";

    for (const agent of BOT_AGENTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);
        const res = await fetch(data.url, {
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": agent,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }

        const html = await res.text();
        const og = parseOgTagsFromHtml(html);
        return { ok: true as const, finalUrl: res.url, og, htmlLength: html.length };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Error de red";
      }
    }

    return { ok: false as const, error: lastError };
  });
