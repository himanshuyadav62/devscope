import { createResource } from "@/lib/data";
import type { NewResource } from "@/lib/database.types";
import { NextResponse } from "next/server";

const resourceTypes = new Set(["Link", "PDF", "Note"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<NewResource>;
    const title = body.title?.trim();
    const type = body.type;
    const url = body.url?.trim() || null;

    if (!title || !type || !resourceTypes.has(type)) {
      return NextResponse.json(
        { error: "A title and valid resource type are required." },
        { status: 400 },
      );
    }

    if (type !== "Note" && !url) {
      return NextResponse.json(
        { error: "A URL is required for links and PDFs." },
        { status: 400 },
      );
    }

    const resource = await createResource({ title, type, url });
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add resource.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
