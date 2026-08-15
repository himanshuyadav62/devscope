"use client";

import { EmptyState } from "@/components/devscope/empty-state";
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE, getExternalHref } from "@/components/devscope/constants";
import { Badge } from "@/components/ui/badge";
import type { PageResult, Resource } from "@/lib/database.types";
import { ExternalLink, FileText, Link2, Newspaper } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function LibraryView({
  initialResources,
  initialNextOffset,
}: {
  initialResources: Resource[];
  initialNextOffset: number | null;
}) {
  const [resources, setResources] = useState(initialResources);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    const response = await fetch(`/api/resources?offset=${nextOffset}&limit=50`);
    const page = (await response.json()) as PageResult<Resource> | { error: string };
    setLoadingMore(false);
    if (!response.ok || "error" in page) return;

    setResources((current) => [...current, ...page.items]);
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
    <div className="mx-auto max-w-262.5 px-4 py-8 md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase text-[#1e6b55]">Personal knowledge</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Your library</h1>
      <p className="mt-2 text-sm text-[#69716d]">{resources.length} saved {resources.length === 1 ? "resource" : "resources"}.</p>
      {resources.length ? (
        <div className="mt-8 divide-y divide-[#d8dcd6] border-t border-[#cbd1ca]">
          {resources.map((resource) => {
            const href = getExternalHref(resource.url);

            return (
              <div key={resource.id} className="grid grid-cols-[minmax(0,1fr)_68px_72px_36px] items-center gap-3 py-5 md:grid-cols-[minmax(0,1fr)_90px_90px_36px]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center bg-white text-[#1e5f4d] dark:bg-[#1c2521] dark:text-[#8bc5af]">
                    {resource.type === "PDF" ? <FileText className="size-4" /> : resource.type === "Note" ? <Newspaper className="size-4" /> : <Link2 className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-[#1e5f4d]" title={`Open ${resource.title}`}>
                        {resource.title}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-semibold">{resource.title}</p>
                    )}
                    <p className="mt-1 truncate text-xs text-[#939a96]">{resource.url ?? "Personal note"}</p>
                  </div>
                </div>
                <Badge variant="secondary">{resource.type}</Badge>
                <span className="text-xs text-[#8a928e]">
                  {new Intl.DateTimeFormat(DISPLAY_LOCALE, {
                    month: "short",
                    day: "numeric",
                    timeZone: DISPLAY_TIME_ZONE,
                  }).format(new Date(resource.created_at))}
                </span>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 place-items-center text-[#747d78] hover:bg-[#e9ece7] hover:text-[#1e5f4d] dark:hover:bg-[#202a25] dark:hover:text-[#8bc5af]"
                    aria-label={`Open ${resource.title}`}
                    title="Open resource"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      ) : <EmptyState title="Your library is empty" text="Add a link, PDF, or note to create your first database record." />}
      <div ref={sentinelRef} className="h-10" />
      {loadingMore ? <p className="py-4 text-center text-xs text-[#858d89]">Loading more...</p> : null}
    </div>
  );
}
