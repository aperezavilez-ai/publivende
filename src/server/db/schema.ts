import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  real,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Plan, Red, EstadoPost, TipoPost, EtapaLead, PagoProvider, ScheduleMeta, PublishSurfaceResult } from "@/lib/mock/types";

/** Perfil de usuario (sin password en respuestas API). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nombre: text("nombre").notNull(),
  celular: text("celular").notNull().default(""),
  codigoPais: text("codigo_pais").notNull().default("+52"),
  nombreNegocio: text("nombre_negocio").notNull().default(""),
  industria: text("industria"),
  descripcionNegocio: text("descripcion_negocio"),
  publicoObjetivo: text("publico_objetivo"),
  tonoMarca: text("tono_marca"),
  ciudad: text("ciudad"),
  horarioAtencion: text("horario_atencion"),
  pagoProviderDefault: text("pago_provider_default").$type<PagoProvider>(),
  plan: text("plan").$type<Plan>().notNull().default("free"),
  planStatus: text("plan_status"),
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  isAdmin: boolean("is_admin").notNull().default(false),
  whatsappConfigurado: boolean("whatsapp_configurado").notNull().default(false),
  onboardingCompletado: boolean("onboarding_completado").notNull().default(false),
  fechaRegistro: timestamp("fecha_registro", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tokens OAuth cifrados — nunca en el navegador. */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    red: text("red").$type<Red>().notNull(),
    nombreCuenta: text("nombre_cuenta").notNull(),
    avatar: text("avatar"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    externalAccountId: text("external_account_id"),
    oauthProvider: text("oauth_provider").$type<"meta" | "google" | "tiktok">(),
    estadoConexion: text("estado_conexion").notNull().default("conectada"),
    metricsSyncedAt: timestamp("metrics_synced_at", { withTimezone: true }),
    metricsError: text("metrics_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("oauth_user_red_idx").on(t.userId, t.red)],
);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipo: text("tipo").$type<TipoPost>().notNull(),
  mediaUrl: text("media_url").notNull().default(""),
  copy: text("copy").notNull(),
  copyPorRed: jsonb("copy_por_red").$type<Partial<Record<Red, string>>>(),
  sourceUrl: text("source_url"),
  alcance: jsonb("alcance"),
  redesDestino: jsonb("redes_destino").$type<Red[]>().notNull().default([]),
  estado: text("estado").$type<EstadoPost>().notNull().default("borrador"),
  fechaProgramada: timestamp("fecha_programada", { withTimezone: true }),
  fechaPublicacion: timestamp("fecha_publicacion", { withTimezone: true }),
  trackingSlug: text("tracking_slug").notNull(),
  hashtagsPorRed: jsonb("hashtags_por_red"),
  hashtagsVirales: jsonb("hashtags_virales").$type<string[]>(),
  canalesDistribucion: jsonb("canales_distribucion"),
  nichoLabel: text("nicho_label"),
  totalCanales: integer("total_canales"),
  whatsappEnviadoAt: timestamp("whatsapp_enviado_at", { withTimezone: true }),
  whatsappBroadcastCount: integer("whatsapp_broadcast_count"),
  externalIds: jsonb("external_ids").$type<Partial<Record<Red, string>>>(),
  publishSurfaces: jsonb("publish_surfaces"),
  scheduleMeta: jsonb("schedule_meta").$type<ScheduleMeta>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productos = pgTable("productos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  precio: real("precio").notNull(),
  moneda: text("moneda").notNull().default("MXN"),
  descripcion: text("descripcion").notNull().default(""),
  imagen: text("imagen").notNull().default(""),
  linkPago: text("link_pago").notNull().default(""),
  pagoProvider: text("pago_provider").$type<PagoProvider>(),
  slugPublico: text("slug_publico"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  celular: text("celular").notNull(),
  etiqueta: text("etiqueta").notNull().default(""),
  etapa: text("etapa").$type<EtapaLead>().notNull().default("nuevo"),
  origen: text("origen").notNull().default(""),
  postOrigenId: uuid("post_origen_id").references(() => posts.id),
  notas: text("notas").notNull().default(""),
  montoVenta: real("monto_venta"),
  leadScore: integer("lead_score"),
  scoreMotivos: jsonb("score_motivos").$type<string[]>(),
  noLeidos: integer("no_leidos").notNull().default(0),
  fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => whatsappContacts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  direccion: text("direccion").$type<"entrante" | "saliente">().notNull(),
  texto: text("texto").notNull(),
  automatico: boolean("automatico").notNull().default(false),
  postId: uuid("post_id").references(() => posts.id),
  waMessageId: text("wa_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  disparador: text("disparador").notNull(),
  palabraClave: text("palabra_clave"),
  respuesta: text("respuesta").notNull(),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Cuenta WhatsApp Business conectada por usuario (Embedded Signup). */
export const whatsappAccounts = pgTable(
  "whatsapp_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wabaId: text("waba_id").notNull(),
    phoneNumberId: text("phone_number_id").notNull(),
    displayPhoneNumber: text("display_phone_number").notNull().default(""),
    verifiedName: text("verified_name"),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    estadoConexion: text("estado_conexion").notNull().default("conectada"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("whatsapp_user_idx").on(t.userId),
    uniqueIndex("whatsapp_phone_number_id_idx").on(t.phoneNumberId),
  ],
);

/** Proyecto / app que usa PubliVende como plataforma (marca blanca). */
export const partners = pgTable(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nombre: text("nombre").notNull(),
    brandName: text("brand_name").notNull(),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").notNull().default("#7c3aed"),
    allowedReturnOrigins: jsonb("allowed_return_origins").$type<string[]>().notNull().default([]),
    webhookUrl: text("webhook_url"),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("partners_slug_idx").on(t.slug)],
);

/** API keys de partners (hash SHA-256; el valor completo solo se muestra al crear). */
export const partnerApiKeys = pgTable("partner_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  label: text("label").notNull().default("default"),
  activo: boolean("activo").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Usuario final de un partner (mapeo external_user_id → users). */
export const partnerUsers = pgTable(
  "partner_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("partner_external_user_idx").on(t.partnerId, t.externalUserId)],
);

/** Medios hospedados temporalmente para APIs de redes (URL pública). */
export const hostedMedia = pgTable("hosted_media", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postDistributions = pgTable("post_distributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull(),
  channelId: text("channel_id"),
  channelName: text("channel_name").notNull(),
  externalId: text("external_id"),
  status: text("status").notNull().default("published"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Cuentas oficiales de la red PubliVende (las maneja el administrador). `nichos` vacío = acepta cualquier nicho. */
export const hubChannels = pgTable(
  "hub_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    red: text("red").$type<Red>().notNull(),
    externalAccountId: text("external_account_id").notNull(),
    nombre: text("nombre").notNull(),
    avatar: text("avatar"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    oauthProvider: text("oauth_provider").$type<"meta" | "google" | "tiktok">().notNull(),
    nichos: jsonb("nichos").$type<string[]>().notNull().default([]),
    activo: boolean("activo").notNull().default(false),
    estadoConexion: text("estado_conexion").notNull().default("conectada"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("hub_channels_red_ext_idx").on(t.red, t.externalAccountId)],
);

export type BoostEstado = "pendiente" | "publicado" | "rechazado" | "error";

/** Solicitudes de un usuario para que su publicación salga en la red oficial PubliVende. */
export const boostRequests = pgTable(
  "boost_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    estado: text("estado").$type<BoostEstado>().notNull().default("pendiente"),
    nicho: text("nicho"),
    iaScore: integer("ia_score"),
    iaMotivo: text("ia_motivo"),
    iaFuente: text("ia_fuente").$type<"ia" | "reglas">(),
    copyRed: text("copy_red"),
    canales: jsonb("canales").$type<string[]>().notNull().default([]),
    resultados: jsonb("resultados").$type<Array<PublishSurfaceResult & { hub_channel_id: string }>>(),
    motivoRechazo: text("motivo_rechazo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publicadoAt: timestamp("publicado_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("boost_requests_post_idx").on(t.postId)],
);

/** Métricas reales por publicación y red, leídas de las APIs de cada plataforma. */
export const postMetrics = pgTable(
  "post_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    red: text("red").$type<Red>().notNull(),
    /** ID consultable en la API (en TikTok es el video_id resuelto, no el publish_id). */
    externalId: text("external_id").notNull(),
    vistas: integer("vistas").notNull().default(0),
    alcance: integer("alcance"),
    likes: integer("likes").notNull().default(0),
    comentarios: integer("comentarios").notNull().default(0),
    compartidos: integer("compartidos").notNull().default(0),
    guardados: integer("guardados"),
    clics: integer("clics"),
    raw: jsonb("raw"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("post_metrics_post_red_idx").on(t.postId, t.red)],
);

/** Clics reales en la página pública /p/<slug> (Real v2: tracking en servidor). */
export const postClicks = pgTable("post_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referer: text("referer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Foto diaria de la cuenta en cada red (seguidores, alcance) para medir crecimiento. */
export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    red: text("red").$type<Red>().notNull(),
    fecha: text("fecha").notNull(),
    seguidores: integer("seguidores").notNull().default(0),
    publicaciones: integer("publicaciones"),
    vistasTotales: integer("vistas_totales"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("account_snapshots_user_red_fecha_idx").on(t.userId, t.red, t.fecha)],
);

/** Diagnósticos y planes del cerebro IA (historial y límite de generaciones por plan). */
export const brainReports = pgTable("brain_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  fuente: text("fuente").$type<"ia" | "reglas">().notNull(),
  diagnosis: jsonb("diagnosis").notNull(),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configuración del piloto automático por usuario. */
export const autopilotSettings = pgTable("autopilot_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  activo: boolean("activo").notNull().default(false),
  modo: text("modo").$type<"aprobar" | "automatico">().notNull().default("aprobar"),
  postsSemana: integer("posts_semana").notNull().default(3),
  redes: jsonb("redes").$type<Red[]>().notNull().default([]),
  ultimaGeneracion: timestamp("ultima_generacion", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Últimos KPIs calculados en el servidor por negocio; base de las comparativas por nicho. */
export const brainKpis = pgTable("brain_kpis", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  nicho: text("nicho").notNull(),
  score: integer("score").notNull(),
  kpis: jsonb("kpis").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Percentiles agregados y anónimos por nicho (solo con muestra mínima de negocios). */
export const nicheBenchmarks = pgTable("niche_benchmarks", {
  nicho: text("nicho").primaryKey(),
  negocios: integer("negocios").notNull(),
  metricas: jsonb("metricas").notNull(),
  ganchos: jsonb("ganchos").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Snapshot JSON del resto de datos demo (inbox, ads, etc.) por usuario. */
export const userDataSnapshots = pgTable("user_data_snapshots", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Banco de Cerebro: Catálogo de Nichos de Mercado con afinidades e inteligencia semántica */
export const marketNiches = pgTable("market_niches", {
  id: text("id").primaryKey(), // slug único: automotriz, belleza_tatuajes, etc.
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
  audienciaObjetivo: text("audiencia_objetivo"),
  anguloGancho: text("angulo_gancho"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Banco de Cerebro: Directorio masivo de comunidades, grupos y destinos de difusión */
export const brainCommunities = pgTable("brain_communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  nicheId: text("niche_id")
    .notNull()
    .references(() => marketNiches.id, { onDelete: "cascade" }),
  plataforma: text("plataforma").notNull(), // facebook_group, facebook_page, whatsapp_channel, telegram_group, instagram_network
  nombre: text("nombre").notNull(),
  url: text("url"),
  pais: text("pais").notNull().default("México"),
  estado: text("estado").notNull().default("General"),
  ciudad: text("ciudad"),
  tipoAlcance: text("tipo_alcance").notNull().default("local"), // local, estatal, nacional, global
  miembrosEstimados: integer("miembros_estimados").notNull().default(10000),
  nivelInteraccion: text("nivel_interaccion").notNull().default("alta"), // alta, media, muy_alta
  activo: boolean("activo").notNull().default(true),
  // [FASE 1 — Descubrimiento real] Procedencia y verificación. Las filas del
  // catálogo sembrado quedan en "catalogo_sin_verificar" con fuente null:
  // nombres y miembros escritos a mano, NO observados. Solo una fila con
  // fuente y verificadoEn fue vista de verdad en la red.
  fuente: text("fuente"), // serpapi | brave | indice_web
  // OJO: "estado" (arriba) es la entidad federativa; el estado del prospecto
  // vive en su propia columna para no pisar la geografía.
  estadoProspecto: text("estado_prospecto").notNull().default("catalogo_sin_verificar"), // catalogo_sin_verificar | descubierto | contactado | aliado
  verificadoEn: timestamp("verificado_en", { withTimezone: true }),
  evidenciaUrl: text("evidencia_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DbUser = typeof users.$inferSelect;
export type DbPost = typeof posts.$inferSelect;
export type DbOAuthAccount = typeof oauthAccounts.$inferSelect;
export type DbWhatsAppAccount = typeof whatsappAccounts.$inferSelect;
export type DbPartner = typeof partners.$inferSelect;
export type DbPartnerUser = typeof partnerUsers.$inferSelect;
export type DbMarketNiche = typeof marketNiches.$inferSelect;
export type DbBrainCommunity = typeof brainCommunities.$inferSelect;
