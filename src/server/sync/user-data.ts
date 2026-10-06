import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { dbPostToClient } from "@/server/publish/service";
import { getMetricsSyncStatus } from "@/server/metrics/sync";
import { resolveNiche } from "@/lib/brain/niches";
import type {
  AutomationRule,
  DB,
  EtapaLead,
  NicheBenchmark,
  Post,
  PostMetric,
  Producto,
  WaContact,
  WaMessage,
} from "@/lib/mock/types";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISPARADORES = new Set(["mensaje_nuevo", "palabra_clave", "fuera_de_horario"]);
const ETAPAS = new Set(["nuevo", "contactado", "negociando", "ganado", "perdido"]);
const MESSAGE_HISTORY_LIMIT = 2000;

/**
 * El localStorage puede contener datos de otras cuentas usadas en el mismo navegador
 * (incluidas contraseñas del modo demo). Solo se guarda lo que pertenece al usuario.
 */
export function scopeSnapshotToUser(userId: string, raw: unknown): Partial<DB> {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<DB>;
  const mine = <T extends { user_id?: string }>(list: T[] | undefined) =>
    Array.isArray(list) ? list.filter((x) => x?.user_id === userId) : undefined;

  const posts = mine(data.posts);
  const postIds = new Set((posts ?? []).map((p) => p.id));
  const contacts = mine(data.whatsapp_contacts);
  const contactIds = new Set((contacts ?? []).map((c) => c.id));
  const campaigns = mine(data.ad_campaigns);
  const campaignIds = new Set((campaigns ?? []).map((c) => c.id));

  return {
    profiles: (data.profiles ?? []).filter((p) => p?.id === userId).map((p) => ({ ...p, password: "" })),
    social_accounts: mine(data.social_accounts),
    posts,
    post_metrics: data.post_metrics?.filter((m) => postIds.has(m.post_id)),
    whatsapp_contacts: contacts,
    whatsapp_messages: data.whatsapp_messages?.filter((m) => contactIds.has(m.contact_id)),
    automation_rules: mine(data.automation_rules),
    media_assets: mine(data.media_assets),
    inbox: mine(data.inbox),
    productos: mine(data.productos),
    ad_campaigns: campaigns,
    ad_metrics: data.ad_metrics?.filter((m) => campaignIds.has(m.campaign_id)),
    marketplace_recetas: data.marketplace_recetas,
    ab_experiments: mine(data.ab_experiments),
    brain_reports: mine(data.brain_reports)?.slice(-12),
  };
}

/**
 * Copia a tablas relacionales lo que el servidor necesita para actuar sin el navegador
 * (webhook de WhatsApp, IA, broadcast): catálogo, reglas y cambios del CRM.
 */
export async function mirrorSnapshotToTables(userId: string, data: Partial<DB>) {
  const db = getDb();

  const productos = (data.productos ?? []).filter(
    (p): p is Producto => p?.user_id === userId && typeof p.nombre === "string" && Number.isFinite(Number(p.precio)),
  );
  if (Array.isArray(data.productos)) {
    await db.delete(schema.productos).where(eq(schema.productos.userId, userId));
  }
  if (productos.length) {
    await db.insert(schema.productos).values(
      productos.map((p) => ({
        ...(UUID_RX.test(p.id) ? { id: p.id } : {}),
        userId,
        nombre: p.nombre,
        precio: Number(p.precio),
        moneda: p.moneda ?? "MXN",
        descripcion: p.descripcion ?? "",
        imagen: p.imagen ?? "",
        linkPago: p.link_pago ?? "",
        pagoProvider: p.pago_provider,
        slugPublico: p.slug_publico,
        activo: p.activo !== false,
      })),
    );
  }

  const reglas = (data.automation_rules ?? []).filter(
    (r): r is AutomationRule => r?.user_id === userId && DISPARADORES.has(r.disparador) && typeof r.respuesta === "string",
  );
  if (Array.isArray(data.automation_rules)) {
    await db.delete(schema.automationRules).where(eq(schema.automationRules.userId, userId));
  }
  if (reglas.length) {
    await db.insert(schema.automationRules).values(
      reglas.map((r) => ({
        ...(UUID_RX.test(r.id) ? { id: r.id } : {}),
        userId,
        nombre: r.nombre,
        disparador: r.disparador,
        palabraClave: r.palabra_clave ?? null,
        respuesta: r.respuesta,
        activa: r.activa,
      })),
    );
  }

  const localContacts = (data.whatsapp_contacts ?? []).filter(
    (c): c is WaContact => c?.user_id === userId && UUID_RX.test(c.id),
  );
  if (localContacts.length) {
    const serverIds = new Set(
      (
        await db
          .select({ id: schema.whatsappContacts.id })
          .from(schema.whatsappContacts)
          .where(and(eq(schema.whatsappContacts.userId, userId), inArray(schema.whatsappContacts.id, localContacts.map((c) => c.id))))
      ).map((r) => r.id),
    );
    for (const c of localContacts) {
      if (!serverIds.has(c.id)) continue;
      await db
        .update(schema.whatsappContacts)
        .set({
          nombre: c.nombre,
          etiqueta: c.etiqueta ?? "",
          etapa: (ETAPAS.has(c.etapa) ? c.etapa : "nuevo") as EtapaLead,
          notas: c.notas ?? "",
          montoVenta: c.monto_venta ?? null,
          noLeidos: c.no_leidos ?? 0,
        })
        .where(and(eq(schema.whatsappContacts.id, c.id), eq(schema.whatsappContacts.userId, userId)));
    }
  }
}

export function contactToClient(row: typeof schema.whatsappContacts.$inferSelect): WaContact {
  return {
    id: row.id,
    user_id: row.userId,
    nombre: row.nombre,
    celular: row.celular,
    etiqueta: row.etiqueta,
    etapa: row.etapa as EtapaLead,
    origen: row.origen,
    post_origen_id: row.postOrigenId ?? undefined,
    notas: row.notas,
    monto_venta: row.montoVenta ?? undefined,
    fecha_creacion: row.fechaCreacion.toISOString(),
    no_leidos: row.noLeidos,
    lead_score: row.leadScore ?? undefined,
    score_motivos: row.scoreMotivos ?? undefined,
  };
}

export function messageToClient(row: typeof schema.whatsappMessages.$inferSelect): WaMessage {
  return {
    id: row.id,
    contact_id: row.contactId,
    direccion: row.direccion,
    texto: row.texto,
    automatico: row.automatico,
    post_id: row.postId ?? undefined,
    timestamp: row.createdAt.toISOString(),
  };
}

/**
 * Agrega al snapshot lo que solo existe en el servidor: contactos y mensajes que llegaron
 * por webhook mientras el navegador estaba cerrado, y posts publicados por el cron.
 */
export async function mergeTablesIntoSnapshot(userId: string, snapshot: Partial<DB> | null): Promise<Partial<DB>> {
  const db = getDb();
  const data: Partial<DB> = { ...(snapshot ?? {}) };

  const [contactRows, messageRows, postRows, oauthRows] = await Promise.all([
    db.select().from(schema.whatsappContacts).where(eq(schema.whatsappContacts.userId, userId)),
    db
      .select()
      .from(schema.whatsappMessages)
      .where(eq(schema.whatsappMessages.userId, userId))
      .orderBy(desc(schema.whatsappMessages.createdAt))
      .limit(MESSAGE_HISTORY_LIMIT),
    db.select().from(schema.posts).where(eq(schema.posts.userId, userId)),
    db.select().from(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, userId)),
  ]);

  const socialMap = new Map((data.social_accounts ?? []).map((s) => [s.red, s]));
  for (const row of oauthRows) {
    const existing = socialMap.get(row.red);
    socialMap.set(row.red, {
      id: row.id,
      user_id: row.userId,
      red: row.red,
      nombre_cuenta: row.nombreCuenta,
      avatar: row.avatar ?? existing?.avatar ?? "",
      estado_conexion: (row.estadoConexion === "conectada" ? "conectada" : "desconectada") as "conectada" | "desconectada",
      token_placeholder: "oauth_authenticated",
      external_account_id: row.externalAccountId ?? undefined,
      token_expires_at: row.tokenExpiresAt?.toISOString() ?? undefined,
      oauth_provider: (row.oauthProvider as "meta" | "google" | "tiktok") ?? undefined,
    });
  }
  data.social_accounts = Array.from(socialMap.values());

  const contacts = new Map((data.whatsapp_contacts ?? []).map((c) => [c.id, c]));
  for (const row of contactRows) {
    const server = contactToClient(row);
    const local = contacts.get(row.id);
    contacts.set(
      row.id,
      local
        ? {
            ...local,
            no_leidos: Math.max(local.no_leidos ?? 0, server.no_leidos),
            post_origen_id: local.post_origen_id ?? server.post_origen_id,
            lead_score: server.lead_score ?? local.lead_score,
            score_motivos: server.score_motivos ?? local.score_motivos,
          }
        : server,
    );
  }
  data.whatsapp_contacts = Array.from(contacts.values());

  const messages = new Map((data.whatsapp_messages ?? []).map((m) => [m.id, m]));
  for (const row of messageRows) {
    if (!messages.has(row.id)) messages.set(row.id, messageToClient(row));
  }
  data.whatsapp_messages = Array.from(messages.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const posts = new Map<string, Post>((data.posts ?? []).map((p) => [p.id, p]));
  for (const row of postRows) {
    const server = dbPostToClient(row);
    const local = posts.get(row.id);
    const defined = Object.fromEntries(
      Object.entries(server).filter(([, v]) => v !== undefined && v !== null),
    ) as Partial<Post>;
    posts.set(row.id, local ? { ...local, ...defined } : server);
  }
  data.posts = Array.from(posts.values());

  try {
    await mergeRealMetrics(userId, data);
  } catch (err) {
    console.error("[mergeTablesIntoSnapshot] metrics", err);
  }

  try {
    data.niche_benchmark = await loadNicheBenchmark(userId);
  } catch (err) {
    console.error("[mergeTablesIntoSnapshot] benchmark", err);
  }

  return data;
}

/** Comparativa anónima del nicho del negocio (solo agregados, nunca datos de otros negocios). */
async function loadNicheBenchmark(userId: string): Promise<NicheBenchmark | null> {
  const db = getDb();
  const [user] = await db
    .select({ industria: schema.users.industria })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return null;
  const nicho = resolveNiche(user.industria).key;
  const [row] = await db
    .select()
    .from(schema.nicheBenchmarks)
    .where(eq(schema.nicheBenchmarks.nicho, nicho))
    .limit(1);
  if (!row) return null;
  return {
    nicho: row.nicho,
    negocios: row.negocios,
    metricas: row.metricas as NicheBenchmark["metricas"],
    ganchos: row.ganchos as NicheBenchmark["ganchos"],
    actualizado_at: row.updatedAt.toISOString(),
  };
}

const SNAPSHOT_HISTORY_DAYS = 120;

/**
 * Las métricas leídas de las APIs sustituyen a las estimadas del mismo post y red.
 * Los mensajes de WhatsApp se atribuyen una sola vez por post (a su primera red con métricas).
 */
export async function mergeRealMetrics(userId: string, data: Partial<DB>) {
  const db = getDb();
  const since = new Date(Date.now() - SNAPSHOT_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [metricRows, snapshotRows, syncStatus] = await Promise.all([
    db.select().from(schema.postMetrics).where(eq(schema.postMetrics.userId, userId)),
    db
      .select()
      .from(schema.accountSnapshots)
      .where(and(eq(schema.accountSnapshots.userId, userId), gte(schema.accountSnapshots.fecha, since))),
    getMetricsSyncStatus(userId),
  ]);

  data.metrics_sync = syncStatus;
  data.account_snapshots = snapshotRows
    .map((r) => ({
      red: r.red,
      fecha: r.fecha,
      seguidores: r.seguidores,
      publicaciones: r.publicaciones,
      vistas_totales: r.vistasTotales,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (!metricRows.length) return;

  const leadsByPost = new Map<string, number>();
  for (const c of data.whatsapp_contacts ?? []) {
    if (c.post_origen_id) leadsByPost.set(c.post_origen_id, (leadsByPost.get(c.post_origen_id) ?? 0) + 1);
  }

  const real = new Map<string, PostMetric>();
  const attributed = new Set<string>();
  for (const r of [...metricRows].sort((a, b) => a.red.localeCompare(b.red))) {
    const leads = attributed.has(r.postId) ? 0 : (leadsByPost.get(r.postId) ?? 0);
    attributed.add(r.postId);
    real.set(`${r.postId}|${r.red}`, {
      id: r.id,
      post_id: r.postId,
      red: r.red,
      vistas: r.vistas,
      likes: r.likes,
      comentarios: r.comentarios,
      compartidos: r.compartidos,
      seguidores_ganados: 0,
      mensajes_generados: leads,
      alcance: r.alcance,
      guardados: r.guardados,
      clics: r.clics,
      fuente: "real",
      actualizado_at: r.fetchedAt.toISOString(),
    });
  }

  const kept = (data.post_metrics ?? []).filter((m) => !real.has(`${m.post_id}|${m.red}`));
  data.post_metrics = [...kept, ...real.values()];
}
