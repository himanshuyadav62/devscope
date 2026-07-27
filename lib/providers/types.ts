import type { FeedSource } from "@/lib/database.types";
import type { stories } from "@/db/schema";

export type DiscoveredStory = typeof stories.$inferInsert;

export interface FeedProvider {
  discover(source: FeedSource): Promise<DiscoveredStory[]>;
}
