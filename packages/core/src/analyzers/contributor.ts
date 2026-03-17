import type { RawCommit, ContributorStats } from "../types.js";

/**
 * Maps repository activity and engagement levels per contributor.
 */
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














