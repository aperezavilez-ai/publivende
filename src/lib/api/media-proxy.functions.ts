import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

export const proxyExternalMedia = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    let lastError = "Error desconocido";
    const isFacebook = /fbcdn\.net|facebook\.com|instagram\.com/i.test(data.url);

    for (const ua of USER_AGENTS) {
      try {
        const res = await fetch(data.url, {
          redirect: "follow",
          headers: {
            "User-Agent": ua,
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
            ...(isFacebook ? { Referer: "https://www.facebook.com/" } : {}),
          },
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }

        const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
        if (!type.startsWith("image/") && !type.startsWith("video/")) {
          lastError = `Tipo no válido: ${type}`;
          continue;
        }

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 50) {
          lastError = "Archivo demasiado pequeño";
          continue;
        }

        const base64 = buf.toString("base64");
        return { ok: true as const, dataUrl: `data:${type};base64,${base64}` };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Error de red";
      }
    }

    return { ok: false as const, error: lastError };
  });

