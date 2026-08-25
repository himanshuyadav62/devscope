import type { NewFeedSource } from "@/lib/database.types";

const providers = new Set([
  "RSS", "GitHub", "GitHub Releases", "GitHub Security", "YouTube", "Hugging Face", "Hacker News", "Dev.to", "Stack Overflow", "arXiv", "npm", "Custom",
]);

function getHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function parseFeedSourceInput(body: unknown):
  | { data: NewFeedSource; error?: never }
  | { data?: never; error: string } {
  const value = body && typeof body === "object" ? body as Partial<NewFeedSource> : {};
  const name = value.name?.trim();
  const provider = value.provider;
  const url = value.url ? getHttpUrl(value.url.trim()) : null;
  const topics = Array.isArray(value.topics)
    ? value.topics.map((topic) => String(topic).trim()).filter(Boolean).slice(0, 12)
    : [];
  const config = value.config && typeof value.config === "object" ? value.config : {};

  if (!name || !provider || !providers.has(provider) || !url) {
    return { error: "A name, supported provider, and valid HTTP URL are required." };
  }
  if (provider === "GitHub" && topics.length === 0 && !config.languages?.length) {
    return { error: "GitHub Radar requires at least one topic or language." };
  }
  if (provider === "GitHub Releases" && config.mode === "selected" && !config.repositories?.length) {
    return { error: "GitHub Releases requires at least one repository." };
  }
  if (provider === "YouTube" && topics.length === 0 && !config.channels?.length) {
    return { error: "YouTube Scout requires at least one topic or channel." };
  }
  if (provider === "npm" && !config.packages?.length) {
    return { error: "npm Package Releases requires at least one package." };
  }

  return { data: { name, provider, url, topics, config } };
}
