import type { RawCommit, CouplingLink } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";


/**
 * Identifies "Temporal Coupling": files that consistently change together.
 * Higher coupling suggests hidden logical dependencies.
 */
export function analyzeCoupling(commits: RawCommit[]): CouplingLink[] {
  const filePairs = new Map<string, number>();
  const fileChangeCounts = new Map<string, number>();

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff);
    if (files.length < 2 || files.length > 50) continue; // Skip huge commits or single-file commits

    // Update individual file counts
    files.forEach(f => {
      fileChangeCounts.set(f, (fileChangeCounts.get(f) || 0) + 1);
    });

    // Update pair counts
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const pair = [files[i], files[j]].sort().join("|");
        filePairs.set(pair, (filePairs.get(pair) || 0) + 1);
      }
    }
  }

  const results: CouplingLink[] = [];

  for (const [pair, sharedCount] of filePairs.entries()) {
    if (sharedCount < 2) continue; // Minimum threshold

    const [fileA, fileB] = pair.split("|");
    if (!fileA || !fileB) continue;

    const countA = fileChangeCounts.get(fileA) || 0;
    const countB = fileChangeCounts.get(fileB) || 0;

    // Use Jaccard Index as the coupling score
    const coupling = sharedCount / (countA + countB - sharedCount);

    if (coupling > 0.3) { // Threshold for "strong" coupling
      results.push({
        head: fileA,
        tail: fileB,
        coupling: parseFloat(coupling.toFixed(2)),
        sharedCommits: sharedCount
      });
    }
  }

  return results.sort((a, b) => b.coupling - a.coupling);
}















