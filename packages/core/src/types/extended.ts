// src/types/extended.ts

import type { ISODateString, WindowDays } from './analytics.js';
import type { Score } from './insights.js';

// ─── Hotspots ────────────────────────────────────────────────────────────────

export interface HotspotEntry {
  readonly path: string;
  readonly changeCount: number;
  readonly uniqueAuthors: number;
  readonly lastChanged: ISODateString;
}

export interface HotspotReport {
  readonly hotspots: HotspotEntry[];
  readonly windowDays: WindowDays;
  readonly generatedAt: ISODateString;
}

// ─── Risk Scoring ────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FileRisk {
  readonly path: string;
  /** 0–100 score. Higher = more risky. */
  readonly score: Score;
  readonly level: RiskLevel;
  /** 
   * Contributing factors.
   * Key: factor name (e.g., 'frequency', 'authors', 'recency')
   * Value: 0–100 score for that factor.
   */
  readonly factors: Record<string, number>;
}

export interface RiskReport {
  readonly fileRisks: FileRisk[];
  /** Average risk score across all files in the report */
  readonly averageScore: Score;
  readonly generatedAt: ISODateString;
}

// ─── Burnout ─────────────────────────────────────────────────────────────────

export interface BurnoutContributor {
  readonly email: string;
  readonly name: string;
  /** Percentage of commits made after hours (e.g., 22:00–06:00) (0–1) */
  readonly afterHoursRatio: number;
  /** Percentage of commits made on weekends (0–1) */
  readonly weekendRatio: number;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface BurnoutReport {
  readonly contributors: BurnoutContributor[];
  readonly totalAfterHoursCommits: number;
  readonly totalWeekendCommits: number;
  readonly analyzedAt: ISODateString;
}

// ─── Compass ─────────────────────────────────────────────────────────────────

export interface CompassEntry {
  readonly path: string;
  /** 1 = highest priority (read first) */
  readonly priority: number;
  readonly reason: string;
  readonly type: 'entry-point' | 'core' | 'config' | 'test';
}

export interface ComponentMaturity {
  readonly name: string;
  readonly status: 'stable' | 'evolving' | 'maturing';
}

export interface CompassReport {
  readonly essentials: CompassEntry[];
  readonly components: ComponentMaturity[];
  readonly analyzedAt: ISODateString;
}

// ─── Repository Health ───────────────────────────────────────────────────────

export interface HealthReport {
  /** 0–100 composite score */
  readonly overallHealth: Score;
  readonly stability: Score;
  readonly velocity: Score;
  readonly simplicity: Score;
  readonly coverage: Score;
  readonly generatedAt: ISODateString;
}

// ─── Impact & Rot ───────────────────────────────────────────────────────────

export interface ImpactEntry {
  readonly path: string;
  /** Average number of other files changed alongside this one */
  readonly blastRadius: number;
}

export interface ImpactReport {
  readonly entries: ImpactEntry[];
  readonly generatedAt: ISODateString;
}

export interface RotReport {
  /** Paths of files that haven't been touched in a long time */
  readonly staleFiles: string[];
  readonly analyzedAt: ISODateString;
}

// ─── Contributors ────────────────────────────────────────────────────────────

export interface ContributorDetail {
  readonly name: string;
  readonly email: string;
  readonly commitCount: number;
  readonly filesChanged: number;
  readonly firstCommit: ISODateString;
  readonly lastCommit: ISODateString;
  readonly activeDays: number;
  readonly insertions: number;
  readonly deletions: number;
  readonly stability: number; // 0–100 score
}

export interface ContributorReport {
  readonly contributors: ContributorDetail[];
  readonly analyzedAt: ISODateString;
}

