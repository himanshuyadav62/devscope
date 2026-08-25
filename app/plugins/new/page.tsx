import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { AddFeedSourcePage } from "@/components/devscope/add-feed-source-page";
import type { FeedSource } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const supportedProviders = new Set<FeedSource["provider"]>([
  "RSS", "GitHub", "GitHub Releases", "YouTube", "Hugging Face", "Hacker News", "Dev.to", "arXiv", "npm", "Custom",
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
  const [{ topics, savedStoriesCount }, params] = await Promise.all([
    getShellData(user.id),
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

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <AddFeedSourcePage initialProvider={initialProvider} initialName={initialName} initialTopics={initialTopics} />
    </AppShell>
  );
}
