import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type GitHubRepository = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  archived: boolean;
  license: { spdx_id: string | null } | null;
  owner: { login: string };
};

type GitHubSearchResponse = {
  items?: GitHubRepository[];
  message?: string;
};

const DAY_MS = 86_400_000;

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function getList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function scoreRepository(repository: GitHubRepository, queryTopics: string[]) {
  const ageDays = Math.max(1, (Date.now() - Date.parse(repository.created_at)) / DAY_MS);
  const pushAgeDays = Math.max(0, (Date.now() - Date.parse(repository.pushed_at)) / DAY_MS);
  const starVelocity = repository.stargazers_count / ageDays;
  const normalizedTopics = new Set((repository.topics ?? []).map((topic) => topic.toLowerCase()));
  const topicMatches = queryTopics.filter((topic) =>
    normalizedTopics.has(topic.toLowerCase().replaceAll(" ", "-")),
  ).length;

  return Math.round(
    Math.log10(repository.stargazers_count + 1) * 18 +
      Math.log10(starVelocity + 1) * 24 +
      Math.max(0, 14 - pushAgeDays) +
      topicMatches * 8 +
      (repository.license ? 4 : 0) -
      (repository.fork ? 20 : 0),
  );
}

function buildReason(repository: GitHubRepository) {
  const ageDays = Math.max(1, Math.round((Date.now() - Date.parse(repository.created_at)) / DAY_MS));
  const parts = [
    `${repository.stargazers_count.toLocaleString("en-US")} stars`,
    `created ${ageDays} day${ageDays === 1 ? "" : "s"} ago`,
  ];
  if (repository.language) parts.push(repository.language);
  return parts.join(" · ");
}

export class GitHubProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const days = clampInteger(config.days, 30, 1, 365);
    const minStars = clampInteger(config.minStars, 25, 0, 1_000_000);
    const limit = clampInteger(config.limit, 12, 1, 30);
    const languages = getList(config.languages).slice(0, 5);
    const topics = getList(source.topics).slice(0, 8);

    if (!topics.length && !languages.length) {
      throw new Error("GitHub Radar needs at least one topic or language.");
    }

    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "devscope-github-radar",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const commonTerms = [
      `created:>=${dateDaysAgo(days)}`,
      `stars:>=${minStars}`,
      "archived:false",
      "fork:false",
    ];
    const searches = [
      ...topics.map((topic) => `${JSON.stringify(topic)} in:name,description,readme`),
      ...languages.map((language) => `language:${JSON.stringify(language)}`),
    ].slice(0, 8);
    const responses = await Promise.all(
      searches.map(async (search) => {
        const params = new URLSearchParams({
          q: [search, ...commonTerms].join(" "),
          sort: "stars",
          order: "desc",
          per_page: String(Math.min(30, Math.max(limit * 2, 10))),
        });
        const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
          headers,
          cache: "no-store",
        });
        const payload = (await response.json()) as GitHubSearchResponse;
        if (!response.ok) {
          const rateHint = response.status === 403
            ? " Add GITHUB_TOKEN to increase the GitHub API rate limit."
            : "";
          throw new Error(`${payload.message ?? `GitHub API returned ${response.status}.`}${rateHint}`);
        }
        return payload.items ?? [];
      }),
    );
    const repositories = Array.from(
      new Map(responses.flat().map((repository) => [repository.html_url, repository])).values(),
    );

    return repositories
      .filter((repository) => !repository.archived && !repository.fork)
      .map((repository) => ({
        repository,
        score: scoreRepository(repository, topics),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ repository, score }) => ({
        kind: "Repository",
        source: "GitHub Radar",
        source_url: repository.html_url,
        title: repository.full_name,
        summary: repository.description ?? "A newly discovered GitHub repository.",
        topics: Array.from(
          new Set([
            ...(repository.topics ?? []).slice(0, 5),
            ...(repository.language ? [repository.language] : []),
          ]),
        ),
        published_at: repository.created_at,
        accent: "#24292f",
        metadata: {
          owner: repository.owner.login,
          repository: repository.name,
          language: repository.language,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          openIssues: repository.open_issues_count,
          license: repository.license?.spdx_id ?? null,
          discoveryScore: score,
          discoveryReason: buildReason(repository),
          pushedAt: repository.pushed_at,
          updatedAt: repository.updated_at,
        },
      }));
  }
}
