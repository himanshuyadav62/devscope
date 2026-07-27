import {
  completeFeedSourceSync,
  failFeedSourceSync,
  getFeedSource,
  insertDiscoveredStories,
  setFeedSourceSyncRunning,
} from "@/lib/data";
import { getFeedProvider } from "@/lib/providers";
import type { SyncFeedSourceResult } from "@/lib/database.types";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const source = await getFeedSource(id);
    if (!source) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }
    if (!source.is_enabled) {
      return NextResponse.json({ error: "Enable this source before syncing it." }, { status: 409 });
    }
    if (source.sync_status === "running") {
      return NextResponse.json({ error: "This source is already syncing." }, { status: 409 });
    }

    await setFeedSourceSyncRunning(id);
    const discoveredStories = await getFeedProvider(source).discover(source);
    const insertedStories = await insertDiscoveredStories(discoveredStories);
    const updatedSource = await completeFeedSourceSync(id, insertedStories.length);
    const result: SyncFeedSourceResult = {
      source: updatedSource,
      stories: insertedStories,
      discovered: discoveredStories.length,
      inserted: insertedStories.length,
    };
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The source sync failed.";
    await failFeedSourceSync(id, message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
