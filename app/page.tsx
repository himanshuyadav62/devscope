import { AppShell } from "@/components/devscope/app-shell";
import { TodayView } from "@/components/devscope/today-view";
import { getShellData, requireDevscopeUser } from "@/app/devscope-data";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await requireDevscopeUser();
  const { stories, topics, savedStoriesCount } = await getShellData(user.id);
  const params = await searchParams;

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <TodayView
        initialStories={stories}
        renderedAt={new Date().toISOString()}
        initialTopic={params.topic ?? "All"}
      />
    </AppShell>
  );
}
