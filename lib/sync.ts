import "server-only";

import {
  completeFeedSourceSync,
  failFeedSourceSync,
  insertDiscoveredStories,
  setFeedSourceSyncRunning,
} from "@/lib/data";
import type { FeedSource, SyncFeedSourceResult } from "@/lib/database.types";
import { getFeedProvider } from "@/lib/providers";

export async function syncFeedSourceForUser(
  userId: string,
  source: FeedSource,
): Promise<SyncFeedSourceResult> {
  try {
    await setFeedSourceSyncRunning(userId, source.id);
    const discoveredStories = await getFeedProvider(source).discover(source);
    const insertedStories = await insertDiscoveredStories(userId, discoveredStories);
    const updatedSource = await completeFeedSourceSync(userId, source.id, insertedStories.length);
    return {
      source: updatedSource,
      stories: insertedStories,
      discovered: discoveredStories.length,
      inserted: insertedStories.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The source sync failed.";
    await failFeedSourceSync(userId, source.id, message).catch(() => undefined);
    throw error;
  }
}
