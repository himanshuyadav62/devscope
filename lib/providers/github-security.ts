import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type SecuritySeverity = "unknown" | "low" | "medium" | "high" | "critical";

type GitHubAdvisory = {
  ghsa_id: string;
  cve_id: string | null;
  html_url: string;
  summary: string;
  description: string;
  severity: SecuritySeverity;
  published_at: string;
  updated_at: string;
  withdrawn_at: string | null;
  cvss?: { score?: number | null } | null;
  epss?: { percentage?: number | null; percentile?: number | string | null } | null;
  vulnerabilities?: Array<{
    package?: { ecosystem?: string; name?: string };
    vulnerable_version_range?: string;
    first_patched_version?: string | null;
  }>;
};

type GitHubError = { message?: string };

const DAY_MS = 86_400_000;
const supportedEcosystems = new Set([
  "npm", "pip", "maven", "nuget", "composer", "go", "rust", "rubygems", "actions", "erlang", "pub", "swift", "other",
]);
const severityRank: Record<SecuritySeverity, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function severity(value: unknown): SecuritySeverity {
  return typeof value === "string" && Object.hasOwn(severityRank, value) ? value as SecuritySeverity : "high";
}

function headers(): HeadersInit {
  const value: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devscope-security-advisories",
  };
  if (process.env.GITHUB_TOKEN) value.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return value;
}

async function fetchAdvisories(ecosystem: string | null, days: number, packages: string[], count: number) {
  const params = new URLSearchParams({
    type: "reviewed",
    published: `>=${dateDaysAgo(days)}`,
    sort: "published",
    direction: "desc",
    per_page: String(Math.min(100, Math.max(20, count))),
  });
  if (ecosystem) params.set("ecosystem", ecosystem);
  if (packages.length) params.set("affects", packages.join(","));

  const response = await fetch(`https://api.github.com/advisories?${params}`, {
    headers: headers(),
    cache: "no-store",
  });
  const payload = (await response.json()) as GitHubAdvisory[] | GitHubError;
  if (!response.ok) {
    const message = Array.isArray(payload) ? null : payload.message;
    const rateHint = response.status === 403 ? " Add GITHUB_TOKEN to increase the GitHub API rate limit." : "";
    throw new Error(`${message ?? `GitHub Advisory API returned ${response.status}.`}${rateHint}`);
  }
  return Array.isArray(payload) ? payload : [];
}

function affectedPackages(advisory: GitHubAdvisory) {
  return Array.from(new Set(
    (advisory.vulnerabilities ?? [])
      .map((item) => item.package?.name)
      .filter((item): item is string => Boolean(item)),
  ));
}

function affectedEcosystems(advisory: GitHubAdvisory) {
  return Array.from(new Set(
    (advisory.vulnerabilities ?? [])
      .map((item) => item.package?.ecosystem)
      .filter((item): item is string => Boolean(item)),
  ));
}

export class GitHubSecurityProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const limit = clampInteger(config.limit, 20, 1, 50);
    const days = clampInteger(config.days, 30, 1, 365);
    const minSeverity = severity(config.minSeverity);
    const minCvss = clampNumber(config.minCvss, 0, 0, 10);
    const packages = list(config.packages).slice(0, 100);
    const ecosystems = list(config.securityEcosystems).filter((item) => supportedEcosystems.has(item)).slice(0, 6);
    const searches: Array<string | null> = ecosystems.length ? ecosystems : [null];
    const responses = await Promise.all(
      searches.map((ecosystem) => fetchAdvisories(ecosystem, days, packages, limit * 3)),
    );
    const advisories = Array.from(
      new Map(responses.flat().map((advisory) => [advisory.ghsa_id, advisory])).values(),
    );

    return advisories
      .filter((advisory) => !advisory.withdrawn_at)
      .filter((advisory) => severityRank[advisory.severity] >= severityRank[minSeverity])
      .filter((advisory) => (advisory.cvss?.score ?? 0) >= minCvss)
      .sort((left, right) => {
        const severityDifference = severityRank[right.severity] - severityRank[left.severity];
        if (severityDifference) return severityDifference;
        const cvssDifference = (right.cvss?.score ?? 0) - (left.cvss?.score ?? 0);
        return cvssDifference || Date.parse(right.published_at) - Date.parse(left.published_at);
      })
      .slice(0, limit)
      .map((advisory): DiscoveredStory => {
        const packageNames = affectedPackages(advisory);
        const advisoryEcosystems = affectedEcosystems(advisory);
        const cvss = advisory.cvss?.score ?? null;
        const epss = advisory.epss?.percentage ?? null;
        return {
          kind: "Security Advisory",
          source: "GitHub Security Advisory",
          source_url: advisory.html_url,
          title: advisory.summary,
          summary: [
            `${advisory.severity.toUpperCase()} severity`,
            cvss !== null ? `CVSS ${cvss.toFixed(1)}` : null,
            packageNames.length ? `Affects ${packageNames.slice(0, 5).join(", ")}` : null,
          ].filter(Boolean).join(" · "),
          topics: Array.from(new Set(["Security", advisory.severity, ...advisoryEcosystems, ...source.topics])).slice(0, 10),
          published_at: advisory.published_at,
          accent: "#b31b1b",
          metadata: {
            ghsaId: advisory.ghsa_id,
            cveId: advisory.cve_id,
            severity: advisory.severity,
            cvss,
            epss,
            affectedPackages: packageNames.join(", ") || null,
            ecosystems: advisoryEcosystems.join(", ") || null,
            updatedAt: advisory.updated_at,
            discoveryReason: `${advisory.severity.toUpperCase()}${cvss !== null ? ` · CVSS ${cvss.toFixed(1)}` : ""}`,
          },
        };
      });
  }
}
