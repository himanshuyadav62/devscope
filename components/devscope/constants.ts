import type { FeedSource } from "@/lib/database.types";
import { Inbox, Library, Newspaper, PlugZap } from "lucide-react";

export type DevscopeView = "today" | "library" | "inbox" | "plugins";

export const navItems = [
  { id: "today", label: "Today", href: "/", icon: Newspaper },
  { id: "library", label: "Library", href: "/library", icon: Library },
  { id: "inbox", label: "Reading queue", href: "/inbox", icon: Inbox },
  { id: "plugins", label: "Plugins", href: "/plugins", icon: PlugZap },
] as const;

export const DISPLAY_LOCALE = "en-US";
export const DISPLAY_TIME_ZONE = "Asia/Kolkata";

export const runnableProviders = new Set<FeedSource["provider"]>([
  "GitHub",
  "GitHub Releases",
  "GitHub Security",
  "YouTube",
  "Hugging Face",
  "Hacker News",
  "Dev.to",
  "Stack Overflow",
  "arXiv",
  "npm",
]);

export function canRunSource(source: FeedSource) {
  return source.is_enabled && runnableProviders.has(source.provider);
}

export function getExternalHref(url: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
