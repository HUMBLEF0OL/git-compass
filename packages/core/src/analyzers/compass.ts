import type { RawCommit, CompassEntry } from "../types.js";

/**
 * Maps onboarding file priority based on centrality and developer touchpoints.
 */
export function analyzeCompass(commits: RawCommit[]): CompassEntry[] {
  // Skeleton implementation for onboarding file guidance
  const fileTouchpoints = new Map<string, Set<string>>();

  for (const commit of commits) {
    const diff = commit.diff as { files?: Array<{ file: string }> } | null;
    if (diff?.files) {
      for (const f of diff.files) {
        const authors = fileTouchpoints.get(f.file) ?? new Set<string>();
        authors.add(commit.author);
        fileTouchpoints.set(f.file, authors);
      }
    }
  }

  return Array.from(fileTouchpoints.entries())
    .map(([path, authors]) => ({
      path,
      priority: 1, // To be determined by deeper logic
      reason: `Touched by ${authors.size} unique contributors`,
      changeCount: commits.filter((c) => {
        const d = c.diff as { files?: Array<{ file: string }> } | null;
        return d?.files?.some((f) => f.file === path);
      }).length,
      type: "core" as const,
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10);
}
