import type { HotspotFile, RiskScore } from "../types.js";

const RISK_WEIGHTS = {
  changeFrequency: 0.4,
  uniqueAuthors: 0.3,
  recency: 0.3,
} as const;

/**
 * Computes risk scores for files based on multiple technical debt indicators.
 */
export function computeRiskScores(files: HotspotFile[]): RiskScore[] {
  if (files.length === 0) return [];

  const maxChanges = Math.max(...files.map((f) => f.changeCount), 1);
  const maxAuthors = Math.max(...files.map((f) => f.uniqueAuthors), 1);
  const now = Date.now();

  return files.map((file) => {
    // Freq Score: Normalized change count (0-1)
    const frequencyScore = file.changeCount / maxChanges;

    // Author Score: Normalized unique author count (0-1)
    const authorScore = file.uniqueAuthors / maxAuthors;

    // Recency Score: Inverse of time since last change (0-1)
    // 0 = 30+ days ago, 1 = changed just now
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const recencyRatio = Math.max(0, 1 - (now - file.lastChanged.getTime()) / msIn30Days);

    const totalScore =
      frequencyScore * RISK_WEIGHTS.changeFrequency +
      authorScore * RISK_WEIGHTS.uniqueAuthors +
      recencyRatio * RISK_WEIGHTS.recency;

    const level: RiskScore["level"] =
      totalScore >= 0.8 ? "critical" : totalScore >= 0.6 ? "high" : totalScore >= 0.4 ? "medium" : "low";

    return {
      path: file.path,
      score: Math.round(totalScore * 100),
      level,
      factors: {
        changeFrequency: Math.round(frequencyScore * 100),
        uniqueAuthors: Math.round(authorScore * 100),
        recentActivity: Math.round(recencyRatio * 100),
      },
    };
  });
}
