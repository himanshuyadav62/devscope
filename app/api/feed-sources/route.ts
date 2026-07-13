import { createFeedSource } from "@/lib/data";
import type { NewFeedSource } from "@/lib/database.types";
import { NextResponse } from "next/server";

const providers = new Set(["RSS", "GitHub", "arXiv", "npm", "Custom"]);

function getHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<NewFeedSource>;
    const name = body.name?.trim();
    const provider = body.provider;
    const url = body.url ? getHttpUrl(body.url.trim()) : null;
    const topics = Array.isArray(body.topics)
      ? body.topics.map((topic) => topic.trim()).filter(Boolean).slice(0, 12)
      : [];

    if (!name || !provider || !providers.has(provider) || !url) {
      return NextResponse.json(
        { error: "A name, supported provider, and valid HTTP URL are required." },
        { status: 400 },
      );
    }

    const source = await createFeedSource({ name, provider, url, topics });
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
