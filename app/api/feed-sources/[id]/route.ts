import { deleteFeedSource, setFeedSourceEnabled, updateFeedSource } from "@/lib/data";
import { parseFeedSourceInput } from "@/lib/feed-source-input";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as { isEnabled?: unknown };

    if (typeof body.isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "isEnabled must be a boolean." },
        { status: 400 },
      );
    }

    const source = await setFeedSourceEnabled(user.id, id, body.isEnabled);
    return NextResponse.json(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const source = await deleteFeedSource(user.id, id);

    if (!source) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = parseFeedSourceInput(await request.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const source = await updateFeedSource(user.id, id, parsed.data);
    if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });
    return NextResponse.json(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
