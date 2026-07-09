import type { resources, stories } from "@/db/schema";

export type Story = typeof stories.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type NewResource = Pick<Resource, "title" | "url" | "type">;
