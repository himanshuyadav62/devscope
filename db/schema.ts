import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id"),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    source_url: text("source_url").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    published_at: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    read_minutes: integer("read_minutes"),
    accent: text("accent"),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    is_saved: boolean("is_saved").notNull().default(false),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("stories_published_at_idx").on(
      table.published_at.desc().nullsFirst(),
    ),
    index("stories_topics_idx").using("gin", table.topics),
    index("stories_user_id_idx").on(table.user_id),
    uniqueIndex("stories_user_source_url_key").on(
      table.user_id,
      table.source_url,
    ),
  ],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id"),
    title: text("title").notNull(),
    url: text("url"),
    type: text("type").$type<"Link" | "PDF" | "Note">().notNull(),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("resources_type_check", sql`${table.type} in ('Link', 'PDF', 'Note')`),
    index("resources_user_id_idx").on(table.user_id),
  ],
);

export const feedSources = pgTable(
  "feed_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id"),
    name: text("name").notNull(),
    provider: text("provider")
      .$type<"RSS" | "GitHub" | "YouTube" | "Hugging Face" | "Hacker News" | "arXiv" | "npm" | "Custom">()
      .notNull(),
    url: text("url").notNull(),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    config: jsonb("config")
      .$type<{
        mode?: "discover";
        languages?: string[];
        days?: number;
        minStars?: number;
        limit?: number;
        channels?: string[];
        hubType?: "models" | "datasets" | "spaces" | "all";
        sort?: "trendingScore" | "downloads" | "likes" | "lastModified";
        author?: string;
        tags?: string[];
        hnFeed?: "top" | "best" | "new" | "ask" | "show" | "jobs";
        minScore?: number;
        includeDiscussions?: boolean;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    is_enabled: boolean("is_enabled").notNull().default(true),
    sync_status: text("sync_status")
      .$type<"idle" | "running" | "success" | "failed">()
      .notNull()
      .default("idle"),
    last_error: text("last_error"),
    last_item_count: integer("last_item_count").notNull().default(0),
    last_synced_at: timestamp("last_synced_at", {
      withTimezone: true,
      mode: "string",
    }),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "feed_sources_provider_check",
      sql`${table.provider} in ('RSS', 'GitHub', 'YouTube', 'Hugging Face', 'Hacker News', 'arXiv', 'npm', 'Custom')`,
    ),
    index("feed_sources_enabled_idx").on(table.is_enabled),
    index("feed_sources_user_id_idx").on(table.user_id),
    uniqueIndex("feed_sources_user_url_key").on(table.user_id, table.url),
  ],
);
