import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { PluginsView } from "@/components/devscope/plugins-view";
import { getFeedSources, getPluginSchedules } from "@/lib/data";
import { getPluginRecommendations } from "@/lib/plugin-recommendations";

export const dynamic = "force-dynamic";

export default async function PluginsPage() {
  const user = await requireDevscopeUser();
  const [{ topics, savedStoriesCount }, feedSources, schedules] = await Promise.all([
    getShellData(user.id),
    getFeedSources(user.id),
    getPluginSchedules(user.id),
  ]);
  const recommendations = getPluginRecommendations({
    topics: [...topics, ...feedSources.flatMap((source) => source.topics)],
    sources: feedSources,
  });

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <PluginsView initialSources={feedSources} initialSchedules={schedules} recommendations={recommendations} />
    </AppShell>
  );
}
