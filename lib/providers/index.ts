import type { FeedSource } from "@/lib/database.types";
import type { FeedProvider } from "@/lib/providers/types";
import { DevToProvider } from "@/lib/providers/devto";
import { GitHubReleasesProvider } from "@/lib/providers/github-releases";
import { GitHubProvider } from "@/lib/providers/github";
import { HackerNewsProvider } from "@/lib/providers/hackernews";
import { HuggingFaceProvider } from "@/lib/providers/huggingface";
import { YouTubeProvider } from "@/lib/providers/youtube";

export function getFeedProvider(source: FeedSource): FeedProvider {
  if (source.provider === "GitHub") return new GitHubProvider();
  if (source.provider === "YouTube") return new YouTubeProvider();
  if (source.provider === "Hugging Face") return new HuggingFaceProvider();
  if (source.provider === "Hacker News") return new HackerNewsProvider();
  if (source.provider === "Dev.to") return new DevToProvider();
  if (source.provider === "GitHub Releases") return new GitHubReleasesProvider();
  throw new Error(`${source.provider} ingestion is not implemented yet.`);
}
