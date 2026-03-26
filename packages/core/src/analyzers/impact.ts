import type { GitCommit } from "../types/signal.js";
import type { ImpactReport, ImpactEntry } from "../types/extended.js";

/**
 * Calculates "Blast Radius": the average number of files affected when a specific file is changed.
 * Pure function.
 */
export function analyzeImpact(commits: GitCommit[]): ImpactReport {
  const fileStats = new Map<string, { totalFilesChanged: number; totalCommits: number }>();

  for (const commit of commits) {
    if (commit.files.length === 0) continue;

    const blastRadius = commit.files.length - 1;

    for (const file of commit.files) {
      const existing = fileStats.get(file) ?? {
        totalFilesChanged: 0,
        totalCommits: 0,
      };
      existing.totalFilesChanged += blastRadius;
      existing.totalCommits += 1;
      fileStats.set(file, existing);
    }
  }

  const entries: ImpactEntry[] = Array.from(fileStats.entries())
    .map(([path, stats]) => ({
      path,
      blastRadius: parseFloat((stats.totalFilesChanged / stats.totalCommits).toFixed(2)),
    }))
    .sort((a, b) => b.blastRadius - a.blastRadius);

  return {
    entries,
    generatedAt: new Date().toISOString(),
  };
}

