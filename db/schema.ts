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
      .$type<"RSS" | "GitHub" | "GitHub Releases" | "GitHub Security" | "YouTube" | "Hugging Face" | "Hacker News" | "Dev.to" | "Stack Overflow" | "arXiv" | "npm" | "Custom">()
      .notNull(),
    url: text("url").notNull(),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    config: jsonb("config")
      .$type<{
        mode?: "discover" | "trending" | "personal" | "selected";
        languages?: string[];
        days?: number;
        minStars?: number;
        limit?: number;
        channels?: string[];
        hubType?: "models" | "datasets" | "spaces" | "all";
        sort?: "trendingScore" | "downloads" | "likes" | "lastModified";
        author?: string;
        tags?: string[];
        categories?: string[];
        arxivSearchIn?: "all" | "title" | "abstract";
        arxivSort?: "submittedDate" | "lastUpdatedDate" | "relevance";
        hnFeed?: "top" | "best" | "new" | "ask" | "show" | "jobs";
        devToFeed?: "top" | "fresh" | "rising" | "latest" | "all";
        username?: string;
        minReactions?: number;
        minScore?: number;
        includeDiscussions?: boolean;
        repositories?: string[];
        githubUsername?: string;
        includePrereleases?: boolean;
        packages?: string[];
        securityEcosystems?: Array<"npm" | "pip" | "maven" | "nuget" | "composer" | "go" | "rust" | "rubygems" | "actions" | "erlang" | "pub" | "swift" | "other">;
        minSeverity?: "low" | "medium" | "high" | "critical";
        minCvss?: number;
        stackOverflowSort?: "hot" | "votes" | "activity" | "creation";
        acceptedOnly?: boolean;
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
      sql`${table.provider} in ('RSS', 'GitHub', 'GitHub Releases', 'GitHub Security', 'YouTube', 'Hugging Face', 'Hacker News', 'Dev.to', 'Stack Overflow', 'arXiv', 'npm', 'Custom')`,
    ),
    index("feed_sources_enabled_idx").on(table.is_enabled),
    index("feed_sources_user_id_idx").on(table.user_id),
    uniqueIndex("feed_sources_user_url_key").on(table.user_id, table.url),
  ],
);

export const pluginSchedules = pgTable(
  "plugin_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id"),
    name: text("name").notNull().default("Daily active plugin run"),
    time_of_day: text("time_of_day").notNull().default("09:00"),
    timezone: text("timezone").notNull().default("UTC"),
    is_enabled: boolean("is_enabled").notNull().default(true),
    last_run_at: timestamp("last_run_at", {
      withTimezone: true,
      mode: "string",
    }),
    next_run_at: timestamp("next_run_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    last_status: text("last_status")
      .$type<"idle" | "success" | "failed">()
      .notNull()
      .default("idle"),
    last_error: text("last_error"),
    last_item_count: integer("last_item_count").notNull().default(0),
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
    check("plugin_schedules_time_check", sql`${table.time_of_day} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
    index("plugin_schedules_due_idx").on(table.is_enabled, table.next_run_at),
    index("plugin_schedules_user_id_idx").on(table.user_id),
  ],
);
