CREATE TABLE IF NOT EXISTS "brain_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "fuente" text NOT NULL,
  "diagnosis" jsonb NOT NULL,
  "plan" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "brain_reports_user_created_idx" ON "brain_reports" ("user_id", "created_at" DESC);
