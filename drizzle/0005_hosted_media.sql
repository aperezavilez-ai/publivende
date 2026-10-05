CREATE TABLE IF NOT EXISTS "hosted_media" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mime_type" text NOT NULL,
  "data_base64" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "hosted_media_user_idx" ON "hosted_media" ("user_id");
