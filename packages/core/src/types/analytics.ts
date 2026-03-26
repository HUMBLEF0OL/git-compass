// src/types/analytics.ts

import type { GitCommit } from './signal.js';

// ─── Shared primitives ────────────────────────────────────────────────────────

/** ISO 8601 date string. e.g. "2024-03-15T10:22:00Z" */
export type ISODateString = string;

/** A sliding window size in days. e.g. 7, 30, 90 */
export type WindowDays = number;

// ─── Branch Analytics ─────────────────────────────────────────────────────────

export interface BranchInfo {
  readonly name: string;
  readonly isRemote: boolean;
  readonly lastCommitHash: string;
  readonly lastCommitDate: ISODateString;
  /** Author email of the last commit on this branch */
  readonly lastCommitAuthor: string;
}

export type BranchStatus = 'active' | 'stale' | 'abandoned';

export interface BranchLifecycle {
  readonly name: string;
  readonly status: BranchStatus;
  readonly firstCommitDate: ISODateString;
  readonly lastCommitDate: ISODateString;
  /** Days from first commit to merge into default branch. null if not yet merged. */
  readonly daysToMerge: number | null;
  /** Days since last commit as of analysis date */
  readonly daysSinceLastCommit: number;
  readonly authorEmail: string;
  /** True if branch has no associated merge into default branch within the commit window */
  readonly isAbandoned: boolean;
}

export interface StaleBranch {
  readonly name: string;
  readonly authorEmail: string;
  readonly lastCommitDate: ISODateString;
  readonly daysSinceLastCommit: number;
  readonly isRemote: boolean;
}

export interface MergeFrequency {
  /** Branch name */
  readonly name: string;
  /** Number of times this branch (or branches matching the pattern) merged into default */
  readonly mergeCount: number;
  /** Average days between merges. null if fewer than 2 merges. */
  readonly avgDaysBetweenMerges: number | null;
  /** Ratio of time branch is "idle" vs active. 0–1 float. */
  readonly idleRatio: number;
}

export interface BranchAnalyticsResult {
  readonly lifecycles: BranchLifecycle[];
  readonly staleBranches: StaleBranch[];
  readonly mergeFrequencies: MergeFrequency[];
  readonly analyzedAt: ISODateString;
}

// ─── Commit Quality ───────────────────────────────────────────────────────────

export type MessageQualityLevel = 'good' | 'acceptable' | 'poor';

export interface CommitMessageScore {
  readonly hash: string;
  readonly message: string;
  readonly qualityLevel: MessageQualityLevel;
  /** 0–100 */
  readonly score: number;
  readonly reasons: string[];
}

export type AtomicityLevel = 'atomic' | 'large' | 'god';

export interface AtomicityScore {
  readonly hash: string;
  /** Number of files changed */
  readonly fileCount: number;
  /** Number of distinct top-level directories touched */
  readonly directoriesAffected: number;
  readonly level: AtomicityLevel;
  /** True if commit crosses 3+ top-level directories */
  readonly crossesConcernBoundary: boolean;
}

export interface ReviewSignal {
  readonly hash: string;
  /** True if commit metadata indicates a direct push without review */
  readonly mergedWithoutReview: boolean;
  /** Author email */
  readonly author: string;
  /** PR number if detectable from commit message. null otherwise. */
  readonly prNumber: number | null;
}

export interface CommitQualityReport {
  readonly commits: Array<{
    hash: string;
    message: CommitMessageScore;
    atomicity: AtomicityScore;
    review: ReviewSignal;
  }>;
  /** Percentage of commits scoring 'good' message quality */
  readonly goodMessageRatio: number;
  /** Percentage of commits classified as 'atomic' */
  readonly atomicRatio: number;
  /** Percentage of commits merged without review signals */
  readonly noReviewRatio: number;
}

// ─── Velocity ─────────────────────────────────────────────────────────────────

export interface VelocityWindow {
  readonly windowStart: ISODateString;
  readonly windowEnd: ISODateString;
  readonly commitCount: number;
  readonly filesChanged: number;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly activeContributors: number;
}

export type AnomalyType = 'spike' | 'dip' | 'none';

export interface VelocityAnomaly {
  readonly window: VelocityWindow;
  readonly type: AnomalyType;
  /**
   * How many standard deviations from the rolling mean.
   * Positive = spike, negative = dip.
   */
  readonly zScore: number;
  /** Human-readable description of the anomaly */
  readonly description: string;
}

export interface ContributorVelocity {
  readonly authorEmail: string;
  readonly windows: VelocityWindow[];
  /** Average commits per window */
  readonly avgCommitsPerWindow: number;
  /** Coefficient of variation (stddev / mean). Lower = more consistent. */
  readonly consistencyScore: number;
}

export interface DeliveryConsistency {
  /** Team-level coefficient of variation across all windows */
  readonly teamConsistencyScore: number;
  /** 'consistent' if CV < 0.3, 'variable' if 0.3–0.6, 'erratic' if > 0.6 */
  readonly rating: 'consistent' | 'variable' | 'erratic';
  readonly windowSummaries: VelocityWindow[];
}

export interface VelocityReport {
  readonly windows: VelocityWindow[];
  readonly anomalies: VelocityAnomaly[];
  readonly byContributor: ContributorVelocity[];
  readonly teamConsistency: DeliveryConsistency;
  readonly analyzedAt: ISODateString;
}

// ─── Parser extension ─────────────────────────────────────────────────────────

export interface GitParserInstance {
  // Reference type — use the actual type from gitParser.ts if exported
  [key: string]: unknown;
}
