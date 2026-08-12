import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { InboxView } from "@/components/devscope/inbox-view";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireDevscopeUser();
  const { stories, topics, savedStoriesCount } = await getShellData(user.id);

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <InboxView initialStories={stories.filter((story) => story.is_saved)} />
    </AppShell>
  );
}
