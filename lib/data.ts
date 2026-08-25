import "server-only";

import { getDb } from "@/db";
import { feedSources, pluginSchedules, resources, stories } from "@/db/schema";
import type {
  FeedSource,
  GitHubSavedRepository,
  NewFeedSource,
  NewPluginSchedule,
  NewResource,
  PageResult,
  PluginSchedule,
  Resource,
  Story,
} from "@/lib/database.types";
import { and, count, desc, eq, lte, sql } from "drizzle-orm";

export const DEFAULT_PAGE_SIZE = 50;

function clampPageSize(value: number, fallback = DEFAULT_PAGE_SIZE) {
  return Number.isFinite(value) ? Math.min(100, Math.max(1, Math.round(value))) : fallback;
}

export async function getStories(userId: string): Promise<Story[]> {
  return getDb()
    .select()
    .from(stories)
    .where(eq(stories.user_id, userId))
    .orderBy(desc(stories.published_at));
}

export async function getStoriesPage(
  userId: string,
  {
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    topic,
    source,
    savedOnly = false,
  }: {
    limit?: number;
    offset?: number;
    topic?: string | null;
    source?: string | null;
    savedOnly?: boolean;
  } = {},
): Promise<PageResult<Story>> {
  const pageSize = clampPageSize(limit);
  const conditions = [eq(stories.user_id, userId)];
  if (topic && topic !== "All") conditions.push(sql`${topic} = any(${stories.topics})`);
  if (source && source !== "All") conditions.push(eq(stories.source, source));
  if (savedOnly) conditions.push(eq(stories.is_saved, true));

  const rows = await getDb()
    .select()
    .from(stories)
    .where(and(...conditions))
    .orderBy(desc(stories.published_at), desc(stories.id))
    .limit(pageSize + 1)
    .offset(Math.max(0, offset));

  return {
    items: rows.slice(0, pageSize),
    nextOffset: rows.length > pageSize ? Math.max(0, offset) + pageSize : null,
  };
}

export async function getStoryShellMeta(userId: string): Promise<{
  topics: string[];
  sources: string[];
  savedStoriesCount: number;
}> {
  const [topicRows, sourceRows, savedCount] = await Promise.all([
    getDb()
      .select({ topics: stories.topics })
      .from(stories)
      .where(eq(stories.user_id, userId)),
    getDb()
      .select({ source: stories.source })
      .from(stories)
      .where(eq(stories.user_id, userId)),
    getDb()
      .select({ count: count() })
      .from(stories)
      .where(and(eq(stories.user_id, userId), eq(stories.is_saved, true))),
  ]);

  return {
    topics: Array.from(new Set(topicRows.flatMap((row) => row.topics))).sort((a, b) => a.localeCompare(b)),
    sources: Array.from(new Set(sourceRows.map((row) => row.source))).sort((a, b) => a.localeCompare(b)),
    savedStoriesCount: savedCount[0]?.count ?? 0,
  };
}

function repositoryFromGitHubUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return null;
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    return owner && repo ? `${owner}/${repo}` : null;
  } catch {
    return null;
  }
}

export async function getSavedGitHubRepositories(userId: string): Promise<GitHubSavedRepository[]> {
  const rows = await getDb()
    .select({
      title: stories.title,
      source_url: stories.source_url,
      summary: stories.summary,
      metadata: stories.metadata,
    })
    .from(stories)
    .where(
      and(
        eq(stories.user_id, userId),
        eq(stories.is_saved, true),
        sql`${stories.source_url} like 'https://github.com/%/%'`,
      ),
    )
    .orderBy(desc(stories.updated_at))
    .limit(100);

  const repositories = rows
    .map((story): GitHubSavedRepository | null => {
      const fullName = repositoryFromGitHubUrl(story.source_url) ?? story.title;
      if (!fullName || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) return null;
      return {
        fullName,
        url: `https://github.com/${fullName}`,
        description: story.summary || null,
        stars: typeof story.metadata.stars === "number" ? story.metadata.stars : 0,
        language: typeof story.metadata.language === "string" ? story.metadata.language : null,
        topics: [],
        source: "saved" as const,
      };
    })
    .filter((repository): repository is GitHubSavedRepository => Boolean(repository));

  return Array.from(new Map(repositories.map((repository) => [repository.fullName, repository])).values());
}

export async function getResources(userId: string): Promise<Resource[]> {
  return getDb()
    .select()
    .from(resources)
    .where(eq(resources.user_id, userId))
    .orderBy(desc(resources.created_at));
}

export async function getResourcesPage(
  userId: string,
  {
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<PageResult<Resource>> {
  const pageSize = clampPageSize(limit);
  const rows = await getDb()
    .select()
    .from(resources)
    .where(eq(resources.user_id, userId))
    .orderBy(desc(resources.created_at), desc(resources.id))
    .limit(pageSize + 1)
    .offset(Math.max(0, offset));

  return {
    items: rows.slice(0, pageSize),
    nextOffset: rows.length > pageSize ? Math.max(0, offset) + pageSize : null,
  };
}

export async function getFeedSources(userId: string): Promise<FeedSource[]> {
  return getDb()
    .select()
    .from(feedSources)
    .where(eq(feedSources.user_id, userId))
    .orderBy(desc(feedSources.created_at));
}

export async function getRunnableFeedSources(userId: string): Promise<FeedSource[]> {
  return getDb()
    .select()
    .from(feedSources)
    .where(
      and(
        eq(feedSources.user_id, userId),
        eq(feedSources.is_enabled, true),
        sql`${feedSources.provider} in ('GitHub', 'GitHub Releases', 'GitHub Security', 'YouTube', 'Hugging Face', 'Hacker News', 'Dev.to', 'Stack Overflow', 'arXiv', 'npm')`,
      ),
    )
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

export async function updateFeedSource(
  userId: string,
  id: string,
  input: NewFeedSource,
): Promise<FeedSource | null> {
  const [source] = await getDb()
    .update(feedSources)
    .set({ ...input, updated_at: new Date().toISOString() })
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .returning();

  return source ?? null;
}

export async function deleteFeedSource(
  userId: string,
  id: string,
): Promise<FeedSource | null> {
  const [source] = await getDb()
    .delete(feedSources)
    .where(and(eq(feedSources.id, id), eq(feedSources.user_id, userId)))
    .returning();

  return source ?? null;
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

export async function getPluginSchedules(userId: string): Promise<PluginSchedule[]> {
  return getDb()
    .select()
    .from(pluginSchedules)
    .where(eq(pluginSchedules.user_id, userId))
    .orderBy(desc(pluginSchedules.created_at));
}

export async function createPluginSchedule(
  userId: string,
  input: NewPluginSchedule,
): Promise<PluginSchedule> {
  const [schedule] = await getDb()
    .insert(pluginSchedules)
    .values({ ...input, user_id: userId })
    .returning();

  if (!schedule) throw new Error("The database did not return the new schedule.");
  return schedule;
}

export async function updatePluginSchedule(
  userId: string,
  id: string,
  input: Partial<NewPluginSchedule>,
): Promise<PluginSchedule> {
  const [schedule] = await getDb()
    .update(pluginSchedules)
    .set({ ...input, updated_at: new Date().toISOString() })
    .where(and(eq(pluginSchedules.id, id), eq(pluginSchedules.user_id, userId)))
    .returning();

  if (!schedule) throw new Error("Schedule not found.");
  return schedule;
}

export async function deletePluginSchedule(userId: string, id: string): Promise<void> {
  await getDb()
    .delete(pluginSchedules)
    .where(and(eq(pluginSchedules.id, id), eq(pluginSchedules.user_id, userId)));
}

export async function getDuePluginSchedules(now = new Date().toISOString()): Promise<PluginSchedule[]> {
  return getDb()
    .select()
    .from(pluginSchedules)
    .where(and(eq(pluginSchedules.is_enabled, true), lte(pluginSchedules.next_run_at, now)))
    .orderBy(pluginSchedules.next_run_at)
    .limit(25);
}

export async function completePluginScheduleRun(
  id: string,
  nextRunAt: string,
  itemCount: number,
): Promise<void> {
  const now = new Date().toISOString();
  await getDb()
    .update(pluginSchedules)
    .set({
      last_run_at: now,
      next_run_at: nextRunAt,
      last_status: "success",
      last_error: null,
      last_item_count: itemCount,
      updated_at: now,
    })
    .where(eq(pluginSchedules.id, id));
}

export async function failPluginScheduleRun(
  id: string,
  nextRunAt: string,
  message: string,
): Promise<void> {
  const now = new Date().toISOString();
  await getDb()
    .update(pluginSchedules)
    .set({
      last_run_at: now,
      next_run_at: nextRunAt,
      last_status: "failed",
      last_error: message.slice(0, 500),
      updated_at: now,
    })
    .where(eq(pluginSchedules.id, id));
}
