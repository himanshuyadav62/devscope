CREATE TABLE "plugin_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text DEFAULT 'Daily active plugin run' NOT NULL,
	"time_of_day" text DEFAULT '09:00' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_status" text DEFAULT 'idle' NOT NULL,
	"last_error" text,
	"last_item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_schedules_time_check" CHECK ("plugin_schedules"."time_of_day" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE INDEX "plugin_schedules_due_idx" ON "plugin_schedules" USING btree ("is_enabled","next_run_at");--> statement-breakpoint
CREATE INDEX "plugin_schedules_user_id_idx" ON "plugin_schedules" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "plugin_schedules"
ADD CONSTRAINT "plugin_schedules_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plugin_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "plugin_schedules_select_own"
ON "plugin_schedules" FOR SELECT TO authenticated
USING ((select auth.uid()) = "user_id");--> statement-breakpoint
CREATE POLICY "plugin_schedules_insert_own"
ON "plugin_schedules" FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = "user_id");--> statement-breakpoint
CREATE POLICY "plugin_schedules_update_own"
ON "plugin_schedules" FOR UPDATE TO authenticated
USING ((select auth.uid()) = "user_id")
WITH CHECK ((select auth.uid()) = "user_id");--> statement-breakpoint
CREATE POLICY "plugin_schedules_delete_own"
ON "plugin_schedules" FOR DELETE TO authenticated
USING ((select auth.uid()) = "user_id");
