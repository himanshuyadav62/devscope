import { DevscopeApp } from "@/components/devscope-app";
import { getResources, getStories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories, resources] = await Promise.all([
    getStories(),
    getResources(),
  ]);

  return (
    <DevscopeApp
      initialStories={stories}
      initialResources={resources}
      renderedAt={new Date().toISOString()}
    />
  );
}
