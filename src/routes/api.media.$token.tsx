import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { isProductionMode } from "@/server/config";

export const Route = createFileRoute("/api/media/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isProductionMode()) {
          return new Response("Media hosting requiere producción", { status: 503 });
        }

        const token = params.token;
        if (!token || !/^[a-f0-9]{32}$/.test(token)) {
          return new Response("Not found", { status: 404 });
        }

        const db = getDb();
        const rows = await db
          .select()
          .from(schema.hostedMedia)
          .where(eq(schema.hostedMedia.id, token))
          .limit(1);
        const row = rows[0];
        if (!row) return new Response("Not found", { status: 404 });

        const body = Buffer.from(row.dataBase64, "base64");
        return new Response(body, {
          headers: {
            "Content-Type": row.mimeType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
