import { createFileRoute } from "@tanstack/react-router";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { buildResultados, type ResultadosPaquete } from "@/server/metrics/resultados";
import PDFDocument from "pdfkit";

/**
 * Real v2 — Reporte de Lanzamiento en PDF, generado EN EL SERVIDOR desde el
 * MISMO paquete de datos que alimenta la pantalla Resultados
 * (buildResultados). Filtros: ?dias=30 y ?postId=<uuid> (campaña = periodo,
 * o un solo post). Autenticación: Authorization: Bearer <token de sesión>.
 */

const fmt = (n: number | null | undefined) =>
  n == null ? "No disponible" : n.toLocaleString("es-MX");
const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;

function renderPdf(p: ResultadosPaquete): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fecha = new Date(p.generado_at).toLocaleDateString("es-MX", {
      day: "numeric", month: "long", year: "numeric",
    });

    doc.fontSize(22).fillColor("#0f172a").text("Reporte General de Métricas", { align: "left" });
    doc.fontSize(12).fillColor("#334155").text(p.negocio.nombre);
    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(
        `${p.filtro_post_id ? "Reporte de una publicación" : `Periodo: últimos ${p.periodo_dias} días`} · Generado el ${fecha} · Datos de las APIs oficiales de cada red`,
      );
    doc.moveDown(1);

    doc.fontSize(14).fillColor("#0f172a").text("Resultados");
    doc.fontSize(11).fillColor("#1e293b");
    const t = p.totales;
    doc.text(`Publicaciones medidas: ${t.posts}`);
    doc.text(`Vistas: ${fmt(t.vistas)} · Alcance: ${fmt(t.alcance)} · Interacciones: ${fmt(t.interacciones)}`);
    doc.text(`Clics medidos: ${fmt(t.clics)} · Conversaciones atribuidas: ${fmt(t.leads)}`);
    doc.text(`Ventas cerradas atribuidas: ${fmt(t.ventas_cerradas)} · Ingresos atribuidos: ${money(t.ingresos)}`);
    doc.text(`Seguidores (suma de redes): ${fmt(t.seguidores)}`);
    doc.moveDown(0.8);

    doc.fontSize(14).fillColor("#0f172a").text("Por red");
    doc.fontSize(11).fillColor("#1e293b");
    for (const r of p.por_red) {
      doc.text(
        `${r.red}: ${r.conectada ? "conectada" : "NO conectada"} · vistas ${fmt(r.vistas)} · alcance ${fmt(r.alcance)} · interacciones ${fmt(r.interacciones)} · seguidores ${fmt(r.seguidores)}`,
      );
    }
    doc.moveDown(0.8);

    doc.fontSize(14).fillColor("#0f172a").text("Por publicación");
    doc.fontSize(11).fillColor("#1e293b");
    if (p.por_post.length === 0) doc.text("Sin publicaciones medidas en el periodo.");
    for (const post of p.por_post) {
      doc.text(`• ${post.copy}`);
      doc
        .fontSize(10)
        .fillColor("#475569")
        .text(
          `  Vistas ${fmt(post.vistas)} · Alcance ${fmt(post.alcance)} · Interacciones ${fmt(post.interacciones)} · Clics ${fmt(post.clics)} · Conversaciones ${fmt(post.leads)} · Ventas ${fmt(post.ventas)} (${money(post.ingresos)}) · Distribuciones Red PubliVende: ${post.distribuciones}`,
        );
      doc.fontSize(11).fillColor("#1e293b");
    }
    doc.moveDown(0.8);

    doc.fontSize(14).fillColor("#0f172a").text("Contra tu nicho");
    doc.fontSize(11).fillColor("#1e293b");
    if (!p.benchmark) {
      doc.text("Aún no hay comparativa de nicho disponible.");
    } else if (!p.benchmark.muestra_suficiente) {
      doc.text(
        `Nicho «${p.benchmark.nicho}»: la comparativa se activa con más negocios midiendo (van ${p.benchmark.negocios}).`,
      );
    } else {
      doc.text(`Nicho «${p.benchmark.nicho}» · ${p.benchmark.negocios} negocios en la muestra`);
      for (const c of p.benchmark.comparaciones) {
        doc.text(`${c.etiqueta}: tú ${c.tu_valor} · mediana del nicho ${c.p50}`);
      }
      if (p.benchmark.comparaciones.length === 0) doc.text("Sin métricas comparables todavía.");
    }
    doc.moveDown(0.8);

    doc.fontSize(14).fillColor("#0f172a").text("Lo que falta por hacer");
    doc.fontSize(11).fillColor("#1e293b");
    if (p.pendientes.length === 0) doc.text("Nada pendiente: todo está conectado y midiendo.");
    for (const pend of p.pendientes) doc.text(`• ${pend.texto}`);
    doc.moveDown(1);

    doc
      .fontSize(9)
      .fillColor("#94a3b8")
      .text(
        `Frescura de datos — métricas: ${p.frescura.metricas_at ? new Date(p.frescura.metricas_at).toLocaleString("es-MX") : "sin sincronizar"} · PubliVende`,
      );

    doc.end();
  });
}

export const Route = createFileRoute("/api/reporte-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isProductionMode()) return new Response("Requiere modo producción", { status: 503 });
        const auth = request.headers.get("Authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "");
        const session = token ? await verifySessionToken(token) : null;
        if (!session) return new Response("Sesión inválida", { status: 401 });

        const url = new URL(request.url);
        const dias = Math.min(365, Math.max(1, Number(url.searchParams.get("dias") ?? 30) || 30));
        const postId = url.searchParams.get("postId") ?? undefined;

        const paquete = await buildResultados(session.userId, { dias, postId });
        const pdf = await renderPdf(paquete);
        return new Response(new Uint8Array(pdf), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="reporte-lanzamiento-publivende.pdf"`,
          },
        });
      },
    },
  },
});
