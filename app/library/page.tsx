import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { LibraryView } from "@/components/devscope/library-view";
import { getResources } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireDevscopeUser();
  const [{ topics, savedStoriesCount }, resources] = await Promise.all([
    getShellData(user.id),
    getResources(user.id),
  ]);

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <LibraryView resources={resources} />
    </AppShell>
  );
}
