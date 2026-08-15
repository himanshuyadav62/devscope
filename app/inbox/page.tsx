import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { InboxView } from "@/components/devscope/inbox-view";
import { DEFAULT_PAGE_SIZE, getStoriesPage } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireDevscopeUser();
  const [shellData, page] = await Promise.all([
    getShellData(user.id),
    getStoriesPage(user.id, { limit: DEFAULT_PAGE_SIZE, savedOnly: true }),
  ]);

  return (
    <AppShell topics={shellData.topics} savedStoriesCount={shellData.savedStoriesCount} user={user}>
      <InboxView initialStories={page.items} initialNextOffset={page.nextOffset} />
    </AppShell>
  );
}
