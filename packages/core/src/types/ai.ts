import type { ISODateString, WindowDays, VelocityReport } from './analytics.js';
import type { Score, OwnershipDriftReport, DependencyChurnReport, OnboardingReport, ReviewDebtReport } from './insights.js';
import type { HotspotReport, RiskReport, BurnoutReport, CompassReport, HealthReport, ContributorReport } from './extended.js';

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Thrown when the AI response cannot be parsed as expected JSON */
export class AIParseError extends Error {
  constructor(
    public readonly raw: string,
    public readonly cause?: unknown,
  ) {
    super(`Failed to parse AI response as JSON: ${raw.slice(0, 120)}`);
    this.name = 'AIParseError';
  }
}

export type InsightSeverity = 'critical' | 'warning' | 'opportunity';

export interface Insight {
  readonly severity: InsightSeverity;
  readonly title: string;
  /** 1–3 sentence explanation */
  readonly description: string;
  /** Specific file paths, author emails, or metric values that evidence this insight */
  readonly evidence: string[];
  /** Concrete next step for the team */
  readonly recommendation: string;
}

// ─── AI Provider Core ──────────────────────────────────────────────────────────

export enum AIProviderType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

export interface AIProviderOptions {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface AIInvokeOptions extends AIProviderOptions {
  readonly systemInstructions?: string;
  readonly customPrompt?: string;
}

export interface AISummary {
  readonly digest: string;
  readonly generatedAt: Date;
  readonly model: string;
  readonly provider: AIProviderType;
}

/**
 * Unified bundle of all analysis reports for AI processing.
 */
export interface AnalysisResult {
  readonly hotspots: HotspotReport;
  readonly risk: RiskReport;
  readonly burnout: BurnoutReport;
  readonly compass: CompassReport;
  readonly velocity: VelocityReport;
  readonly insights: {
    readonly ownershipDrift: OwnershipDriftReport;
    readonly dependencyChurn: DependencyChurnReport;
    readonly onboarding: OnboardingReport;
    readonly reviewDebt: ReviewDebtReport;
  };
  readonly health: HealthReport;
  readonly contributors: ContributorReport;
  readonly meta: {
    readonly repoPath: string;
    readonly branch: string;
    readonly commitCount: number;
    readonly windowDays: WindowDays;
  };
}

export interface AIProvider {
  readonly type: AIProviderType;
  readonly model: string;
  generateSummary(analysis: AnalysisResult, options?: AIInvokeOptions): Promise<AISummary>;
  query(question: string, analysis: AnalysisResult, options?: AIInvokeOptions): Promise<string>;
  generateText(prompt: string, options?: AIInvokeOptions): Promise<string>;
}

// ─── Insight Pack ─────────────────────────────────────────────────────────────

export interface InsightPack {
  readonly critical: Insight[];
  readonly warnings: Insight[];
  readonly opportunities: Insight[];
  readonly generatedAt: ISODateString;
}

// ─── PR Context ───────────────────────────────────────────────────────────────

export interface PRFileSummary {
  readonly filePath: string;
  /** Risk level derived from existing analyzer data */
  readonly riskLevel: 'high' | 'medium' | 'low';
  /** Why this file is risky (or not) */
  readonly riskReason: string;
}

export interface PRContextBrief {
  /** One-paragraph plain-English summary of the PR's risk profile */
  readonly summary: string;
  readonly fileSummaries: PRFileSummary[];
  /** Overall risk level for the PR as a whole */
  readonly overallRisk: 'high' | 'medium' | 'low';
  /** Specific things a reviewer should focus on */
  readonly reviewFocusAreas: string[];
  readonly generatedAt: ISODateString;
}

// ─── Snapshot Comparison ──────────────────────────────────────────────────────

/**
 * A serializable point-in-time capture of all analytics results.
 * Passed to compareSnapshots to produce a delta narrative.
 */
export interface AnalyticsSnapshot {
  readonly capturedAt: ISODateString;
  readonly windowDays: number;
  readonly metrics: {
    readonly riskScoreAvg: number;
    readonly hotspotCount: number;
    readonly knowledgeSiloCount: number;
    readonly rotFileCount: number;
    readonly onboardingScore: Score;
    readonly reviewCoverageRatio: number;
    readonly teamConsistencyScore: number;
    /** Any additional numeric metrics the caller wants to track */
    readonly [key: string]: number;
  };
}

export type RegressionSeverity = 'critical' | 'moderate' | 'minor';

export interface Regression {
  readonly metricName: string;
  readonly previousValue: number;
  readonly currentValue: number;
  /** Absolute change: currentValue - previousValue */
  readonly delta: number;
  /** Percentage change relative to previousValue */
  readonly percentChange: number;
  readonly severity: RegressionSeverity;
  readonly direction: 'improved' | 'regressed';
}

export interface SnapshotDelta {
  readonly regressions: Regression[];
  readonly improvements: Regression[];
  /** Plain-English narrative generated by the AI engine */
  readonly narrative: string;
  readonly snapshotA: AnalyticsSnapshot;
  readonly snapshotB: AnalyticsSnapshot;
  readonly generatedAt: ISODateString;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export type TemplateAudience = 'technical' | 'executive' | 'onboarding';
export type TemplateLength = 'brief' | 'standard' | 'detailed';

export interface PromptTemplate {
  readonly audience: TemplateAudience;
  readonly length: TemplateLength;
  /** Custom instructions appended to every prompt built with this template */
  readonly customInstructions?: string;
}

export interface TemplatedSummarizerOptions {
  readonly template: PromptTemplate;
}

