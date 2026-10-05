CREATE TABLE IF NOT EXISTS "hub_channels" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "hub_channels_red_ext_idx" ON "hub_channels" ("red", "external_account_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boost_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS "boost_requests_post_idx" ON "boost_requests" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boost_requests_estado_idx" ON "boost_requests" ("estado", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boost_requests_user_idx" ON "boost_requests" ("user_id", "created_at");
