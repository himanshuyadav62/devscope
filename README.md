# Devscope

Devscope is a personal software-industry intelligence workspace. It brings together daily software news, research papers, releases, repositories, and personal references in one focused feed.

The project currently provides the application shell and database-backed workspace for collecting, filtering, saving, and configuring information sources. It does not seed or display hardcoded stories, resources, or source plugins: all application content is read from PostgreSQL.

## What Is Built

- A daily software-industry feed with topic filtering and text search.
- Story cards for papers, repositories, releases, and news.
- Bookmarking: saved stories appear in the Reading queue.
- A personal library for links, PDFs, and notes. Valid external links can be opened directly from the library.
- A Plugins screen for configuring feed sources.
- Database-backed source configuration for `RSS`, `GitHub`, `GitHub Releases`, `GitHub Security`, `YouTube`, `Hugging Face`, `Hacker News`, `Dev.to`, `Stack Overflow`, `arXiv`, `npm`, and `Custom` providers.
- On-demand ingestion for GitHub repositories and releases, reviewed security advisories, npm package releases, Stack Overflow questions, YouTube videos, Hugging Face Hub items, Hacker News, DEV Community, and arXiv.
- Daily scheduler records that run all active supported plugins when `/api/schedules/run` is triggered by cron.
- Infinite-scroll pagination for feed, library, and reading queue data with a default page size of 50.
- Google sign-in through Supabase Auth with cookie-based SSR sessions.
- Per-user feed sources, stories, bookmarks, and library records protected by RLS.
- Source enable/disable controls and topic labels.
- Light and dark modes, with the user preference stored locally in the browser.
- Responsive navigation, including a mobile sheet menu.
- shadcn/ui components for shared controls and dialogs.

## Current Product Boundary

Devscope supports on-demand and scheduled ingestion for every provider listed above except generic RSS and Custom sources.

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
GITHUB_TOKEN=optional_github_token
YOUTUBE_API_KEY=your_youtube_data_api_key
HUGGINGFACE_TOKEN=optional_huggingface_token
STACK_EXCHANGE_KEY=optional_stack_apps_key_for_higher_quota
CRON_SECRET=random_16_plus_character_secret
```

`POSTGRES_PRISMA_URL` is also accepted by the application. Drizzle Kit additionally accepts `POSTGRES_URL_NON_POOLING` when it is available.

Never commit database credentials. The repository ignores environment files.

### Configure scheduled ingestion

Users can add daily UTC schedules from the Plugins page. The schedules run all
active supported source plugins when a cron provider calls:

```bash
GET /api/schedules/run
Authorization: Bearer $CRON_SECRET
```

Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when the
`CRON_SECRET` environment variable is configured. Vercel Hobby accounts support
cron jobs only once per day, so the included production cron checks schedules
daily at midnight UTC. More frequent checks require a Vercel plan that supports
them or another cron provider.

This project includes [vercel.json](vercel.json), which calls
`/api/schedules/run` daily in production:

```json
{
  "crons": [
    {
      "path": "/api/schedules/run",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Configure Google sign-in

1. Enable Google in Supabase Dashboard → Authentication → Providers.
2. Add the Supabase callback URL to the Google OAuth client:
   `https://tvcihucgxjazljejsejx.supabase.co/auth/v1/callback`
3. In Supabase Authentication → URL Configuration, set the production Site URL
   and allow `http://localhost:3000/auth/callback` for local development.
4. Restart the Next.js server after changing environment variables.

Rows created before user ownership was introduced remain ownerless and are
hidden. New rows belong to the signed-in user.

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
| `/library` | `GET` | Opens the personal library view. |
| `/inbox` | `GET` | Opens the saved stories / Reading queue view. |
| `/plugins` | `GET` | Opens the feed source plugins view. |
| `/api/resources` | `POST` | Creates a library resource. |
| `/api/resources` | `GET` | Returns a paginated resource page. |
| `/api/stories` | `GET` | Returns a paginated story page for feed or reading queue. |
| `/api/stories/:id/bookmark` | `PATCH` | Adds or removes a story from the Reading queue. |
| `/api/feed-sources` | `POST` | Creates a source configuration. |
| `/api/feed-sources/:id` | `PATCH` | Enables or pauses a source configuration. |
| `/api/feed-sources/:id/sync` | `POST` | Runs a supported source and inserts deduplicated feed items. |
| `/api/schedules` | `GET`, `POST` | Lists or creates daily active-plugin schedules. |
| `/api/schedules/:id` | `PATCH`, `DELETE` | Updates or deletes a schedule. |
| `/api/schedules/run` | `GET`, `POST` | Cron endpoint that runs due schedules. |

## Feed Source Ideas

These are useful initial sources to add through Plugins:

- Engineering blogs and product release notes through RSS or Atom feeds.
- GitHub release feeds for important frameworks and tools.
- GitHub Releases sources for repositories your team depends on.
- YouTube topics and selected channels through YouTube Scout.
- Hugging Face models, datasets, and Spaces by topic, tag, author, or organization.
- Hacker News top, best, new, Show HN, Ask HN, and jobs feeds.
- arXiv query feeds for areas such as AI, systems, security, or programming languages.
- npm package registry metadata for libraries your team depends on.
- Hacker News, Dev.to, and technical publications that expose RSS feeds.
- Internal engineering blogs or changelog feeds through the `Custom` provider.

See [ROADMAP.md](ROADMAP.md) for how these configurations will become a scheduled, deduplicated feed.

## Project Structure

```text
app/
  api/                    Route handlers for library, bookmarks, and feed sources
  page.tsx                Today route
  library/page.tsx        Library route
  inbox/page.tsx          Reading queue route
  plugins/page.tsx        Feed source plugins route
components/
  devscope/               Shared shell plus route-specific Devscope views
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
