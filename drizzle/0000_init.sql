CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
  "is_admin" boolean DEFAULT false NOT NULL,
  "whatsapp_configurado" boolean DEFAULT false NOT NULL,
  "onboarding_completado" boolean DEFAULT false NOT NULL,
  "fecha_registro" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "red" text NOT NULL,
  "nombre_cuenta" text NOT NULL,
  "avatar" text,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "token_expires_at" timestamptz,
  "external_account_id" text,
  "oauth_provider" text,
  "estado_conexion" text DEFAULT 'conectada' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_user_red_idx" ON "oauth_accounts" ("user_id", "red");

CREATE TABLE IF NOT EXISTS "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tipo" text NOT NULL,
  "media_url" text DEFAULT '' NOT NULL,
  "copy" text NOT NULL,
  "copy_por_red" jsonb,
  "source_url" text,
  "alcance" jsonb,
  "redes_destino" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "estado" text DEFAULT 'borrador' NOT NULL,
  "fecha_programada" timestamptz,
  "fecha_publicacion" timestamptz,
  "tracking_slug" text NOT NULL,
  "hashtags_por_red" jsonb,
  "hashtags_virales" jsonb,
  "canales_distribucion" jsonb,
  "nicho_label" text,
  "total_canales" integer,
  "whatsapp_enviado_at" timestamptz,
  "whatsapp_broadcast_count" integer,
  "external_ids" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nombre" text NOT NULL,
  "precio" real NOT NULL,
  "moneda" text DEFAULT 'MXN' NOT NULL,
  "descripcion" text DEFAULT '' NOT NULL,
  "imagen" text DEFAULT '' NOT NULL,
  "link_pago" text DEFAULT '' NOT NULL,
  "pago_provider" text,
  "slug_publico" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nombre" text NOT NULL,
  "celular" text NOT NULL,
  "etiqueta" text DEFAULT '' NOT NULL,
  "etapa" text DEFAULT 'nuevo' NOT NULL,
  "origen" text DEFAULT '' NOT NULL,
  "post_origen_id" uuid REFERENCES "posts"("id"),
  "notas" text DEFAULT '' NOT NULL,
  "monto_venta" real,
  "lead_score" integer,
  "score_motivos" jsonb,
  "no_leidos" integer DEFAULT 0 NOT NULL,
  "fecha_creacion" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contact_id" uuid NOT NULL REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "direccion" text NOT NULL,
  "texto" text NOT NULL,
  "automatico" boolean DEFAULT false NOT NULL,
  "post_id" uuid REFERENCES "posts"("id"),
  "wa_message_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "automation_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nombre" text NOT NULL,
  "disparador" text NOT NULL,
  "palabra_clave" text,
  "respuesta" text NOT NULL,
  "activa" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_data_snapshots" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
