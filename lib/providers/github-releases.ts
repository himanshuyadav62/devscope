import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type GitHubRelease = {
  id: number;
  html_url: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  author?: { login: string };
  assets?: Array<{ download_count?: number }>;
};

type GitHubError = {
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

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeRepository(value: string) {
  return value
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/releases.*$/, "")
    .replace(/\.git$/, "")
    .split(/[?#]/)[0]
    .trim();
}

function isRepository(value: string) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function releaseScore(release: GitHubRelease) {
  const publishedAt = Date.parse(release.published_at ?? release.created_at);
  const ageDays = Number.isFinite(publishedAt) ? Math.max(0, (Date.now() - publishedAt) / DAY_MS) : 30;
  const downloads = (release.assets ?? []).reduce((sum, asset) => sum + (asset.download_count ?? 0), 0);

  return Math.round(
    Math.max(0, 21 - ageDays) +
      Math.log10(downloads + 1) * 8 +
      (release.prerelease ? -4 : 4),
  );
}

function releaseSummary(release: GitHubRelease) {
  const body = release.body?.replace(/\s+/g, " ").trim();
  if (body) return body.slice(0, 500);
  return release.prerelease ? "A new prerelease is available." : "A new GitHub release is available.";
}

async function fetchReleases(repository: string, perPage: number) {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devscope-github-releases",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=${perPage}`, {
    headers,
    cache: "no-store",
  });
  const payload = (await response.json()) as GitHubRelease[] | GitHubError;
  if (!response.ok) {
    const rateHint = response.status === 403 ? " Add GITHUB_TOKEN to increase the GitHub API rate limit." : "";
    const message = Array.isArray(payload) ? null : payload.message;
    throw new Error(`${message ?? `GitHub Releases API returned ${response.status}.`}${rateHint}`);
  }
  return Array.isArray(payload) ? payload : [];
}

export class GitHubReleasesProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const limit = clampInteger(config.limit, 12, 1, 30);
    const days = clampInteger(config.days, 90, 1, 365);
    const includePrereleases = getBoolean(config.includePrereleases, false);
    const repositories = getList(config.repositories)
      .map(normalizeRepository)
      .filter(isRepository)
      .slice(0, 10);

    if (!repositories.length) {
      throw new Error("GitHub Releases needs at least one repository like vercel/next.js.");
    }

    const cutoff = Date.now() - days * DAY_MS;
    const releases = (await Promise.all(
      repositories.map(async (repository) => {
        const items = await fetchReleases(repository, Math.min(30, Math.max(limit * 2, 10)));
        return items.map((release) => ({ repository, release }));
      }),
    )).flat();

    return releases
      .filter(({ release }) => !release.draft)
      .filter(({ release }) => includePrereleases || !release.prerelease)
      .filter(({ release }) => Date.parse(release.published_at ?? release.created_at) >= cutoff)
      .map(({ repository, release }) => ({ repository, release, score: releaseScore(release) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ repository, release, score }): DiscoveredStory => {
        const downloads = (release.assets ?? []).reduce((sum, asset) => sum + (asset.download_count ?? 0), 0);
        return {
          kind: "Release",
          source: repository,
          source_url: release.html_url,
          title: `${repository} ${release.name || release.tag_name}`,
          summary: releaseSummary(release),
          topics: Array.from(new Set(["GitHub Release", ...source.topics, repository.split("/")[0]])).slice(0, 8),
          published_at: release.published_at ?? release.created_at,
          accent: "#24292f",
          metadata: {
            repository,
            releaseId: release.id,
            tag: release.tag_name,
            author: release.author?.login ?? null,
            prerelease: release.prerelease,
            downloads,
            discoveryScore: score,
            discoveryReason: `${release.prerelease ? "Prerelease" : "Release"} · ${downloads.toLocaleString("en-US")} asset downloads`,
          },
        };
      });
  }
}
