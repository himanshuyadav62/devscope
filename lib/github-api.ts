import "server-only";

export type GitHubRepository = {
  id: number;
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

export type GitHubRelease = {
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

type GitHubSearchResponse = {
  items?: GitHubRepository[];
  message?: string;
};

type GitHubError = {
  message?: string;
};

export type GitHubRepositorySummary = {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
};

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devscope",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function githubError(status: number, message?: string) {
  const rateHint = status === 403 ? " Add GITHUB_TOKEN to increase the GitHub API rate limit." : "";
  return new Error(`${message ?? `GitHub API returned ${status}.`}${rateHint}`);
}

export function normalizeRepository(value: string) {
  return value
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/releases.*$/, "")
    .replace(/\.git$/, "")
    .split(/[?#]/)[0]
    .trim();
}

export function isRepository(value: string) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

export function normalizeRepositories(values: string[], limit = 30) {
  return Array.from(
    new Set(values.map(normalizeRepository).filter(isRepository)),
  ).slice(0, limit);
}

export function summarizeRepository(repository: GitHubRepository): GitHubRepositorySummary {
  return {
    fullName: repository.full_name,
    url: repository.html_url,
    description: repository.description,
    stars: repository.stargazers_count,
    language: repository.language,
    topics: repository.topics ?? [],
  };
}

export async function searchGitHubRepositories({
  query,
  topics = [],
  languages = [],
  minStars = 0,
  pushedAfter,
  limit = 10,
  sort = "stars",
}: {
  query?: string;
  topics?: string[];
  languages?: string[];
  minStars?: number;
  pushedAfter?: string;
  limit?: number;
  sort?: "stars" | "updated";
}) {
  const terms = [
    query?.trim(),
    ...topics.map((topic) => `${JSON.stringify(topic)} in:name,description,readme`),
    ...languages.map((language) => `language:${JSON.stringify(language)}`),
    `stars:>=${Math.max(0, Math.round(minStars))}`,
    pushedAfter ? `pushed:>=${pushedAfter}` : null,
    "archived:false",
    "fork:false",
  ].filter(Boolean);

  const params = new URLSearchParams({
    q: terms.join(" "),
    sort,
    order: "desc",
    per_page: String(Math.min(50, Math.max(1, limit))),
  });
  const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  const payload = (await response.json()) as GitHubSearchResponse;
  if (!response.ok) {
    throw githubError(response.status, payload.message);
  }
  return payload.items ?? [];
}

export async function fetchGitHubStarredRepositories(username: string, limit = 30) {
  const safeUsername = username.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9-]{1,39}$/.test(safeUsername)) {
    throw new Error("Enter a valid GitHub username.");
  }

  const params = new URLSearchParams({
    sort: "updated",
    direction: "desc",
    per_page: String(Math.min(100, Math.max(1, limit))),
  });
  const response = await fetch(`https://api.github.com/users/${safeUsername}/starred?${params}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  const payload = (await response.json()) as GitHubRepository[] | GitHubError;
  if (!response.ok) {
    throw githubError(response.status, Array.isArray(payload) ? undefined : payload.message);
  }
  return Array.isArray(payload) ? payload : [];
}

export async function fetchGitHubReleases(repository: string, perPage: number) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=${perPage}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  const payload = (await response.json()) as GitHubRelease[] | GitHubError;
  if (!response.ok) {
    throw githubError(response.status, Array.isArray(payload) ? undefined : payload.message);
  }
  return Array.isArray(payload) ? payload : [];
}
