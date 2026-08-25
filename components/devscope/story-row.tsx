"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DISPLAY_LOCALE,
  DISPLAY_TIME_ZONE,
  getExternalHref,
} from "@/components/devscope/constants";
import type { Story } from "@/lib/database.types";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  GitFork,
  MessageSquare,
  Newspaper,
  Package,
  ShieldAlert,
  Sparkles,
  Star,
} from "lucide-react";

function sourceAccentClass(accent: string | null) {
  if (accent === "#24292f") return "text-[#24292f] dark:text-[#c9d1d9]";
  if (accent === "#0a0a0a") return "text-[#0a0a0a] dark:text-[#f5f5f5]";
  if (accent === "#b31b1b") return "text-[#b31b1b] dark:text-[#ff8f8f]";
  if (accent === "#cb3837") return "text-[#a52b2a] dark:text-[#ff9291]";
  if (accent === "#f48024") return "text-[#b45309] dark:text-[#ffb36f]";
  if (accent === "#ff6600") return "text-[#b45309] dark:text-[#ffb86c]";
  if (accent === "#ff0033") return "text-[#d6002b] dark:text-[#ff7a95]";
  if (accent === "#ff9d00") return "text-[#b66a00] dark:text-[#ffd27a]";
  return "text-[#1e5f4d] dark:text-[#8bc5af]";
}

export function StoryRow({
  story,
  index,
  onSave,
}: {
  story: Story;
  index: number;
  onSave: () => void;
}) {
  const KindIcon = story.kind === "Paper"
    ? FileText
    : story.kind === "Repository"
      ? GitFork
      : story.kind === "Release"
        ? Sparkles
        : story.kind === "Security Advisory"
          ? ShieldAlert
          : story.kind === "Package Release"
            ? Package
            : story.kind === "Question"
              ? MessageSquare
        : Newspaper;
  const href = getExternalHref(story.source_url);
  const published = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(story.published_at));
  const discoveryReason =
    typeof story.metadata.discoveryReason === "string"
      ? story.metadata.discoveryReason
      : null;
  const stars = typeof story.metadata.stars === "number" ? story.metadata.stars : null;

  return (
    <article className="group grid grid-cols-[34px_minmax(0,1fr)_36px] gap-3 border-b border-[#d8dcd6] py-5 dark:border-[#2b3530] md:grid-cols-[42px_minmax(0,1fr)_80px] md:gap-4">
      <div className="font-mono text-xs text-[#a0a7a3]">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`flex items-center gap-1.5 font-bold ${sourceAccentClass(story.accent)}`}>
            <KindIcon className="size-3.5" /> {story.source}
          </span>
          <span className="text-[#a0a6a2]">/</span>
          <span className="font-semibold uppercase text-[#7d8581]">{story.kind}</span>
        </div>
        <h3 className="text-[17px] font-bold leading-6">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="hover:text-[#1e5f4d] dark:hover:text-[#8bc5af]">
              {story.title}
            </a>
          ) : (
            story.title
          )}
        </h3>
        {story.summary ? <p className="mt-2 text-sm leading-6 text-[#65706a]">{story.summary}</p> : null}
        {discoveryReason ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#7a837e]">
            <Star className="size-3.5 text-[#b7791f]" />
            {discoveryReason}
            {stars !== null ? <span className="sr-only">{stars} GitHub stars</span> : null}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {story.topics.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
          <span className="text-[11px] text-[#949b97]">
            {published}
            {story.read_minutes
              ? story.kind === "Video"
                ? ` · ${story.read_minutes} min video`
                : ` · ${story.read_minutes} min read`
              : ""}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-end gap-1">
        <Button variant="ghost" size="icon-xs" onClick={onSave} aria-label={story.is_saved ? "Remove bookmark" : "Bookmark story"}>
          {story.is_saved ? <BookmarkCheck className="size-4 text-[#1e5f4d]" /> : <Bookmark className="size-4" />}
        </Button>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="hidden size-8 place-items-center text-[#747d78] md:grid" aria-label="Open story">
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
