import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { LibraryView } from "@/components/devscope/library-view";
import { DEFAULT_PAGE_SIZE, getResourcesPage } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireDevscopeUser();
  const [shellData, page] = await Promise.all([
    getShellData(user.id),
    getResourcesPage(user.id, { limit: DEFAULT_PAGE_SIZE }),
  ]);

  return (
    <AppShell topics={shellData.topics} savedStoriesCount={shellData.savedStoriesCount} user={user}>
      <LibraryView initialResources={page.items} initialNextOffset={page.nextOffset} />
    </AppShell>
  );
}
