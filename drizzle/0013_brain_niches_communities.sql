CREATE TABLE IF NOT EXISTS "market_niches" (
  "id" text PRIMARY KEY NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "audiencia_objetivo" text,
  "angulo_gancho" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brain_communities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "niche_id" text NOT NULL REFERENCES "market_niches"("id") ON DELETE CASCADE,
  "plataforma" text NOT NULL,
  "nombre" text NOT NULL,
  "url" text,
  "pais" text DEFAULT 'México' NOT NULL,
  "estado" text DEFAULT 'General' NOT NULL,
  "ciudad" text,
  "tipo_alcance" text DEFAULT 'local' NOT NULL,
  "miembros_estimados" integer DEFAULT 10000 NOT NULL,
  "nivel_interaccion" text DEFAULT 'alta' NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brain_communities_niche_idx" ON "brain_communities" ("niche_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brain_communities_geo_idx" ON "brain_communities" ("pais", "estado", "ciudad");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brain_communities_alcance_idx" ON "brain_communities" ("tipo_alcance", "activo");
