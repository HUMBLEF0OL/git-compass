import type { GitCommit } from "../types/signal.js";
import type { HealthReport } from "../types/extended.js";
import type { Score } from "../types/insights.js";

/**
 * Computes a holistic "Health Report" for the repository across 4 dimensions.
 * Pure function.
 */
export function analyzeHealth(commits: GitCommit[]): HealthReport {
  if (commits.length === 0) {
    return {
      overallHealth: 0,
      stability: 0,
      velocity: 0,
      simplicity: 0,
      coverage: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 1. Stability: Inverse of commit noise/churn proxy
  // For now, we'll use a simple proxy: average files per commit vs a baseline.
  const avgFiles = commits.reduce((sum, c) => sum + c.files.length, 0) / commits.length;
  const stability: Score = Math.max(20, Math.min(100, 100 - avgFiles * 5));

  // 2. Velocity: Commit frequency (assumed 30-day window for normalization)
  const velocity: Score = Math.min(100, (commits.length / 30) * 10);

  // 3. Simplicity: Proxy via average files changed (lower is simpler)
  const simplicity: Score = Math.max(30, Math.min(100, 100 - avgFiles * 4));

  // 4. Coverage: Test file presence heuristic
  const allFiles = new Set(commits.flatMap((c) => c.files));
  const testFiles = Array.from(allFiles).filter(
    (f) =>
      f.toLowerCase().includes("test") ||
      f.toLowerCase().includes("spec") ||
      f.includes("__tests__"),
  );
  const coverage: Score = Math.min(100, (testFiles.length / (allFiles.size || 1)) * 400);

  const overallHealth: Score = Math.round(
    (stability + velocity + simplicity + coverage) / 4
  );

  return {
    overallHealth,
    stability: Math.round(stability),
    velocity: Math.round(velocity),
    simplicity: Math.round(simplicity),
    coverage: Math.round(coverage),
    generatedAt: new Date().toISOString(),
  };
}

