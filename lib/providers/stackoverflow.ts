import type { FeedSource } from "@/lib/database.types";
import type { DiscoveredStory, FeedProvider } from "@/lib/providers/types";

type StackOverflowSort = "hot" | "votes" | "activity" | "creation";

type StackOverflowQuestion = {
  question_id: number;
  title: string;
  link: string;
  tags: string[];
  score: number;
  answer_count: number;
  is_answered: boolean;
  accepted_answer_id?: number;
  creation_date: number;
  last_activity_date: number;
  owner?: { display_name?: string };
};

type StackOverflowResponse = {
  items?: StackOverflowQuestion[];
  error_message?: string;
  backoff?: number;
  quota_remaining?: number;
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function questionSort(value: unknown): StackOverflowSort {
  return typeof value === "string" && ["hot", "votes", "activity", "creation"].includes(value)
    ? value as StackOverflowSort
    : "hot";
}

function stackTag(value: string) {
  return value.toLowerCase().trim().replaceAll(" ", "-");
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

async function fetchQuestions({
  tag,
  sort,
  days,
  pageSize,
}: {
  tag: string | null;
  sort: StackOverflowSort;
  days: number;
  pageSize: number;
}) {
  const params = new URLSearchParams({
    site: "stackoverflow",
    sort,
    order: "desc",
    pagesize: String(Math.min(100, pageSize)),
    fromdate: String(Math.floor((Date.now() - days * 86_400_000) / 1000)),
  });
  if (tag) params.set("tagged", tag);
  if (process.env.STACK_EXCHANGE_KEY) params.set("key", process.env.STACK_EXCHANGE_KEY);

  const response = await fetch(`https://api.stackexchange.com/2.3/questions?${params}`, { cache: "no-store" });
  const payload = (await response.json()) as StackOverflowResponse;
  if (!response.ok || payload.error_message) {
    throw new Error(payload.error_message ?? `Stack Exchange API returned ${response.status}.`);
  }
  return payload.items ?? [];
}

export class StackOverflowProvider implements FeedProvider {
  async discover(source: FeedSource): Promise<DiscoveredStory[]> {
    const config = source.config ?? {};
    const sort = questionSort(config.stackOverflowSort);
    const limit = clampInteger(config.limit, 20, 1, 50);
    const days = clampInteger(config.days, 14, 1, 365);
    const minScore = clampInteger(config.minScore, 3, 0, 100_000);
    const acceptedOnly = config.acceptedOnly === true;
    const tags = Array.from(new Set([...list(config.tags), ...source.topics].map(stackTag))).slice(0, 8);
    const searches: Array<string | null> = tags.length ? tags : [null];
    const responses = await Promise.all(
      searches.map((tag) => fetchQuestions({ tag, sort, days, pageSize: Math.max(15, limit * 3) })),
    );
    const questions = Array.from(
      new Map(responses.flat().map((question) => [question.question_id, question])).values(),
    );

    return questions
      .filter((question) => question.score >= minScore)
      .filter((question) => !acceptedOnly || Boolean(question.accepted_answer_id))
      .sort((left, right) => {
        if (sort === "creation") return right.creation_date - left.creation_date;
        if (sort === "activity") return right.last_activity_date - left.last_activity_date;
        return right.score - left.score || right.answer_count - left.answer_count;
      })
      .slice(0, limit)
      .map((question): DiscoveredStory => ({
        kind: "Question",
        source: "Stack Overflow",
        source_url: question.link,
        title: decodeHtml(question.title),
        summary: [
          `${question.score.toLocaleString("en-US")} votes`,
          `${question.answer_count.toLocaleString("en-US")} answers`,
          question.accepted_answer_id ? "Accepted answer" : question.is_answered ? "Answered" : "Unanswered",
        ].join(" · "),
        topics: Array.from(new Set(["Stack Overflow", ...question.tags, ...source.topics])).slice(0, 10),
        published_at: new Date(question.creation_date * 1000).toISOString(),
        accent: "#f48024",
        metadata: {
          questionId: question.question_id,
          score: question.score,
          answers: question.answer_count,
          accepted: Boolean(question.accepted_answer_id),
          answered: question.is_answered,
          author: question.owner?.display_name ?? null,
          lastActivityAt: new Date(question.last_activity_date * 1000).toISOString(),
          discoveryReason: `${question.score.toLocaleString("en-US")} votes · ${question.answer_count.toLocaleString("en-US")} answers`,
        },
      }));
  }
}
