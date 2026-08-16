import { AppShell } from "@/components/devscope/app-shell";
import { TodayView } from "@/components/devscope/today-view";
import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { DEFAULT_PAGE_SIZE, getStoriesPage } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; source?: string }>;
}) {
  const user = await requireDevscopeUser();
  const params = await searchParams;
  const [shellData, page] = await Promise.all([
    getShellData(user.id),
    getStoriesPage(user.id, { limit: DEFAULT_PAGE_SIZE, topic: params.topic, source: params.source }),
  ]);

  return (
    <AppShell topics={shellData.topics} savedStoriesCount={shellData.savedStoriesCount} user={user}>
      <TodayView
        initialStories={page.items}
        initialNextOffset={page.nextOffset}
        renderedAt={new Date().toISOString()}
        initialTopic={params.topic ?? "All"}
        initialSource={params.source ?? "All"}
        sources={shellData.sources}
      />
    </AppShell>
  );
}
