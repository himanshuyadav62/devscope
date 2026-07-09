import "server-only";

import { getDb } from "@/db";
import { resources, stories } from "@/db/schema";
import type { NewResource, Resource, Story } from "@/lib/database.types";
import { desc, eq } from "drizzle-orm";

export async function getStories(): Promise<Story[]> {
  return getDb().select().from(stories).orderBy(desc(stories.published_at));
}

export async function getResources(): Promise<Resource[]> {
  return getDb().select().from(resources).orderBy(desc(resources.created_at));
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
