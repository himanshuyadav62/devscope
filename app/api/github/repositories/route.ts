import { requireUser } from "@/lib/auth";
import { searchGitHubRepositories, summarizeRepository } from "@/lib/github-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ repositories: [] });
    }

    const repositories = await searchGitHubRepositories({
      query,
      limit: 10,
      sort: "stars",
    });

    return NextResponse.json({
      repositories: repositories.map(summarizeRepository),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not search GitHub repositories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
