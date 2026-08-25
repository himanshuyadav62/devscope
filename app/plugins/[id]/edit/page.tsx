import { getShellData, requireDevscopeUser } from "@/app/devscope-data";
import { AppShell } from "@/components/devscope/app-shell";
import { EditFeedSourcePage } from "@/components/devscope/edit-feed-source-page";
import { getFeedSource } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPluginSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireDevscopeUser();
  const { id } = await params;
  const [{ topics, savedStoriesCount }, source] = await Promise.all([
    getShellData(user.id),
    getFeedSource(user.id, id),
  ]);
  if (!source) notFound();

  return (
    <AppShell topics={topics} savedStoriesCount={savedStoriesCount} user={user}>
      <EditFeedSourcePage source={source} />
    </AppShell>
  );
}
