"use client";

import { AddFeedSourceForm } from "@/components/devscope/add-feed-source-dialog";
import { Button } from "@/components/ui/button";
import type { FeedSource, NewFeedSource } from "@/lib/database.types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddFeedSourcePage({
  initialProvider,
  initialName,
  initialTopics,
}: {
  initialProvider?: FeedSource["provider"];
  initialName?: string;
  initialTopics?: string[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  async function addFeedSource(input: NewFeedSource) {
    const response = await fetch("/api/feed-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as FeedSource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Save failed.");

    setNotice("Feed source saved. Taking you back to plugins…");
    router.push("/plugins");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <Button variant="ghost" size="sm" className="mb-6 px-0" onClick={() => router.push("/plugins")}>
        <ArrowLeft className="size-4" />
        Back to plugins
      </Button>

      <div className="border-b border-[#d8dcd6] pb-7 dark:border-[#2b3530]">
        <p className="text-xs font-semibold uppercase text-[#1e6b55] dark:text-[#8bc5af]">New source</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">Add feed source</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69716d] dark:text-[#aab4af]">
          Configure security advisories, package releases, Q&amp;A, GitHub, video, research, community, RSS, or custom sources.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-[#d8dcd6] bg-white/40 p-5 dark:border-[#2b3530] dark:bg-[#151b18]/60 md:p-7">
        <AddFeedSourceForm
          onAdd={addFeedSource}
          onCancel={() => router.push("/plugins")}
          initialProvider={initialProvider}
          initialName={initialName}
          initialTopics={initialTopics}
        />
      </section>

      {notice ? (
        <Button onClick={() => setNotice(null)} className="fixed bottom-5 right-5 z-30 shadow-xl">
          {notice}
        </Button>
      ) : null}
    </div>
  );
}
