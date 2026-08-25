"use client";

import { AddFeedSourceForm } from "@/components/devscope/add-feed-source-dialog";
import { Button } from "@/components/ui/button";
import type { FeedSource, NewFeedSource } from "@/lib/database.types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function EditFeedSourcePage({ source }: { source: FeedSource }) {
  const router = useRouter();

  async function updateSource(input: NewFeedSource) {
    const response = await fetch(`/api/feed-sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as FeedSource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Update failed.");
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
        <p className="text-xs font-semibold uppercase text-[#1e6b55] dark:text-[#8bc5af]">Edit source</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">{source.name}</h1>
        <p className="mt-2 text-sm leading-6 text-[#69716d] dark:text-[#aab4af]">
          Update this plugin&apos;s source, discovery filters, and result limits.
        </p>
      </div>
      <section className="mt-8 rounded-2xl border border-[#d8dcd6] bg-white/40 p-5 dark:border-[#2b3530] dark:bg-[#151b18]/60 md:p-7">
        <AddFeedSourceForm initialSource={source} onAdd={updateSource} onCancel={() => router.push("/plugins")} submitLabel="Save changes" />
      </section>
    </div>
  );
}
