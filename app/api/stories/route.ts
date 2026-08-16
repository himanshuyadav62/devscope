import { DEFAULT_PAGE_SIZE, getStoriesPage } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { NextResponse } from "next/server";

function intParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const limit = intParam(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE);
    const offset = intParam(url.searchParams.get("offset"), 0);
    const topic = url.searchParams.get("topic");
    const source = url.searchParams.get("source");
    const savedOnly = url.searchParams.get("savedOnly") === "true";
    const page = await getStoriesPage(user.id, { limit, offset, topic, source, savedOnly });
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load stories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
