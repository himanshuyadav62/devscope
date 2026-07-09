"use client";

import type { NewResource, Resource, Story } from "@/lib/database.types";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  GitFork,
  Inbox,
  Library,
  Link2,
  Menu,
  Newspaper,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const navItems = [
  { id: "today", label: "Today", icon: Newspaper },
  { id: "library", label: "Library", icon: Library },
  { id: "inbox", label: "Reading queue", icon: Inbox },
];

const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "Asia/Kolkata";

export function DevscopeApp({
  initialStories,
  initialResources,
  renderedAt,
}: {
  initialStories: Story[];
  initialResources: Resource[];
  renderedAt: string;
}) {
  const [view, setView] = useState("today");
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState(initialStories);
  const [resources, setResources] = useState(initialResources);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const topics = useMemo(
    () => [
      "All",
      ...Array.from(new Set(stories.flatMap((story) => story.topics))).sort(),
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
    <div className="min-h-screen bg-[#f5f6f3] text-[#1c211f]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#dfe2dc] bg-[#fafbf8] px-4 py-5 transition-transform lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-10 items-center justify-between px-2">
          <button className="flex items-center gap-2.5" onClick={() => setView("today")}>
            <span className="grid size-7 place-items-center bg-[#1e5f4d] text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[17px] font-bold">devscope</span>
          </button>
          <button
            className="grid size-8 place-items-center text-[#66706b] lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setMobileNav(false);
                }}
                className={`flex h-10 w-full items-center gap-3 px-3 text-sm font-medium transition-colors ${
                  view === item.id
                    ? "bg-[#e5eee9] text-[#174d3f]"
                    : "text-[#5d6661] hover:bg-[#eef0ec]"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
                {item.id === "inbox" ? (
                  <span className="ml-auto text-xs text-[#8b938f]">
                    {savedStories.length}
                  </span>
                ) : null}
              </button>
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
                <button
                  key={item}
                  className="flex w-full items-center gap-2.5 text-sm text-[#69716d] hover:text-[#1e5f4d]"
                  onClick={() => {
                    setTopic(item);
                    setView("today");
                  }}
                >
                  <span className="size-1.5 rounded-full bg-[#1e5f4d]" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto border-t border-[#e3e5e0] pt-4">
          <button className="flex h-9 w-full items-center gap-3 px-3 text-sm text-[#66706b] hover:text-[#1c211f]">
            <Settings className="size-4" />
            Settings
          </button>
          <div className="mt-3 flex items-center gap-3 px-3 text-xs text-[#77807b]">
            <Database className="size-4 text-[#1e5f4d]" />
            Supabase connected
          </div>
        </div>
      </aside>

      {mobileNav ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#dfe2dc] bg-[#f5f6f3]/95 px-4 backdrop-blur md:px-8">
          <button
            className="mr-3 grid size-9 place-items-center lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a938e]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stories, sources, topics..."
              className="h-9 w-full border border-[#d8dcd6] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#6a8f82]"
            />
          </div>
          <button className="ml-auto mr-2 grid size-9 place-items-center text-[#5f6964]" aria-label="Notifications">
            <Bell className="size-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex h-9 items-center gap-2 bg-[#1e5f4d] px-3.5 text-sm font-semibold text-white hover:bg-[#164c3d]"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add resource</span>
          </button>
        </header>

        {notice ? (
          <button
            onClick={() => setNotice(null)}
            className="fixed bottom-5 right-5 z-30 flex items-center gap-3 bg-[#1d2925] px-4 py-3 text-sm text-white shadow-xl"
          >
            {notice}
            <X className="size-3.5" />
          </button>
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

      {showAdd ? (
        <AddResourceModal onClose={() => setShowAdd(false)} onAdd={addResource} />
      ) : null}
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
    <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-8 md:py-10">
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
        <div className="flex items-center gap-2 text-xs text-[#737c77]">
          <Clock3 className="size-3.5" />
          Live database view
        </div>
      </div>

      <section className="py-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {topics.map((option) => (
            <button
              key={option}
              onClick={() => setTopic(option)}
              className={`h-8 shrink-0 border px-3 text-xs font-semibold ${
                topic === option
                  ? "border-[#1e5f4d] bg-[#1e5f4d] text-white"
                  : "border-[#d4d9d2] bg-white text-[#626b66]"
              }`}
            >
              {option}
            </button>
          ))}
          <button className="ml-auto flex h-8 shrink-0 items-center gap-1.5 px-2 text-xs font-semibold text-[#59635e]">
            Sort <ChevronDown className="size-3" />
          </button>
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
                <button key={label} onClick={() => setTopic(label)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="font-mono text-xs text-[#9aa19d]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-xs font-semibold">{label}</span>
                    <span className="text-[11px] text-[#949b97]">{count} {count === 1 ? "story" : "stories"}</span>
                  </span>
                </button>
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
    <article className="group grid grid-cols-[34px_minmax(0,1fr)_36px] gap-3 border-b border-[#d8dcd6] py-5 md:grid-cols-[42px_minmax(0,1fr)_80px] md:gap-4">
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
          {story.topics.map((item) => <span key={item} className="bg-[#e9ece7] px-2 py-1 text-[10px] font-semibold text-[#66706b]">{item}</span>)}
          <span className="text-[11px] text-[#949b97]">
            {published}
            {story.read_minutes ? ` · ${story.read_minutes} min read` : ""}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-end gap-1">
        <button onClick={onSave} className="grid size-8 place-items-center text-[#747d78]" aria-label={story.is_saved ? "Remove bookmark" : "Bookmark story"}>
          {story.is_saved ? <BookmarkCheck className="size-4 text-[#1e5f4d]" /> : <Bookmark className="size-4" />}
        </button>
        <a href={story.source_url} target="_blank" rel="noreferrer" className="hidden size-8 place-items-center text-[#747d78] md:grid" aria-label="Open story">
          <ExternalLink className="size-4" />
        </a>
      </div>
    </article>
  );
}

function LibraryView({ resources }: { resources: Resource[] }) {
  return (
    <div className="mx-auto max-w-[1050px] px-4 py-8 md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase text-[#1e6b55]">Personal knowledge</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Your library</h1>
      <p className="mt-2 text-sm text-[#69716d]">{resources.length} saved {resources.length === 1 ? "resource" : "resources"}.</p>
      {resources.length ? (
        <div className="mt-8 divide-y divide-[#d8dcd6] border-t border-[#cbd1ca]">
          {resources.map((resource) => (
            <div key={resource.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center bg-white text-[#1e5f4d]">
                  {resource.type === "PDF" ? <FileText className="size-4" /> : resource.type === "Note" ? <Newspaper className="size-4" /> : <Link2 className="size-4" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{resource.title}</p>
                  <p className="mt-1 truncate text-xs text-[#939a96]">{resource.url ?? "Personal note"}</p>
                </div>
              </div>
              <span className="text-xs text-[#626b66]">{resource.type}</span>
              <span className="text-xs text-[#8a928e]">
                {new Intl.DateTimeFormat(DISPLAY_LOCALE, {
                  month: "short",
                  day: "numeric",
                  timeZone: DISPLAY_TIME_ZONE,
                }).format(new Date(resource.created_at))}
              </span>
            </div>
          ))}
        </div>
      ) : <EmptyState title="Your library is empty" text="Add a link, PDF, or note to create your first database record." />}
    </div>
  );
}

function QueueView({ stories, toggleSaved }: { stories: Story[]; toggleSaved: (story: Story) => void }) {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 md:px-8 md:py-10">
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

function AddResourceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (resource: NewResource) => Promise<void> }) {
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save resource.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201d]/40 p-4">
      <div className="w-full max-w-md border border-[#d9ddd7] bg-[#fafbf8] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-semibold uppercase text-[#1e6b55]">Personal collection</p><h2 className="mt-1 font-heading text-2xl font-semibold">Add a resource</h2></div>
          <button onClick={onClose} className="grid size-8 place-items-center" aria-label="Close"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-6">
          <div className="grid grid-cols-3 border border-[#d5d9d3] bg-white p-1">
            {(["Link", "PDF", "Note"] as const).map((option) => <button type="button" key={option} onClick={() => setType(option)} className={`h-8 text-xs font-semibold ${type === option ? "bg-[#e2ece7] text-[#174d3f]" : "text-[#7b837f]"}`}>{option}</button>)}
          </div>
          <label className="mt-5 block text-xs font-semibold" htmlFor="title">Title</label>
          <input id="title" name="title" required autoFocus className="mt-2 h-10 w-full border border-[#d5d9d3] bg-white px-3 text-sm outline-none focus:border-[#5d8476]" />
          <label className="mt-4 block text-xs font-semibold" htmlFor="url">{type === "Note" ? "Reference URL (optional)" : "URL"}</label>
          <input id="url" name="url" type={type === "Note" ? "text" : "url"} required={type !== "Note"} className="mt-2 h-10 w-full border border-[#d5d9d3] bg-white px-3 text-sm outline-none focus:border-[#5d8476]" />
          {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 border border-[#d5d9d3] px-4 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 bg-[#1e5f4d] px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Add to library"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
