import type { RawCommit, HotspotFile, AnalysisWindow } from "../types.js";
import { getWindowCutoff, extractImpactsFromDiff } from "../utils/index.js";

/**
 * Identifies hotspots in a repository based on change frequency and author diversity.
 */
export function analyzeHotspots(
  commits: RawCommit[],
  window: AnalysisWindow = "30d",
  excludePatterns?: string[],
): HotspotFile[] {
  const cutoff = getWindowCutoff(window);
  const filtered = commits.filter((c) => c.date >= cutoff);

  const fileMap = new Map<
    string,
    { changeCount: number; authors: Set<string>; lastChanged: Date; linesImpacted: number }
  >();

  for (const commit of filtered) {
    const impacts = extractImpactsFromDiff(commit.diff, excludePatterns);
    for (const impact of impacts) {
      const existing = fileMap.get(impact.file) ?? {
        changeCount: 0,
        authors: new Set<string>(),
        lastChanged: commit.date,
        linesImpacted: 0,
      };
      existing.changeCount++;
      existing.authors.add(commit.author);
      existing.linesImpacted += impact.insertions + impact.deletions;
      if (commit.date > existing.lastChanged) {
        existing.lastChanged = commit.date;
      }
      fileMap.set(impact.file, existing);
    }
  }

  return Array.from(fileMap.entries())
    .map(([path, data]) => ({
      path,
      changeCount: data.changeCount,
      uniqueAuthors: data.authors.size,
      lastChanged: data.lastChanged,
      linesImpacted: data.linesImpacted,
      riskScore: 0, // Placeholder, to be computed by risk.ts
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}
