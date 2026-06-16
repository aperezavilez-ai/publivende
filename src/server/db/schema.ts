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
import type { Plan, Red, EstadoPost, TipoPost, EtapaLead, PagoProvider, ScheduleMeta } from "@/lib/mock/types";

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

/** Snapshot JSON del resto de datos demo (inbox, ads, etc.) por usuario. */
export const userDataSnapshots = pgTable("user_data_snapshots", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DbUser = typeof users.$inferSelect;
export type DbPost = typeof posts.$inferSelect;
export type DbOAuthAccount = typeof oauthAccounts.$inferSelect;
export type DbWhatsAppAccount = typeof whatsappAccounts.$inferSelect;
export type DbPartner = typeof partners.$inferSelect;
export type DbPartnerUser = typeof partnerUsers.$inferSelect;
