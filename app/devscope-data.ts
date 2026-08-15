import { getCurrentUser } from "@/lib/auth";
import { getStoryShellMeta } from "@/lib/data";
import { redirect } from "next/navigation";

export async function requireDevscopeUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function getStoryTopics(stories: Array<{ topics: string[] }>) {
  return Array.from(new Set(stories.flatMap((story) => story.topics))).sort((a, b) => a.localeCompare(b));
}

export async function getShellData(userId: string) {
  return getStoryShellMeta(userId);
}
