import type { GitCommit } from "../types/signal.js";
import type { RotReport } from "../types/extended.js";

/**
 * Detects code rot by identifying files that haven't been touched in a long time.
 * Pure function.
 */
export function analyzeRot(commits: GitCommit[]): RotReport {
  if (commits.length === 0) {
    return { staleFiles: [], analyzedAt: new Date().toISOString() };
  }

  const fileMap = new Map<string, Date>();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (const commit of commits) {
    const commitDate = new Date(commit.date);
    for (const file of commit.files) {
      const existing = fileMap.get(file);
      if (!existing || commitDate > existing) {
        fileMap.set(file, commitDate);
      }
    }
  }

  const staleFiles = Array.from(fileMap.entries())
    .filter(([_, lastDate]) => lastDate < ninetyDaysAgo)
    .map(([path, _]) => path)
    .sort();

  return {
    staleFiles,
    analyzedAt: new Date().toISOString(),
  };
}
