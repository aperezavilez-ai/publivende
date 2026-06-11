import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const proxyExternalMedia = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        redirect: "follow",
        headers: {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          Accept: "image/*,*/*",
          Referer: "https://www.facebook.com/",
        },
      });
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };

      const type = res.headers.get("content-type") ?? "image/jpeg";
      if (!type.startsWith("image/") && !type.startsWith("video/")) {
        return { ok: false as const, error: "No es imagen ni video" };
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) return { ok: false as const, error: "Archivo demasiado pequeño" };

      const base64 = buf.toString("base64");
      return { ok: true as const, dataUrl: `data:${type};base64,${base64}` };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Error de red" };
    }
  });
