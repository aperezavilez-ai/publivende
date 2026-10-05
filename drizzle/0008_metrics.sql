ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "metrics_synced_at" timestamp with time zone;
ALTER TABLE "oauth_accounts" ADD COLUMN IF NOT EXISTS "metrics_error" text;

CREATE TABLE IF NOT EXISTS "post_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS "post_metrics_post_red_idx" ON "post_metrics" ("post_id", "red");
CREATE INDEX IF NOT EXISTS "post_metrics_user_idx" ON "post_metrics" ("user_id");

CREATE TABLE IF NOT EXISTS "account_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "red" text NOT NULL,
  "fecha" text NOT NULL,
  "seguidores" integer DEFAULT 0 NOT NULL,
  "publicaciones" integer,
  "vistas_totales" integer,
  "raw" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_snapshots_user_red_fecha_idx" ON "account_snapshots" ("user_id", "red", "fecha");
