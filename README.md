# Devscope

Devscope is a personal software-industry intelligence workspace. It brings together daily software news, research papers, releases, repositories, and personal references in one focused feed.

The project currently provides the application shell and database-backed workspace for collecting, filtering, saving, and configuring information sources. It does not seed or display hardcoded stories, resources, or source plugins: all application content is read from PostgreSQL.

## What Is Built

- A daily software-industry feed with topic filtering and text search.
- Story cards for papers, repositories, releases, and news.
- Bookmarking: saved stories appear in the Reading queue.
- A personal library for links, PDFs, and notes. Valid external links can be opened directly from the library.
- A Plugins screen for configuring feed sources.
- Database-backed source configuration for `RSS`, `GitHub`, `arXiv`, `npm`, and `Custom` providers.
- Source enable/disable controls and topic labels.
- Light and dark modes, with the user preference stored locally in the browser.
- Responsive navigation, including a mobile sheet menu.
- shadcn/ui components for shared controls and dialogs.

## Current Product Boundary

Devscope stores and manages its feed source configuration, but scheduled ingestion is not implemented yet. Adding a source does **not** fetch its items automatically today. The next implementation phase is an ingestion worker that reads enabled sources and writes normalized items to `stories`.

## Stack

- Next.js 16 with the App Router and React 19
- TypeScript and Tailwind CSS 4
- shadcn/ui and Lucide icons
- PostgreSQL, including Supabase-hosted Postgres connections
- Drizzle ORM and Drizzle Kit
- `postgres` driver for server-side database access

## Local Setup

### Prerequisites

- Node.js 20 or later
- pnpm
- A PostgreSQL connection string. A Supabase Postgres database works well.

### Install dependencies

```bash
pnpm install
```

### Configure environment variables

Create `.env.local` (or use `.env`) with one of the supported connection variables:

```bash
POSTGRES_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

`POSTGRES_PRISMA_URL` is also accepted by the application. Drizzle Kit additionally accepts `POSTGRES_URL_NON_POOLING` when it is available.

Never commit database credentials. The repository ignores environment files.

### Apply the schema

```bash
pnpm db:setup
```

This runs `drizzle-kit push`, which compares [db/schema.ts](db/schema.ts) with the connected PostgreSQL database and asks for confirmation before applying changes.

### Run the app

```bash
pnpm dev
```

Open the local URL shown in the terminal, normally `http://localhost:3000`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server. |
| `pnpm lint` | Run ESLint. |
| `pnpm build` | Create and type-check a production build. |
| `pnpm start` | Run the production build locally. |
| `pnpm db:setup` | Synchronize the Drizzle schema with PostgreSQL. |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes. |
| `pnpm db:studio` | Open Drizzle Studio for database inspection. |

## Data Model

The schema lives in [db/schema.ts](db/schema.ts).

| Table | Purpose |
| --- | --- |
| `stories` | Feed items. Stores source metadata, URL, kind, summary, topics, publish time, estimated read time, and bookmark state. URLs are unique to prevent duplicates. |
| `resources` | Personal library entries: `Link`, `PDF`, or `Note`. |
| `feed_sources` | Configured ingestion sources. Stores provider, URL, topic labels, enabled status, and last-sync timestamp. |

Database access is centralized in [lib/data.ts](lib/data.ts) and uses Drizzle. The browser never receives a database connection string.

## Application Routes

| Route | Method | Behavior |
| --- | --- | --- |
| `/` | `GET` | Loads database-backed stories, personal resources, and feed sources. |
| `/api/resources` | `POST` | Creates a library resource. |
| `/api/stories/:id/bookmark` | `PATCH` | Adds or removes a story from the Reading queue. |
| `/api/feed-sources` | `POST` | Creates a source configuration. |
| `/api/feed-sources/:id` | `PATCH` | Enables or pauses a source configuration. |

## Feed Source Ideas

These are useful initial sources to add through Plugins:

- Engineering blogs and product release notes through RSS or Atom feeds.
- GitHub release feeds for important frameworks and tools.
- arXiv query feeds for areas such as AI, systems, security, or programming languages.
- npm package registry metadata for libraries your team depends on.
- Hacker News, Dev.to, and technical publications that expose RSS feeds.
- Internal engineering blogs or changelog feeds through the `Custom` provider.

See [ROADMAP.md](ROADMAP.md) for how these configurations will become a scheduled, deduplicated feed.

## Project Structure

```text
app/
  api/                    Route handlers for library, bookmarks, and feed sources
  page.tsx                Server-rendered application entry point
components/
  devscope-app.tsx        Main client experience and views
  ui/                     shadcn/ui component sources
db/
  index.ts                PostgreSQL and Drizzle initialization
  schema.ts               Drizzle table definitions
lib/
  data.ts                 Server-only database operations
  database.types.ts       Types inferred from the Drizzle schema
```

## Verification

Run the following before shipping a change:

```bash
pnpm lint
pnpm build
```

## Roadmap

The planned scope, priorities, and delivery phases are maintained in [ROADMAP.md](ROADMAP.md).
