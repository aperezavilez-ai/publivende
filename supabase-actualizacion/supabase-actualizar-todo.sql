-- Publivende: actualizacion completa de Supabase al esquema actual (src/server/db/schema.ts)
-- Idempotente: se puede correr varias veces. No borra tablas, columnas ni datos.

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
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
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text NOT NULL UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "celular" text DEFAULT '' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "codigo_pais" text DEFAULT '+52' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nombre_negocio" text DEFAULT '' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "industria" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "descripcion_negocio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publico_objetivo" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tono_marca" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ciudad" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "horario_atencion" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pago_provider_default" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_status" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_renews_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_configurado" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completado" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fecha_registro" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "red" text NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "nombre_cuenta" text NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "access_token" text NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "refresh_token" text;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "external_account_id" text;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "oauth_provider" text;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "estado_conexion" text DEFAULT 'conectada' NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "metrics_synced_at" timestamp with time zone;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "metrics_error" text;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_user_red_idx" ON "oauth_accounts" ("user_id", "red");

CREATE TABLE IF NOT EXISTS "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tipo" text NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "media_url" text DEFAULT '' NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "copy" text NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "copy_por_red" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "alcance" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "redes_destino" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "estado" text DEFAULT 'borrador' NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "fecha_programada" timestamp with time zone;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "fecha_publicacion" timestamp with time zone;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tracking_slug" text NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hashtags_por_red" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hashtags_virales" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "canales_distribucion" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "nicho_label" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "total_canales" integer;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "whatsapp_enviado_at" timestamp with time zone;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "whatsapp_broadcast_count" integer;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_ids" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "publish_surfaces" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "schedule_meta" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "precio" real NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "moneda" text DEFAULT 'MXN' NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "descripcion" text DEFAULT '' NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "imagen" text DEFAULT '' NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "link_pago" text DEFAULT '' NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "pago_provider" text;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "slug_publico" text;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT true NOT NULL;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "productos" ADD CONSTRAINT "productos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "celular" text NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "etiqueta" text DEFAULT '' NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "etapa" text DEFAULT 'nuevo' NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "origen" text DEFAULT '' NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "post_origen_id" uuid;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "notas" text DEFAULT '' NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "monto_venta" real;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "lead_score" integer;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "score_motivos" jsonb;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "no_leidos" integer DEFAULT 0 NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD COLUMN IF NOT EXISTS "fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_post_origen_id_posts_id_fk" FOREIGN KEY ("post_origen_id") REFERENCES "posts"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "direccion" text NOT NULL,
  "texto" text NOT NULL,
  "automatico" boolean DEFAULT false NOT NULL,
  "post_id" uuid,
  "wa_message_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "contact_id" uuid NOT NULL;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "direccion" text NOT NULL;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "texto" text NOT NULL;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "automatico" boolean DEFAULT false NOT NULL;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "post_id" uuid;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "wa_message_id" text;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "automation_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "nombre" text NOT NULL,
  "disparador" text NOT NULL,
  "palabra_clave" text,
  "respuesta" text NOT NULL,
  "activa" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "disparador" text NOT NULL;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "palabra_clave" text;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "respuesta" text NOT NULL;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "activa" boolean DEFAULT true NOT NULL;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "waba_id" text NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "phone_number_id" text NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "display_phone_number" text DEFAULT '' NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "verified_name" text;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "access_token_encrypted" text NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "estado_conexion" text DEFAULT 'conectada' NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_user_idx" ON "whatsapp_accounts" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_phone_number_id_idx" ON "whatsapp_accounts" ("phone_number_id");

CREATE TABLE IF NOT EXISTS "partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "slug" text NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "brand_name" text NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "primary_color" text DEFAULT '#7c3aed' NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "allowed_return_origins" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "webhook_url" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT true NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "partners_slug_idx" ON "partners" ("slug");

CREATE TABLE IF NOT EXISTS "partner_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL,
  "label" text DEFAULT 'default' NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "partner_id" uuid NOT NULL;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" text NOT NULL;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "key_hash" text NOT NULL;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "label" text DEFAULT 'default' NOT NULL;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT true NOT NULL;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;
ALTER TABLE "partner_api_keys" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "partner_api_keys" ADD CONSTRAINT "partner_api_keys_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "partner_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "external_user_id" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "partner_id" uuid NOT NULL;
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "external_user_id" text NOT NULL;
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE;
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "partner_external_user_idx" ON "partner_users" ("partner_id", "external_user_id");

CREATE TABLE IF NOT EXISTS "hosted_media" (
  "id" text PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "mime_type" text NOT NULL,
  "data_base64" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "hosted_media" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "hosted_media" ADD COLUMN IF NOT EXISTS "mime_type" text NOT NULL;
ALTER TABLE "hosted_media" ADD COLUMN IF NOT EXISTS "data_base64" text NOT NULL;
ALTER TABLE "hosted_media" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "hosted_media" ADD CONSTRAINT "hosted_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "post_distributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "post_id" uuid NOT NULL;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "channel_type" text NOT NULL;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "channel_id" text;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "channel_name" text NOT NULL;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published' NOT NULL;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "post_distributions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "post_distributions" ADD CONSTRAINT "post_distributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "post_distributions" ADD CONSTRAINT "post_distributions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "hub_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "red" text NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "external_account_id" text NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "nombre" text NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "access_token" text NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "refresh_token" text;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "oauth_provider" text NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "nichos" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT false NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "estado_conexion" text DEFAULT 'conectada' NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "hub_channels" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "hub_channels_red_ext_idx" ON "hub_channels" ("red", "external_account_id");

CREATE TABLE IF NOT EXISTS "boost_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "post_id" uuid NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "estado" text DEFAULT 'pendiente' NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "nicho" text;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "ia_score" integer;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "ia_motivo" text;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "ia_fuente" text;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "copy_red" text;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "canales" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "resultados" jsonb;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "motivo_rechazo" text;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "publicado_at" timestamp with time zone;
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "boost_requests_post_idx" ON "boost_requests" ("post_id");

CREATE TABLE IF NOT EXISTS "post_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "post_id" uuid NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "red" text NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "external_id" text NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "vistas" integer DEFAULT 0 NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "alcance" integer;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "likes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "comentarios" integer DEFAULT 0 NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "compartidos" integer DEFAULT 0 NOT NULL;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "guardados" integer;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "clics" integer;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "raw" jsonb;
ALTER TABLE "post_metrics" ADD COLUMN IF NOT EXISTS "fetched_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "post_metrics_post_red_idx" ON "post_metrics" ("post_id", "red");

CREATE TABLE IF NOT EXISTS "account_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "red" text NOT NULL,
  "fecha" text NOT NULL,
  "seguidores" integer DEFAULT 0 NOT NULL,
  "publicaciones" integer,
  "vistas_totales" integer,
  "raw" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "red" text NOT NULL;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "fecha" text NOT NULL;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "seguidores" integer DEFAULT 0 NOT NULL;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "publicaciones" integer;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "vistas_totales" integer;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "raw" jsonb;
ALTER TABLE "account_snapshots" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "account_snapshots_user_red_fecha_idx" ON "account_snapshots" ("user_id", "red", "fecha");

CREATE TABLE IF NOT EXISTS "brain_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "score" integer NOT NULL,
  "fuente" text NOT NULL,
  "diagnosis" jsonb NOT NULL,
  "plan" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "score" integer NOT NULL;
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "fuente" text NOT NULL;
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "diagnosis" jsonb NOT NULL;
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "plan" jsonb NOT NULL;
ALTER TABLE "brain_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "brain_reports" ADD CONSTRAINT "brain_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "autopilot_settings" (
  "user_id" uuid PRIMARY KEY,
  "activo" boolean DEFAULT false NOT NULL,
  "modo" text DEFAULT 'aprobar' NOT NULL,
  "posts_semana" integer DEFAULT 3 NOT NULL,
  "redes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "ultima_generacion" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT false NOT NULL;
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "modo" text DEFAULT 'aprobar' NOT NULL;
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "posts_semana" integer DEFAULT 3 NOT NULL;
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "redes" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "ultima_generacion" timestamp with time zone;
ALTER TABLE "autopilot_settings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "autopilot_settings" ADD CONSTRAINT "autopilot_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "brain_kpis" (
  "user_id" uuid PRIMARY KEY,
  "nicho" text NOT NULL,
  "score" integer NOT NULL,
  "kpis" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "brain_kpis" ADD COLUMN IF NOT EXISTS "nicho" text NOT NULL;
ALTER TABLE "brain_kpis" ADD COLUMN IF NOT EXISTS "score" integer NOT NULL;
ALTER TABLE "brain_kpis" ADD COLUMN IF NOT EXISTS "kpis" jsonb NOT NULL;
ALTER TABLE "brain_kpis" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "brain_kpis" ADD CONSTRAINT "brain_kpis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "niche_benchmarks" (
  "nicho" text PRIMARY KEY,
  "negocios" integer NOT NULL,
  "metricas" jsonb NOT NULL,
  "ganchos" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "niche_benchmarks" ADD COLUMN IF NOT EXISTS "negocios" integer NOT NULL;
ALTER TABLE "niche_benchmarks" ADD COLUMN IF NOT EXISTS "metricas" jsonb NOT NULL;
ALTER TABLE "niche_benchmarks" ADD COLUMN IF NOT EXISTS "ganchos" jsonb NOT NULL;
ALTER TABLE "niche_benchmarks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "user_data_snapshots" (
  "user_id" uuid PRIMARY KEY,
  "data" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "user_data_snapshots" ADD COLUMN IF NOT EXISTS "data" jsonb NOT NULL;
ALTER TABLE "user_data_snapshots" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "user_data_snapshots" ADD CONSTRAINT "user_data_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");