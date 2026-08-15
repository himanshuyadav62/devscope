import { getSavedGitHubRepositories } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { fetchGitHubStarredRepositories, summarizeRepository } from "@/lib/github-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim() ?? "";
    const saved = await getSavedGitHubRepositories(user.id);
    const starred = username
      ? (await fetchGitHubStarredRepositories(username, 50)).map((repository) => ({
          ...summarizeRepository(repository),
          source: "starred" as const,
        }))
      : [];

    return NextResponse.json({
      repositories: Array.from(
        new Map(
          [
            ...starred,
            ...saved,
          ].map((repository) => [repository.fullName, repository]),
        ).values(),
      ).slice(0, 100),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch GitHub repositories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
