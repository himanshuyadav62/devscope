# Better plugin recommendations for software engineers

Research date: August 25, 2026

## Decision

Devscope now recommends recurring, actionable engineering signals before general news:

1. **Security advisory radar** — reviewed vulnerabilities filtered by ecosystem, package, severity, CVSS score, and date.
2. **npm package release watch** — exact versions of packages a project depends on.
3. **Stack Overflow signal** — recent questions filtered by stack, score, recency, ranking, and optionally accepted answers.
4. **GitHub releases** — meaningful changes in relevant open-source projects.
5. Broader discovery sources such as Hacker News, DEV, Hugging Face, arXiv, repository discovery, and YouTube when they strongly match the user's interests.

This ordering is a Devscope product inference: operational signals are more likely to change what an engineer does today, while general discovery is valuable but less consistently actionable.

## Why these moved to the top

GitHub's public global advisory endpoint returns reviewed advisories and supports ecosystem, severity, affected-package, date, and exploitation-likelihood filters. Public data can be requested without authentication, while an existing GitHub token improves rate limits. [GitHub global security advisories documentation](https://docs.github.com/en/rest/security-advisories/global-advisories)

The official npm registry metadata maps package versions to publication timestamps, so Devscope can watch exact packages without scraping npm pages or requiring an npm token. [npm package metadata documentation](https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md)

Stack Exchange's official questions API supports tags, scores, recency windows, and hot/vote/activity/newest ranking. It works anonymously; an optional Stack Apps key increases quota. [Questions API](https://api.stackexchange.com/docs/questions), [API throttles](https://api.stackexchange.com/docs/throttle)

The 2025 Stack Overflow Developer Survey received more than 49,000 responses and reports technical documentation as the most-used learning resource, used by nearly 68% of respondents to that question. This supports recommending precise technical signal ahead of a generic content stream. [2025 Stack Overflow Developer Survey](https://survey.stackoverflow.co/2025/developers)

## Design changes

- Recommendations are ranked by actionability, topic fit, and setup friction.
- Already-configured provider types are excluded.
- Cards identify their purpose—such as dependencies, risk, or problem solving—and whether a key is required.
- Every recommendation opens a reviewable configuration page rather than silently installing a source.
- General discovery remains available and can outrank another source when the user's existing topics strongly match it.

## Constraints

- GitHub's public REST quota is lower without authentication; `GITHUB_TOKEN` remains the recommended optional production setting. [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- Stack Exchange asks clients not to repeat identical requests more than once per minute; Devscope's scheduled/on-demand model is well within that guidance. [Stack Exchange throttles](https://api.stackexchange.com/docs/throttle)
- arXiv recommends a delay between repeated calls and notes that identical result sets generally need fetching only daily. [arXiv API manual](https://info.arxiv.org/help/api/user-manual.html)
- DEV documents a limit of 10 requests per 30 seconds. [DEV API](https://developers.forem.com/api/v0)

The APIs were smoke-tested against live public endpoints during implementation. No paid API is required for the three new providers.
