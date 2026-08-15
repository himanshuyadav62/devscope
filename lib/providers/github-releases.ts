import type { FeedSource } from "@/lib/database.types";
import {
  fetchGitHubReleases,
  isRepository,
  normalizeRepositories,
  searchGitHubRepositories,
  type GitHubRelease,
  type GitHubRepository,
} from "@/lib/github-api";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

const DAY_MS = 86_400_000;
type ReleaseRepository = Pick<GitHubRepository, "full_name"> & Partial<Pick<GitHubRepository, "stargazers_count" | "topics">>;

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

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function releaseScore(release: GitHubRelease, repository?: ReleaseRepository, queryTopics: string[] = []) {
  const publishedAt = Date.parse(release.published_at ?? release.created_at);
  const ageDays = Number.isFinite(publishedAt) ? Math.max(0, (Date.now() - publishedAt) / DAY_MS) : 30;
  const downloads = (release.assets ?? []).reduce((sum, asset) => sum + (asset.download_count ?? 0), 0);
  const normalizedTopics = new Set((repository?.topics ?? []).map((topic) => topic.toLowerCase()));
  const topicMatches = queryTopics.filter((topic) =>
    normalizedTopics.has(topic.toLowerCase().replaceAll(" ", "-")),
  ).length;

  return Math.round(
    Math.max(0, 21 - ageDays) +
      Math.log10(downloads + 1) * 8 +
      Math.log10((repository?.stargazers_count ?? 0) + 1) * 5 +
      topicMatches * 6 +
      (release.prerelease ? -4 : 4),
  );
}

function releaseSummary(release: GitHubRelease) {
  const body = release.body?.replace(/\s+/g, " ").trim();
  if (body) return body.slice(0, 500);
  return release.prerelease ? "A new prerelease is available." : "A new GitHub release is available.";
}

async function discoverTrendingRepositories({
  topics,
  languages,
  days,
  minStars,
  limit,
}: {
  topics: string[];
  languages: string[];
  days: number;
  minStars: number;
  limit: number;
}) {
  const searches = [
    ...topics.map((topic) => ({ topics: [topic], languages: [] as string[] })),
    ...languages.map((language) => ({ topics: [] as string[], languages: [language] })),
  ].slice(0, 8);

  if (!searches.length) {
    searches.push({ topics: [], languages: [] });
  }

  const responses = await Promise.all(
    searches.map((search) =>
      searchGitHubRepositories({
        ...search,
        minStars,
        pushedAfter: dateDaysAgo(days),
        limit: Math.min(25, Math.max(limit * 2, 10)),
        sort: "updated",
      }),
    ),
  );

  return Array.from(
    new Map(responses.flat().map((repository) => [repository.full_name, repository])).values(),
  )
    .filter((repository) => !repository.archived && !repository.fork)
    .sort((left, right) => right.stargazers_count - left.stargazers_count)
    .slice(0, Math.min(15, Math.max(limit * 2, 8)));
}

export class GitHubReleasesProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const limit = clampInteger(config.limit, 12, 1, 30);
    const days = clampInteger(config.days, 90, 1, 365);
    const minStars = clampInteger(config.minStars, 500, 0, 1_000_000);
    const includePrereleases = getBoolean(config.includePrereleases, false);
    const languages = getList(config.languages).slice(0, 5);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const configuredRepositories = normalizeRepositories(getList(config.repositories), 30);
    const configuredMode = getString(config.mode);
    const mode = configuredMode === "trending" || configuredMode === "personal" || configuredMode === "selected"
      ? configuredMode
      : configuredRepositories.length
        ? "selected"
        : "trending";

    const repositories = mode === "trending"
      ? await discoverTrendingRepositories({ topics, languages, days, minStars, limit })
      : configuredRepositories
        .filter(isRepository)
        .slice(0, 30)
        .map((repository): ReleaseRepository => ({ full_name: repository }));

    if (!repositories.length && mode === "selected") {
      throw new Error("GitHub Releases needs at least one repository like vercel/next.js.");
    }
    if (!repositories.length && mode === "personal") {
      throw new Error("No GitHub repositories were found from your starred or saved repo selection.");
    }

    const cutoff = Date.now() - days * DAY_MS;
    const releases = (await Promise.all(
      repositories.map(async (repository) => {
        const items = await fetchGitHubReleases(repository.full_name, Math.min(30, Math.max(limit * 2, 10)));
        return items.map((release) => ({ repository, release }));
      }),
    )).flat();

    return releases
      .filter(({ release }) => !release.draft)
      .filter(({ release }) => includePrereleases || !release.prerelease)
      .filter(({ release }) => Date.parse(release.published_at ?? release.created_at) >= cutoff)
      .map(({ repository, release }) => ({ repository, release, score: releaseScore(release, repository, topics) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ repository, release, score }): DiscoveredStory => {
        const downloads = (release.assets ?? []).reduce((sum, asset) => sum + (asset.download_count ?? 0), 0);
        return {
          kind: "Release",
          source: repository.full_name,
          source_url: release.html_url,
          title: `${repository.full_name} ${release.name || release.tag_name}`,
          summary: releaseSummary(release),
          topics: Array.from(new Set([
            "GitHub Release",
            ...source.topics,
            ...(repository.topics ?? []).slice(0, 3),
            repository.full_name.split("/")[0],
          ])).slice(0, 8),
          published_at: release.published_at ?? release.created_at,
          accent: "#24292f",
          metadata: {
            repository: repository.full_name,
            releaseId: release.id,
            tag: release.tag_name,
            author: release.author?.login ?? null,
            prerelease: release.prerelease,
            downloads,
            stars: repository.stargazers_count ?? null,
            releaseMode: mode,
            discoveryScore: score,
            discoveryReason: `${release.prerelease ? "Prerelease" : "Release"} · ${downloads.toLocaleString("en-US")} asset downloads`,
          },
        };
      });
  }
}
