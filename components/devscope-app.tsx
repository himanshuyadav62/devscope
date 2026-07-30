"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  FeedSource,
  NewFeedSource,
  NewResource,
  Resource,
  Story,
  SyncFeedSourceResult,
} from "@/lib/database.types";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  GitFork,
  Inbox,
  Library,
  Link2,
  Menu,
  Moon,
  Newspaper,
  Plus,
  PlugZap,
  Rss,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Video,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "today", label: "Today", icon: Newspaper },
  { id: "library", label: "Library", icon: Library },
  { id: "inbox", label: "Reading queue", icon: Inbox },
  { id: "plugins", label: "Plugins", icon: PlugZap },
];

const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "Asia/Kolkata";

function getExternalHref(url: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function DevscopeApp({
  initialStories,
  initialResources,
  initialFeedSources,
  renderedAt,
  user,
}: Readonly<{
  initialStories: Story[];
  initialResources: Resource[];
  initialFeedSources: FeedSource[];
  renderedAt: string;
  user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
}>) {
  const [view, setView] = useState("today");
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState(initialStories);
  const [resources, setResources] = useState(initialResources);
  const [feedSources, setFeedSources] = useState(initialFeedSources);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("devscope-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

    document.documentElement.classList.toggle("dark", shouldUseDark);
    queueMicrotask(() => setDarkMode(shouldUseDark));
  }, []);

  const topics = useMemo(
    () => [
      "All",
      ...Array.from(new Set(stories.flatMap((story) => story.topics))).sort((a, b) => a.localeCompare(b)),
    ],
    [stories],
  );

  const filteredStories = useMemo(() => {
    const normalized = query.toLowerCase();
    return stories.filter((story) => {
      const matchesTopic = topic === "All" || story.topics.includes(topic);
      const matchesQuery =
        !normalized ||
        `${story.title} ${story.summary} ${story.source} ${story.topics.join(" ")}`
          .toLowerCase()
          .includes(normalized);
      return matchesTopic && matchesQuery;
    });
  }, [query, stories, topic]);

  const savedStories = stories.filter((story) => story.is_saved);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("devscope-theme", next ? "dark" : "light");
      return next;
    });
  }

  async function addResource(input: NewResource) {
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as Resource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Save failed.");

    setResources((current) => [result as Resource, ...current]);
    setShowAdd(false);
    setView("library");
    setNotice("Resource saved to the database.");
  }

  async function toggleSaved(story: Story) {
    const nextValue = !story.is_saved;
    setStories((current) =>
      current.map((item) =>
        item.id === story.id ? { ...item, is_saved: nextValue } : item,
      ),
    );

    const response = await fetch(`/api/stories/${story.id}/bookmark`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSaved: nextValue }),
    });

    if (!response.ok) {
      setStories((current) =>
        current.map((item) =>
          item.id === story.id ? { ...item, is_saved: story.is_saved } : item,
        ),
      );
      setNotice("The bookmark could not be saved.");
    }
  }

  async function addFeedSource(input: NewFeedSource) {
    const response = await fetch("/api/feed-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as FeedSource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Save failed.");

    setFeedSources((current) => [result as FeedSource, ...current]);
    setShowAddSource(false);
    setNotice("Feed source saved to the database.");
  }

  async function toggleFeedSource(source: FeedSource) {
    const nextValue = !source.is_enabled;
    setFeedSources((current) =>
      current.map((item) =>
        item.id === source.id ? { ...item, is_enabled: nextValue } : item,
      ),
    );

    const response = await fetch(`/api/feed-sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: nextValue }),
    });

    if (!response.ok) {
      setFeedSources((current) =>
        current.map((item) =>
          item.id === source.id ? { ...item, is_enabled: source.is_enabled } : item,
        ),
      );
      setNotice("The source status could not be saved.");
    }
  }

  async function syncFeedSource(source: FeedSource) {
    setSyncingSourceId(source.id);
    const response = await fetch(`/api/feed-sources/${source.id}/sync`, {
      method: "POST",
    });
    const result = (await response.json()) as SyncFeedSourceResult | { error: string };
    setSyncingSourceId(null);

    if (!response.ok || "error" in result) {
      setFeedSources((current) =>
        current.map((item) =>
          item.id === source.id
            ? { ...item, sync_status: "failed" as const, last_error: "error" in result ? result.error : "Sync failed." }
            : item,
        ),
      );
      setNotice("error" in result ? result.error : "The source sync failed.");
      return;
    }

    setFeedSources((current) =>
      current.map((item) => item.id === source.id ? result.source : item),
    );
    setStories((current) => {
      const knownUrls = new Set(current.map((story) => story.source_url));
      return [...result.stories.filter((story) => !knownUrls.has(story.source_url)), ...current];
    });
    setNotice(
      result.inserted
        ? `${source.name} added ${result.inserted} new feed ${result.inserted === 1 ? "item" : "items"}.`
        : `${source.name} checked ${result.discovered} items; your feed is already current.`,
    );
  }

  return (
    <div className="devscope-shell min-h-screen bg-[#f5f6f3] text-[#1c211f] transition-colors dark:bg-[#101513] dark:text-[#edf1ee]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#dfe2dc] bg-[#fafbf8] transition-colors dark:border-[#2b3530] dark:bg-[#151b18] lg:block">
        <SidebarContent
          view={view}
          setView={setView}
          topics={topics}
          setTopic={setTopic}
          savedStoriesCount={savedStories.length}
          user={user}
        />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-64 max-w-64 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Switch between your Devscope views.</SheetDescription>
          </SheetHeader>
          <SidebarContent
            view={view}
            setView={setView}
            topics={topics}
            setTopic={setTopic}
            savedStoriesCount={savedStories.length}
            user={user}
            onNavigate={() => setMobileNav(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#dfe2dc] bg-[#f5f6f3]/95 px-4 backdrop-blur dark:border-[#2b3530] dark:bg-[#101513]/95 md:px-8">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-3 lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a938e]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stories, sources, topics..."
              className="pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="ml-auto"
            aria-label={darkMode ? "Use light mode" : "Use dark mode"}
            title={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" className="mr-2" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button
            onClick={() => setShowAdd(true)}
            size="sm"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add resource</span>
          </Button>
        </header>

        {notice ? (
          <Button
            onClick={() => setNotice(null)}
            className="fixed bottom-5 right-5 z-30 shadow-xl"
          >
            {notice}
            <X className="size-3.5" />
          </Button>
        ) : null}

        {view === "today" ? (
          <TodayView
            topic={topic}
            topics={topics}
            setTopic={setTopic}
            stories={filteredStories}
            totalStories={stories.length}
            toggleSaved={toggleSaved}
            renderedAt={renderedAt}
          />
        ) : view === "library" ? (
          <LibraryView resources={resources} />
        ) : view === "plugins" ? (
          <PluginsView
            sources={feedSources}
            onAdd={() => setShowAddSource(true)}
            onToggle={toggleFeedSource}
            onSync={syncFeedSource}
            syncingSourceId={syncingSourceId}
          />
        ) : (
          <QueueView stories={savedStories} toggleSaved={toggleSaved} />
        )}
      </main>

      <AddResourceDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addResource} />
      <AddFeedSourceDialog
        open={showAddSource}
        onOpenChange={setShowAddSource}
        onAdd={addFeedSource}
      />
    </div>
  );
}

function SidebarContent({
  view,
  setView,
  topics,
  setTopic,
  savedStoriesCount,
  user,
  onNavigate,
}: {
  view: string;
  setView: (view: string) => void;
  topics: string[];
  setTopic: (topic: string) => void;
  savedStoriesCount: number;
  user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  onNavigate?: () => void;
}) {
  function navigate(nextView: string) {
    setView(nextView);
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="flex h-10 items-center px-2">
        <Button variant="ghost" className="h-auto justify-start gap-2.5 px-0" onClick={() => navigate("today")}>
          <span className="grid size-7 place-items-center bg-[#1e5f4d] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[17px] font-bold">devscope</span>
        </Button>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={view === item.id ? "secondary" : "ghost"}
              onClick={() => navigate(item.id)}
              className="h-10 w-full justify-start gap-3 px-3"
            >
              <Icon className="size-4" />
              {item.label}
              {item.id === "inbox" ? (
                <Badge variant="secondary" className="ml-auto">
                  {savedStoriesCount}
                </Badge>
              ) : null}
            </Button>
          );
        })}
      </nav>

      {topics.length > 1 ? (
        <div className="mt-8 px-3">
          <p className="text-[11px] font-semibold uppercase text-[#969e99]">
            Topics
          </p>
          <div className="mt-3 space-y-2.5">
            {topics.slice(1, 7).map((item) => (
              <Button
                key={item}
                variant="ghost"
                className="h-auto w-full justify-start gap-2.5 px-0 py-0"
                onClick={() => {
                  setTopic(item);
                  navigate("today");
                }}
              >
                <span className="size-1.5 rounded-full bg-[#1e5f4d]" />
                <span className="truncate">{item}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 px-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dce8e2] text-xs font-bold text-[#1e5f4d]">
            {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.name ?? "Signed in"}</p>
            <p className="truncate text-[11px] text-[#77807b]">{user.email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-3">
          <Button type="submit" variant="ghost" className="h-9 w-full justify-start gap-3 px-3">
            <Settings className="size-4" />
            Sign out
          </Button>
        </form>
        <p className="mt-2 flex items-center gap-2 px-3 text-[11px] text-[#77807b]">
          <Database className="size-3.5 text-[#1e5f4d]" />
          Private Supabase workspace
        </p>
      </div>
    </div>
  );
}

function TodayView({
  topic,
  topics,
  setTopic,
  stories,
  totalStories,
  toggleSaved,
  renderedAt,
}: {
  topic: string;
  topics: string[];
  setTopic: (topic: string) => void;
  stories: Story[];
  totalStories: number;
  toggleSaved: (story: Story) => void;
  renderedAt: string;
}) {
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
  const greeting =
    hour < 12
      ? "Good morning."
      : hour < 18
        ? "Good afternoon."
        : "Good evening.";
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    stories.flatMap((story) => story.topics).forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stories]);

  return (
    <div className="mx-auto max-w-295 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dcd6] pb-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[#1e6b55]">{dateLabel}</p>
          <h1 className="font-heading text-3xl font-semibold md:text-4xl">{greeting}</h1>
          <p className="mt-2 text-sm text-[#69716d]">
            {totalStories === 0
              ? "No stories have been ingested yet."
              : `${totalStories} development${totalStories === 1 ? "" : "s"} in your feed.`}
          </p>
        </div>
      </div>

      <section className="py-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {topics.map((option) => (
            <Button
              key={option}
              onClick={() => setTopic(option)}
              variant={topic === option ? "default" : "outline"}
              size="xs"
              className="shrink-0"
            >
              {option}
            </Button>
          ))}
          <Button variant="ghost" size="xs" className="ml-auto shrink-0">
            Sort <ChevronDown className="size-3" />
          </Button>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Latest stories</h2>
            <span className="text-xs text-[#8a928e]">{stories.length} shown</span>
          </div>
          <div className="border-t border-[#ccd2cb]">
            {stories.length ? (
              stories.map((story, index) => (
                <StoryRow
                  key={story.id}
                  story={story}
                  index={index}
                  onSave={() => toggleSaved(story)}
                />
              ))
            ) : (
              <EmptyState
                title="Your feed is empty"
                text="Connect an ingestion source or add rows to the stories table."
              />
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
                  onClick={() => setTopic(label)}
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
    </div>
  );
}

function StoryRow({ story, index, onSave }: { story: Story; index: number; onSave: () => void }) {
  const KindIcon = story.kind === "Paper" ? FileText : story.kind === "Repository" ? GitFork : story.kind === "Release" ? Sparkles : Newspaper;
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
          <span className="flex items-center gap-1.5 font-bold" style={{ color: story.accent ?? "#1e5f4d" }}>
            <KindIcon className="size-3.5" /> {story.source}
          </span>
          <span className="text-[#a0a6a2]">/</span>
          <span className="font-semibold uppercase text-[#7d8581]">{story.kind}</span>
        </div>
        <h3 className="text-[17px] font-bold leading-6 group-hover:text-[#1e5f4d]">{story.title}</h3>
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
        <a href={story.source_url} target="_blank" rel="noreferrer" className="hidden size-8 place-items-center text-[#747d78] md:grid" aria-label="Open story">
          <ExternalLink className="size-4" />
        </a>
      </div>
    </article>
  );
}

function LibraryView({ resources }: { resources: Resource[] }) {
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
    </div>
  );
}

function PluginsView({
  sources,
  onAdd,
  onToggle,
  onSync,
  syncingSourceId,
}: {
  sources: FeedSource[];
  onAdd: () => void;
  onToggle: (source: FeedSource) => void;
  onSync: (source: FeedSource) => void;
  syncingSourceId: string | null;
}) {
  const enabledCount = sources.filter((source) => source.is_enabled).length;

  return (
    <div className="mx-auto max-w-262.5 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dcd6] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase text-[#1e6b55]">Source plugins</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Feed sources</h1>
          <p className="mt-2 text-sm text-[#69716d]">
            {enabledCount} of {sources.length} source{sources.length === 1 ? "" : "s"} enabled.
          </p>
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus className="size-4" />
          Add source
        </Button>
      </div>

      {sources.length ? (
        <div className="mt-6 divide-y divide-[#d8dcd6] border-t border-[#cbd1ca]">
          {sources.map((source) => {
            const href = getExternalHref(source.url);
            const lastSynced = source.last_synced_at
              ? new Intl.DateTimeFormat(DISPLAY_LOCALE, {
                  month: "short",
                  day: "numeric",
                  timeZone: DISPLAY_TIME_ZONE,
                }).format(new Date(source.last_synced_at))
              : "Not synced yet";

            return (
              <div key={source.id} className="flex items-center gap-3 py-5">
                <span className="grid size-9 shrink-0 place-items-center bg-white text-[#1e5f4d] dark:bg-[#1c2521] dark:text-[#8bc5af]">
                  {source.provider === "GitHub"
                    ? <GitFork className="size-4" />
                    : source.provider === "YouTube"
                      ? <Video className="size-4" />
                      : <Rss className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{source.name}</p>
                    <Badge variant="secondary">{source.provider}</Badge>
                    {!source.is_enabled ? <Badge variant="outline">Paused</Badge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8a928e]">
                    <span className="truncate">{source.url}</span>
                    <span>Last sync: {lastSynced}</span>
                    {source.sync_status === "success" ? (
                      <span>{source.last_item_count} new last run</span>
                    ) : null}
                  </div>
                  {source.last_error ? (
                    <p className="mt-2 text-xs text-red-700 dark:text-red-400">{source.last_error}</p>
                  ) : null}
                  {source.topics.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {source.topics.map((topic) => (
                        <Badge key={topic} variant="outline">{topic}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 place-items-center text-[#747d78] hover:bg-[#e9ece7] hover:text-[#1e5f4d] dark:hover:bg-[#202a25] dark:hover:text-[#8bc5af]"
                    aria-label={`Open ${source.name}`}
                    title="Open source"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
                {source.provider === "GitHub" || source.provider === "YouTube" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!source.is_enabled || syncingSourceId === source.id}
                    onClick={() => onSync(source)}
                  >
                    <RefreshCw className={syncingSourceId === source.id ? "size-3.5 animate-spin" : "size-3.5"} />
                    <span className="hidden sm:inline">
                      {syncingSourceId === source.id ? "Running" : "Run now"}
                    </span>
                  </Button>
                ) : null}
                <Switch
                  checked={source.is_enabled}
                  onCheckedChange={() => onToggle(source)}
                  aria-label={source.is_enabled ? `Disable ${source.name}` : `Enable ${source.name}`}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No feed sources yet"
          text="Add an RSS, GitHub, YouTube, arXiv, npm, or custom source to configure your feed."
        />
      )}
    </div>
  );
}

function QueueView({ stories, toggleSaved }: { stories: Story[]; toggleSaved: (story: Story) => void }) {
  return (
    <div className="mx-auto max-w-225 px-4 py-8 md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase text-[#1e6b55]">Reading queue</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Saved for later</h1>
      <div className="mt-8 border-t border-[#ccd2cb]">
        {stories.length ? stories.map((story, index) => <StoryRow key={story.id} story={story} index={index} onSave={() => toggleSaved(story)} />) : <EmptyState title="Nothing saved yet" text="Bookmark a story to add it to your reading queue." />}
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-20 text-center">
      <Database className="mx-auto size-6 text-[#98a09c]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[#7b847f]">{text}</p>
    </div>
  );
}

function AddResourceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (resource: NewResource) => Promise<void>;
}) {
  const [type, setType] = useState<Resource["type"]>("Link");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await onAdd({ title: String(data.get("title")), url: String(data.get("url")) || null, type });
      setSaving(false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Could not save resource.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="text-xs font-semibold uppercase text-[#1e6b55]">Personal collection</p>
          <DialogTitle>Add a resource</DialogTitle>
          <DialogDescription>
            Save a link, PDF, or note to your personal library.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-6">
          <ToggleGroup
            value={[type]}
            onValueChange={(value) => {
              const nextType = value.at(-1) as Resource["type"] | undefined;
              if (nextType) setType(nextType);
            }}
            spacing={0}
            variant="outline"
            size="sm"
            className="grid w-full grid-cols-3"
          >
            {(["Link", "PDF", "Note"] as const).map((option) => (
              <ToggleGroupItem
                type="button"
                key={option}
                value={option}
                className="w-full"
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="mt-5 block text-xs font-semibold" htmlFor="title">Title</label>
          <Input id="title" name="title" required autoFocus className="mt-2" />
          <label className="mt-4 block text-xs font-semibold" htmlFor="url">{type === "Note" ? "Reference URL (optional)" : "URL"}</label>
          <Input id="url" name="url" type={type === "Note" ? "text" : "url"} required={type !== "Note"} className="mt-2" />
          {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add to library"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFeedSourceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (source: NewFeedSource) => Promise<void>;
}) {
  const [provider, setProvider] = useState<FeedSource["provider"]>("RSS");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const topics = String(data.get("topics"))
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);
    const languages = String(data.get("languages"))
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean);
    const channels = String(data.get("channels"))
      .split(",")
      .map((channel) => channel.trim())
      .filter(Boolean);

    try {
      await onAdd({
        name: String(data.get("name")).trim(),
        provider,
        url: provider === "GitHub"
          ? `https://github.com/search?q=${encodeURIComponent([...topics, ...languages].join(" "))}&type=repositories`
          : provider === "YouTube"
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent([...topics, ...channels].join(" "))}`
            : String(data.get("url")).trim(),
        topics,
        config: provider === "GitHub"
          ? {
              mode: "discover",
              languages,
              days: Number(data.get("days")) || 30,
              minStars: Number(data.get("minStars")) || 25,
              limit: Number(data.get("limit")) || 12,
            }
          : provider === "YouTube"
            ? {
                mode: "discover",
                channels,
                days: Number(data.get("days")) || 14,
                limit: Number(data.get("limit")) || 12,
              }
          : {},
      });
      setSaving(false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Could not save source.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add feed source</DialogTitle>
          <DialogDescription>
            Configure a source for your next feed ingestion run.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-6">
          <ToggleGroup
            value={[provider]}
            onValueChange={(value) => {
              const nextProvider = value.at(-1) as FeedSource["provider"] | undefined;
              if (nextProvider) setProvider(nextProvider);
            }}
            spacing={0}
            variant="outline"
            size="sm"
            className="grid w-full grid-cols-3"
          >
            {(["RSS", "GitHub", "YouTube", "arXiv", "npm", "Custom"] as const).map((option) => (
              <ToggleGroupItem type="button" key={option} value={option} className="w-full text-xs">
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="mt-5 block text-xs font-semibold" htmlFor="source-name">Name</label>
          <Input id="source-name" name="name" required autoFocus className="mt-2" placeholder="e.g. OpenAI research" />
          <label className="mt-4 block text-xs font-semibold" htmlFor="source-url">Source URL</label>
          {provider === "GitHub" ? (
            <p className="mt-2 text-xs leading-5 text-[#737c77]">
              GitHub Radar searches public repositories using your topics and languages.
            </p>
          ) : provider === "YouTube" ? (
            <p className="mt-2 text-xs leading-5 text-[#737c77]">
              YouTube Scout finds recent videos by topic, selected channels, or both.
            </p>
          ) : (
            <Input id="source-url" name="url" type="url" required className="mt-2" placeholder="https://example.com/feed.xml" />
          )}
          <label className="mt-4 block text-xs font-semibold" htmlFor="source-topics">Topics</label>
          <Input id="source-topics" name="topics" className="mt-2" placeholder="AI, TypeScript, Security" />
          {provider === "GitHub" ? (
            <>
              <label className="mt-4 block text-xs font-semibold" htmlFor="source-languages">Languages (optional)</label>
              <Input id="source-languages" name="languages" className="mt-2" placeholder="TypeScript, Rust, Python" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold" htmlFor="source-days">Created within</label>
                  <Input id="source-days" name="days" type="number" min="1" max="365" defaultValue="30" className="mt-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold" htmlFor="source-stars">Minimum stars</label>
                  <Input id="source-stars" name="minStars" type="number" min="0" defaultValue="25" className="mt-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold" htmlFor="source-limit">Results</label>
                  <Input id="source-limit" name="limit" type="number" min="1" max="30" defaultValue="12" className="mt-2" />
                </div>
              </div>
            </>
          ) : provider === "YouTube" ? (
            <>
              <label className="mt-4 block text-xs font-semibold" htmlFor="source-channels">Channels (optional)</label>
              <Input
                id="source-channels"
                name="channels"
                className="mt-2"
                placeholder="@Fireship, @Computerphile, UC channel ID"
              />
              <p className="mt-1.5 text-[11px] leading-4 text-[#858d89]">
                Separate channels with commas. You can use @handles, channel URLs, or UC channel IDs.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold" htmlFor="youtube-days">Published within</label>
                  <Input id="youtube-days" name="days" type="number" min="1" max="90" defaultValue="14" className="mt-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold" htmlFor="youtube-limit">Results</label>
                  <Input id="youtube-limit" name="limit" type="number" min="1" max="30" defaultValue="12" className="mt-2" />
                </div>
              </div>
            </>
          ) : null}
          {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add source"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
