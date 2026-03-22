import type { RawCommit, AnalysisWindow, ChurnDataPoint } from "../types.js";
import { getWindowCutoff, extractImpactsFromDiff } from "../utils/index.js";

/**
 * Analyzes code churn (additions/deletions) over time.
 */
export function analyzeChurn(
  commits: RawCommit[],
  window: AnalysisWindow = "30d",
  excludePatterns?: string[],
): ChurnDataPoint[] {
  const cutoff = getWindowCutoff(window);
  const filtered = commits.filter((c) => c.date >= cutoff);
  const churnMap = new Map<string, { added: number; removed: number; commits: number }>();

  for (const commit of filtered) {
    if (!commit.diff || typeof commit.diff !== "object") continue;

    const impacts = extractImpactsFromDiff(commit.diff, excludePatterns);
    if (impacts.length === 0) continue;

    const dateKey = commit.date.toISOString().split("T")[0];
    if (!dateKey) continue;

    const existing = churnMap.get(dateKey) ?? { added: 0, removed: 0, commits: 0 };
    for (const impact of impacts) {
      existing.added += impact.insertions;
      existing.removed += impact.deletions;
    }
    existing.commits += 1;
    churnMap.set(dateKey, existing);
  }

  return Array.from(churnMap.entries())
    .map(([date, data]) => ({
      date: new Date(date),
      linesAdded: data.added,
      linesRemoved: data.removed,
      netChurn: data.added - data.removed,
      commitCount: data.commits,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
