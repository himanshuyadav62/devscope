"use client";

import { EmptyState } from "@/components/devscope/empty-state";
import { StoryRow } from "@/components/devscope/story-row";
import type { PageResult, Story } from "@/lib/database.types";
import { useCallback, useEffect, useRef, useState } from "react";

export function InboxView({
  initialStories,
  initialNextOffset,
}: {
  initialStories: Story[];
  initialNextOffset: number | null;
}) {
  const [stories, setStories] = useState(initialStories);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const loadMore = useCallback(async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    const response = await fetch(`/api/stories?savedOnly=true&offset=${nextOffset}&limit=50`);
    const page = (await response.json()) as PageResult<Story> | { error: string };
    setLoadingMore(false);
    if (!response.ok || "error" in page) return;

    setStories((current) => [...current, ...page.items]);
    setNextOffset(page.nextOffset);
  }, [nextOffset]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nextOffset === null) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loadingMore) void loadMore();
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore, nextOffset]);

  return (
    <div className="mx-auto max-w-225 px-4 py-8 md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase text-[#1e6b55]">Reading queue</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Saved for later</h1>
      <div className="mt-8 border-t border-[#ccd2cb]">
        {stories.length ? (
          stories.map((story, index) => (
            <StoryRow key={story.id} story={story} index={index} onSave={() => toggleSaved(story)} />
          ))
        ) : (
          <EmptyState title="Nothing saved yet" text="Bookmark a story to add it to your reading queue." />
        )}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loadingMore ? <p className="py-4 text-center text-xs text-[#858d89]">Loading more...</p> : null}
    </div>
  );
}
