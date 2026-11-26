import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { isRealAIEnabled } from "@/server/config";
import { listHubChannels, type DbHubChannel } from "@/server/red/channels";
import { publishForUser } from "@/server/publish/service";
import { generateHubPostOpenAI } from "@/server/ai/openai";
import { redAcceptsMedia } from "@/lib/red/limits";
import {
  NICHO_CATALOG,
  toCanonicalNicho,
  type NichoKey,
} from "@/services/import/inferNiche";
import type { Red } from "@/lib/mock/types";

/**
 * [OPERADOR IA DE PUBLIVENDE — Pieza 1, 2026-11-26]
 *
 * El motor de crecimiento DE LA CASA. El autopiloto existente trabaja para
 * los CLIENTES; este operador trabaja para PubliVende: cada día genera un
 * post PROPIO por cuenta oficial activa (valor para el nicho + invitación a
 * publicar con PubliVende) y lo deja PROGRAMADO para que el cron existente
 * publish-scheduled lo publique a su hora. Sin que nadie lo lance a mano.
 *
 * Decisiones de cableado (leídas del código vigente):
 * - Dueño de los posts: las cuentas oficiales (hub_channels) NO tienen
 *   columna de dueño; se conectan con la sesión del super admin. El dueño
 *   de los posts del operador es el PRIMER usuario con isAdmin=true
 *   (por fecha de registro): es la cuenta de la casa.
 * - Formato que recoge el cron: post creado con publishForUser(programar)
 *   → estado «programado» + fechaProgramada; el runner de cada minuto toma
 *   estado='programado' con fecha vencida y publica vía expandDistribution.
 *   OJO con la semántica existente de esa expansión: por red toma la
 *   PRIMERA cuenta oficial activa y conectada de esa red. Hoy hay una sola
 *   cuenta activa, así que el destino es exacto; si mañana hay dos cuentas
 *   de la misma red, ambas publicaciones caerían en la primera (límite de
 *   la expansión actual, no de este operador).
 * - Fuente honesta: con MEAI_API_KEY se genera con generateHubPostOpenAI
 *   (el mismo helper de contenido propio de cuentas oficiales) y la fuente
 *   del post es «ia»; sin llave o si la IA falla, salen plantillas por
 *   nicho con fuente «reglas». NUNCA se declara «ia» lo que salió de
 *   plantilla (mismo patrón que el autopiloto de clientes).
 * - Alcance de esta pieza: posts de TEXTO. Instagram, YouTube y TikTok
 *   exigen imagen o video (redAcceptsMedia), así que esas cuentas se
 *   omiten con motivo declarado; Facebook sí acepta texto.
 * - Hora de publicación: 16:00 UTC (10:00 CDMX / 09:00 Mazatlán). El cron
 *   corre 13:30 UTC; si el operador se ejecuta después de las 16:00 UTC
 *   (disparo manual tardío), programa a +10 minutos para que salga hoy.
 */

export const OPERATOR_POST_HOUR_UTC = 16;
const DAY_MS = 86_400_000;
export const PUBLIVENDE_URL = "https://publivende.mx";

export type OperatorFuente = "ia" | "reglas";

export interface OperatorChannelPlan {
  channel: DbHubChannel;
  /** Nichos canónicos de la cuenta (sin «general»); vacío = cuenta general. */
  nichos: NichoKey[];
  nichoDelDia: NichoKey;
}

/** Nichos canónicos de una cuenta oficial a partir de su texto libre. */
export function canonicalChannelNiches(channel: Pick<DbHubChannel, "nichos">): NichoKey[] {
  const out: NichoKey[] = [];
  for (const raw of channel.nichos.flatMap((n) => n.split(","))) {
    const c = toCanonicalNicho(raw.trim());
    if (c !== "general" && !out.includes(c)) out.push(c);
  }
  return out;
}

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / DAY_MS);
}

/**
 * Nicho del día para una cuenta: rota por día del año entre sus nichos.
 * Cuenta sin nichos específicos → «general». Función pura y determinista.
 */
export function pickNicheForDay(nichos: NichoKey[], date: Date): NichoKey {
  if (!nichos.length) return "general";
  return nichos[dayOfYearUtc(date) % nichos.length];
}

/** Hora de publicación del post de hoy (o +10 min si ya pasó). Pura. */
export function scheduledTimeFor(now: Date): Date {
  const candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), OPERATOR_POST_HOUR_UTC, 0, 0, 0),
  );
  if (candidate.getTime() > now.getTime()) return candidate;
  return new Date(now.getTime() + 10 * 60_000);
}

export function nicheNombre(nicho: NichoKey): string {
  return NICHO_CATALOG.find((n) => n.id === nicho)?.nombre ?? "Negocios locales";
}

function nicheHashtags(nicho: NichoKey): string[] {
  const entry = NICHO_CATALOG.find((n) => n.id === nicho);
  const base = entry ? entry.hashtags.slice(0, 4) : ["#NegociosLocales", "#EmprendedoresMX"];
  return [...base, "#PubliVende"];
}

/** Consejo breve por nicho para las plantillas (fuente «reglas»). */
const CONSEJO_POR_NICHO: Record<string, string> = {
  automotriz:
    "revisa la presión de tus llantas una vez al mes: rodar con la presión correcta ahorra gasolina y alarga la vida de la llanta",
  belleza_tatuajes:
    "antes de tatuarte, pide ver trabajos ya cicatrizados del estudio: ahí se nota la verdadera calidad de la línea y el color",
  gastronomia:
    "fotografía tu platillo con luz natural junto a una ventana: la comida se vende primero por los ojos y no necesitas equipo caro",
  hogar_inmuebles:
    "si rentas o vendes una casa, publica primero las fotos de la fachada y la sala con luz de día: son las dos que deciden si te escriben",
  servicios_profesionales:
    "responde los mensajes de tus clientes en menos de 15 minutos: la mayoría contrata al primero que contesta, no al más barato",
  comercio_general:
    "publica tu producto con precio visible y botón de WhatsApp: cada paso extra entre «me interesa» y la compra te cuesta ventas",
  salud_fitness:
    "la constancia vence a la intensidad: 30 minutos diarios de movimiento sostenido transforman más que un solo día de exceso",
  tecnologia_gadgets:
    "antes de cambiar de celular, revisa batería y almacenamiento: muchas veces una limpieza y batería nueva le dan otro año de vida",
  general:
    "publica con constancia, no con prisa: tres publicaciones buenas por semana venden más que diez hechas al aventón",
};

function invitationSuffix(nicho: NichoKey): string {
  const tema =
    nicho === "general"
      ? "tu giro"
      : nicheNombre(nicho).split(",")[0].trim().toLowerCase();
  return (
    `📣 ¿Tienes un negocio de ${tema}? Con PubliVende publicas una vez y tu anuncio se difunde ` +
    `en las cuentas y nichos de tu giro, con los mensajes directo a tu WhatsApp. ` +
    `Empieza gratis 👉 ${PUBLIVENDE_URL}`
  );
}

export interface TemplateInput {
  nicho: NichoKey;
  cuenta: string;
  date: Date;
}

/**
 * Copy de plantilla por nicho (fuente «reglas»): consejo del nicho +
 * invitación a publicar con PubliVende + link + hashtags del catálogo.
 * Rota entre 3 estructuras según el día. Función pura.
 */
export function buildTemplateCopy(input: TemplateInput): string {
  const consejo = CONSEJO_POR_NICHO[input.nicho] ?? CONSEJO_POR_NICHO.general;
  const consejoCap = consejo.charAt(0).toUpperCase() + consejo.slice(1);
  const variant = dayOfYearUtc(input.date) % 3;
  const hashtags = nicheHashtags(input.nicho).join(" ");
  const body =
    variant === 0
      ? `💡 Consejo del día: ${consejo}.`
      : variant === 1
        ? `¿Ya lo haces así? ${consejoCap}. Los negocios que venden por redes lo aplican a diario.`
        : `Dato útil para tu negocio: ${consejo}. Guárdalo y compártelo con quien lo necesite.`;
  return `${body}\n\n${invitationSuffix(input.nicho)}\n\n${hashtags}`;
}

/** Tema para pedirle a la IA el contenido de valor del día. Pura. */
export function buildAiTema(nicho: NichoKey, date: Date): string {
  const nombre = nicheNombre(nicho);
  const variant = dayOfYearUtc(date) % 3;
  if (variant === 0) return `Un consejo práctico y accionable para negocios de ${nombre} que venden por redes sociales en México`;
  if (variant === 1) return `Una tendencia o dato útil de hoy para la audiencia de ${nombre} en México, explicado en lenguaje simple`;
  return `Un error común que cometen los negocios de ${nombre} al vender por redes sociales y cómo evitarlo`;
}

/** Plan del día para una cuenta: sus nichos canónicos y el nicho que toca hoy. Pura. */
export function planChannel(channel: DbHubChannel, date: Date): OperatorChannelPlan {
  const nichos = canonicalChannelNiches(channel);
  return { channel, nichos, nichoDelDia: pickNicheForDay(nichos, date) };
}

async function resolveOperatorOwnerId(): Promise<string | null> {
  const rows = await getDb()
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.isAdmin, true))
    .orderBy(schema.users.fechaRegistro)
    .limit(1);
  return rows[0]?.id ?? null;
}

const operadorCanalId = sql<string>`${schema.posts.scheduleMeta}->'operador'->>'canal_id'`;

/** ¿Ya existe el post del operador de esta cuenta para el día de la corrida? */
async function alreadyCreatedToday(ownerId: string, canalId: string, now: Date): Promise<boolean> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + DAY_MS);
  const rows = await getDb()
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.userId, ownerId),
        eq(operadorCanalId, canalId),
        gte(schema.posts.fechaProgramada, start),
        lt(schema.posts.fechaProgramada, end),
        inArray(schema.posts.estado, ["programado", "publicado", "borrador"]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export interface OperatorRunResult {
  ok: true;
  iaActiva: boolean;
  cuentasActivas: number;
  creados: number;
  omitidos: number;
  saltadas: Array<{ cuenta: string; motivo: string }>;
  detalle: Array<{
    cuenta: string;
    red: string;
    nicho: NichoKey;
    fuente: OperatorFuente;
    fechaProgramada: string;
  }>;
  motivo?: string;
}

/**
 * Corrida del operador: 1 post propio programado por cuenta oficial activa
 * y conectada que acepte texto. Idempotente por cuenta y día.
 */
export async function runOperator(opts?: { now?: Date }): Promise<OperatorRunResult | { ok: false; error: string }> {
  const now = opts?.now ?? new Date();
  const iaActiva = isRealAIEnabled();
  const channels = await listHubChannels();
  const activas = channels.filter((c) => c.activo && c.estadoConexion === "conectada");

  if (!activas.length) {
    return {
      ok: true,
      iaActiva,
      cuentasActivas: 0,
      creados: 0,
      omitidos: 0,
      saltadas: [],
      detalle: [],
      motivo: "Sin cuentas oficiales activas y conectadas: no hay dónde publicar todavía",
    };
  }

  const ownerId = await resolveOperatorOwnerId();
  if (!ownerId) {
    return { ok: false, error: "No hay usuario super admin registrado: las cuentas oficiales no tienen dueño" };
  }

  const fecha = scheduledTimeFor(now);
  const saltadas: OperatorRunResult["saltadas"] = [];
  const detalle: OperatorRunResult["detalle"] = [];
  let creados = 0;
  let omitidos = 0;
  const seenAccounts = new Set<string>();

  for (const channel of activas) {
    const accountKey = `${channel.red}:${channel.externalAccountId}`;
    if (seenAccounts.has(accountKey)) {
      saltadas.push({ cuenta: channel.nombre, motivo: "Es la misma cuenta oficial conectada dos veces" });
      continue;
    }
    seenAccounts.add(accountKey);

    if (!redAcceptsMedia(channel.red, "texto")) {
      saltadas.push({
        cuenta: channel.nombre,
        motivo: `${channel.red} exige imagen o video; esta pieza del Operador publica texto (por ahora solo Facebook)`,
      });
      continue;
    }

    if (await alreadyCreatedToday(ownerId, channel.id, now)) {
      omitidos++;
      continue;
    }

    const plan = planChannel(channel, now);
    let copy = "";
    let fuente: OperatorFuente = "reglas";
    if (iaActiva) {
      try {
        const aiCopy = await generateHubPostOpenAI({
          cuenta: channel.nombre,
          red: channel.red,
          nichos: plan.nichos.length ? plan.nichos.map(nicheNombre) : [nicheNombre("general")],
          tema: buildAiTema(plan.nichoDelDia, now),
        });
        if (aiCopy.trim().length >= 40) {
          copy = `${aiCopy.trim()}\n\n${invitationSuffix(plan.nichoDelDia)}`;
          fuente = "ia";
        }
      } catch (err) {
        console.error("[operator] IA falló, se usa plantilla:", err);
      }
    }
    if (!copy) {
      copy = buildTemplateCopy({ nicho: plan.nichoDelDia, cuenta: channel.nombre, date: now });
      fuente = "reglas";
    }

    const res = await publishForUser({
      userId: ownerId,
      post: {
        tipo: "texto",
        media_url: "",
        copy,
        redes: [channel.red as Red],
        programar: fecha.toISOString(),
        nicho_label: nicheNombre(plan.nichoDelDia),
        schedule_meta: {
          operador: {
            nicho: plan.nichoDelDia,
            fuente,
            canal_id: channel.id,
            generado_at: now.toISOString(),
          },
        },
      },
    });
    if (!res.ok) {
      saltadas.push({ cuenta: channel.nombre, motivo: res.error ?? "No se pudo programar el post" });
      continue;
    }
    creados++;
    detalle.push({
      cuenta: channel.nombre,
      red: channel.red,
      nicho: plan.nichoDelDia,
      fuente,
      fechaProgramada: fecha.toISOString(),
    });
  }

  return { ok: true, iaActiva, cuentasActivas: activas.length, creados, omitidos, saltadas, detalle };
}

export interface OperatorLogEntry {
  id: string;
  cuenta: string;
  red: string;
  nicho: string;
  fuente: string;
  estado: string;
  fechaProgramada: string | null;
  fechaPublicacion: string | null;
  copy: string;
  error?: string;
}

/** Bitácora del operador: últimos posts creados por él, con su estado real. */
export async function getOperatorLog(limit = 20): Promise<OperatorLogEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(sql`(${schema.posts.scheduleMeta} -> 'operador') IS NOT NULL`)
    .orderBy(desc(schema.posts.fechaProgramada))
    .limit(limit);
  const channels = await listHubChannels().catch(() => [] as DbHubChannel[]);
  const byId = new Map(channels.map((c) => [c.id, c]));
  return rows.map((r) => {
    const meta = (r.scheduleMeta ?? {}) as {
      operador?: { nicho?: string; fuente?: string; canal_id?: string };
      schedule_error?: string;
    };
    const op = meta.operador ?? {};
    const channel = op.canal_id ? byId.get(op.canal_id) : undefined;
    return {
      id: r.id,
      cuenta: channel?.nombre ?? "Cuenta oficial",
      red: channel?.red ?? (r.redesDestino?.[0] as string) ?? "",
      nicho: op.nicho ?? "general",
      fuente: op.fuente ?? "reglas",
      estado: r.estado,
      fechaProgramada: r.fechaProgramada?.toISOString() ?? null,
      fechaPublicacion: r.fechaPublicacion?.toISOString() ?? null,
      copy: r.copy.slice(0, 220),
      error: meta.schedule_error,
    };
  });
}

/** Estado para la tarjeta: modo IA/reglas y cuentas que el operador cubre. */
export async function getOperatorOverview() {
  const channels = await listHubChannels();
  const activas = channels.filter((c) => c.activo && c.estadoConexion === "conectada");
  const now = new Date();
  return {
    iaActiva: isRealAIEnabled(),
    cuentas: activas.map((c) => {
      const plan = planChannel(c, now);
      return {
        id: c.id,
        nombre: c.nombre,
        red: c.red as string,
        nichos: plan.nichos,
        nichoHoy: plan.nichoDelDia,
        aceptaTexto: redAcceptsMedia(c.red, "texto"),
      };
    }),
  };
}
