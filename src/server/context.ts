import { eq } from "drizzle-orm";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb, schema } from "./db";

export async function getBusinessContextServer(userId: string): Promise<string> {
  const db = getDb();
  const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const p = users[0];
  if (!p) return "";

  const prods = await db
    .select()
    .from(schema.productos)
    .where(eq(schema.productos.userId, userId));

  const lines = [
    `Negocio: ${p.nombreNegocio}`,
    `Industria: ${p.industria ?? "general"}`,
    `Descripción: ${p.descripcionNegocio ?? ""}`,
    `Público: ${p.publicoObjetivo ?? ""}`,
    `Tono: ${p.tonoMarca ?? "casual"}`,
    `Ciudad: ${p.ciudad ?? ""}`,
    `Horario: ${p.horarioAtencion ?? ""}`,
    `WhatsApp: ${p.codigoPais}${p.celular}`,
  ];

  if (prods.length) {
    lines.push("Catálogo:");
    prods.filter((pr) => pr.activo).forEach((pr) => {
      lines.push(`- ${pr.nombre}: $${pr.precio} ${pr.moneda} — ${pr.descripcion}`);
    });
  }

  return lines.filter(Boolean).join("\n");
}

export async function getPostContextBlockServer(userId: string, postId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, postId))
    .limit(1);
  const post = rows[0];
  if (!post || post.userId !== userId) return "";

  const appUrl = resolveAppBaseUrl();
  const lines = [
    `Publicación: ${post.copy.slice(0, 400)}`,
    post.sourceUrl ? `Link original: ${post.sourceUrl}` : "",
    `Página: ${appUrl}/p/${post.trackingSlug}`,
    `Ref: ${post.trackingSlug}`,
  ];
  if (post.hashtagsVirales?.length) {
    lines.push(`Hashtags: ${post.hashtagsVirales.slice(0, 8).join(" ")}`);
  }
  return lines.filter(Boolean).join("\n");
}
