import type { RawCommit } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";

/**
 * Identifies "Abandoned Code" or "Rot": files that haven't been touched in a long time.
 * Also calculates "Complexity Rot" if we had line counts, but here we focus on time.
 */
export function analyzeRot(commits: RawCommit[], excludePatterns?: string[]): string[] {
  const lastTouched = new Map<string, Date>();
  const now = new Date();
  const threshold = 180; // 180 days

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff, excludePatterns);
    for (const file of files) {
      const existing = lastTouched.get(file);
      if (!existing || commit.date > existing) {
        lastTouched.set(file, commit.date);
      }
    }
  }

  return Array.from(lastTouched.entries())
    .filter(([_, date]) => {
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > threshold;
    })
    .map(([path]) => path);
}
