import { DEFAULT_PAGE_SIZE, createResource, getResourcesPage } from "@/lib/data";
import type { NewResource } from "@/lib/database.types";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const resourceTypes = new Set(["Link", "PDF", "Note"]);

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
    const page = await getResourcesPage(user.id, { limit, offset });
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load resources.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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

    const resource = await createResource(user.id, { title, type, url });
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add resource.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
