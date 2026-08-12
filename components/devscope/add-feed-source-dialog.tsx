"use client";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FeedSource, NewFeedSource } from "@/lib/database.types";
import { FormEvent, useState } from "react";

const providerOptions = ["RSS", "GitHub", "YouTube", "Hugging Face", "Hacker News", "arXiv", "npm", "Custom"] as const;

export function AddFeedSourceDialog({
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
    const csv = (name: string) => String(data.get(name) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const topics = csv("topics");
    const languages = csv("languages");
    const channels = csv("channels");
    const tags = csv("tags");
    const author = String(data.get("author") ?? "").trim();
    const hubType = String(data.get("hubType") ?? "all") as NonNullable<FeedSource["config"]>["hubType"];
    const sort = String(data.get("sort") ?? "trendingScore") as NonNullable<FeedSource["config"]>["sort"];
    const hnFeed = String(data.get("hnFeed") ?? "top") as NonNullable<FeedSource["config"]>["hnFeed"];
    const includeDiscussions = data.get("includeDiscussions") === "on";
    const huggingFaceQuery = encodeURIComponent([...topics, ...tags, author].filter(Boolean).join(" "));
    const huggingFaceUrl = hubType === "all"
      ? `https://huggingface.co/search/full-text?q=${huggingFaceQuery}`
      : `https://huggingface.co/${hubType}?search=${huggingFaceQuery}`;
    const hackerNewsUrl = `https://news.ycombinator.com/${hnFeed === "new" ? "newest" : hnFeed === "show" ? "show" : hnFeed === "ask" ? "ask" : hnFeed === "jobs" ? "jobs" : "news"}`;

    try {
      await onAdd({
        name: String(data.get("name")).trim(),
        provider,
        url: provider === "GitHub"
          ? `https://github.com/search?q=${encodeURIComponent([...topics, ...languages].join(" "))}&type=repositories`
          : provider === "YouTube"
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent([...topics, ...channels].join(" "))}`
            : provider === "Hugging Face"
              ? huggingFaceUrl
              : provider === "Hacker News"
                ? hackerNewsUrl
                : String(data.get("url")).trim(),
        topics,
        config: provider === "GitHub"
          ? { mode: "discover", languages, days: Number(data.get("days")) || 30, minStars: Number(data.get("minStars")) || 25, limit: Number(data.get("limit")) || 12 }
          : provider === "YouTube"
            ? { mode: "discover", channels, days: Number(data.get("days")) || 14, limit: Number(data.get("limit")) || 12 }
            : provider === "Hugging Face"
              ? { mode: "discover", hubType, sort, author, tags, limit: Number(data.get("limit")) || 12 }
              : provider === "Hacker News"
                ? { mode: "discover", hnFeed, minScore: Number(data.get("minScore")) || 0, includeDiscussions, limit: Number(data.get("limit")) || 15 }
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add feed source</DialogTitle>
          <DialogDescription>Configure a source for your next feed ingestion run.</DialogDescription>
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
            {providerOptions.map((option) => (
              <ToggleGroupItem type="button" key={option} value={option} className="w-full text-xs">
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="mt-5 block text-xs font-semibold" htmlFor="source-name">Name</label>
          <Input id="source-name" name="name" required autoFocus className="mt-2" placeholder="e.g. OpenAI research" />
          <label className="mt-4 block text-xs font-semibold" htmlFor="source-url">Source URL</label>
          {provider === "GitHub" ? <p className="mt-2 text-xs leading-5 text-[#737c77]">GitHub Radar searches public repositories using your topics and languages.</p>
            : provider === "YouTube" ? <p className="mt-2 text-xs leading-5 text-[#737c77]">YouTube Scout finds recent videos by topic, selected channels, or both.</p>
              : provider === "Hugging Face" ? <p className="mt-2 text-xs leading-5 text-[#737c77]">Hugging Face Scout tracks public models, datasets, and Spaces from Hub search.</p>
                : provider === "Hacker News" ? <p className="mt-2 text-xs leading-5 text-[#737c77]">Hacker News Scout pulls public HN stories, Show HN, Ask HN, and jobs without an API key.</p>
                  : <Input id="source-url" name="url" type="url" required className="mt-2" placeholder="https://example.com/feed.xml" />}
          <label className="mt-4 block text-xs font-semibold" htmlFor="source-topics">Topics</label>
          <Input id="source-topics" name="topics" className="mt-2" placeholder="AI, TypeScript, Security" />
          {provider === "GitHub" ? <GitHubFields />
            : provider === "YouTube" ? <YouTubeFields />
              : provider === "Hugging Face" ? <HuggingFaceFields />
                : provider === "Hacker News" ? <HackerNewsFields />
                  : null}
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

function GitHubFields() {
  return (
    <>
      <label className="mt-4 block text-xs font-semibold" htmlFor="source-languages">Languages (optional)</label>
      <Input id="source-languages" name="languages" className="mt-2" placeholder="TypeScript, Rust, Python" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <NumberField id="source-days" name="days" label="Created within" min={1} max={365} defaultValue={30} />
        <NumberField id="source-stars" name="minStars" label="Minimum stars" min={0} defaultValue={25} />
        <NumberField id="source-limit" name="limit" label="Results" min={1} max={30} defaultValue={12} />
      </div>
    </>
  );
}

function YouTubeFields() {
  return (
    <>
      <label className="mt-4 block text-xs font-semibold" htmlFor="source-channels">Channels (optional)</label>
      <Input id="source-channels" name="channels" className="mt-2" placeholder="@Fireship, @Computerphile, UC channel ID" />
      <p className="mt-1.5 text-[11px] leading-4 text-[#858d89]">Separate channels with commas. You can use @handles, channel URLs, or UC channel IDs.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField id="youtube-days" name="days" label="Published within" min={1} max={90} defaultValue={14} />
        <NumberField id="youtube-limit" name="limit" label="Results" min={1} max={30} defaultValue={12} />
      </div>
    </>
  );
}

function HuggingFaceFields() {
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SelectField id="hf-type" name="hubType" label="Hub type" options={[["all", "All"], ["models", "Models"], ["datasets", "Datasets"], ["spaces", "Spaces"]]} />
        <SelectField id="hf-sort" name="sort" label="Sort" options={[["trendingScore", "Trending"], ["downloads", "Downloads"], ["likes", "Likes"], ["lastModified", "Recently updated"]]} />
      </div>
      <label className="mt-4 block text-xs font-semibold" htmlFor="hf-tags">Tags (optional)</label>
      <Input id="hf-tags" name="tags" className="mt-2" placeholder="text-generation, gradio, pytorch" />
      <label className="mt-4 block text-xs font-semibold" htmlFor="hf-author">Author or org (optional)</label>
      <Input id="hf-author" name="author" className="mt-2" placeholder="openai, google, Qwen" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField id="hf-limit" name="limit" label="Results" min={1} max={30} defaultValue={12} />
      </div>
    </>
  );
}

function HackerNewsFields() {
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SelectField id="hn-feed" name="hnFeed" label="Feed" options={[["top", "Top"], ["best", "Best"], ["new", "New"], ["show", "Show HN"], ["ask", "Ask HN"], ["jobs", "Jobs"]]} />
        <NumberField id="hn-score" name="minScore" label="Minimum score" min={0} defaultValue={10} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField id="hn-limit" name="limit" label="Results" min={1} max={30} defaultValue={15} />
        <label className="flex items-end gap-2 pb-2 text-xs font-semibold" htmlFor="hn-discussions">
          <input id="hn-discussions" name="includeDiscussions" type="checkbox" defaultChecked className="size-4 accent-[#1e5f4d]" />
          Include discussion posts
        </label>
      </div>
    </>
  );
}

function NumberField({ id, name, label, min, max, defaultValue }: { id: string; name: string; label: string; min: number; max?: number; defaultValue: number }) {
  return (
    <div>
      <label className="block text-xs font-semibold" htmlFor={id}>{label}</label>
      <Input id={id} name={name} type="number" min={min} max={max} defaultValue={defaultValue} className="mt-2" />
    </div>
  );
}

function SelectField({ id, name, label, options }: { id: string; name: string; label: string; options: Array<[string, string]> }) {
  return (
    <div>
      <label className="block text-xs font-semibold" htmlFor={id}>{label}</label>
      <select id={id} name={name} className="mt-2 h-10 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );
}
