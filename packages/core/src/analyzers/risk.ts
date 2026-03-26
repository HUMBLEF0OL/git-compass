import type { HotspotEntry, RiskReport, FileRisk, RiskLevel } from "../types/extended.js";
import type { Score } from "../types/insights.js";

const RISK_WEIGHTS = {
  changeFrequency: 0.4,
  uniqueAuthors: 0.3,
  recency: 0.3,
} as const;

/**
 * Computes risk scores for files based on technical debt indicators.
 * Pure function.
 */
export function analyzeRisk(hotspots: HotspotEntry[]): RiskReport {
  if (hotspots.length === 0) {
    return {
      fileRisks: [],
      averageScore: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const maxChanges = Math.max(...hotspots.map((f) => f.changeCount), 1);
  const maxAuthors = Math.max(...hotspots.map((f) => f.uniqueAuthors), 1);
  const now = Date.now();

  const fileRisks: FileRisk[] = hotspots.map((file) => {
    // Freq Score: Normalized change count (0–1)
    const frequencyScore = file.changeCount / maxChanges;

    // Author Score: Normalized unique author count (0–1)
    const authorScore = file.uniqueAuthors / maxAuthors;

    // Recency Score: Inverse of time since last change (0–1)
    // 0 = 30+ days ago, 1 = changed just now
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const recencyRatio = Math.max(0, 1 - (now - new Date(file.lastChanged).getTime()) / msIn30Days);

    const totalScore =
      frequencyScore * RISK_WEIGHTS.changeFrequency +
      authorScore * RISK_WEIGHTS.uniqueAuthors +
      recencyRatio * RISK_WEIGHTS.recency;

    const score: Score = Math.round(totalScore * 100);

    const level: RiskLevel =
      score >= 80
        ? "critical"
        : score >= 60
          ? "high"
          : score >= 40
            ? "medium"
            : "low";

    return {
      path: file.path,
      score,
      level,
      factors: {
        frequency: Math.round(frequencyScore * 100),
        authors: Math.round(authorScore * 100),
        recency: Math.round(recencyRatio * 100),
      },
    };
  });

  const averageScore = Math.round(
    fileRisks.reduce((acc, r) => acc + r.score, 0) / fileRisks.length
  );

  return {
    fileRisks,
    averageScore,
    generatedAt: new Date().toISOString(),
  };
}

