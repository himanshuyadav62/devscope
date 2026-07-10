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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NewResource, Resource, Story } from "@/lib/database.types";
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
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "today", label: "Today", icon: Newspaper },
  { id: "library", label: "Library", icon: Library },
  { id: "inbox", label: "Reading queue", icon: Inbox },
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
  renderedAt,
}: Readonly<{
  initialStories: Story[];
  initialResources: Resource[];
  renderedAt: string;
}>) {
  const [view, setView] = useState("today");
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState(initialStories);
  const [resources, setResources] = useState(initialResources);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

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

  return (
    <div className="devscope-shell min-h-screen bg-[#f5f6f3] text-[#1c211f] transition-colors dark:bg-[#101513] dark:text-[#edf1ee]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#dfe2dc] bg-[#fafbf8] transition-colors dark:border-[#2b3530] dark:bg-[#151b18] lg:block">
        <SidebarContent
          view={view}
          setView={setView}
          topics={topics}
          setTopic={setTopic}
          savedStoriesCount={savedStories.length}
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
        ) : (
          <QueueView stories={savedStories} toggleSaved={toggleSaved} />
        )}
      </main>

      <AddResourceDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addResource} />
    </div>
  );
}

function SidebarContent({
  view,
  setView,
  topics,
  setTopic,
  savedStoriesCount,
  onNavigate,
}: {
  view: string;
  setView: (view: string) => void;
  topics: string[];
  setTopic: (topic: string) => void;
  savedStoriesCount: number;
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
        <Button variant="ghost" className="h-9 w-full justify-start gap-3 px-3">
          <Settings className="size-4" />
          Settings
        </Button>
        <div className="mt-3 flex items-center gap-3 px-3 text-xs text-[#77807b]">
          <Database className="size-4 text-[#1e5f4d]" />
          Supabase connected
        </div>
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {story.topics.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
          <span className="text-[11px] text-[#949b97]">
            {published}
            {story.read_minutes ? ` · ${story.read_minutes} min read` : ""}
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
