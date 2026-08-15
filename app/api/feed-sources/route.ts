import { createFeedSource } from "@/lib/data";
import type { NewFeedSource } from "@/lib/database.types";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const providers = new Set(["RSS", "GitHub", "GitHub Releases", "YouTube", "Hugging Face", "Hacker News", "arXiv", "npm", "Custom"]);

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
    const user = await requireUser();
    const body = (await request.json()) as Partial<NewFeedSource>;
    const name = body.name?.trim();
    const provider = body.provider;
    const url = body.url ? getHttpUrl(body.url.trim()) : null;
    const topics = Array.isArray(body.topics)
      ? body.topics.map((topic) => topic.trim()).filter(Boolean).slice(0, 12)
      : [];
    const config = body.config && typeof body.config === "object" ? body.config : {};

    if (!name || !provider || !providers.has(provider) || !url) {
      return NextResponse.json(
        { error: "A name, supported provider, and valid HTTP URL are required." },
        { status: 400 },
      );
    }

    if (provider === "GitHub" && topics.length === 0 && !config.languages?.length) {
      return NextResponse.json(
        { error: "GitHub Radar requires at least one topic or language." },
        { status: 400 },
      );
    }

    if (provider === "GitHub Releases" && !config.repositories?.length) {
      return NextResponse.json(
        { error: "GitHub Releases requires at least one repository." },
        { status: 400 },
      );
    }

    if (provider === "YouTube" && topics.length === 0 && !config.channels?.length) {
      return NextResponse.json(
        { error: "YouTube Scout requires at least one topic or channel." },
        { status: 400 },
      );
    }

    if (provider === "Hugging Face" && topics.length === 0 && !config.tags?.length && !config.author) {
      return NextResponse.json(
        { error: "Hugging Face Scout requires at least one topic, tag, or author." },
        { status: 400 },
      );
    }

    const source = await createFeedSource(user.id, { name, provider, url, topics, config });
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
