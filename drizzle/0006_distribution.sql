ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "publish_surfaces" jsonb;

CREATE TABLE IF NOT EXISTS "post_distributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "channel_type" text NOT NULL,
  "channel_id" text,
  "channel_name" text NOT NULL,
  "external_id" text,
  "status" text NOT NULL DEFAULT 'published',
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "post_distributions_post_idx" ON "post_distributions" ("post_id");
CREATE INDEX IF NOT EXISTS "post_distributions_user_idx" ON "post_distributions" ("user_id");

CREATE TABLE IF NOT EXISTS "user_facebook_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "group_id" text NOT NULL,
  "group_name" text NOT NULL,
  "member_count" integer NOT NULL DEFAULT 0,
  "can_post" boolean NOT NULL DEFAULT true,
  "synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_fb_group_idx" ON "user_facebook_groups" ("user_id", "group_id");
