import type { DB, Post, PostMetric, WaContact, Red } from "@/lib/mock/types";

export interface FunnelRow {
  post: Post;
  vistas: number;
  likes: number;
  mensajes: number;
  leads: number;
  ventas: number;
  ingreso: number;
  roas: number; // ingreso / (vistas * 0.001) -> CPM equivalente; mock
}

export interface FunnelSummary {
  rango_dias: number;
  red: Red | "todas";
  vistas: number;
  mensajes: number;
  leads: number;
  ventas: number;
  ingreso: number;
  conv_vista_msg: number; // %
  conv_msg_lead: number; // %
  conv_lead_venta: number; // %
  top: FunnelRow[];
}

export function buildFunnel(
  db: DB,
  userId: string,
  opts: { dias: number; red: Red | "todas"; campanaId?: string | "todas" } = { dias: 30, red: "todas" },
): FunnelSummary {
  const cutoff = Date.now() - opts.dias * 86400000;
  const posts = db.posts.filter(
    (p) => p.user_id === userId && p.estado === "publicado" && p.fecha_publicacion && +new Date(p.fecha_publicacion) >= cutoff,
  );
  const postIds = new Set(posts.map((p) => p.id));
  const metrics: PostMetric[] = db.post_metrics.filter(
    (m) => postIds.has(m.post_id) && (opts.red === "todas" || m.red === opts.red),
  );
  const contacts: WaContact[] = db.whatsapp_contacts.filter(
    (c) => c.user_id === userId && c.post_origen_id && postIds.has(c.post_origen_id),
  );

  const rows: FunnelRow[] = posts.map((post) => {
    const ms = metrics.filter((m) => m.post_id === post.id);
    const cs = contacts.filter((c) => c.post_origen_id === post.id);
    const ventas = cs.filter((c) => c.etapa === "ganado");
    const ingreso = ventas.reduce((s, c) => s + (c.monto_venta ?? 0), 0);
    const vistas = ms.reduce((s, m) => s + m.vistas, 0);
    return {
      post,
      vistas,
      likes: ms.reduce((s, m) => s + m.likes, 0),
      mensajes: ms.reduce((s, m) => s + m.mensajes_generados, 0),
      leads: cs.length,
      ventas: ventas.length,
      ingreso,
      roas: vistas > 0 ? Math.round((ingreso / (vistas * 0.01)) * 100) / 100 : 0,
    };
  });

  const vistas = rows.reduce((s, r) => s + r.vistas, 0);
  const mensajes = rows.reduce((s, r) => s + r.mensajes, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const ventas = rows.reduce((s, r) => s + r.ventas, 0);
  const ingreso = rows.reduce((s, r) => s + r.ingreso, 0);

  return {
    rango_dias: opts.dias,
    red: opts.red,
    vistas,
    mensajes,
    leads,
    ventas,
    ingreso,
    conv_vista_msg: vistas > 0 ? +((mensajes / vistas) * 100).toFixed(2) : 0,
    conv_msg_lead: mensajes > 0 ? +((leads / mensajes) * 100).toFixed(1) : 0,
    conv_lead_venta: leads > 0 ? +((ventas / leads) * 100).toFixed(1) : 0,
    top: rows.sort((a, b) => b.ingreso - a.ingreso || b.vistas - a.vistas).slice(0, 10),
  };
}
