import { setFeedSourceEnabled } from "@/lib/data";
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
