import "server-only";

import { getDb } from "@/db";
import { feedSources, resources, stories } from "@/db/schema";
import type {
  FeedSource,
  NewFeedSource,
  NewResource,
  Resource,
  Story,
} from "@/lib/database.types";
import { and, desc, eq } from "drizzle-orm";

export async function getStories(userId: string): Promise<Story[]> {
  return getDb()
    .select()
    .from(stories)
    .where(eq(stories.user_id, userId))
    .orderBy(desc(stories.published_at));
}

export async function getResources(userId: string): Promise<Resource[]> {
  return getDb()
    .select()
    .from(resources)
    .where(eq(resources.user_id, userId))
    .orderBy(desc(resources.created_at));
}

export async function getFeedSources(userId: string): Promise<FeedSource[]> {
  return getDb()
    .select()
    .from(feedSources)
    .where(eq(feedSources.user_id, userId))
    .orderBy(desc(feedSources.created_at));
}

export async function createFeedSource(
  userId: string,
  input: NewFeedSource,
): Promise<FeedSource> {
  const [source] = await getDb()
    .insert(feedSources)
    .values({ ...input, user_id: userId })
    .returning();

  if (!source) throw new Error("The database did not return the new source.");
  return source;
}

export async function setFeedSourceEnabled(
  userId: string,
  id: string,
  isEnabled: boolean,
): Promise<FeedSource> {
  const [source] = await getDb()
    .update(feedSources)
    .set({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .returning();

  if (!source) throw new Error("Source not found.");
  return source;
}

export async function getFeedSource(
  userId: string,
  id: string,
): Promise<FeedSource | null> {
  const [source] = await getDb()
    .select()
    .from(feedSources)
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .limit(1);
  return source ?? null;
}

export async function setFeedSourceSyncRunning(
  userId: string,
  id: string,
): Promise<FeedSource> {
  const [source] = await getDb()
    .update(feedSources)
    .set({ sync_status: "running", last_error: null, updated_at: new Date().toISOString() })
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .returning();

  if (!source) throw new Error("Source not found.");
  return source;
}

export async function completeFeedSourceSync(
  userId: string,
  id: string,
  itemCount: number,
): Promise<FeedSource> {
  const now = new Date().toISOString();
  const [source] = await getDb()
    .update(feedSources)
    .set({
      sync_status: "success",
      last_error: null,
      last_item_count: itemCount,
      last_synced_at: now,
      updated_at: now,
    })
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .returning();

  if (!source) throw new Error("Source not found.");
  return source;
}

export async function failFeedSourceSync(
  userId: string,
  id: string,
  message: string,
): Promise<void> {
  await getDb()
    .update(feedSources)
    .set({
      sync_status: "failed",
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)));
}

export async function insertDiscoveredStories(
  userId: string,
  input: Array<typeof stories.$inferInsert>,
): Promise<Story[]> {
  if (!input.length) return [];
  return getDb()
    .insert(stories)
    .values(input.map((story) => ({ ...story, user_id: userId })))
    .onConflictDoNothing({ target: [stories.user_id, stories.source_url] })
    .returning();
}

export async function createResource(
  userId: string,
  input: NewResource,
): Promise<Resource> {
  const [resource] = await getDb()
    .insert(resources)
    .values({ ...input, user_id: userId })
    .returning();

  if (!resource) throw new Error("The database did not return the new resource.");
  return resource;
}

export async function setStorySaved(
  userId: string,
  id: string,
  isSaved: boolean,
): Promise<Story> {
  const [story] = await getDb()
    .update(stories)
    .set({ is_saved: isSaved, updated_at: new Date().toISOString() })
    .where(and(eq(stories.id, id), eq(stories.user_id, userId)))
    .returning();

  if (!story) throw new Error("Story not found.");
  return story;
}
