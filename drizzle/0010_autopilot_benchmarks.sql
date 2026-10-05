CREATE TABLE IF NOT EXISTS "autopilot_settings" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activo" boolean DEFAULT false NOT NULL,
  "modo" text DEFAULT 'aprobar' NOT NULL,
  "posts_semana" integer DEFAULT 3 NOT NULL,
  "redes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "ultima_generacion" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "brain_kpis" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "nicho" text NOT NULL,
  "score" integer NOT NULL,
  "kpis" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "brain_kpis_nicho_idx" ON "brain_kpis" ("nicho", "updated_at");

CREATE TABLE IF NOT EXISTS "niche_benchmarks" (
  "nicho" text PRIMARY KEY NOT NULL,
  "negocios" integer NOT NULL,
  "metricas" jsonb NOT NULL,
  "ganchos" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
