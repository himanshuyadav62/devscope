import type { feedSources, pluginSchedules, resources, stories } from "@/db/schema";

export type Story = typeof stories.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type NewResource = Pick<Resource, "title" | "url" | "type">;

export type FeedSource = typeof feedSources.$inferSelect;
export type NewFeedSource = Omit<Pick<
  FeedSource,
  "name" | "provider" | "url" | "topics" | "config"
>, "config"> & { config?: FeedSource["config"] };

export type SyncFeedSourceResult = {
  source: FeedSource;
  stories: Story[];
  discovered: number;
  inserted: number;
};

export type PluginSchedule = typeof pluginSchedules.$inferSelect;
export type NewPluginSchedule = Pick<
  PluginSchedule,
  "name" | "time_of_day" | "timezone" | "is_enabled" | "next_run_at"
>;

export type PageResult<T> = {
  items: T[];
  nextOffset: number | null;
};
