import { DevscopeApp } from "@/components/devscope-app";
import { getFeedSources, getResources, getStories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories, resources, feedSources] = await Promise.all([
    getStories(),
    getResources(),
    getFeedSources(),
  ]);

  return (
    <DevscopeApp
      initialStories={stories}
      initialResources={resources}
      initialFeedSources={feedSources}
      renderedAt={new Date().toISOString()}
    />
  );
}
