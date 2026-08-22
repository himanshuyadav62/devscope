import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type ArxivSearchIn = "all" | "title" | "abstract";
type ArxivSort = "submittedDate" | "lastUpdatedDate" | "relevance";
type ArxivEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: string[];
  categories: string[];
  primaryCategory: string | null;
  pdfUrl: string | null;
  abstractUrl: string;
  comment: string | null;
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

function searchIn(value: unknown): ArxivSearchIn {
  const field = getString(value);
  return field === "title" || field === "abstract" ? field : "all";
}

function sortBy(value: unknown): ArxivSort {
  const sort = getString(value);
  return sort === "lastUpdatedDate" || sort === "relevance" ? sort : "submittedDate";
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1] ?? "") : "";
}

function tagValues(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => decodeXml(match[1] ?? ""))
    .filter(Boolean);
}

function attrValues(xml: string, tag: string, attr: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "gi")))
    .map((match) => {
      const attrs = match[1] ?? "";
      const attrMatch = attrs.match(new RegExp(`${attr}="([^"]*)"`, "i"));
      return attrMatch ? decodeXml(attrMatch[1] ?? "") : "";
    })
    .filter(Boolean);
}

function linkHref(xml: string, predicate: (attrs: string) => boolean) {
  for (const match of xml.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = match[1] ?? "";
    if (!predicate(attrs)) continue;
    const href = attrs.match(/href="([^"]*)"/i)?.[1];
    if (href) return decodeXml(href);
  }
  return null;
}

function arxivId(url: string) {
  return url.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
}

function compactQueryTerm(value: string) {
  const escaped = value.replaceAll("\"", "").trim();
  return escaped.includes(" ") ? `"${escaped}"` : escaped;
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date(Date.now() - days * 86_400_000);
  const format = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}0000`;
  return `submittedDate:[${format(start)} TO ${format(end)}]`;
}

function buildSearchQuery({
  topics,
  categories,
  author,
  field,
  days,
}: {
  topics: string[];
  categories: string[];
  author: string;
  field: ArxivSearchIn;
  days: number;
}) {
  const fieldPrefix = field === "title" ? "ti" : field === "abstract" ? "abs" : "all";
  const topicTerms = topics.map((topic) => `${fieldPrefix}:${compactQueryTerm(topic)}`);
  const categoryTerms = categories.map((category) => `cat:${category}`);
  const terms = [
    topicTerms.length ? `(${topicTerms.join(" OR ")})` : null,
    categoryTerms.length ? `(${categoryTerms.join(" OR ")})` : null,
    author ? `au:${compactQueryTerm(author)}` : null,
    dateRange(days),
  ].filter(Boolean);
  return terms.length ? terms.join(" AND ") : "all:machine learning";
}

function parseEntries(xml: string): ArxivEntry[] {
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)).map((match) => {
    const entry = match[1] ?? "";
    const abstractUrl = tagValue(entry, "id");
    const categoryTerms = attrValues(entry, "category", "term");
    const primaryCategory = entry.match(/<arxiv:primary_category\b([^>]*)>/i)?.[1]?.match(/term="([^"]*)"/i)?.[1] ?? categoryTerms[0] ?? null;
    return {
      id: arxivId(abstractUrl),
      title: tagValue(entry, "title"),
      summary: tagValue(entry, "summary"),
      published: tagValue(entry, "published"),
      updated: tagValue(entry, "updated"),
      authors: tagValues(entry, "name"),
      categories: categoryTerms,
      primaryCategory,
      pdfUrl: linkHref(entry, (attrs) => attrs.includes('title="pdf"') || attrs.includes('type="application/pdf"')),
      abstractUrl,
      comment: tagValue(entry, "arxiv:comment") || null,
    };
  });
}

function scoreEntry(entry: ArxivEntry, topics: string[]) {
  const published = Date.parse(entry.published);
  const ageDays = Number.isFinite(published) ? Math.max(0, (Date.now() - published) / 86_400_000) : 30;
  const haystack = `${entry.title} ${entry.summary} ${entry.categories.join(" ")}`.toLowerCase();
  const matches = topics.filter((topic) => haystack.includes(topic.toLowerCase())).length;
  return Math.round(Math.max(0, 30 - ageDays) + matches * 12 + (entry.pdfUrl ? 3 : 0));
}

async function fetchArxiv(params: URLSearchParams) {
  const response = await fetch(`https://export.arxiv.org/api/query?${params}`, {
    headers: { "User-Agent": "devscope-arxiv" },
    cache: "no-store",
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`arXiv API returned ${response.status}.`);
  }
  if (body.includes("<opensearch:totalResults>0</opensearch:totalResults>")) return [];
  return parseEntries(body);
}

export class ArxivProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const limit = clampInteger(config.limit, 15, 1, 30);
    const days = clampInteger(config.days, 30, 1, 365);
    const categories = getList(config.categories).slice(0, 10);
    const author = getString(config.author);
    const field = searchIn(config.arxivSearchIn);
    const arxivSort = sortBy(config.arxivSort);
    const topics = source.topics.map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const searchQuery = buildSearchQuery({ topics, categories, author, field, days });
    const params = new URLSearchParams({
      search_query: searchQuery,
      start: "0",
      max_results: String(Math.min(100, Math.max(limit * 4, 20))),
      sortBy: arxivSort,
      sortOrder: "descending",
    });

    const entries = await fetchArxiv(params);

    return entries
      .filter((entry) => entry.title && entry.abstractUrl)
      .map((entry) => ({ entry, score: scoreEntry(entry, topics) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ entry, score }): DiscoveredStory => ({
        kind: "Paper",
        source: "arXiv",
        source_url: entry.abstractUrl,
        title: entry.title,
        summary: entry.summary.slice(0, 700),
        topics: Array.from(new Set([
          "arXiv",
          ...(entry.primaryCategory ? [entry.primaryCategory] : []),
          ...entry.categories.slice(0, 4),
          ...topics,
        ])).slice(0, 8),
        published_at: entry.published || entry.updated || new Date().toISOString(),
        accent: "#b31b1b",
        metadata: {
          arxivId: entry.id,
          authors: entry.authors.slice(0, 5).join(", "),
          primaryCategory: entry.primaryCategory,
          pdfUrl: entry.pdfUrl,
          updatedAt: entry.updated,
          comment: entry.comment,
          discoveryScore: score,
          discoveryReason: `${entry.primaryCategory ?? "arXiv"} · ${entry.authors.slice(0, 2).join(", ") || "unknown authors"}`,
        },
      }));
  }
}
