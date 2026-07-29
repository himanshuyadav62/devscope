import type { FeedSource } from "@/lib/database.types";
import type { FeedProvider } from "@/lib/providers/types";
import { GitHubProvider } from "@/lib/providers/github";
import { YouTubeProvider } from "@/lib/providers/youtube";

export function getFeedProvider(source: FeedSource): FeedProvider {
  if (source.provider === "GitHub") return new GitHubProvider();
  if (source.provider === "YouTube") return new YouTubeProvider();
  throw new Error(`${source.provider} ingestion is not implemented yet.`);
}
