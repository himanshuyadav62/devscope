import { DevscopeApp } from "@/components/devscope-app";
import { getFeedSources, getResources, getStories } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [stories, resources, feedSources] = await Promise.all([
    getStories(user.id),
    getResources(user.id),
    getFeedSources(user.id),
  ]);

  return (
    <DevscopeApp
      initialStories={stories}
      initialResources={resources}
      initialFeedSources={feedSources}
      renderedAt={new Date().toISOString()}
      user={user}
    />
  );
}
