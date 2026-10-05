import { desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/server/db";
import type { DbUser } from "@/server/db/schema";
import { dbPostToClient } from "@/server/publish/service";
import { contactToClient, messageToClient } from "@/server/sync/user-data";
import { diagnose, type BrainInput, type Diagnosis } from "@/lib/brain/diagnose";
import { resolveNiche } from "@/lib/brain/niches";
import type {
  AutomationRule,
  NicheBenchmark,
  PagoProvider,
  Producto,
  Profile,
  SocialAccount,
} from "@/lib/mock/types";

const MESSAGE_LIMIT = 2000;

export function dbUserToProfile(u: DbUser): Profile {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    password: "",
    celular: u.celular,
    codigo_pais: u.codigoPais,
    nombre_negocio: u.nombreNegocio,
    industria: u.industria ?? undefined,
    descripcion_negocio: u.descripcionNegocio ?? undefined,
    publico_objetivo: u.publicoObjetivo ?? undefined,
    tono_marca: u.tonoMarca ?? undefined,
    ciudad: u.ciudad ?? undefined,
    horario_atencion: u.horarioAtencion ?? undefined,
    pago_provider_default: (u.pagoProviderDefault ?? undefined) as PagoProvider | undefined,
    plan: u.plan,
    is_admin: u.isAdmin,
    whatsapp_configurado: u.whatsappConfigurado,
    onboarding_completado: u.onboardingCompletado,
    fecha_registro: u.fechaRegistro.toISOString(),
  };
}

/** Arma la entrada del diagnóstico solo con datos de Postgres (para crons, sin navegador). */
export async function buildServerBrainInput(
  user: DbUser,
  benchmark?: NicheBenchmark | null,
): Promise<BrainInput> {
  const db = getDb();
  const userId = user.id;
  const [posts, metrics, contacts, messages, productos, accounts, snapshots, rules, waAccounts] =
    await Promise.all([
      db.select().from(schema.posts).where(eq(schema.posts.userId, userId)),
      db.select().from(schema.postMetrics).where(eq(schema.postMetrics.userId, userId)),
      db.select().from(schema.whatsappContacts).where(eq(schema.whatsappContacts.userId, userId)),
      db
        .select()
        .from(schema.whatsappMessages)
        .where(eq(schema.whatsappMessages.userId, userId))
        .orderBy(desc(schema.whatsappMessages.createdAt))
        .limit(MESSAGE_LIMIT),
      db.select().from(schema.productos).where(eq(schema.productos.userId, userId)),
      db.select().from(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, userId)),
      db
        .select()
        .from(schema.accountSnapshots)
        .where(
          sql`${schema.accountSnapshots.userId} = ${userId} AND ${schema.accountSnapshots.createdAt} > now() - interval '120 days'`,
        ),
      db.select().from(schema.automationRules).where(eq(schema.automationRules.userId, userId)),
      db
        .select({ estado: schema.whatsappAccounts.estadoConexion })
        .from(schema.whatsappAccounts)
        .where(eq(schema.whatsappAccounts.userId, userId)),
    ]);

  const profile = dbUserToProfile(user);
  profile.whatsapp_configurado ||= waAccounts.some((w) => w.estado === "conectada");

  return {
    profile,
    posts: posts.map(dbPostToClient),
    metrics: metrics.map((m) => ({
      id: m.id,
      post_id: m.postId,
      red: m.red,
      vistas: m.vistas,
      likes: m.likes,
      comentarios: m.comentarios,
      compartidos: m.compartidos,
      seguidores_ganados: 0,
      mensajes_generados: 0,
      alcance: m.alcance,
      guardados: m.guardados,
      clics: m.clics,
      fuente: "real" as const,
    })),
    contacts: contacts.map(contactToClient),
    messages: messages.map(messageToClient),
    productos: productos.map(
      (p): Producto => ({
        id: p.id,
        user_id: p.userId,
        nombre: p.nombre,
        precio: p.precio,
        moneda: p.moneda as Producto["moneda"],
        descripcion: p.descripcion,
        imagen: p.imagen,
        link_pago: p.linkPago,
        pago_provider: p.pagoProvider ?? undefined,
        slug_publico: p.slugPublico ?? undefined,
        activo: p.activo,
      }),
    ),
    accounts: accounts.map(
      (a): SocialAccount => ({
        id: a.id,
        user_id: a.userId,
        red: a.red,
        nombre_cuenta: a.nombreCuenta,
        avatar: a.avatar ?? "",
        estado_conexion: a.estadoConexion === "conectada" ? "conectada" : "desconectada",
        token_placeholder: "",
        external_account_id: a.externalAccountId ?? undefined,
        oauth_provider: a.oauthProvider ?? undefined,
      }),
    ),
    snapshots: snapshots.map((s) => ({
      red: s.red,
      fecha: s.fecha,
      seguidores: s.seguidores,
      publicaciones: s.publicaciones,
      vistas_totales: s.vistasTotales,
    })),
    rules: rules.map(
      (r): AutomationRule => ({
        id: r.id,
        user_id: r.userId,
        nombre: r.nombre,
        disparador: r.disparador as AutomationRule["disparador"],
        palabra_clave: r.palabraClave ?? undefined,
        respuesta: r.respuesta,
        activa: r.activa,
      }),
    ),
    benchmark: benchmark ?? undefined,
  };
}

export async function getNicheBenchmark(nicho: string): Promise<NicheBenchmark | null> {
  const [row] = await getDb()
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

/** Calcula el diagnóstico en el servidor y guarda los KPIs del negocio para las comparativas. */
export async function computeServerDiagnosis(user: DbUser): Promise<Diagnosis> {
  const benchmark = await getNicheBenchmark(resolveNiche(user.industria).key).catch(() => null);
  const diagnosis = diagnose(await buildServerBrainInput(user, benchmark));
  await storeBrainKpis(user.id, diagnosis);
  return diagnosis;
}

export async function storeBrainKpis(userId: string, d: Diagnosis) {
  const values = { nicho: d.nicho, score: d.score, kpis: d.kpis, updatedAt: new Date() };
  await getDb()
    .insert(schema.brainKpis)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: schema.brainKpis.userId, set: values });
}
