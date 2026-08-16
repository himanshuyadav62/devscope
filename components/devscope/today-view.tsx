"use client";

import { EmptyState } from "@/components/devscope/empty-state";
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from "@/components/devscope/constants";
import { StoryRow } from "@/components/devscope/story-row";
import { Button } from "@/components/ui/button";
import type { PageResult, Story } from "@/lib/database.types";
import { useEffect, useMemo, useRef, useState } from "react";

export function TodayView({
  initialStories,
  initialNextOffset,
  renderedAt,
  initialTopic = "All",
  initialSource = "All",
  sources,
}: {
  initialStories: Story[];
  initialNextOffset: number | null;
  renderedAt: string;
  initialTopic?: string;
  initialSource?: string;
  sources: string[];
}) {
  const [stories, setStories] = useState(initialStories);
  const [topic, setTopic] = useState(initialTopic);
  const [source, setSource] = useState(initialSource);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const topics = useMemo(
    () => [
      "All",
      ...Array.from(new Set(stories.flatMap((story) => story.topics))).sort((a, b) => a.localeCompare(b)),
    ],
    [stories],
  );
  const sourceOptions = useMemo(() => ["All", ...sources], [sources]);
  const filteredStories = stories;
  const now = new Date(renderedAt);
  const dateLabel = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: DISPLAY_TIME_ZONE,
    }).format(now),
  );
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    stories.flatMap((story) => story.topics).forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stories]);

  async function toggleSaved(story: Story) {
    const nextValue = !story.is_saved;
    setStories((current) => current.map((item) => item.id === story.id ? { ...item, is_saved: nextValue } : item));

    const response = await fetch(`/api/stories/${story.id}/bookmark`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSaved: nextValue }),
    });

    if (!response.ok) {
      setStories((current) => current.map((item) => item.id === story.id ? { ...item, is_saved: story.is_saved } : item));
    }
  }

  async function loadStories(nextTopic: string, nextSource: string, offset: number, replace = false) {
    setLoadingMore(true);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: "50",
    });
    if (nextTopic !== "All") params.set("topic", nextTopic);
    if (nextSource !== "All") params.set("source", nextSource);
    const response = await fetch(`/api/stories?${params}`);
    const page = (await response.json()) as PageResult<Story> | { error: string };
    setLoadingMore(false);
    if (!response.ok || "error" in page) return;

    setStories((current) => replace ? page.items : [...current, ...page.items]);
    setNextOffset(page.nextOffset);
  }

  function selectTopic(nextTopic: string) {
    setTopic(nextTopic);
    void loadStories(nextTopic, source, 0, true);
  }

  function selectSource(nextSource: string) {
    setSource(nextSource);
    void loadStories(topic, nextSource, 0, true);
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nextOffset === null) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loadingMore) {
        void loadStories(topic, source, nextOffset);
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadingMore, nextOffset, topic, source]);

  return (
    <div className="mx-auto max-w-295 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dcd6] pb-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[#1e6b55]">{dateLabel}</p>
          <h1 className="font-heading text-3xl font-semibold md:text-4xl">{greeting}</h1>
          <p className="mt-2 text-sm text-[#69716d]">
            {stories.length === 0 ? "No stories have been ingested yet." : `${stories.length} development${stories.length === 1 ? "" : "s"} in your feed.`}
          </p>
        </div>
      </div>

      <section className="py-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#69716d] dark:text-[#aab4af]">
            Source
            <select
              value={source}
              onChange={(event) => selectSource(event.target.value)}
              className="h-8 min-w-40 border border-[#cbd1ca] bg-transparent px-2 text-xs normal-case tracking-normal text-[#1c211f] outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-[#2b3530] dark:bg-[#151b18] dark:text-[#edf1ee]"
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          {topics.map((option) => (
            <Button
              key={option}
              onClick={() => selectTopic(option)}
              variant={topic === option ? "default" : "outline"}
              size="xs"
              className="shrink-0"
            >
              {option}
            </Button>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Latest stories</h2>
            <span className="text-xs text-[#8a928e]">{filteredStories.length} shown</span>
          </div>
          <div className="border-t border-[#ccd2cb]">
            {filteredStories.length ? (
              filteredStories.map((story, index) => (
                <StoryRow key={story.id} story={story} index={index} onSave={() => toggleSaved(story)} />
              ))
            ) : (
              <EmptyState title="Your feed is empty" text="Connect an ingestion source or add rows to the stories table." />
            )}
          </div>
        </section>

        <aside>
          <h2 className="border-b border-[#d8dcd6] pb-3 text-sm font-bold">Trending topics</h2>
          {topicCounts.length ? (
            <div className="divide-y divide-[#e0e3de]">
              {topicCounts.map(([label, count], index) => (
                <Button
                  key={label}
                  variant="ghost"
                  onClick={() => selectTopic(label)}
                  className="h-auto w-full justify-start gap-3 px-0 py-3 text-left"
                >
                  <span className="font-mono text-xs text-[#9aa19d]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-xs font-semibold">{label}</span>
                    <span className="text-[11px] text-[#949b97]">{count} {count === 1 ? "story" : "stories"}</span>
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="py-5 text-xs leading-5 text-[#858d89]">Topic trends appear as stories enter the database.</p>
          )}
        </aside>
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loadingMore ? <p className="py-4 text-center text-xs text-[#858d89]">Loading more...</p> : null}
    </div>
  );
}
