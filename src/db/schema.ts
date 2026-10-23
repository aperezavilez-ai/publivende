import { pgTable, text, timestamp, integer, boolean, json, uuid, varchar, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const estadoPostEnum = pgEnum("estado_post", [
  "borrador",
  "programado",
  "publicado",
  "fallido",
  "cancelado"
]);

export const tipoPostEnum = pgEnum("tipo_post", [
  "simple",
  "carrusel",
  "reel",
  "historia",
  "video"
]);

export const redSocialEnum = pgEnum("red_social", [
  "facebook",
  "instagram",
  "tiktok",
  "twitter",
  "linkedin",
  "youtube",
  "pinterest"
]);

export const autopilotEstadoEnum = pgEnum("autopilot_estado", [
  "pendiente",
  "aprobado",
  "rechazado"
]);

export const planEnum = pgEnum("plan", [
  "free",
  "pro",
  "enterprise"
]);

export const estadoConexionEnum = pgEnum("estado_conexion", [
  "activo",
  "inactivo",
  "error",
  "token_expirado"
]);

export const tipoAutomatizacionEnum = pgEnum("tipo_automatizacion", [
  "respuesta_comentario",
  "respuesta_dm",
  "publicacion_programada",
  "moderacion",
  "webhook"
]);

export const estadoExperimentoEnum = pgEnum("estado_experimento", [
  "activo",
  "completado",
  "pausado",
  "cancelado"
]);

export const tipoNotificacionEnum = pgEnum("tipo_notificacion", [
  "info",
  "warning",
  "error",
  "success"
]);

// ============================================
// TABLAS PRINCIPALES
// ============================================

// Usuarios
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),

  // Business Context
  industria: varchar("industria", { length: 100 }),
  audiencia: text("audiencia"),
  productos: text("productos"),
  propuestaValor: text("propuesta_valor"),
  tonoMarca: varchar("tono_marca", { length: 50 }),
  valores: json("valores").$type<string[]>(),

  // Configuración Autopilot
  autopilotEnabled: boolean("autopilot_enabled").default(false),
  autopilotMode: varchar("autopilot_mode", { length: 20 }).default("aprobacion"), // "aprobacion" | "auto"
  autopilotSlots: json("autopilot_slots").$type<{
    dia: string;
    hora: string;
    tipoContenido?: string;
  }[]>(),

  // Preferencias
  zonaHoraria: varchar("zona_horaria", { length: 50 }).default("America/Mexico_City"),
  idioma: varchar("idioma", { length: 10 }).default("es"),
  hashtagsFavoritos: json("hashtags_favoritos").$type<string[]>(),

  // Suscripción
  plan: planEnum("plan").default("free"),
  limitePostsMes: integer("limite_posts_mes").default(50),
  limiteRedesConectadas: integer("limite_redes_conectadas").default(3),
  limiteAutopilotPosts: integer("limite_autopilot_posts").default(10),

  // Notificaciones
  notificacionesEmail: boolean("notificaciones_email").default(true),
  notificacionesPush: boolean("notificaciones_push").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conexiones de Redes Sociales
export const socialConnections = pgTable("social_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  red: redSocialEnum("red").notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }),
  accountUsername: varchar("account_username", { length: 255 }),
  avatarUrl: text("avatar_url"),

  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),

  scopes: json("scopes").$type<string[]>(),
  estado: estadoConexionEnum("estado").default("activo"),
  errorMessage: text("error_message"),

  // Métricas básicas de la cuenta
  followers: integer("followers").default(0),
  following: integer("following").default(0),

  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  contenido: text("contenido").notNull(),
  contenidoPorRed: json("contenido_por_red").$type<Record<string, string>>(), // Variaciones por red

  medios: json("medios").$type<{
    id: string;
    tipo: "imagen" | "video" | "gif";
    url: string;
    thumbnailUrl?: string;
    orden: number;
  }[]>(),

  redesSeleccionadas: json("redes_seleccionadas").$type<string[]>().notNull(),

  fechaProgramada: timestamp("fecha_programada"),
  estado: estadoPostEnum("estado").default("borrador").notNull(),
  tipoPost: tipoPostEnum("tipo_post").default("simple").notNull(),

  // Autopilot
  autopilotEstado: autopilotEstadoEnum("autopilot_estado"),
  autopilotAprobadoPor: varchar("autopilot_aprobado_por", { length: 20 }), // "auto" | "manual"
  autopilotGeneradoPor: text("autopilot_generado_por"), // Modelo IA usado
  autopilotPrompt: text("autopilot_prompt"),

  // Experimentos A/B
  experimentoId: uuid("experimento_id").references(() => experimentos.id, { onDelete: "set null" }),
  varianteId: varchar("variante_id", { length: 50 }),

  // Productos vinculados
  productosVinculados: json("productos_vinculados").$type<string[]>(),

  // Métricas agregadas (suma de todas las redes)
  vistas: integer("vistas").default(0),
  likes: integer("likes").default(0),
  comentarios: integer("comentarios").default(0),
  compartidos: integer("compartidos").default(0),
  guardados: integer("guardados").default(0),
  clicks: integer("clicks").default(0),

  // Metadata
  tags: json("tags").$type<string[]>(),
  recetaId: uuid("receta_id").references(() => recetas.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// Posts por Red Social (tracking individual)
export const postNetworks = pgTable("post_networks", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),

  red: redSocialEnum("red").notNull(),
  connectionId: uuid("connection_id").notNull().references(() => socialConnections.id, { onDelete: "cascade" }),

  externalPostId: varchar("external_post_id", { length: 255 }), // ID en la plataforma
  externalUrl: text("external_url"),

  estado: estadoPostEnum("estado").default("programado").notNull(),
  errorMessage: text("error_message"),
  retries: integer("retries").default(0),

  // Métricas específicas de esta red
  vistas: integer("vistas").default(0),
  likes: integer("likes").default(0),
  comentarios: integer("comentarios").default(0),
  compartidos: integer("compartidos").default(0),
  guardados: integer("guardados").default(0),
  clicks: integer("clicks").default(0),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),

  lastMetricsUpdateAt: timestamp("last_metrics_update_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recetas de Contenido
export const recetas = pgTable("recetas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = receta del sistema

  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  framework: varchar("framework", { length: 50 }).notNull(), // "AIDA", "PAS", "BAB", etc.

  estructura: json("estructura").$type<{
    orden: number;
    tipo: string;
    placeholder: string;
    tips: string[];
  }[]>().notNull(),

  objetivos: json("objetivos").$type<string[]>(),
  industrias: json("industrias").$type<string[]>(),

  ejemplos: json("ejemplos").$type<{
    titulo: string;
    contenido: string;
    resultado: string;
  }[]>(),

  // Métricas de uso
  usageCount: integer("usage_count").default(0),
  avgEngagement: decimal("avg_engagement", { precision: 5, scale: 2 }),

  isPublic: boolean("is_public").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Biblioteca de Assets
export const libraryAssets = pgTable("library_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  tipo: varchar("tipo", { length: 20 }).notNull(), // "imagen", "video", "gif", "plantilla"
  nombre: varchar("nombre", { length: 255 }).notNull(),

  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),

  // Metadata del archivo
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // segundos para videos

  tags: json("tags").$type<string[]>(),
  carpeta: varchar("carpeta", { length: 255 }),

  // Métricas de uso
  usageCount: integer("usage_count").default(0),
  avgEngagement: decimal("avg_engagement", { precision: 5, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Productos
export const productos = pgTable("productos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),

  imagenes: json("imagenes").$type<string[]>(),
  precio: decimal("precio", { precision: 10, scale: 2 }),
  moneda: varchar("moneda", { length: 10 }).default("USD"),

  variantes: json("variantes").$type<{
    nombre: string;
    precio: number;
    stock?: number;
  }[]>(),

  stock: integer("stock"),
  sku: varchar("sku", { length: 100 }),
  url: text("url"),

  // Métricas
  menciones: integer("menciones").default(0),
  clicks: integer("clicks").default(0),
  conversiones: integer("conversiones").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),

  activo: boolean("activo").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Experimentos A/B
export const experimentos = pgTable("experimentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),

  estado: estadoExperimentoEnum("estado").default("activo").notNull(),

  variantes: json("variantes").$type<{
    id: string;
    nombre: string;
    contenido: string;
    medios?: string[];
  }[]>().notNull(),

  metricaObjetivo: varchar("metrica_objetivo", { length: 50 }).notNull(), // "engagement", "clicks", "conversiones"

  // Resultados
  resultados: json("resultados").$type<{
    varianteId: string;
    vistas: number;
    metrica: number;
    tasa: number;
  }[]>(),

  ganadorId: varchar("ganador_id", { length: 50 }),
  significanciaEstadistica: decimal("significancia_estadistica", { precision: 5, scale: 4 }),

  iniciadoAt: timestamp("iniciado_at"),
  finalizadoAt: timestamp("finalizado_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Automatizaciones
export const automatizaciones = pgTable("automatizaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),

  tipo: tipoAutomatizacionEnum("tipo").notNull(),

  trigger: json("trigger").$type<{
    tipo: string;
    condiciones: Record<string, any>;
  }>().notNull(),

  acciones: json("acciones").$type<{
    tipo: string;
    parametros: Record<string, any>;
  }[]>().notNull(),

  activa: boolean("activa").default(true),

  // Estadísticas
  ejecutada: integer("ejecutada").default(0),
  exitosas: integer("exitosas").default(0),
  fallidas: integer("fallidas").default(0),

  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campañas de Ads
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),

  red: redSocialEnum("red").notNull(),
  connectionId: uuid("connection_id").notNull().references(() => socialConnections.id, { onDelete: "cascade" }),

  externalCampaignId: varchar("external_campaign_id", { length: 255 }),

  // Configuración
  objetivo: varchar("objetivo", { length: 50 }), // "reach", "engagement", "conversiones", etc.
  presupuesto: decimal("presupuesto", { precision: 10, scale: 2 }),
  presupuestoDiario: decimal("presupuesto_diario", { precision: 10, scale: 2 }),
  moneda: varchar("moneda", { length: 10 }).default("USD"),

  audiencia: json("audiencia").$type<{
    edades?: [number, number];
    generos?: string[];
    ubicaciones?: string[];
    intereses?: string[];
  }>(),

  // Fechas
  iniciadoAt: timestamp("iniciado_at"),
  finalizadoAt: timestamp("finalizado_at"),

  // Métricas
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversiones: integer("conversiones").default(0),
  gastado: decimal("gastado", { precision: 10, scale: 2 }).default("0"),

  cpm: decimal("cpm", { precision: 10, scale: 2 }),
  cpc: decimal("cpc", { precision: 10, scale: 2 }),
  cpa: decimal("cpa", { precision: 10, scale: 2 }),
  roas: decimal("roas", { precision: 5, scale: 2 }),

  estado: varchar("estado", { length: 20 }).default("borrador"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Business
export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  nombre: varchar("nombre", { length: 255 }),

  tags: json("tags").$type<string[]>(),
  segmento: varchar("segmento", { length: 100 }),

  // Metadata
  lastMessageAt: timestamp("last_message_at"),
  totalMessages: integer("total_messages").default(0),
  isBlocked: boolean("is_blocked").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappCampaigns = pgTable("whatsapp_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  nombre: varchar("nombre", { length: 255 }).notNull(),
  templateId: varchar("template_id", { length: 255 }).notNull(),
  templateName: varchar("template_name", { length: 255 }),

  segmento: varchar("segmento", { length: 100 }),
  audienciaCount: integer("audiencia_count"),

  programadaPara: timestamp("programada_para"),

  // Métricas
  enviados: integer("enviados").default(0),
  entregados: integer("entregados").default(0),
  leidos: integer("leidos").default(0),
  respuestas: integer("respuestas").default(0),
  conversiones: integer("conversiones").default(0),

  estado: varchar("estado", { length: 20 }).default("borrador"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notificaciones
export const notificaciones = pgTable("notificaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  tipo: tipoNotificacionEnum("tipo").default("info").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensaje: text("mensaje").notNull(),

  link: text("link"),
  actionText: varchar("action_text", { length: 100 }),

  leida: boolean("leida").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Log
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

  accion: varchar("accion", { length: 100 }).notNull(),
  entidad: varchar("entidad", { length: 50 }).notNull(),
  entidadId: varchar("entidad_id", { length: 255 }),

  detalles: json("detalles"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// RELACIONES
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  socialConnections: many(socialConnections),
  posts: many(posts),
  recetas: many(recetas),
  libraryAssets: many(libraryAssets),
  productos: many(productos),
  experimentos: many(experimentos),
  automatizaciones: many(automatizaciones),
  campaigns: many(campaigns),
  whatsappContacts: many(whatsappContacts),
  whatsappCampaigns: many(whatsappCampaigns),
  notificaciones: many(notificaciones),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [socialConnections.userId],
    references: [users.id],
  }),
  postNetworks: many(postNetworks),
  campaigns: many(campaigns),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  receta: one(recetas, {
    fields: [posts.recetaId],
    references: [recetas.id],
  }),
  experimento: one(experimentos, {
    fields: [posts.experimentoId],
    references: [experimentos.id],
  }),
  postNetworks: many(postNetworks),
}));

export const postNetworksRelations = relations(postNetworks, ({ one }) => ({
  post: one(posts, {
    fields: [postNetworks.postId],
    references: [posts.id],
  }),
  connection: one(socialConnections, {
    fields: [postNetworks.connectionId],
    references: [socialConnections.id],
  }),
}));

export const recetasRelations = relations(recetas, ({ one, many }) => ({
  user: one(users, {
    fields: [recetas.userId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const libraryAssetsRelations = relations(libraryAssets, ({ one }) => ({
  user: one(users, {
    fields: [libraryAssets.userId],
    references: [users.id],
  }),
}));

export const productosRelations = relations(productos, ({ one }) => ({
  user: one(users, {
    fields: [productos.userId],
    references: [users.id],
  }),
}));

export const experimentosRelations = relations(experimentos, ({ one, many }) => ({
  user: one(users, {
    fields: [experimentos.userId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const automatizacionesRelations = relations(automatizaciones, ({ one }) => ({
  user: one(users, {
    fields: [automatizaciones.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  connection: one(socialConnections, {
    fields: [campaigns.connectionId],
    references: [socialConnections.id],
  }),
}));

export const whatsappContactsRelations = relations(whatsappContacts, ({ one }) => ({
  user: one(users, {
    fields: [whatsappContacts.userId],
    references: [users.id],
  }),
}));

export const whatsappCampaignsRelations = relations(whatsappCampaigns, ({ one }) => ({
  user: one(users, {
    fields: [whatsappCampaigns.userId],
    references: [users.id],
  }),
}));

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  user: one(users, {
    fields: [notificaciones.userId],
    references: [users.id],
  }),
}));

// ============================================
// TYPES EXPORTADOS
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type SocialConnection = typeof socialConnections.$inferSelect;
export type NewSocialConnection = typeof socialConnections.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type PostNetwork = typeof postNetworks.$inferSelect;
export type NewPostNetwork = typeof postNetworks.$inferInsert;

export type Receta = typeof recetas.$inferSelect;
export type NewReceta = typeof recetas.$inferInsert;

export type LibraryAsset = typeof libraryAssets.$inferSelect;
export type NewLibraryAsset = typeof libraryAssets.$inferInsert;

export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;

export type Experimento = typeof experimentos.$inferSelect;
export type NewExperimento = typeof experimentos.$inferInsert;

export type Automatizacion = typeof automatizaciones.$inferSelect;
export type NewAutomatizacion = typeof automatizaciones.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type WhatsAppContact = typeof whatsappContacts.$inferSelect;
export type NewWhatsAppContact = typeof whatsappContacts.$inferInsert;

export type WhatsAppCampaign = typeof whatsappCampaigns.$inferSelect;
export type NewWhatsAppCampaign = typeof whatsappCampaigns.$inferInsert;

export type Notificacion = typeof notificaciones.$inferSelect;
export type NewNotificacion = typeof notificaciones.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
