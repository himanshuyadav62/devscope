import {
  getFeedSource,
} from "@/lib/data";
import { syncFeedSourceForUser } from "@/lib/sync";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const user = await requireUser();
    const source = await getFeedSource(user.id, id);
    if (!source) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }
    if (!source.is_enabled) {
      return NextResponse.json({ error: "Enable this source before syncing it." }, { status: 409 });
    }
    if (source.sync_status === "running") {
      return NextResponse.json({ error: "This source is already syncing." }, { status: 409 });
    }

    const result = await syncFeedSourceForUser(user.id, source);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The source sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
