import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type NpmVersion = {
  name?: string;
  version?: string;
  description?: string;
  license?: string;
  deprecated?: string;
  dist?: { unpackedSize?: number; fileCount?: number };
};

type NpmPackage = {
  name?: string;
  description?: string;
  time?: Record<string, string>;
  versions?: Record<string, NpmVersion>;
  "dist-tags"?: Record<string, string>;
  error?: string;
  reason?: string;
};

const DAY_MS = 86_400_000;

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

async function fetchPackage(packageName: string) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
    headers: { Accept: "application/json", "User-Agent": "devscope-npm-releases" },
    cache: "no-store",
  });
  const payload = (await response.json()) as NpmPackage;
  if (!response.ok) {
    throw new Error(payload.reason ?? payload.error ?? `npm registry returned ${response.status} for ${packageName}.`);
  }
  return payload;
}

function isPrerelease(version: string) {
  return version.includes("-");
}

function majorVersion(version: string) {
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return Number.isFinite(major) ? major : null;
}

export class NpmProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const packages = Array.from(new Set(list(config.packages))).slice(0, 30);
    const days = clampInteger(config.days, 30, 1, 365);
    const limit = clampInteger(config.limit, 20, 1, 50);
    const includePrereleases = config.includePrereleases === true;
    if (!packages.length) throw new Error("npm Package Releases needs at least one package.");

    const cutoff = Date.now() - days * DAY_MS;
    const payloads = await Promise.all(packages.map(fetchPackage));
    const releases = payloads.flatMap((packument) => {
      const name = packument.name ?? "unknown-package";
      const tags = packument["dist-tags"] ?? {};
      return Object.entries(packument.time ?? {})
        .filter(([version]) => version !== "created" && version !== "modified")
        .filter(([version, publishedAt]) => Date.parse(publishedAt) >= cutoff && (includePrereleases || !isPrerelease(version)))
        .map(([version, publishedAt]) => ({
          name,
          version,
          publishedAt,
          details: packument.versions?.[version],
          tags: Object.entries(tags).filter(([, taggedVersion]) => taggedVersion === version).map(([tag]) => tag),
        }));
    });

    return releases
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
      .slice(0, limit)
      .map((release): DiscoveredStory => {
        const major = majorVersion(release.version);
        const url = `https://www.npmjs.com/package/${release.name}/v/${release.version}`;
        return {
          kind: "Package Release",
          source: "npm",
          source_url: url,
          title: `${release.name} ${release.version}`,
          summary: [
            release.details?.description,
            release.tags.length ? `Tags: ${release.tags.join(", ")}` : null,
            release.details?.deprecated ? `Deprecated: ${release.details.deprecated}` : null,
          ].filter(Boolean).join(" · ") || `A new version of ${release.name} was published.`,
          topics: Array.from(new Set(["npm", release.name, ...(major !== null ? [`v${major}`] : []), ...source.topics])).slice(0, 10),
          published_at: release.publishedAt,
          accent: "#cb3837",
          metadata: {
            package: release.name,
            version: release.version,
            major,
            prerelease: isPrerelease(release.version),
            distTags: release.tags.join(", ") || null,
            deprecated: release.details?.deprecated ?? null,
            license: release.details?.license ?? null,
            unpackedSize: release.details?.dist?.unpackedSize ?? null,
            fileCount: release.details?.dist?.fileCount ?? null,
            discoveryReason: `${release.name} · published ${new Date(release.publishedAt).toLocaleDateString("en-US")}`,
          },
        };
      });
  }
}
