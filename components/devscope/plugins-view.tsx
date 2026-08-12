"use client";

import { AddFeedSourceDialog } from "@/components/devscope/add-feed-source-dialog";
import { EmptyState } from "@/components/devscope/empty-state";
import {
  DISPLAY_LOCALE,
  DISPLAY_TIME_ZONE,
  canRunSource,
  getExternalHref,
} from "@/components/devscope/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FeedSource, NewFeedSource, SyncFeedSourceResult } from "@/lib/database.types";
import { ExternalLink, GitFork, Newspaper, Plus, RefreshCw, Rss, Sparkles, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PluginsView({ initialSources }: { initialSources: FeedSource[] }) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [showAddSource, setShowAddSource] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [syncingAllSources, setSyncingAllSources] = useState(false);
  const enabledCount = sources.filter((source) => source.is_enabled).length;
  const runnableCount = sources.filter(canRunSource).length;

  async function addFeedSource(input: NewFeedSource) {
    const response = await fetch("/api/feed-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as FeedSource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Save failed.");

    setSources((current) => [result as FeedSource, ...current]);
    setShowAddSource(false);
    setNotice("Feed source saved to the database.");
    router.refresh();
  }

  async function toggleFeedSource(source: FeedSource) {
    const nextValue = !source.is_enabled;
    setSources((current) => current.map((item) => item.id === source.id ? { ...item, is_enabled: nextValue } : item));

    const response = await fetch(`/api/feed-sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: nextValue }),
    });

    if (!response.ok) {
      setSources((current) => current.map((item) => item.id === source.id ? { ...item, is_enabled: source.is_enabled } : item));
      setNotice("The source status could not be saved.");
    }
  }

  async function runFeedSourceSync(source: FeedSource) {
    try {
      setSyncingSourceId(source.id);
      const response = await fetch(`/api/feed-sources/${source.id}/sync`, { method: "POST" });
      const result = (await response.json()) as SyncFeedSourceResult | { error: string };

      if (!response.ok || "error" in result) {
        setSources((current) => current.map((item) => item.id === source.id ? { ...item, sync_status: "failed" as const, last_error: "error" in result ? result.error : "Sync failed." } : item));
        setNotice("error" in result ? result.error : "The source sync failed.");
        return null;
      }

      setSources((current) => current.map((item) => item.id === source.id ? result.source : item));
      router.refresh();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The source sync failed.";
      setSources((current) => current.map((item) => item.id === source.id ? { ...item, sync_status: "failed" as const, last_error: message } : item));
      setNotice(message);
      return null;
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function syncFeedSource(source: FeedSource) {
    const result = await runFeedSourceSync(source);
    if (!result) return;

    setNotice(
      result.inserted
        ? `${source.name} added ${result.inserted} new feed ${result.inserted === 1 ? "item" : "items"}.`
        : `${source.name} checked ${result.discovered} items; your feed is already current.`,
    );
  }

  async function syncActiveFeedSources() {
    const sourcesToSync = sources.filter(canRunSource);
    if (!sourcesToSync.length) {
      setNotice("No active runnable sources to sync.");
      return;
    }

    setSyncingAllSources(true);
    let inserted = 0;
    let discovered = 0;
    let failed = 0;

    for (const source of sourcesToSync) {
      const result = await runFeedSourceSync(source);
      if (result) {
        inserted += result.inserted;
        discovered += result.discovered;
      } else {
        failed += 1;
      }
    }

    setSyncingAllSources(false);
    setNotice(
      failed
        ? `Synced ${sourcesToSync.length - failed} sources; ${failed} failed. Added ${inserted} new feed ${inserted === 1 ? "item" : "items"}.`
        : `Synced ${sourcesToSync.length} active sources. Added ${inserted} new feed ${inserted === 1 ? "item" : "items"} from ${discovered} discovered.`,
    );
  }

  return (
    <div className="mx-auto max-w-262.5 px-4 py-8 md:px-8 md:py-10">
      {notice ? (
        <Button onClick={() => setNotice(null)} className="fixed bottom-5 right-5 z-30 shadow-xl">
          {notice}
          <X className="size-3.5" />
        </Button>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dcd6] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase text-[#1e6b55]">Source plugins</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Feed sources</h1>
          <p className="mt-2 text-sm text-[#69716d]">
            {enabledCount} of {sources.length} source{sources.length === 1 ? "" : "s"} enabled.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={syncActiveFeedSources} size="sm" variant="outline" disabled={!runnableCount || syncingAllSources || Boolean(syncingSourceId)}>
            <RefreshCw className={syncingAllSources ? "size-4 animate-spin" : "size-4"} />
            {syncingAllSources ? "Running active" : "Run active"}
          </Button>
          <Button onClick={() => setShowAddSource(true)} size="sm">
            <Plus className="size-4" />
            Add source
          </Button>
        </div>
      </div>

      {sources.length ? (
        <div className="mt-6 divide-y divide-[#d8dcd6] border-t border-[#cbd1ca]">
          {sources.map((source) => <PluginSourceRow key={source.id} source={source} syncingSourceId={syncingSourceId} syncingAllSources={syncingAllSources} onSync={syncFeedSource} onToggle={toggleFeedSource} />)}
        </div>
      ) : (
        <EmptyState title="No feed sources yet" text="Add an RSS, GitHub, YouTube, Hugging Face, Hacker News, arXiv, npm, or custom source to configure your feed." />
      )}

      <AddFeedSourceDialog open={showAddSource} onOpenChange={setShowAddSource} onAdd={addFeedSource} />
    </div>
  );
}

function PluginSourceRow({
  source,
  syncingSourceId,
  syncingAllSources,
  onSync,
  onToggle,
}: {
  source: FeedSource;
  syncingSourceId: string | null;
  syncingAllSources: boolean;
  onSync: (source: FeedSource) => void;
  onToggle: (source: FeedSource) => void;
}) {
  const href = getExternalHref(source.url);
  const lastSynced = source.last_synced_at
    ? new Intl.DateTimeFormat(DISPLAY_LOCALE, {
        month: "short",
        day: "numeric",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(new Date(source.last_synced_at))
    : "Not synced yet";

  return (
    <div className="flex items-center gap-3 py-5">
      <span className="grid size-9 shrink-0 place-items-center bg-white text-[#1e5f4d] dark:bg-[#1c2521] dark:text-[#8bc5af]">
        {source.provider === "GitHub"
          ? <GitFork className="size-4" />
          : source.provider === "YouTube"
            ? <Video className="size-4" />
            : source.provider === "Hugging Face"
              ? <Sparkles className="size-4" />
              : source.provider === "Hacker News"
                ? <Newspaper className="size-4" />
                : <Rss className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-[#1e5f4d] dark:hover:text-[#8bc5af]" title={`Open ${source.name}`}>
              {source.name}
            </a>
          ) : (
            <p className="truncate text-sm font-semibold">{source.name}</p>
          )}
          <Badge variant="secondary">{source.provider}</Badge>
          {!source.is_enabled ? <Badge variant="outline">Paused</Badge> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8a928e]">
          <span className="truncate">{source.url}</span>
          <span>Last sync: {lastSynced}</span>
          {source.sync_status === "success" ? <span>{source.last_item_count} new last run</span> : null}
        </div>
        {source.last_error ? <p className="mt-2 text-xs text-red-700 dark:text-red-400">{source.last_error}</p> : null}
        {source.topics.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {source.topics.map((topic) => <Badge key={topic} variant="outline">{topic}</Badge>)}
          </div>
        ) : null}
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="grid size-8 place-items-center text-[#747d78] hover:bg-[#e9ece7] hover:text-[#1e5f4d] dark:hover:bg-[#202a25] dark:hover:text-[#8bc5af]" aria-label={`Open ${source.name}`} title="Open source">
          <ExternalLink className="size-4" />
        </a>
      ) : null}
      {canRunSource(source) ? (
        <Button variant="outline" size="sm" disabled={!source.is_enabled || syncingAllSources || Boolean(syncingSourceId)} onClick={() => onSync(source)}>
          <RefreshCw className={syncingSourceId === source.id ? "size-3.5 animate-spin" : "size-3.5"} />
          <span className="hidden sm:inline">{syncingSourceId === source.id ? "Running" : "Run now"}</span>
        </Button>
      ) : null}
      <Switch checked={source.is_enabled} onCheckedChange={() => onToggle(source)} aria-label={source.is_enabled ? `Disable ${source.name}` : `Enable ${source.name}`} />
    </div>
  );
}
