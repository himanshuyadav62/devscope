import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { AddFeedSourcePage } from "@/components/devscope/add-feed-source-page";
import { getFeedSources } from "@/lib/data";
import type { FeedSource } from "@/lib/database.types";
import { getPluginRecommendations } from "@/lib/plugin-recommendations";

export const dynamic = "force-dynamic";

const supportedProviders = new Set<FeedSource["provider"]>([
  "RSS", "GitHub", "GitHub Releases", "GitHub Security", "YouTube", "Hugging Face", "Hacker News", "Dev.to", "Stack Overflow", "arXiv", "npm", "Custom",
]);

function parameter(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function NewPluginSourcePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDevscopeUser();
  const [{ topics, savedStoriesCount }, feedSources, params] = await Promise.all([
    getShellData(user.id),
    getFeedSources(user.id),
    searchParams,
  ]);
  const requestedProvider = parameter(params.provider) as FeedSource["provider"];
  const initialProvider = supportedProviders.has(requestedProvider) ? requestedProvider : undefined;
  const initialName = parameter(params.name).slice(0, 120);
  const initialTopics = parameter(params.topics)
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 12);
  const recommendations = getPluginRecommendations({
    topics: [...topics, ...feedSources.flatMap((source) => source.topics)],
    sources: feedSources,
    includeInstalled: true,
  });

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <AddFeedSourcePage initialProvider={initialProvider} initialName={initialName} initialTopics={initialTopics} recommendations={recommendations} />
    </AppShell>
  );
}
