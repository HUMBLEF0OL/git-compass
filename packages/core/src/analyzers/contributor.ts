import type { RawCommit, ContributorStats, ContributorTimelinePoint } from "../types.js";
import type { DeduplicationResult, CanonicalContributor } from '../types/signal.js';

export function analyzeContributors(commits: RawCommit[]): ContributorStats[] {
  const contributorMap = new Map<
    string,
    {
      author: string;
      email: string;
      commitCount: number;
      added: number;
      removed: number;
      files: Set<string>;
      first: Date;
      last: Date;
      days: Set<string>;
    }
  >();

  for (const commit of commits) {
    const existing = contributorMap.get(commit.author) ?? {
      author: commit.author,
      email: commit.email,
      commitCount: 0,
      added: 0,
      removed: 0,
      files: new Set<string>(),
      first: commit.date,
      last: commit.date,
      days: new Set<string>(),
    };

    existing.commitCount++;
    if (commit.date < existing.first) existing.first = commit.date;
    if (commit.date > existing.last) existing.last = commit.date;

    existing.days.add(commit.date.toISOString().split("T")[0]!);

    const diff = commit.diff as {
      insertions?: number;
      deletions?: number;
      files?: Array<{ file: string }>;
    } | null;

    if (diff) {
      existing.added += diff.insertions ?? 0;
      existing.removed += diff.deletions ?? 0;
      if (diff.files) {
        diff.files.forEach((f) => existing.files.add(f.file));
      }
    }

    contributorMap.set(commit.author, existing);
  }

  return Array.from(contributorMap.values()).map((data) => ({
    author: data.author,
    email: data.email,
    commitCount: data.commitCount,
    linesAdded: data.added,
    linesRemoved: data.removed,
    filesChanged: data.files.size,
    firstCommit: data.first,
    lastCommit: data.last,
    activeDays: data.days.size,
  }));
}

/**
 * Tracks contributor impact (lines added) over time for temporal visualization.
 */
export function analyzeContributorTimeline(commits: RawCommit[]): ContributorTimelinePoint[] {
  const timelineMap = new Map<string, { [author: string]: number }>();

  for (const commit of commits) {
    const dateKey = commit.date.toISOString().split("T")[0];
    if (!dateKey) continue;

    const diff = commit.diff as { insertions?: number } | null;
    const impact = diff?.insertions ?? 0;

    const dayData = timelineMap.get(dateKey) ?? {};
    dayData[commit.author] = (dayData[commit.author] ?? 0) + impact;
    timelineMap.set(dateKey, dayData);
  }

  return Array.from(timelineMap.entries())
    .map(([date, impacts]) => ({
      date: new Date(date),
      impacts,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Deduplicates contributors by email and identifies bots.
 */
export function deduplicateContributors(
  contributors: ContributorStats[],
  options: { identityMap?: Record<string, string> } = {}
): DeduplicationResult {
  const identityMap = options.identityMap ?? {};
  const groups = new Map<string, { nameCounts: Record<string, number>; emails: Set<string> }>();

  for (const c of contributors) {
    const email = c.email.toLowerCase();
    const canonicalEmail = (identityMap[email] || identityMap[c.email] || email).toLowerCase();

    const group = groups.get(canonicalEmail) ?? { nameCounts: {}, emails: new Set() };
    group.emails.add(c.email);
    group.nameCounts[c.author] = (group.nameCounts[c.author] || 0) + 1;
    groups.set(canonicalEmail, group);
  }

  const canonical: CanonicalContributor[] = [];
  const botsRemoved: string[] = [];

  for (const [canonicalEmail, group] of groups.entries()) {
    // Pick canonical name: most frequent, then first alphabetically
    const name = Object.entries(group.nameCounts)
      .sort(([nameA, countA], [nameB, countB]) => {
        if (countB !== countA) return countB - countA;
        return nameA.localeCompare(nameB);
      })[0]![0];

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

