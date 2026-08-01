import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type HackerNewsFeed = "top" | "best" | "new" | "ask" | "show" | "jobs";

type HackerNewsItem = {
  id: number;
  deleted?: boolean;
  dead?: boolean;
  type?: "story" | "job" | "comment" | "poll" | "pollopt";
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
};

type HackerNewsError = {
  error?: string;
};

const API_BASE = "https://hacker-news.firebaseio.com/v0";

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function hnFeed(value: unknown): HackerNewsFeed {
  const feed = getString(value);
  return ["top", "best", "new", "ask", "show", "jobs"].includes(feed)
    ? feed as HackerNewsFeed
    : "top";
}

function feedEndpoint(feed: HackerNewsFeed) {
  if (feed === "best") return "beststories";
  if (feed === "new") return "newstories";
  if (feed === "ask") return "askstories";
  if (feed === "show") return "showstories";
  if (feed === "jobs") return "jobstories";
  return "topstories";
}

function feedLabel(feed: HackerNewsFeed) {
  if (feed === "ask") return "Ask HN";
  if (feed === "show") return "Show HN";
  if (feed === "jobs") return "Jobs";
  return `${feed.slice(0, 1).toUpperCase()}${feed.slice(1)} Stories`;
}

function storyUrl(item: HackerNewsItem) {
  return item.url || `https://news.ycombinator.com/item?id=${item.id}`;
}

function discussionUrl(item: HackerNewsItem) {
  return `https://news.ycombinator.com/item?id=${item.id}`;
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesTopics(item: HackerNewsItem, topics: string[]) {
  if (!topics.length) return true;
  const text = `${item.title ?? ""} ${item.url ?? ""} ${item.by ?? ""}`.toLowerCase();
  return topics.some((topic) => text.includes(topic.toLowerCase()));
}

function scoreItem(item: HackerNewsItem, topics: string[]) {
  const score = item.score ?? 0;
  const comments = item.descendants ?? 0;
  const title = item.title?.toLowerCase() ?? "";
  const topicMatches = topics.filter((topic) => title.includes(topic.toLowerCase())).length;

  return Math.round(
    Math.log10(score + 1) * 24 +
      Math.log10(comments + 1) * 10 +
      topicMatches * 12,
  );
}

async function hnRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, { cache: "no-store" });
  const payload = (await response.json()) as T | HackerNewsError;
  if (!response.ok) {
    const error = typeof payload === "object" && payload && "error" in payload ? payload.error : null;
    throw new Error(error ?? `Hacker News API returned ${response.status}.`);
  }
  return payload as T;
}

async function fetchItems(ids: number[]) {
  return Promise.all(ids.map((id) => hnRequest<HackerNewsItem | null>(`item/${id}.json`)));
}

export class HackerNewsProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const feed = hnFeed(config.hnFeed);
    const limit = clampInteger(config.limit, 15, 1, 30);
    const minScore = clampInteger(config.minScore, feed === "new" || feed === "jobs" ? 0 : 10, 0, 10_000);
    const includeDiscussions = getBoolean(config.includeDiscussions, true);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const ids = await hnRequest<number[]>(`${feedEndpoint(feed)}.json`);
    const candidates = ids.slice(0, Math.min(100, Math.max(limit * 6, 30)));
    const items = (await fetchItems(candidates))
      .filter((item): item is HackerNewsItem => Boolean(item))
      .filter((item) => !item.deleted && !item.dead)
      .filter((item) => item.type === "story" || item.type === "job")
      .filter((item) => includeDiscussions || Boolean(item.url))
      .filter((item) => (item.score ?? 0) >= minScore)
      .filter((item) => matchesTopics(item, topics));

    return items
      .map((item) => ({ item, score: scoreItem(item, topics) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ item, score }): DiscoveredStory => {
        const url = storyUrl(item);
        const host = hostFromUrl(url);
        const comments = item.descendants ?? 0;
        const points = item.score ?? 0;
        const kind = item.type === "job" ? "Job" : item.url ? "News" : "Discussion";

        return {
          kind,
          source: "Hacker News",
          source_url: url,
          title: item.title ?? `Hacker News item ${item.id}`,
          summary: [
            host ? `Source: ${host}` : null,
            `${points.toLocaleString("en-US")} points`,
            kind === "Job" ? null : `${comments.toLocaleString("en-US")} comments`,
          ].filter(Boolean).join(" · "),
          topics: Array.from(new Set([feedLabel(feed), ...topics])).slice(0, 8),
          published_at: new Date((item.time ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          accent: "#ff6600",
          metadata: {
            hnId: item.id,
            by: item.by ?? null,
            score: points,
            comments,
            feed,
            discussionUrl: discussionUrl(item),
            discoveryScore: score,
            discoveryReason: `${points.toLocaleString("en-US")} points · ${comments.toLocaleString("en-US")} comments`,
          },
        };
      });
  }
}
