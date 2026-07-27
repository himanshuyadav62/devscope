ALTER TABLE "stories"
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "feed_sources"
ADD COLUMN IF NOT EXISTS "config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "feed_sources"
ADD COLUMN IF NOT EXISTS "sync_status" text DEFAULT 'idle' NOT NULL;
--> statement-breakpoint
ALTER TABLE "feed_sources"
ADD COLUMN IF NOT EXISTS "last_error" text;
--> statement-breakpoint
ALTER TABLE "feed_sources"
ADD COLUMN IF NOT EXISTS "last_item_count" integer DEFAULT 0 NOT NULL;
