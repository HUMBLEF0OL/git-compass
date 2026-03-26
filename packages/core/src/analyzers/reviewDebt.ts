import type { GitCommit } from '../types/signal.js';
import type { 
  ReviewCoverage, 
  ReviewConcentration, 
  ReviewHealthScore, 
  ReviewDebtReport, 
  ReviewerLoad 
} from '../types/insights.js';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Checks if a commit has any review signals.
 */
function isReviewed(commit: GitCommit): boolean {
  const msg = commit.message;
  const hasReviewKeyword = /Reviewed-by:|Approved-by:|Co-authored-by:/i.test(msg);
  const hasPRReference = /#\d+/.test(msg);
  const isMerge = commit.parents.length > 1;

  return hasReviewKeyword || hasPRReference || isMerge;
}

/**
 * Computes review coverage metrics.
 */
export function computeReviewCoverage(commits: GitCommit[]): ReviewCoverage {
  const totalCommits = commits.length;
  let reviewedCommits = 0;
  let directPushCommits = 0;

  commits.forEach((c) => {
    if (isReviewed(c)) {
      reviewedCommits++;
    } else if (c.parents.length === 1) {
      directPushCommits++;
    }
  });

  const coverageRatio = totalCommits === 0 ? 0 : round4(reviewedCommits / totalCommits);
  
  let rating: 'healthy' | 'at-risk' | 'critical' = 'critical';
  if (coverageRatio >= 0.8) rating = 'healthy';
  else if (coverageRatio >= 0.5) rating = 'at-risk';

  return {
    totalCommits,
    reviewedCommits,
    directPushCommits,
    coverageRatio,
    rating,
  };
}

/**
 * Analyzes concentration of review work among authors.
 */
export function computeReviewConcentration(commits: GitCommit[]): ReviewConcentration {
  const tally: Record<string, number> = {};
  let totalReviews = 0;

  commits.forEach((c) => {
    const msg = c.message;
    // Extract emails from common review headers
    const matches = msg.matchAll(/(?:Reviewed-by|Approved-by|Co-authored-by): .*? <(.+?)>/gi);
    let found = false;
    for (const match of matches) {
      const email = match[1];
      if (email) {
        tally[email] = (tally[email] || 0) + 1;
        totalReviews++;
        found = true;
      }
    }

    // Fallback for merge commits if no explicit headers found
    if (!found && c.parents.length > 1 && c.author.email) {
      tally[c.author.email] = (tally[c.author.email] || 0) + 1;
      totalReviews++;
    }
  });

  const reviewers: ReviewerLoad[] = Object.entries(tally)
    .map(([email, count]) => ({
      reviewerEmail: email,
      reviewCount: count,
      reviewShare: totalReviews === 0 ? 0 : round4(count / totalReviews),
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);

  const topReviewer = reviewers[0] || null;
  const isBottlenecked = topReviewer ? topReviewer.reviewShare > 0.5 : false;

  return {
    reviewers,
    isBottlenecked,
    topReviewerEmail: topReviewer?.reviewerEmail || null,
    topReviewerShare: topReviewer?.reviewShare || 0,
  };
}

/**
 * Computes a composite health score for review culture.
 */
export function computeReviewHealthScore(
  coverage: ReviewCoverage, 
  concentration: ReviewConcentration
): ReviewHealthScore {
  const coverageScore = Math.round(coverage.coverageRatio * 100);
  
  let concentrationScore = 100;
  if (concentration.topReviewerShare > 0) {
    concentrationScore = Math.round((1 - concentration.topReviewerShare) * 100);
  }

  const score = Math.round((coverageScore * 0.6) + (concentrationScore * 0.4));

  let rating: 'healthy' | 'at-risk' | 'critical' = 'critical';
  if (score >= 70) rating = 'healthy';
  else if (score >= 40) rating = 'at-risk';

  return {
    score,
    rating,
    breakdown: {
      coverageScore,
      concentrationScore,
    },
  };
}

/**
 * Aggregates review debt metrics.
 */
export function analyzeReviewDebt(commits: GitCommit[]): ReviewDebtReport {
  const coverage = computeReviewCoverage(commits);
  const concentration = computeReviewConcentration(commits);
  
  return {
    coverage,
    concentration,
    health: computeReviewHealthScore(coverage, concentration),
    analyzedAt: new Date().toISOString(),
  };
}
