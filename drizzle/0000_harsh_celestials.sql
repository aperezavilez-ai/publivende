CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"red" text NOT NULL,
	"fecha" text NOT NULL,
	"seguidores" integer DEFAULT 0 NOT NULL,
	"publicaciones" integer,
	"vistas_totales" integer,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"disparador" text NOT NULL,
	"palabra_clave" text,
	"respuesta" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autopilot_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"activo" boolean DEFAULT false NOT NULL,
	"modo" text DEFAULT 'aprobar' NOT NULL,
	"posts_semana" integer DEFAULT 3 NOT NULL,
	"redes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ultima_generacion" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boost_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"nicho" text,
	"ia_score" integer,
	"ia_motivo" text,
	"ia_fuente" text,
	"copy_red" text,
	"canales" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resultados" jsonb,
	"motivo_rechazo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publicado_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "brain_kpis" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"nicho" text NOT NULL,
	"score" integer NOT NULL,
	"kpis" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"fuente" text NOT NULL,
	"diagnosis" jsonb NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosted_media" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"mime_type" text NOT NULL,
	"data_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"red" text NOT NULL,
	"external_account_id" text NOT NULL,
	"nombre" text NOT NULL,
	"avatar" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"oauth_provider" text NOT NULL,
	"nichos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"activo" boolean DEFAULT false NOT NULL,
	"estado_conexion" text DEFAULT 'conectada' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niche_benchmarks" (
	"nicho" text PRIMARY KEY NOT NULL,
	"negocios" integer NOT NULL,
	"metricas" jsonb NOT NULL,
	"ganchos" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"red" text NOT NULL,
	"nombre_cuenta" text NOT NULL,
	"avatar" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"external_account_id" text,
	"oauth_provider" text,
	"estado_conexion" text DEFAULT 'conectada' NOT NULL,
	"metrics_synced_at" timestamp with time zone,
	"metrics_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"label" text DEFAULT 'default' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"brand_name" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#7c3aed' NOT NULL,
	"allowed_return_origins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"webhook_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"channel_type" text NOT NULL,
	"channel_id" text,
	"channel_name" text NOT NULL,
	"external_id" text,
	"status" text DEFAULT 'published' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"red" text NOT NULL,
	"external_id" text NOT NULL,
	"vistas" integer DEFAULT 0 NOT NULL,
	"alcance" integer,
	"likes" integer DEFAULT 0 NOT NULL,
	"comentarios" integer DEFAULT 0 NOT NULL,
	"compartidos" integer DEFAULT 0 NOT NULL,
	"guardados" integer,
	"clics" integer,
	"raw" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"media_url" text DEFAULT '' NOT NULL,
	"copy" text NOT NULL,
	"copy_por_red" jsonb,
	"source_url" text,
	"alcance" jsonb,
	"redes_destino" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"fecha_programada" timestamp with time zone,
	"fecha_publicacion" timestamp with time zone,
	"tracking_slug" text NOT NULL,
	"hashtags_por_red" jsonb,
	"hashtags_virales" jsonb,
	"canales_distribucion" jsonb,
	"nicho_label" text,
	"total_canales" integer,
	"whatsapp_enviado_at" timestamp with time zone,
	"whatsapp_broadcast_count" integer,
	"external_ids" jsonb,
	"publish_surfaces" jsonb,
	"schedule_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"precio" real NOT NULL,
	"moneda" text DEFAULT 'MXN' NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"imagen" text DEFAULT '' NOT NULL,
	"link_pago" text DEFAULT '' NOT NULL,
	"pago_provider" text,
	"slug_publico" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_data_snapshots" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text NOT NULL,
	"celular" text DEFAULT '' NOT NULL,
	"codigo_pais" text DEFAULT '+52' NOT NULL,
	"nombre_negocio" text DEFAULT '' NOT NULL,
	"industria" text,
	"descripcion_negocio" text,
	"publico_objetivo" text,
	"tono_marca" text,
	"ciudad" text,
	"horario_atencion" text,
	"pago_provider_default" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_status" text,
	"plan_renews_at" timestamp with time zone,
	"is_admin" boolean DEFAULT false NOT NULL,
	"whatsapp_configurado" boolean DEFAULT false NOT NULL,
	"onboarding_completado" boolean DEFAULT false NOT NULL,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"waba_id" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"display_phone_number" text DEFAULT '' NOT NULL,
	"verified_name" text,
	"access_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"estado_conexion" text DEFAULT 'conectada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"celular" text NOT NULL,
	"etiqueta" text DEFAULT '' NOT NULL,
	"etapa" text DEFAULT 'nuevo' NOT NULL,
	"origen" text DEFAULT '' NOT NULL,
	"post_origen_id" uuid,
	"notas" text DEFAULT '' NOT NULL,
	"monto_venta" real,
	"lead_score" integer,
	"score_motivos" jsonb,
	"no_leidos" integer DEFAULT 0 NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"direccion" text NOT NULL,
	"texto" text NOT NULL,
	"automatico" boolean DEFAULT false NOT NULL,
	"post_id" uuid,
	"wa_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_settings" ADD CONSTRAINT "autopilot_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_kpis" ADD CONSTRAINT "brain_kpis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_reports" ADD CONSTRAINT "brain_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosted_media" ADD CONSTRAINT "hosted_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_keys" ADD CONSTRAINT "partner_api_keys_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_distributions" ADD CONSTRAINT "post_distributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_distributions" ADD CONSTRAINT "post_distributions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data_snapshots" ADD CONSTRAINT "user_data_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_post_origen_id_posts_id_fk" FOREIGN KEY ("post_origen_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_snapshots_user_red_fecha_idx" ON "account_snapshots" USING btree ("user_id","red","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "boost_requests_post_idx" ON "boost_requests" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hub_channels_red_ext_idx" ON "hub_channels" USING btree ("red","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_user_red_idx" ON "oauth_accounts" USING btree ("user_id","red");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_external_user_idx" ON "partner_users" USING btree ("partner_id","external_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partners_slug_idx" ON "partners" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "post_metrics_post_red_idx" ON "post_metrics" USING btree ("post_id","red");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_user_idx" ON "whatsapp_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_phone_number_id_idx" ON "whatsapp_accounts" USING btree ("phone_number_id");