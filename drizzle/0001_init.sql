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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"is_admin" boolean DEFAULT false NOT NULL,
	"whatsapp_configurado" boolean DEFAULT false NOT NULL,
	"onboarding_completado" boolean DEFAULT false NOT NULL,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data_snapshots" ADD CONSTRAINT "user_data_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_post_origen_id_posts_id_fk" FOREIGN KEY ("post_origen_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_user_red_idx" ON "oauth_accounts" USING btree ("user_id","red");