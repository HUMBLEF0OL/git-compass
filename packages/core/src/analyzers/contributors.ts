import type { GitCommit } from "../types/signal.js";
import type { DeduplicationResult, CanonicalContributor } from '../types/signal.js';
import type { ContributorReport, ContributorDetail } from '../types/extended.js';

/**
 * Analyzes contributor activity and impact.
 * Pure function.
 */
export function analyzeContributors(commits: GitCommit[]): ContributorReport {
  const contributorMap = new Map<
    string,
    {
      name: string;
      email: string;
      commitCount: number;
      files: Set<string>;
      first: string;
      last: string;
      days: Set<string>;
    }
  >();

  for (const commit of commits) {
    const existing = contributorMap.get(commit.author.email) ?? {
      name: commit.author.name,
      email: commit.author.email,
      commitCount: 0,
      files: new Set<string>(),
      first: commit.date,
      last: commit.date,
      days: new Set<string>(),
    };

    existing.commitCount++;
    if (new Date(commit.date) < new Date(existing.first)) existing.first = commit.date;
    if (new Date(commit.date) > new Date(existing.last)) existing.last = commit.date;

    existing.days.add(commit.date.split("T")[0]!);
    commit.files.forEach((f) => existing.files.add(f));

    contributorMap.set(commit.author.email, existing);
  }

  const contributors: ContributorDetail[] = Array.from(contributorMap.values()).map((data) => ({
    name: data.name,
    email: data.email,
    commitCount: data.commitCount,
    filesChanged: data.files.size,
    firstCommit: data.first,
    lastCommit: data.last,
    activeDays: data.days.size,
  }));

  return {
    contributors,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Deduplicates contributors by email and identifies bots.
 * Pure function.
 */
export function deduplicateContributors(
  commits: GitCommit[],
  options: { identityMap?: Record<string, string> } = {}
): DeduplicationResult {
  const identityMap = options.identityMap ?? {};
  const groups = new Map<string, { names: Record<string, number>; emails: Set<string> }>();

  for (const c of commits) {
    const email = c.author.email.toLowerCase();
    const canonicalEmail = (identityMap[email] || email).toLowerCase();

    const group = groups.get(canonicalEmail) ?? { names: {}, emails: new Set() };
    group.emails.add(c.author.email);
    group.names[c.author.name] = (group.names[c.author.name] || 0) + 1;
    groups.set(canonicalEmail, group);
  }

  const canonical: CanonicalContributor[] = [];
  const botsRemoved: string[] = [];

  for (const [canonicalEmail, group] of groups.entries()) {
    // Pick name with most commits
    const name = Object.entries(group.names)
      .sort(([_, countA], [__, countB]) => countB - countA)[0]![0];

    const isBot =
      name.toLowerCase().endsWith('[bot]') ||
      canonicalEmail.includes('bot@') ||
      canonicalEmail.includes('noreply@') ||
      canonicalEmail.includes('dependabot') ||
      canonicalEmail.includes('renovate');

    if (isBot) {
      botsRemoved.push(...Array.from(group.emails));
    } else {
      canonical.push({
        canonicalEmail,
        canonicalName: name,
        aliases: Array.from(group.emails).filter(e => e.toLowerCase() !== canonicalEmail),
      });
    }
  }

  return { canonical, botsRemoved };
}


