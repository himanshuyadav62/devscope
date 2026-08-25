import type { FeedSource } from "@/lib/database.types";

export type PluginRecommendation = {
  provider: FeedSource["provider"];
  name: string;
  description: string;
  reason: string;
  suggestedTopics: string[];
};

type RecommendationDefinition = Omit<PluginRecommendation, "reason" | "suggestedTopics"> & {
  baseScore: number;
  fallbackTopics?: string[];
  interestTerms: string[];
};

const recommendationCatalog: RecommendationDefinition[] = [
  {
    provider: "GitHub Releases",
    name: "Trending GitHub releases",
    description: "Discover noteworthy releases from active open-source repositories without choosing repos first.",
    baseScore: 100,
    interestTerms: ["open source", "github", "software", "developer", "typescript", "javascript", "python", "rust", "golang", "go", "react", "next.js"],
  },
  {
    provider: "Hacker News",
    name: "Hacker News highlights",
    description: "Bring high-signal technology stories, launches, discussions, and developer news into your feed.",
    baseScore: 92,
    interestTerms: ["startup", "technology", "programming", "developer", "software", "security", "database", "cloud", "ai"],
  },
  {
    provider: "Dev.to",
    name: "DEV Community picks",
    description: "Follow practical tutorials and community posts, with optional topic and tag filtering.",
    baseScore: 84,
    interestTerms: ["web", "javascript", "typescript", "react", "next.js", "css", "frontend", "backend", "devops", "programming"],
  },
  {
    provider: "Hugging Face",
    name: "Hugging Face trending",
    description: "Track useful models, datasets, and Spaces from the public Hugging Face Hub.",
    baseScore: 72,
    interestTerms: ["ai", "artificial intelligence", "machine learning", "ml", "llm", "nlp", "computer vision", "data science", "transformers"],
  },
  {
    provider: "arXiv",
    name: "New research papers",
    description: "Find recent papers in AI, software engineering, security, systems, and other research areas.",
    baseScore: 70,
    interestTerms: ["research", "paper", "ai", "artificial intelligence", "machine learning", "ml", "llm", "nlp", "security", "distributed systems", "database"],
  },
  {
    provider: "GitHub",
    name: "GitHub repository radar",
    description: "Discover promising repositories by topic, language, activity, and star count.",
    baseScore: 68,
    fallbackTopics: ["Open Source"],
    interestTerms: ["open source", "github", "programming", "developer", "software", "typescript", "javascript", "python", "rust", "golang", "go"],
  },
  {
    provider: "YouTube",
    name: "YouTube developer videos",
    description: "Find recent technical videos by topic or from channels the user chooses.",
    baseScore: 62,
    fallbackTopics: ["Software Engineering"],
    interestTerms: ["tutorial", "video", "programming", "developer", "software", "ai", "web", "cloud", "security"],
  },
];

function normalized(value: string) {
  return value.toLocaleLowerCase().trim();
}

function matchingTopics(topics: string[], interestTerms: string[]) {
  return topics.filter((topic) => {
    const value = normalized(topic);
    return interestTerms.some((term) => value.includes(term) || normalized(term).includes(value));
  });
}

export function getPluginRecommendations({
  topics,
  sources,
  limit = 3,
}: {
  topics: string[];
  sources: FeedSource[];
  limit?: number;
}): PluginRecommendation[] {
  const installedProviders = new Set(sources.map((source) => source.provider));
  const uniqueTopics = Array.from(
    new Map(topics.filter(Boolean).map((topic) => [normalized(topic), topic.trim()])).values(),
  );

  return recommendationCatalog
    .filter((recommendation) => !installedProviders.has(recommendation.provider))
    .map((recommendation) => {
      const matches = matchingTopics(uniqueTopics, recommendation.interestTerms).slice(0, 4);
      const suggestedTopics = matches.length ? matches : recommendation.fallbackTopics ?? [];
      return {
        recommendation,
        matches,
        score: recommendation.baseScore + matches.length * 24,
        suggestedTopics,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ recommendation, matches, suggestedTopics }) => ({
      provider: recommendation.provider,
      name: recommendation.name,
      description: recommendation.description,
      reason: matches.length
        ? `Fits your interest${matches.length === 1 ? "" : "s"} in ${matches.join(", ")}.`
        : "A useful, high-signal addition to a developer feed.",
      suggestedTopics,
    }));
}
