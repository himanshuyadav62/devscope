import type { feedSources, resources, stories } from "@/db/schema";

export type Story = typeof stories.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type NewResource = Pick<Resource, "title" | "url" | "type">;

export type FeedSource = typeof feedSources.$inferSelect;
export type NewFeedSource = Pick<
  FeedSource,
  "name" | "provider" | "url" | "topics"
>;
