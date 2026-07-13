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
import { desc, eq } from "drizzle-orm";

export async function getStories(): Promise<Story[]> {
  return getDb().select().from(stories).orderBy(desc(stories.published_at));
}

export async function getResources(): Promise<Resource[]> {
  return getDb().select().from(resources).orderBy(desc(resources.created_at));
}

export async function getFeedSources(): Promise<FeedSource[]> {
  return getDb()
    .select()
    .from(feedSources)
    .orderBy(desc(feedSources.created_at));
}

export async function createFeedSource(
  input: NewFeedSource,
): Promise<FeedSource> {
  const [source] = await getDb().insert(feedSources).values(input).returning();

  if (!source) throw new Error("The database did not return the new source.");
  return source;
}

export async function setFeedSourceEnabled(
  id: string,
  isEnabled: boolean,
): Promise<FeedSource> {
  const [source] = await getDb()
    .update(feedSources)
    .set({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .where(eq(feedSources.id, id))
    .returning();

  if (!source) throw new Error("Source not found.");
  return source;
}

export async function createResource(input: NewResource): Promise<Resource> {
  const [resource] = await getDb().insert(resources).values(input).returning();

  if (!resource) throw new Error("The database did not return the new resource.");
  return resource;
}

export async function setStorySaved(
  id: string,
  isSaved: boolean,
): Promise<Story> {
  const [story] = await getDb()
    .update(stories)
    .set({ is_saved: isSaved, updated_at: new Date().toISOString() })
    .where(eq(stories.id, id))
    .returning();

  if (!story) throw new Error("Story not found.");
  return story;
}
