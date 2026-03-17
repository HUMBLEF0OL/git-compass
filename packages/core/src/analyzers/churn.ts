import type { RawCommit, AnalysisWindow, ChurnDataPoint } from "../types.js";
import { getWindowCutoff } from "../utils/index.js";

/**
 * Analyzes code churn (additions/deletions) over time.
 */
export function analyzeChurn(
  commits: RawCommit[],
  window: AnalysisWindow = "30d"
): ChurnDataPoint[] {
  const cutoff = getWindowCutoff(window);
  const filtered = commits.filter((c) => c.date >= cutoff);
  const churnMap = new Map<string, { added: number; removed: number; commits: number }>();

  for (const commit of filtered) {

    if (!commit.diff || typeof commit.diff !== "object") continue;

    const diffObj = commit.diff as { insertions: number; deletions: number };
    const dateKey = commit.date.toISOString().split("T")[0];
    if (!dateKey) continue;

    const existing = churnMap.get(dateKey) ?? { added: 0, removed: 0, commits: 0 };
    existing.added += diffObj.insertions ?? 0;
    existing.removed += diffObj.deletions ?? 0;
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
