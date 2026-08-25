"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PluginRecommendation } from "@/lib/plugin-recommendations";
import { ArrowDown, GitFork, MessageSquare, Newspaper, Package, ShieldAlert, Sparkles, Video } from "lucide-react";

export function PluginRecommendations({
  recommendations,
  selectedProvider,
  onConfigure,
}: {
  recommendations: PluginRecommendation[];
  selectedProvider?: PluginRecommendation["provider"];
  onConfigure: (recommendation: PluginRecommendation) => void;
}) {
  return (
    <section className="mt-8 border-b border-[#d8dcd6] pb-8 dark:border-[#2b3530]" aria-labelledby="plugin-recommendations-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#1e6b55] dark:text-[#8bc5af]">Recommended for you</p>
          <h2 id="plugin-recommendations-heading" className="mt-1 text-xl font-bold">Choose an engineering signal</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[#737c77] dark:text-[#aab4af]">
          All recommendations are shown. Choose one to prefill its configuration below, then review it before saving.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((recommendation) => {
          const selected = selectedProvider === recommendation.provider;
          return (
            <article
              key={recommendation.provider}
              className={`flex min-h-64 flex-col border p-4 transition ${
                selected
                  ? "border-[#1e6b55] bg-[#edf5f0] ring-1 ring-[#1e6b55]/25 dark:border-[#73aa95] dark:bg-[#1d2923]"
                  : "border-[#d8dcd6] bg-white/55 dark:border-[#2b3530] dark:bg-[#151b18]/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-9 place-items-center bg-[#e7efe9] text-[#1e5f4d] dark:bg-[#25312b] dark:text-[#9acbb8]">
                  <RecommendationIcon provider={recommendation.provider} />
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {recommendation.isInstalled ? <Badge variant="outline">Already added</Badge> : null}
                  <Badge variant="secondary">{recommendation.provider}</Badge>
                </div>
              </div>
              <h3 className="mt-4 text-sm font-bold">{recommendation.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{recommendation.category}</Badge>
                <Badge variant="outline">{recommendation.access}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#69716d] dark:text-[#aab4af]">{recommendation.description}</p>
              <p className="mt-2 text-[11px] font-medium leading-4 text-[#1e6b55] dark:text-[#8bc5af]">{recommendation.reason}</p>
              <Button
                type="button"
                variant={selected ? "secondary" : "outline"}
                size="sm"
                className="mt-auto self-start"
                onClick={() => onConfigure(recommendation)}
              >
                {selected ? "Selected" : recommendation.isInstalled ? "Configure another" : "Configure"}
                <ArrowDown className="size-3.5" />
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationIcon({ provider }: { provider: PluginRecommendation["provider"] }) {
  if (provider === "GitHub" || provider === "GitHub Releases") return <GitFork className="size-4" />;
  if (provider === "GitHub Security") return <ShieldAlert className="size-4" />;
  if (provider === "npm") return <Package className="size-4" />;
  if (provider === "Stack Overflow") return <MessageSquare className="size-4" />;
  if (provider === "YouTube") return <Video className="size-4" />;
  if (provider === "Hugging Face") return <Sparkles className="size-4" />;
  return <Newspaper className="size-4" />;
}
