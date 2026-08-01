import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type HuggingFaceKind = "model" | "dataset" | "space";

type HuggingFaceRepo = {
  _id?: string;
  id?: string;
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
  library_name?: string;
  createdAt?: string;
  lastModified?: string;
  last_modified?: string;
  trendingScore?: number;
  cardData?: {
    license?: string;
    language?: string | string[];
    datasets?: string | string[];
    tags?: string[];
    task_categories?: string[];
  };
  siblings?: unknown[];
  sdk?: string;
};

type HuggingFaceError = {
  error?: string;
  message?: string;
};

const DAY_MS = 86_400_000;

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function getList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function repoId(repo: HuggingFaceRepo) {
  return repo.id ?? repo.modelId ?? repo._id ?? "";
}

function repoDate(repo: HuggingFaceRepo) {
  return repo.lastModified ?? repo.last_modified ?? repo.createdAt ?? new Date().toISOString();
}

function repoUrl(kind: HuggingFaceKind, id: string) {
  const prefix = kind === "model" ? "" : `${kind}s/`;
  return `https://huggingface.co/${prefix}${id}`;
}

function titleKind(kind: HuggingFaceKind) {
  if (kind === "model") return "Model";
  if (kind === "dataset") return "Dataset";
  return "Space";
}

function apiPath(kind: HuggingFaceKind) {
  if (kind === "model") return "models";
  if (kind === "dataset") return "datasets";
  return "spaces";
}

function sortValue(sort: unknown) {
  const value = getString(sort);
  if (["trendingScore", "downloads", "likes", "lastModified"].includes(value)) return value;
  return "trendingScore";
}

function scoreRepo(repo: HuggingFaceRepo, topics: string[]) {
  const downloads = repo.downloads ?? 0;
  const likes = repo.likes ?? 0;
  const modifiedAt = Date.parse(repoDate(repo));
  const ageDays = Number.isFinite(modifiedAt) ? Math.max(0, (Date.now() - modifiedAt) / DAY_MS) : 30;
  const tags = new Set((repo.tags ?? []).map((tag) => tag.toLowerCase()));
  const topicMatches = topics.filter((topic) => {
    const normalized = topic.toLowerCase().replaceAll(" ", "-");
    return tags.has(normalized) || repoId(repo).toLowerCase().includes(topic.toLowerCase());
  }).length;

  return Math.round(
    (repo.trendingScore ?? 0) * 3 +
      Math.log10(downloads + 1) * 14 +
      Math.log10(likes + 1) * 18 +
      Math.max(0, 21 - ageDays) +
      topicMatches * 9,
  );
}

function discoveryReason(repo: HuggingFaceRepo, kind: HuggingFaceKind) {
  const parts = [
    titleKind(kind),
    `${compactNumber(repo.downloads ?? 0)} downloads`,
    `${compactNumber(repo.likes ?? 0)} likes`,
  ];
  if (repo.pipeline_tag) parts.push(repo.pipeline_tag);
  if (repo.library_name) parts.push(repo.library_name);
  if (repo.sdk) parts.push(repo.sdk);
  return parts.join(" · ");
}

async function huggingFaceRequest(kind: HuggingFaceKind, params: URLSearchParams) {
  const headers: HeadersInit = { "User-Agent": "devscope-huggingface-scout" };
  if (process.env.HUGGINGFACE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.HUGGINGFACE_TOKEN}`;
  }

  const response = await fetch(`https://huggingface.co/api/${apiPath(kind)}?${params}`, {
    headers,
    cache: "no-store",
  });
  const payload = (await response.json()) as HuggingFaceRepo[] | HuggingFaceError;
  if (!response.ok) {
    const error = Array.isArray(payload) ? null : payload.error ?? payload.message;
    const rateHint = response.status === 429 ? " Add HUGGINGFACE_TOKEN for authenticated Hub API requests." : "";
    throw new Error(`${error ?? `Hugging Face API returned ${response.status}.`}${rateHint}`);
  }
  return Array.isArray(payload) ? payload : [];
}

async function discoverKind(
  source: FeedSource,
  kind: HuggingFaceKind,
  topics: string[],
  tags: string[],
  limit: number,
) {
  const config = source.config ?? {};
  const searches = topics.length ? topics : [""];
  const requests = searches.slice(0, 6).map((topic) => {
    const params = new URLSearchParams({
      sort: sortValue(config.sort),
      direction: "-1",
      limit: String(Math.min(50, Math.max(limit * 2, 12))),
      full: "true",
    });
    if (topic) params.set("search", topic);
    const author = getString(config.author);
    if (author) params.set("author", author);
    for (const tag of tags.slice(0, 8)) params.append("filter", tag);
    return huggingFaceRequest(kind, params);
  });

  const repos = Array.from(
    new Map((await Promise.all(requests)).flat().map((repo) => [repoUrl(kind, repoId(repo)), repo])).values(),
  );

  return repos
    .filter((repo) => repoId(repo))
    .map((repo) => ({ repo, score: scoreRepo(repo, topics) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ repo, score }): DiscoveredStory => {
      const id = repoId(repo);
      const repoTags = Array.from(new Set([
        ...(repo.tags ?? []),
        ...(repo.cardData?.tags ?? []),
        ...(repo.cardData?.task_categories ?? []),
        ...(repo.pipeline_tag ? [repo.pipeline_tag] : []),
        ...(repo.library_name ? [repo.library_name] : []),
        ...(repo.sdk ? [repo.sdk] : []),
      ])).slice(0, 8);

      return {
        kind: titleKind(kind),
        source: "Hugging Face Scout",
        source_url: repoUrl(kind, id),
        title: id,
        summary: [
          repo.pipeline_tag ? `Task: ${repo.pipeline_tag}` : null,
          repo.library_name ? `Library: ${repo.library_name}` : null,
          repo.sdk ? `SDK: ${repo.sdk}` : null,
          repo.cardData?.license ? `License: ${repo.cardData.license}` : null,
        ].filter(Boolean).join(" · ") || `A discovered Hugging Face ${titleKind(kind).toLowerCase()}.`,
        topics: repoTags,
        published_at: repoDate(repo),
        accent: "#ff9d00",
        metadata: {
          hubType: kind,
          author: repo.author ?? id.split("/")[0] ?? null,
          downloads: repo.downloads ?? 0,
          likes: repo.likes ?? 0,
          tags: repoTags.join(", "),
          pipelineTag: repo.pipeline_tag ?? null,
          libraryName: repo.library_name ?? null,
          sdk: repo.sdk ?? null,
          discoveryScore: score,
          discoveryReason: discoveryReason(repo, kind),
          lastModified: repoDate(repo),
        },
      };
    });
}

export class HuggingFaceProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const limit = clampInteger(config.limit, 12, 1, 30);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const tags = getList(config.tags).slice(0, 8);
    const hubType = getString(config.hubType);
    const kinds: HuggingFaceKind[] = hubType === "models"
      ? ["model"]
      : hubType === "datasets"
        ? ["dataset"]
        : hubType === "spaces"
          ? ["space"]
          : ["model", "dataset", "space"];

    if (!topics.length && !tags.length && !getString(config.author)) {
      throw new Error("Hugging Face Scout needs at least one topic, tag, or author.");
    }

    const perKindLimit = Math.min(30, Math.max(limit, Math.ceil(limit / kinds.length) * 2));
    const results = await Promise.all(
      kinds.map((kind) => discoverKind(source, kind, topics, tags, perKindLimit)),
    );

    return results
      .flat()
      .sort((left, right) => {
        const leftScore = Number(left.metadata?.discoveryScore ?? 0);
        const rightScore = Number(right.metadata?.discoveryScore ?? 0);
        return rightScore - leftScore;
      })
      .slice(0, limit);
  }
}
