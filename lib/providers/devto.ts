import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type DevToFeed = "top" | "fresh" | "rising" | "latest" | "all";

type DevToArticle = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  canonical_url?: string | null;
  readable_publish_date?: string;
  published_at?: string;
  published_timestamp?: string;
  tag_list?: string[];
  tags?: string;
  comments_count?: number;
  positive_reactions_count?: number;
  public_reactions_count?: number;
  reading_time_minutes?: number;
  user?: {
    name?: string;
    username?: string;
  };
  organization?: {
    name?: string;
    username?: string;
  } | null;
};

type DevToError = {
  error?: string;
  message?: string;
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function devToFeed(value: unknown): DevToFeed {
  const feed = getString(value);
  return ["top", "fresh", "rising", "latest", "all"].includes(feed) ? feed as DevToFeed : "top";
}

function feedLabel(feed: DevToFeed) {
  if (feed === "fresh") return "Fresh DEV";
  if (feed === "rising") return "Rising DEV";
  if (feed === "latest") return "Latest DEV";
  if (feed === "all") return "DEV";
  return "Top DEV";
}

function articleTags(article: DevToArticle) {
  if (Array.isArray(article.tag_list)) return article.tag_list;
  if (article.tags) return article.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function scoreArticle(article: DevToArticle, topics: string[]) {
  const reactions = article.public_reactions_count ?? article.positive_reactions_count ?? 0;
  const comments = article.comments_count ?? 0;
  const tags = articleTags(article).map((tag) => tag.toLowerCase());
  const title = article.title.toLowerCase();
  const topicMatches = topics.filter((topic) => {
    const normalized = topic.toLowerCase().replaceAll(" ", "");
    return title.includes(topic.toLowerCase()) || tags.includes(normalized);
  }).length;

  return Math.round(
    Math.log10(reactions + 1) * 24 +
      Math.log10(comments + 1) * 10 +
      topicMatches * 12,
  );
}

function isRecent(article: DevToArticle, days: number) {
  const published = Date.parse(article.published_timestamp ?? article.published_at ?? "");
  if (!Number.isFinite(published)) return true;
  return published >= Date.now() - days * 86_400_000;
}

async function devToRequest(path: string, params: URLSearchParams) {
  const response = await fetch(`https://dev.to/api/${path}?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "devscope-devto",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as DevToArticle[] | DevToError;
  if (!response.ok) {
    const error = Array.isArray(payload) ? null : payload.error ?? payload.message;
    throw new Error(error ?? `DEV API returned ${response.status}.`);
  }
  return Array.isArray(payload) ? payload : [];
}

function matchesTopics(article: DevToArticle, topics: string[]) {
  if (!topics.length) return true;
  const text = `${article.title} ${article.description ?? ""} ${articleTags(article).join(" ")}`.toLowerCase();
  return topics.some((topic) => text.includes(topic.toLowerCase()));
}

export class DevToProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const feed = devToFeed(config.devToFeed);
    const limit = clampInteger(config.limit, 15, 1, 30);
    const days = clampInteger(config.days, feed === "top" ? 14 : 30, 1, 365);
    const minReactions = clampInteger(config.minReactions, 0, 0, 1_000_000);
    const username = getString(config.username);
    const tags = getList(config.tags).slice(0, 8);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const params = new URLSearchParams({
      page: "1",
      per_page: String(Math.min(100, Math.max(limit * 4, 30))),
    });

    if (username) params.set("username", username.replace(/^@/, ""));
    if (tags.length) params.set(tags.length === 1 ? "tag" : "tags", tags.join(","));
    if (feed === "top") params.set("top", String(days));
    if (feed === "fresh" || feed === "rising" || feed === "all") params.set("state", feed);

    const articles = await devToRequest(feed === "latest" ? "articles/latest" : "articles", params);

    return articles
      .filter((article) => article.title && article.url)
      .filter((article) => feed === "top" || isRecent(article, days))
      .filter((article) => (article.public_reactions_count ?? article.positive_reactions_count ?? 0) >= minReactions)
      .filter((article) => matchesTopics(article, [...topics, ...tags]))
      .map((article) => ({ article, score: scoreArticle(article, [...topics, ...tags]) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ article, score }): DiscoveredStory => {
        const reactions = article.public_reactions_count ?? article.positive_reactions_count ?? 0;
        const comments = article.comments_count ?? 0;
        const author = article.organization?.username ?? article.user?.username ?? null;
        const publishedAt = article.published_timestamp ?? article.published_at ?? new Date().toISOString();

        return {
          kind: "Article",
          source: "DEV Community",
          source_url: article.url,
          title: article.title,
          summary: [
            article.description || null,
            `${reactions.toLocaleString("en-US")} reactions`,
            `${comments.toLocaleString("en-US")} comments`,
            article.reading_time_minutes ? `${article.reading_time_minutes} min read` : null,
          ].filter(Boolean).join(" · "),
          topics: Array.from(new Set([feedLabel(feed), ...articleTags(article), ...topics])).slice(0, 8),
          published_at: publishedAt,
          read_minutes: article.reading_time_minutes ?? null,
          accent: "#0a0a0a",
          metadata: {
            devToId: article.id,
            author,
            comments,
            reactions,
            feed,
            canonicalUrl: article.canonical_url ?? null,
            discoveryScore: score,
            discoveryReason: `${reactions.toLocaleString("en-US")} reactions · ${comments.toLocaleString("en-US")} comments`,
          },
        };
      });
  }
}
