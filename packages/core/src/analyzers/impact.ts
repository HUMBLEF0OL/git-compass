import type { RawCommit, FileImpact } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";

/**
 * Calculates "Blast Radius": the average number of files affected when a specific file is changed.
 */
export function analyzeImpact(commits: RawCommit[]): FileImpact[] {
  const fileStats = new Map<string, { totalFilesChanged: number; totalCommits: number; maxBlast: number }>();

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff);
    if (files.length === 0) continue;

    const blastRadius = files.length - 1;

    for (const file of files) {
      const existing = fileStats.get(file) ?? { totalFilesChanged: 0, totalCommits: 0, maxBlast: 0 };
      existing.totalFilesChanged += blastRadius;
      existing.totalCommits += 1;
      if (blastRadius > existing.maxBlast) existing.maxBlast = blastRadius;
      fileStats.set(file, existing);
    }
  }

  return Array.from(fileStats.entries())
    .map(([path, stats]) => ({
      path,
      blastRadius: parseFloat((stats.totalFilesChanged / stats.totalCommits).toFixed(2)),
      maxBlastRadius: stats.maxBlast
    }))
    .sort((a, b) => b.blastRadius - a.blastRadius);
}

