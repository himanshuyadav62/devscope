import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    channelTitle: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string } };
  };
};

type YouTubeVideo = {
  id: string;
  snippet: YouTubeSearchItem["snippet"] & { tags?: string[] };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};

type YouTubeResponse<T> = {
  items?: T[];
  error?: { message?: string };
};

const DAY_MS = 86_400_000;

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseDuration(value?: string) {
  if (!value) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return {
    seconds,
    label: seconds >= 3600
      ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
      : `${Math.floor(seconds / 60)}m`,
  };
}

function numeric(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreVideo(video: YouTubeVideo, queryTopics: string[]) {
  const ageDays = Math.max(1, (Date.now() - Date.parse(video.snippet.publishedAt)) / DAY_MS);
  const views = numeric(video.statistics?.viewCount);
  const likes = numeric(video.statistics?.likeCount);
  const text = `${video.snippet.title} ${video.snippet.description} ${(video.snippet.tags ?? []).join(" ")}`.toLowerCase();
  const matches = queryTopics.filter((topic) => text.includes(topic.toLowerCase())).length;
  return Math.round(
    Math.log10(views + 1) * 16 +
      Math.log10(views / ageDays + 1) * 20 +
      Math.log10(likes + 1) * 6 +
      matches * 10 +
      Math.max(0, 10 - ageDays),
  );
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

async function youtubeRequest<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<T[]> {
  const query = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as YouTubeResponse<T>;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `YouTube API returned ${response.status}.`);
  }
  return payload.items ?? [];
}

async function resolveChannelId(channel: string, apiKey: string) {
  const normalized = channel.trim();
  if (/^UC[\w-]{22}$/.test(normalized)) return normalized;

  const handle = normalized
    .replace(/^https?:\/\/(?:www\.)?youtube\.com\//, "")
    .replace(/^@/, "")
    .replace(/^channel\//, "")
    .split(/[/?#]/)[0];
  if (!handle) return null;

  const channels = await youtubeRequest<{ id: string }>(
    "channels",
    { part: "id", forHandle: handle, maxResults: "1" },
    apiKey,
  );
  return channels[0]?.id ?? null;
}

export class YouTubeProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY is required to run YouTube Scout.");
    }

    const config = source.config ?? {};
    const days = clampInteger(config.days, 14, 1, 90);
    const limit = clampInteger(config.limit, 12, 1, 30);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 5);
    const channels = (config.channels ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 5);
    if (!topics.length && !channels.length) {
      throw new Error("YouTube Scout needs at least one topic or channel.");
    }

    const publishedAfter = new Date(Date.now() - days * DAY_MS).toISOString();
    const channelIds = (await Promise.all(
      channels.map((channel) => resolveChannelId(channel, apiKey)),
    )).filter((channel): channel is string => Boolean(channel));
    if (channels.length && !channelIds.length && !topics.length) {
      throw new Error("None of the YouTube channels could be resolved. Use @handles or UC channel IDs.");
    }

    const searches = [
      ...topics.map((topic) => ({ q: topic, order: "relevance" })),
      ...channelIds.map((channelId) => ({ channelId, order: "date" })),
    ].slice(0, 8);
    const searchResults = await Promise.all(
      searches.map((search) =>
        youtubeRequest<YouTubeSearchItem>(
          "search",
          {
            part: "snippet",
            type: "video",
            maxResults: String(Math.min(25, Math.max(limit * 2, 10))),
            publishedAfter,
            safeSearch: "moderate",
            ...search,
          },
          apiKey,
        ),
      ),
    );
    const videoIds = Array.from(
      new Set(searchResults.flat().map((item) => item.id.videoId).filter((id): id is string => Boolean(id))),
    );
    if (!videoIds.length) return [];

    const videos = await youtubeRequest<YouTubeVideo>(
      "videos",
      {
        part: "snippet,contentDetails,statistics",
        id: videoIds.slice(0, 50).join(","),
        maxResults: "50",
      },
      apiKey,
    );

    return videos
      .map((video) => ({ video, score: scoreVideo(video, topics) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ video, score }) => {
        const views = numeric(video.statistics?.viewCount);
        const likes = numeric(video.statistics?.likeCount);
        const duration = parseDuration(video.contentDetails?.duration);
        const channelSelected = channelIds.includes(video.snippet.channelId);
        const reason = [
          channelSelected ? "Selected channel" : "Topic match",
          `${compactNumber(views)} views`,
          duration?.label,
        ].filter(Boolean).join(" · ");

        return {
          kind: "Video",
          source: video.snippet.channelTitle,
          source_url: `https://www.youtube.com/watch?v=${video.id}`,
          title: decodeHtml(video.snippet.title),
          summary: decodeHtml(video.snippet.description).slice(0, 500),
          topics: Array.from(new Set([
            ...topics.filter((topic) =>
              `${video.snippet.title} ${video.snippet.description}`.toLowerCase().includes(topic.toLowerCase()),
            ),
            ...(video.snippet.tags ?? []).slice(0, 4),
          ])).slice(0, 8),
          published_at: video.snippet.publishedAt,
          read_minutes: duration ? Math.max(1, Math.ceil(duration.seconds / 60)) : null,
          accent: "#ff0033",
          metadata: {
            channelId: video.snippet.channelId,
            channel: video.snippet.channelTitle,
            videoId: video.id,
            views,
            likes,
            comments: numeric(video.statistics?.commentCount),
            duration: duration?.label ?? null,
            thumbnail: video.snippet.thumbnails?.high?.url ?? video.snippet.thumbnails?.medium?.url ?? null,
            discoveryScore: score,
            discoveryReason: reason,
          },
        };
      });
  }
}
