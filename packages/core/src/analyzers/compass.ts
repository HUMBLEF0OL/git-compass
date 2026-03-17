import type { RawCommit, CompassEntry } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";

/**
 * Maps onboarding file priority based on centrality and developer touchpoints.
 */
export function analyzeCompass(commits: RawCommit[]): CompassEntry[] {
  // Skeleton implementation for onboarding file guidance
  const fileTouchpoints = new Map<string, Set<string>>();

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff);
    for (const file of files) {
      const authors = fileTouchpoints.get(file) ?? new Set<string>();
      authors.add(commit.author);
      fileTouchpoints.set(file, authors);
    }
  }

  return Array.from(fileTouchpoints.entries())
    .map(([path, authors]) => ({
      path,
      priority: 1, // To be determined by deeper logic
      reason: `Touched by ${authors.size} unique contributors`,
      changeCount: commits.filter((c) => {
        const files = extractFilesFromDiff(c.diff);
        return files.includes(path);
      }).length,
      type: "core" as const,
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10);
}















