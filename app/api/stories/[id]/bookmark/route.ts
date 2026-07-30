import { setStorySaved } from "@/lib/data";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as { isSaved?: unknown };

    if (typeof body.isSaved !== "boolean") {
      return NextResponse.json(
        { error: "isSaved must be a boolean." },
        { status: 400 },
      );
    }

    const story = await setStorySaved(user.id, id, body.isSaved);
    return NextResponse.json(story);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update bookmark.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
