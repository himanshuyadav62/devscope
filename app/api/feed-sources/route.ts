import { createFeedSource } from "@/lib/data";
import { parseFeedSourceInput } from "@/lib/feed-source-input";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = parseFeedSourceInput(await request.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const source = await createFeedSource(user.id, parsed.data);
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
