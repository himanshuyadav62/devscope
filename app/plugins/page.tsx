import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { PluginsView } from "@/components/devscope/plugins-view";
import { getFeedSources } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PluginsPage() {
  const user = await requireDevscopeUser();
  const [{ topics, savedStoriesCount }, feedSources] = await Promise.all([
    getShellData(user.id),
    getFeedSources(user.id),
  ]);

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <PluginsView initialSources={feedSources} />
    </AppShell>
  );
}
