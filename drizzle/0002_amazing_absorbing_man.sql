ALTER TABLE "feed_sources" DROP CONSTRAINT "feed_sources_url_key";--> statement-breakpoint
ALTER TABLE "stories" DROP CONSTRAINT "stories_source_url_key";--> statement-breakpoint
ALTER TABLE "feed_sources" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE INDEX "feed_sources_user_id_idx" ON "feed_sources" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_sources_user_url_key" ON "feed_sources" USING btree ("user_id","url");--> statement-breakpoint
CREATE INDEX "resources_user_id_idx" ON "resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stories_user_id_idx" ON "stories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_user_source_url_key" ON "stories" USING btree ("user_id","source_url");
--> statement-breakpoint
ALTER TABLE "feed_sources"
ADD CONSTRAINT "feed_sources_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resources"
ADD CONSTRAINT "resources_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "stories"
ADD CONSTRAINT "stories_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "feed_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Users can read their own feed sources"
ON "feed_sources" FOR SELECT TO authenticated
USING ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can create their own feed sources"
ON "feed_sources" FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own feed sources"
ON "feed_sources" FOR UPDATE TO authenticated
USING ((select auth.uid()) = "user_id")
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can delete their own feed sources"
ON "feed_sources" FOR DELETE TO authenticated
USING ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can read their own resources"
ON "resources" FOR SELECT TO authenticated
USING ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can create their own resources"
ON "resources" FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own resources"
ON "resources" FOR UPDATE TO authenticated
USING ((select auth.uid()) = "user_id")
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can delete their own resources"
ON "resources" FOR DELETE TO authenticated
USING ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can read their own stories"
ON "stories" FOR SELECT TO authenticated
USING ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can create their own stories"
ON "stories" FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can update their own stories"
ON "stories" FOR UPDATE TO authenticated
USING ((select auth.uid()) = "user_id")
WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint
CREATE POLICY "Users can delete their own stories"
ON "stories" FOR DELETE TO authenticated
USING ((select auth.uid()) = "user_id");
