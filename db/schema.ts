import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    source_url: text("source_url")
      .notNull()
      .unique("stories_source_url_key"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    published_at: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    read_minutes: integer("read_minutes"),
    accent: text("accent"),
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
  ],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
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
  ],
);

export const feedSources = pgTable(
  "feed_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    provider: text("provider")
      .$type<"RSS" | "GitHub" | "arXiv" | "npm" | "Custom">()
      .notNull(),
    url: text("url").notNull().unique("feed_sources_url_key"),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    is_enabled: boolean("is_enabled").notNull().default(true),
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
      sql`${table.provider} in ('RSS', 'GitHub', 'arXiv', 'npm', 'Custom')`,
    ),
    index("feed_sources_enabled_idx").on(table.is_enabled),
  ],
);
