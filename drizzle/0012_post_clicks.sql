-- Real v2: tabla de clics del tracking público /p/<slug>.
-- Idempotente: se puede correr varias veces sin error ni duplicar.
CREATE TABLE IF NOT EXISTS "post_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referer" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "post_clicks_post_idx" ON "post_clicks" ("post_id");
CREATE INDEX IF NOT EXISTS "post_clicks_user_idx" ON "post_clicks" ("user_id");
