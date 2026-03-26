import type { GitCommit } from '../types/signal.js';
import type { OnboardingReport, OnboardingScore, LearningPathEntry } from '../types/insights.js';
import { classifyFile } from '../parser/fileClassifier.js';

interface RotSummary {
  rotFileCount: number;
  totalFileCount: number;
}

interface SiloSummary {
  siloFileCount: number;
  totalFileCount: number;
}

interface BlastRadiusSummary {
  avgBlastRadius: number;
  maxBlastRadius: number;
}

interface ChurnSummary {
  avgChurnPerFile: number;
}

/**
 * Computes a weighted onboarding score based on health indices.
 */
export function computeOnboardingScore(
  rot: RotSummary, 
  silos: SiloSummary, 
  blastRadius: BlastRadiusSummary, 
  churn: ChurnSummary
): OnboardingScore {
  const codeHealthScore = 100 - Math.round((rot.rotFileCount / Math.max(rot.totalFileCount, 1)) * 100);
  const knowledgeDistributionScore = 100 - Math.round((silos.siloFileCount / Math.max(silos.totalFileCount, 1)) * 100);
  
  // Cap avgBlastRadius at 50 for scoring
  const safetyScore = 100 - Math.round((Math.min(blastRadius.avgBlastRadius, 50) / 50) * 100);
  
  // Cap avgChurnPerFile at 500
  const approachabilityScore = 100 - Math.round((Math.min(churn.avgChurnPerFile, 500) / 500) * 100);

  const rawScore = (codeHealthScore * 0.25) + (knowledgeDistributionScore * 0.30) + (safetyScore * 0.25) + (approachabilityScore * 0.20);
  const score = Math.round(rawScore);

  let rating: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (score >= 80) rating = 'excellent';
  else if (score >= 60) rating = 'good';
  else if (score >= 40) rating = 'fair';

  const breakdown = {
    codeHealthScore,
    knowledgeDistributionScore,
    safetyScore,
    approachabilityScore,
  };

  // Weakest area tied break order: codeHealthScore, knowledgeDistributionScore, safetyScore, approachabilityScore
  const order: (keyof typeof breakdown)[] = ['codeHealthScore', 'knowledgeDistributionScore', 'safetyScore', 'approachabilityScore'];
  const weakestArea = order.reduce((a, b) => breakdown[b] < breakdown[a] ? b : a);

  return {
    score,
    rating,
    breakdown,
    weakestArea,
  };
}

/**
 * Generates a starting path for new contributors.
 */
export function generateLearningPath(
  commits: GitCommit[], 
  options: { maxFiles?: number; now?: number } = {}
): LearningPathEntry[] {
  const { maxFiles = 20, now = Date.now() } = options;
  const fileStats: Record<string, { 
    commitCount: number; 
    authors: Set<string>; 
    lastTouch: number; 
    depth: number;
  }> = {};

  let maxCommitCount = 0;
  let maxUniqueAuthors = 0;
  let maxPathDepth = 0;

  commits.forEach((c) => {
    c.files.forEach((f) => {
      if (!fileStats[f]) {
        fileStats[f] = { 
          commitCount: 0, 
          authors: new Set(), 
          lastTouch: 0, 
          depth: f.split('/').length - 1 
        };
      }
      const stats = fileStats[f]!;
      stats.commitCount++;
      stats.authors.add(c.author.email);
      const t = new Date(c.date).getTime();
      if (t > stats.lastTouch) stats.lastTouch = t;

      if (stats.commitCount > maxCommitCount) maxCommitCount = stats.commitCount;
      if (stats.authors.size > maxUniqueAuthors) maxUniqueAuthors = stats.authors.size;
      if (stats.depth > maxPathDepth) maxPathDepth = stats.depth;
    });
  });


  const entries: LearningPathEntry[] = Object.entries(fileStats)
    .filter(([f]) => {
      const classification = classifyFile(f);
      return (
        classification.category !== 'lockfile' && 
        classification.category !== 'generated' && 
        classification.category !== 'asset'
      );
    })
    .map(([filePath, stats]) => {
      const churnScore = maxCommitCount === 0 ? 0 : (stats.commitCount / maxCommitCount) * 40;
      const authorScore = maxUniqueAuthors === 0 ? 0 : (stats.authors.size / maxUniqueAuthors) * 30;
      const daysSinceLastTouch = Math.floor((now - stats.lastTouch) / 86_400_000);
      const recencyScore = Math.min(20, (daysSinceLastTouch / 365) * 20);
      const depthScore = maxPathDepth === 0 ? 0 : (stats.depth / maxPathDepth) * 10;

      const priorityScore = churnScore + authorScore + recencyScore + depthScore;
      
      const scores = { churnScore, authorScore, recencyScore, depthScore };
      const highest = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a);
      
      let reason = 'Good entry point';
      if (highest[1] > 0) {
        if (highest[0] === 'churnScore') reason = 'Low churn — stable and predictable';
        else if (highest[0] === 'authorScore') reason = 'Few authors — clear ownership';
        else if (highest[0] === 'recencyScore') reason = 'Recently active — up to date';
        else if (highest[0] === 'depthScore') reason = 'Top-level file — easy to locate';
      }

      return {
        filePath,
        order: 0,
        reason,
        priorityScore,
      };
    })
    .sort((a, b) => a.priorityScore - b.priorityScore)
    .slice(0, maxFiles)
    .map((entry, idx) => ({ ...entry, order: idx + 1 }));

  return entries;
}

/**
 * Aggregates onboarding metrics.
 */
export function analyzeOnboarding(
  commits: GitCommit[],
  rot: RotSummary,
  silos: SiloSummary,
  blastRadius: BlastRadiusSummary,
  churn: ChurnSummary,
  options?: { maxFiles?: number }
): OnboardingReport {
  return {
    score: computeOnboardingScore(rot, silos, blastRadius, churn),
    learningPath: generateLearningPath(commits, options),
    analyzedAt: new Date().toISOString(),
  };
}
