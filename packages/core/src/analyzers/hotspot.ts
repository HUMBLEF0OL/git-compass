import type { RawCommit, HotspotFile, AnalysisWindow } from "../types.js";

/**
 * Calculates the cutoff date based on the analysis window.
 */
function getWindowCutoff(window: AnalysisWindow): Date {
  if (window === "all") return new Date(0);
  const now = new Date();
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[window];
  now.setDate(now.getDate() - days);
  return now;
}


/**
 * Extracts changed file paths from a commit's diff metadata.
 */
function extractFilesFromDiff(diff: any): string[] {
  if (!diff || typeof diff !== "object") return [];
  const diffObj = diff as { files?: Array<{ file: string }> };
  return diffObj.files?.map((f) => f.file) ?? [];
}

/**
 * Identifies hotspots in a repository based on change frequency and author diversity.
 */
export function analyzeHotspots(
  commits: RawCommit[],
  window: AnalysisWindow = "30d",
): HotspotFile[] {
  const cutoff = getWindowCutoff(window);
  const filtered = commits.filter((c) => c.date >= cutoff);

  const fileMap = new Map<
    string,
    { changeCount: number; authors: Set<string>; lastChanged: Date }
  >();

  for (const commit of filtered) {
    const files = extractFilesFromDiff(commit.diff);
    for (const file of files) {
      const existing = fileMap.get(file) ?? {
        changeCount: 0,
        authors: new Set<string>(),
        lastChanged: commit.date,
      };
      existing.changeCount++;
      existing.authors.add(commit.author);
      if (commit.date > existing.lastChanged) {
        existing.lastChanged = commit.date;
      }
      fileMap.set(file, existing);
    }
  }

  return Array.from(fileMap.entries())
    .map(([path, data]) => ({
      path,
      changeCount: data.changeCount,
      uniqueAuthors: data.authors.size,
      lastChanged: data.lastChanged,
      riskScore: 0, // Placeholder, to be computed by risk.ts
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}
