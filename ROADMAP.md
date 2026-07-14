# Devscope Roadmap

This roadmap separates the working product from the next layers of capability. Priorities may change as the real source mix and reading habits become clearer.

## Now: Foundation Complete

- Database-backed daily feed, library, reading queue, and source plugins.
- Drizzle schema for stories, resources, and feed sources.
- Source configuration with RSS, GitHub, arXiv, npm, and custom provider types.
- Topic filtering, search, bookmarks, dark mode, and responsive navigation.

## Next: Source Ingestion

Goal: turn enabled source configurations into fresh entries in the daily feed.

- Create a provider adapter interface with one adapter per source type.
- Implement RSS/Atom fetching and parsing first.
- Add GitHub Releases and arXiv query adapters.
- Add npm package update support for tracked packages.
- Run ingestion on a schedule using a server-side cron or job runner.
- Store fetch status, errors, item counts, and `last_synced_at` per source.
- Normalize titles, timestamps, canonical URLs, summaries, and source metadata.
- Deduplicate feed items by canonical URL before inserting into `stories`.
- Mark stale or failing sources clearly in Plugins.

## Then: Better Feed Quality

Goal: make the daily summary useful without overwhelming the reader.

- Topic extraction and normalization for ingested stories.
- Relevance scoring based on configured topics and reading behavior.
- Daily digest with grouped papers, releases, repositories, and news.
- Sort controls: newest, relevance, source, and estimated reading time.
- Story detail view with original link, metadata, related items, and notes.
- Source-level filters and per-topic notification preferences.
- Archive and read states alongside bookmarks.

## Personal Knowledge Collection

Goal: make Devscope valuable even when the user is not reading the external feed.

- Add library resources to the Reading queue, not only feed stories.
- Store note content and richer metadata for PDFs and links.
- Browser extension to save the current page into the library.
- PDF upload and extraction pipeline, with storage and searchable text.
- Tags, folders, notes, and full-text search across personal resources.
- Link preview metadata and duplicate detection.

## Personalization and Accounts

Goal: support private, user-specific workspaces safely.

- Authentication and user profiles.
- Per-user stories, resources, source plugins, bookmarks, and preferences.
- Row-level database policies appropriate to the selected authentication model.
- Import/export of source configurations and library data.
- Team workspaces with shared source collections and curated digests.

## Reliability and Operations

Goal: make ingestion predictable, observable, and production ready.

- Retry policy with backoff and source-specific rate limits.
- Job logs, metrics, and source health monitoring.
- Schema migrations committed to the repository and CI migration checks.
- Automated tests for adapters, normalization, database operations, and route handlers.
- End-to-end tests for source management and reading queue workflows.
- Error states, loading states, and accessibility review.
- Deployment configuration, environment validation, backups, and incident alerts.

## Possible Integrations

These are optional and should be added only when they serve a clear workflow.

- GitHub OAuth for private release feeds and starred repositories.
- Slack or email delivery for a daily digest.
- Notion, Obsidian, or Readwise export for saved resources.
- Calendar integration for scheduled reading blocks.
- LLM-assisted clustering and concise summaries, with source links kept prominent.

## Product Principles

- Keep original source links visible and easy to open.
- Prefer transparent ranking and filtering over a mysterious recommendation feed.
- Keep personal data private by default.
- Treat source health and attribution as first-class product features.
- Build the smallest reliable ingestion pipeline before adding AI summarization.
