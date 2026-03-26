// src/types/insights.ts

import type { ISODateString } from './analytics.js';

// ─── Shared ───────────────────────────────────────────────────────────────────

/** 0–100 composite score. Higher = more concerning unless noted. */
export type Score = number;

// ─── Ownership Drift ──────────────────────────────────────────────────────────

export interface OwnershipPeriod {
  /** Email of the author who owned the file during this period */
  readonly ownerEmail: string;
  readonly ownerName: string;
  readonly from: ISODateString;
  readonly to: ISODateString;
  /** Number of commits this author made to the file in this period */
  readonly commitCount: number;
  /** Percentage of file commits owned during this period (0–1) */
  readonly ownershipShare: number;
}

export interface OwnershipTransition {
  readonly filePath: string;
  /** Ordered history of ownership periods, oldest first */
  readonly periods: OwnershipPeriod[];
  /** True if the file has had 2+ distinct primary owners */
  readonly hasTransitioned: boolean;
  /** Number of distinct authors who have held primary ownership */
  readonly ownerCount: number;
}

export interface OrphanedFile {
  readonly filePath: string;
  /** Email of the original primary author */
  readonly originalOwnerEmail: string;
  /** Date of their last commit to this file */
  readonly lastKnownActivityDate: ISODateString;
  /** Days since original owner last touched the file */
  readonly daysSinceOwnerActivity: number;
  /**
   * True if no other author has made commits to this file
   * after the original owner's last commit
   */
  readonly hasNoSuccessor: boolean;
}

export interface OwnershipConcentration {
  /**
   * Gini coefficient (0–1).
   * 0 = perfectly equal ownership across all authors.
   * 1 = one author owns everything.
   */
  readonly giniCoefficient: number;
  /** 'concentrated' if gini > 0.6, 'balanced' if 0.3–0.6, 'distributed' if < 0.3 */
  readonly rating: 'concentrated' | 'balanced' | 'distributed';
  /** The single author who owns the most files by commit count */
  readonly dominantOwnerEmail: string | null;
  /** Percentage of total file-commits owned by the dominant author (0–1) */
  readonly dominantOwnerShare: number;
}

export interface OwnershipDriftReport {
  readonly transitions: OwnershipTransition[];
  readonly orphanedFiles: OrphanedFile[];
  readonly concentration: OwnershipConcentration;
  readonly analyzedAt: ISODateString;
}

// ─── Dependency Churn Correlation ─────────────────────────────────────────────

export type CouplingTrend = 'strengthening' | 'weakening' | 'stable';

export interface CouplingStrength {
  /** First file in the pair */
  readonly fileA: string;
  /** Second file in the pair */
  readonly fileB: string;
  /**
   * Ratio of commits where both files changed together
   * vs total commits touching either file. (0–1)
   */
  readonly couplingScore: number;
  readonly trend: CouplingTrend;
  /**
   * Co-change count in the first half of the commit window
   * vs the second half. Used to derive trend.
   */
  readonly earlyWindowCount: number;
  readonly lateWindowCount: number;
}

export interface CouplingDrift {
  readonly fileA: string;
  readonly fileB: string;
  /** couplingScore in an earlier snapshot */
  readonly previousScore: number;
  /** couplingScore now */
  readonly currentScore: number;
  /** Absolute change: currentScore - previousScore */
  readonly delta: number;
  /**
   * 'decoupled' if delta < -0.2 (used to change together, no longer does).
   * 'coupled' if delta > 0.2 (newly coupled).
   * 'unchanged' otherwise.
   */
  readonly status: 'decoupled' | 'coupled' | 'unchanged';
}

export interface DependencyChurnReport {
  readonly couplings: CouplingStrength[];
  readonly drifts: CouplingDrift[];
  readonly analyzedAt: ISODateString;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type OnboardingRating = 'excellent' | 'good' | 'fair' | 'poor';

export interface OnboardingScore {
  /** Composite 0–100. Higher = easier to onboard into. */
  readonly score: Score;
  readonly rating: OnboardingRating;
  readonly breakdown: {
    /** 0–100. Higher = less rot. Inverted from rot levels. */
    readonly codeHealthScore: number;
    /** 0–100. Higher = more distributed knowledge. */
    readonly knowledgeDistributionScore: number;
    /** 0–100. Higher = lower blast radius risk. */
    readonly safetyScore: number;
    /** 0–100. Higher = better documented and lower churn. */
    readonly approachabilityScore: number;
  };
  readonly weakestArea: keyof OnboardingScore['breakdown'];
}

export interface LearningPathEntry {
  readonly filePath: string;
  /** Recommended order for a new contributor to explore (1 = start here) */
  readonly order: number;
  readonly reason: string;
  /**
   * Composite priority score used to derive order.
   * Lower raw score = safer/easier = comes first.
   */
  readonly priorityScore: number;
}

export interface OnboardingReport {
  readonly score: OnboardingScore;
  readonly learningPath: LearningPathEntry[];
  readonly analyzedAt: ISODateString;
}

// ─── Review Debt ──────────────────────────────────────────────────────────────

export interface ReviewCoverage {
  readonly totalCommits: number;
  readonly reviewedCommits: number;
  readonly directPushCommits: number;
  /** Ratio of commits with review signals (0–1) */
  readonly coverageRatio: number;
  /** 'healthy' >= 0.8, 'at-risk' 0.5–0.8, 'critical' < 0.5 */
  readonly rating: 'healthy' | 'at-risk' | 'critical';
}

export interface ReviewerLoad {
  readonly reviewerEmail: string;
  /** Number of PRs/commits this person reviewed */
  readonly reviewCount: number;
  /** Percentage of all reviews done by this person (0–1) */
  readonly reviewShare: number;
}

export interface ReviewConcentration {
  readonly reviewers: ReviewerLoad[];
  /**
   * True if the top reviewer holds > 50% of all review activity.
   * Indicates a bottleneck.
   */
  readonly isBottlenecked: boolean;
  readonly topReviewerEmail: string | null;
  readonly topReviewerShare: number;
}

export interface ReviewHealthScore {
  /** Composite 0–100. Higher = healthier review culture. */
  readonly score: Score;
  /** 'healthy' >= 70, 'at-risk' 40–69, 'critical' < 40 */
  readonly rating: 'healthy' | 'at-risk' | 'critical';
  readonly breakdown: {
    readonly coverageScore: number;
    readonly concentrationScore: number;
  };
}

export interface ReviewDebtReport {
  readonly coverage: ReviewCoverage;
  readonly concentration: ReviewConcentration;
  readonly health: ReviewHealthScore;
  readonly analyzedAt: ISODateString;
}
