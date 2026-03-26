import {
  analyzeHotspots,
  analyzeRisk,
  analyzeDependencyChurn,
  analyzeContributors,
  analyzeBurnout,
  analyzeOwnershipDrift,
  analyzeOnboarding,
  analyzeReviewDebt,
  analyzeVelocity,
  analyzeCompass,
  analyzeHealth,
  analyzeRot,
  type AnalysisResult,
  type GitCommit,
} from "@git-compass/core";

/**
 * Performs a full suite of analytical calculations on a set of commits.
 * Orchestrates multiple P1 and P2 analyzers to create a unified AnalysisResult.
 */
export function performFullAnalysis(
  commits: GitCommit[],
  repoPath: string,
  branch: string,
  windowDays: number
): AnalysisResult {
  // P1 Core Metrics
  const hotspots = analyzeHotspots(commits, windowDays as any);
  const velocity = analyzeVelocity(commits, windowDays as any);
  const contributors = analyzeContributors(commits);
  const burnout = analyzeBurnout(commits);
  
  // P2 Deep Insights Primitives
  const risk = analyzeRisk(hotspots.hotspots);
  const churn = analyzeDependencyChurn(commits);
  const ownership = analyzeOwnershipDrift(commits, contributors.contributors.map(c => c.email));
  const rot = analyzeRot(commits);
  const compassion = analyzeCompass(commits);
  const reviewDebt = analyzeReviewDebt(commits);

  // Derive Onboarding metrics (mirrors server.js logic)
  const allFiles = [...new Set(commits.flatMap(c => c.files))];
  const rotSummary = { rotFileCount: rot.staleFiles.length, totalFileCount: allFiles.length };
  
  // Simple silo detection from hotspots for onboarding score
  const siloCount = hotspots.hotspots.filter(h => h.uniqueAuthors === 1).length;
  const siloSummary = { siloFileCount: siloCount, totalFileCount: allFiles.length };
  
  const totalChurn = hotspots.hotspots.reduce((acc, h) => acc + h.changeCount, 0);
  const churnAvg = hotspots.hotspots.length > 0 ? (totalChurn / hotspots.hotspots.length) : 0;
  
  const radiusAvg = hotspots.hotspots.length > 0
    ? hotspots.hotspots.reduce((acc, h) => acc + (h.uniqueAuthors || 1), 0) / hotspots.hotspots.length
    : 0;

  const onboarding = analyzeOnboarding(
    commits,
    rotSummary,
    siloSummary,
    { avgBlastRadius: radiusAvg, maxBlastRadius: 0 },
    { avgChurnPerFile: churnAvg }
  );

  return {
    meta: {
      repoPath,
      branch,
      commitCount: commits.length,
      windowDays: windowDays as any,
    },
    hotspots,
    risk,
    burnout,
    compass: compassion,
    velocity,
    insights: {
      ownershipDrift: ownership,
      dependencyChurn: churn,
      onboarding,
      reviewDebt,
    },
    health: analyzeHealth(commits),
    contributors,
  };
}
