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
import type { FeedSource, NewFeedSource, PluginSchedule, SyncFeedSourceResult } from "@/lib/database.types";
import { CalendarClock, ExternalLink, GitFork, Newspaper, Plus, RefreshCw, Rss, Sparkles, Trash2, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PluginsView({
  initialSources,
  initialSchedules,
}: {
  initialSources: FeedSource[];
  initialSchedules: PluginSchedule[];
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showAddSource, setShowAddSource] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleName, setScheduleName] = useState("Daily active plugin run");
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

  async function addSchedule() {
    const response = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: scheduleName,
        timeOfDay: scheduleTime,
        timezone: "UTC",
        isEnabled: true,
      }),
    });
    const result = (await response.json()) as PluginSchedule | { error: string };
    if (!response.ok || "error" in result) {
      setNotice("error" in result ? result.error : "Could not save schedule.");
      return;
    }
    setSchedules((current) => [result, ...current]);
    setNotice("Schedule saved. Active plugins will run at that UTC time.");
    router.refresh();
  }

  async function toggleSchedule(schedule: PluginSchedule) {
    const nextValue = !schedule.is_enabled;
    setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, is_enabled: nextValue } : item));
    const response = await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: nextValue }),
    });
    const result = (await response.json()) as PluginSchedule | { error: string };
    if (!response.ok || "error" in result) {
      setSchedules((current) => current.map((item) => item.id === schedule.id ? schedule : item));
      setNotice("error" in result ? result.error : "Could not update schedule.");
      return;
    }
    setSchedules((current) => current.map((item) => item.id === schedule.id ? result : item));
  }

  async function deleteSchedule(schedule: PluginSchedule) {
    setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    const response = await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" });
    if (!response.ok) {
      setSchedules((current) => [schedule, ...current]);
      setNotice("Could not delete schedule.");
    }
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

      <section className="mt-6 border-y border-[#cbd1ca] py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#1e6b55]">Scheduler</p>
            <h2 className="mt-1 text-sm font-bold">Run active plugins automatically</h2>
            <p className="mt-1 text-xs leading-5 text-[#737c77]">
              Times are stored in UTC. Configure your platform cron to call <code className="font-mono">/api/schedules/run</code>.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[180px_120px_auto]">
            <input
              value={scheduleName}
              onChange={(event) => setScheduleName(event.target.value)}
              className="h-10 border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Schedule name"
            />
            <input
              value={scheduleTime}
              onChange={(event) => setScheduleTime(event.target.value)}
              type="time"
              className="h-10 border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Schedule time"
            />
            <Button onClick={addSchedule} size="sm">
              <CalendarClock className="size-4" />
              Add schedule
            </Button>
          </div>
        </div>
        {schedules.length ? (
          <div className="mt-4 divide-y divide-[#d8dcd6] border-t border-[#d8dcd6]">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex flex-wrap items-center gap-3 py-3">
                <CalendarClock className="size-4 text-[#1e5f4d]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{schedule.name}</p>
                    {!schedule.is_enabled ? <Badge variant="outline">Paused</Badge> : null}
                    {schedule.last_status === "failed" ? <Badge variant="outline">Failed</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-[#8a928e]">
                    Runs daily at {schedule.time_of_day} {schedule.timezone}. Next: {new Intl.DateTimeFormat(DISPLAY_LOCALE, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TIME_ZONE }).format(new Date(schedule.next_run_at))}
                    {schedule.last_run_at ? ` · Last run: ${new Intl.DateTimeFormat(DISPLAY_LOCALE, { month: "short", day: "numeric", timeZone: DISPLAY_TIME_ZONE }).format(new Date(schedule.last_run_at))}` : ""}
                  </p>
                  {schedule.last_error ? <p className="mt-1 text-xs text-red-700 dark:text-red-400">{schedule.last_error}</p> : null}
                </div>
                <Switch checked={schedule.is_enabled} onCheckedChange={() => toggleSchedule(schedule)} aria-label={schedule.is_enabled ? "Disable schedule" : "Enable schedule"} />
                <Button variant="ghost" size="icon-xs" onClick={() => deleteSchedule(schedule)} aria-label="Delete schedule">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

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
        {source.provider === "GitHub" || source.provider === "GitHub Releases"
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
