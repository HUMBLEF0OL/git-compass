import type { RawCommit, CompassEntry } from "../types.js";

/**
 * Identifies "Abandoned Code" or "Rot": files that haven't been touched in a long time.
 * Also calculates "Complexity Rot" if we had line counts, but here we focus on time.
 */
export function analyzeRot(commits: RawCommit[]): string[] {
  const lastTouched = new Map<string, Date>();
  const now = new Date();
  const threshold = 180; // 180 days

  for (const commit of commits) {
    const files = extractFilesFromDiff(commit.diff);
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

function extractFilesFromDiff(diff: any): string[] {
  if (!diff || typeof diff !== "object") return [];
  const diffObj = diff as { files?: Array<{ file: string }> };
  return diffObj.files?.map((f) => f.file) ?? [];
}
