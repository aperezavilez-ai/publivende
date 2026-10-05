ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_status" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_renews_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "users_stripe_customer_idx" ON "users" ("stripe_customer_id");
