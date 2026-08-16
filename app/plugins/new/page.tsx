import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { AddFeedSourcePage } from "@/components/devscope/add-feed-source-page";

export const dynamic = "force-dynamic";

export default async function NewPluginSourcePage() {
  const user = await requireDevscopeUser();
  const { topics, savedStoriesCount } = await getShellData(user.id);

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <AddFeedSourcePage />
    </AppShell>
  );
}
