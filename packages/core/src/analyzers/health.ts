import type { RawCommit, RepositoryHealth, ChurnDataPoint, CouplingLink } from "../types.js";
import { extractFilesFromDiff } from "../utils/index.js";

/**
 * Computes a holistic "Health Score" for the repository across 5 dimensions.
 */
export function analyzeHealth(
  commits: RawCommit[],
  churn: ChurnDataPoint[],
  coupling: CouplingLink[],
): RepositoryHealth {
  // 1. Stability: Inverse of churn intensity relative to commit volume
  const totalAdded = churn.reduce((sum, d) => sum + d.linesAdded, 0);
  const totalRemoved = churn.reduce((sum, d) => sum + d.linesRemoved, 0);
  const churnIntensity = (totalAdded + totalRemoved) / (commits.length || 1);
  // Scale: 0 churn = 100, 500 lines/commit = 50, 1000+ lines/commit = 20
  const stability = Math.max(20, Math.min(100, 100 - churnIntensity / 10));

  // 2. Velocity: Commit frequency over the window
  // Assuming the window is roughly 30 days for this simple heuristic
  const velocity = Math.min(100, (commits.length / 30) * 10);

  // 3. Simplicity: Proxy via average file impact per commit
  const avgFilesChanged =
    commits.reduce((sum, c) => sum + extractFilesFromDiff(c.diff).length, 0) /
    (commits.length || 1);
  const simplicity = Math.max(30, Math.min(100, 100 - avgFilesChanged * 5));

  // 4. Coverage: Test file presence heuristic
  const allFiles = new Set(commits.flatMap((c) => extractFilesFromDiff(c.diff)));
  const testFiles = Array.from(allFiles).filter(
    (f) =>
      f.toLowerCase().includes("test") ||
      f.toLowerCase().includes("spec") ||
      f.includes("__tests__"),
  );
  const coverage = Math.min(100, (testFiles.length / (allFiles.size || 1)) * 400); // 25% tests = 100%

  // 5. Decoupling: Inverse of strong temporal couplings
  const strongCouplings = coupling.filter((c) => c.coupling > 0.6).length;
  const decoupling = Math.max(10, Math.min(100, 100 - strongCouplings * 4));

  return {
    stability: Math.round(stability),
    velocity: Math.round(velocity),
    simplicity: Math.round(simplicity),
    coverage: Math.round(coverage),
    decoupling: Math.round(decoupling),
  };
}
