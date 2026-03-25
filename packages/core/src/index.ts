export * from "./parser/index.js";

export * from "./analyzers/index.js";
export * from "./ai/index.js";
export * from "./utils/index.js";

// Signal Quality — P0
export { classifyCommit, isLockfileOnlyCommit } from './parser/commitClassifier.js';
export { classifyFile } from './parser/fileClassifier.js';
export { createFilterPipeline } from './parser/filterPipeline.js';
export { computeSignalIntegrity } from './analyzers/signalIntegrity.js';
export { analyzeContributors, deduplicateContributors } from './analyzers/contributors.js';
export type {
  CommitType,
  NoiseReason,
  ClassifiedCommit,
  FileCategory,
  ClassifiedFile,
  FilterPipelineOptions,

  FilterPipeline,
  NoiseSummary,
  SignalIntegrityReport,
  CanonicalContributor,
  DeduplicationResult,
  GitCommit,
} from './types/signal.js';

export { analyzeHotspots } from './analyzers/hotspots.js';
export { analyzeRisk } from './analyzers/risk.js';
export { analyzeBurnout } from './analyzers/burnout.js';
export { analyzeCompass } from './analyzers/compass.js';
export { analyzeImpact } from './analyzers/impact.js';
export { analyzeRot } from './analyzers/rot.js';
export { analyzeHealth } from './analyzers/health.js';
export type {
  HotspotEntry,
  HotspotReport,
  RiskLevel,
  FileRisk,
  RiskReport,
  BurnoutContributor,
  BurnoutReport,
  CompassEntry,
  ComponentMaturity,
  CompassReport,
  ImpactEntry,
  ImpactReport,
  RotReport,
  HealthReport,
  ContributorDetail,
  ContributorReport,
} from './types/extended.js';

// Analytics — P1
export { getBranches } from './parser/git-parser.js';
export {
  analyzeBranchLifecycles,
  detectStaleBranches,
  computeMergeFrequency,
} from './analyzers/branches.js';
export {
  scoreCommitMessage,
  detectAtomicity,
  computeReviewSignals,
  analyzeCommitQuality,
} from './analyzers/commitQuality.js';
export {
  computeVelocityWindows,
  computeVelocityTrend,
  detectVelocityAnomalies,
  computeContributorVelocity,
  computeDeliveryConsistency,
  analyzeVelocity,
} from './analyzers/velocity.js';
export type {
  ISODateString,
  WindowDays,
  BranchInfo,
  BranchStatus,
  BranchLifecycle,
  StaleBranch,
  MergeFrequency,
  BranchAnalyticsResult,
  MessageQualityLevel,
  CommitMessageScore,
  AtomicityLevel,
  AtomicityScore,
  ReviewSignal,
  CommitQualityReport,
  VelocityWindow,
  AnomalyType,
  VelocityAnomaly,
  ContributorVelocity,
  DeliveryConsistency,
  VelocityReport,
} from './types/analytics.js';

// Insights — P2
export {
  computeOwnershipTransitions,
  detectOrphanedFiles,
  computeOwnershipConcentration,
  analyzeOwnershipDrift,
} from './analyzers/ownershipDrift.js';
export {
  correlateChangeFrequency,
  detectCouplingDrift,
  analyzeDependencyChurn,
} from './analyzers/dependencyChurn.js';
export {
  computeOnboardingScore,
  generateLearningPath,
  analyzeOnboarding,
} from './analyzers/onboarding.js';
export {
  computeReviewCoverage,
  computeReviewConcentration,
  computeReviewHealthScore,
  analyzeReviewDebt,
} from './analyzers/reviewDebt.js';
export type {
  Score,
  OwnershipPeriod,
  OwnershipTransition,
  OrphanedFile,
  OwnershipConcentration,
  OwnershipDriftReport,
  CouplingTrend,
  CouplingStrength,
  CouplingDrift,
  DependencyChurnReport,
  OnboardingRating,
  OnboardingScore,
  LearningPathEntry,
  OnboardingReport,
  ReviewCoverage,
  ReviewerLoad,
  ReviewConcentration,
  ReviewHealthScore,
  ReviewDebtReport,
} from './types/insights.js';

// AI Engine — P3
export { generateInsightPack, buildInsightPackPrompt, parseInsightPackResponse } from './ai/insightPack.js';
export { generatePRContext, buildPRFileSummaries, buildPRContextPrompt, parsePRContextResponse } from './ai/prContext.js';
export { compareSnapshots, detectRegressions, buildComparisonPrompt, parseComparisonResponse } from './ai/snapshotComparison.js';
export {
  createSummarizerWithTemplate,
  DEFAULT_TEMPLATE,
  EXECUTIVE_TEMPLATE,
  ONBOARDING_TEMPLATE,
} from './ai/templates.js';
export { resolveTemplateInstructions } from './ai/utils.js';
export { summarizeWithTemplate } from './ai/summarizer.js';
export type {
  AIParseError,
  InsightSeverity,
  Insight,
  InsightPack,
  PRFileSummary,
  PRContextBrief,
  AnalyticsSnapshot,
  RegressionSeverity,
  Regression,
  SnapshotDelta,
  TemplateAudience,
  TemplateLength,
  PromptTemplate,
  TemplatedSummarizerOptions,
} from './types/ai.js';

// Infrastructure — P4
export { getCommitsSince } from './parser/git-parser.js';
export {
  createIncrementalContext,
  mergeBaselines,
} from './infrastructure/incremental.js';
export {
  compose,
  composeSync,
  withErrorHandler,
} from './infrastructure/pipeline.js';
export {
  djb2Hash,
  serializeSnapshot,
  deserializeSnapshot,
  isValidSnapshot,
} from './infrastructure/snapshot.js';
export type {
  AnalysisBaseline,
  IncrementalContext,
  IncrementalOptions,
  PipelineStep,
  ComposedPipeline,
  SnapshotEnvelope,
  DeserializeOptions,
  SnapshotCorruptionError,
  SnapshotVersionError,
} from './types/infrastructure.js';

