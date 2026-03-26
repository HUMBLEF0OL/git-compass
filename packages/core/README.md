# @git-compass/core

<div align="center">

[![npm version](https://img.shields.io/npm/v/@git-compass/core?style=flat-square&color=0f3460&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/core)
[![npm downloads](https://img.shields.io/npm/dm/@git-compass/core?style=flat-square&color=0f3460&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@git-compass/core?style=flat-square&color=0f3460&labelColor=0a0c10)](https://bundlephobia.com/package/@git-compass/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6?style=flat-square&labelColor=0a0c10)](https://www.typescriptlang.org)
[![tree-shakeable](https://img.shields.io/badge/tree--shakeable-yes-34d399?style=flat-square&labelColor=0a0c10)](https://bundlephobia.com/package/@git-compass/core)
[![zero dependencies](https://img.shields.io/badge/prod%20dependencies-0-34d399?style=flat-square&labelColor=0a0c10)](https://www.npmjs.com/package/@git-compass/core?activeTab=dependencies)
[![Build](https://img.shields.io/github/actions/workflow/status/git-compass/core/ci.yml?style=flat-square&labelColor=0a0c10)](https://github.com/git-compass/core/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-34d399?style=flat-square&labelColor=0a0c10)](https://github.com/git-compass/core)

**The analytical engine powering the Git Compass ecosystem.**

Deep Git analytics as pure, composable TypeScript functions. Detect hotspots, knowledge silos, burnout patterns, ownership drift, coupling decay, and more with zero binary dependencies and a built-in AI layer.

[Installation](#installation) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Signal Quality](#signal-quality--noise-filtering) · [AI Engine](#ai-engine) · [Infrastructure](#infrastructure)

</div>

---

## What is `@git-compass/core`?

`@git-compass/core` is a **strictly functional Git analytics library** for Node.js and TypeScript. It parses raw Git history and transforms it into structured, AI-ready analytical data with no database, no daemon, and no binary to install.

It is the shared engine behind:

- **`@git-compass/cli`** — command-line analytics dashboard
- **`@git-compass/web`** — browser-based repository health dashboard

You can also use it directly to build your own Git analytics tooling, CI integrations, or engineering intelligence dashboards.

---

## Installation

```bash
# npm
npm install @git-compass/core

# pnpm
pnpm add @git-compass/core

# yarn
yarn add @git-compass/core
```

### Requirements

- **Node.js** `>=18.0.0`
- **TypeScript** `>=5.0` (optional — fully usable from plain JS)
- A valid local Git repository to analyse

### Peer Dependencies

`@git-compass/core` has **zero production dependencies**. The only optional peer is the Anthropic SDK, required only if you use the AI engine:

```bash
pnpm add @anthropic-ai/sdk   # only if using /ai functions
```

---

## Quick Start

```typescript
import {
  createGitParser,
  getCommits,
  createFilterPipeline,
  analyzeHotspots,
  computeRiskScores,
  detectKnowledgeSilos,
  generateInsightPack,
} from '@git-compass/core';

// 1. Create a parser pointed at any local repo
const git = createGitParser('./path/to/your/repo');

// 2. Fetch commits for a rolling 30-day window
const rawCommits = await getCommits(git, { windowDays: 30 });

// 3. Filter out noise (bots, lockfiles, merge commits, generated files)
const pipeline = createFilterPipeline({
  excludeCommitTypes: ['merge', 'bot', 'release'],
  excludeFileCategories: ['lockfile', 'generated', 'asset'],
});
const commits = pipeline.filter(rawCommits);

// 4. Run analyzers — all pure functions
const hotspots  = analyzeHotspots(commits);
const riskScores = computeRiskScores(hotspots);
const silos     = detectKnowledgeSilos(commits);

console.log(riskScores[0]);
// { filePath: 'src/auth/session.ts', level: 'critical', score: 94, ... }

// 5. Generate an AI-powered insight pack (requires @anthropic-ai/sdk)
const insights = await generateInsightPack({ hotspots, riskScores, silos });
console.log(insights.critical[0].recommendation);
// "Pair-program on src/auth/session.ts — one author holds 91% of commits."
```

---

## Core Philosophy

`@git-compass/core` is built on four non-negotiable principles:

**No Classes** — All logic is pure, stateless functions. Nothing to instantiate, nothing to configure globally.

**No Mutation** — Every transformation produces a new object. Input is never modified.

**Side Effects Isolated** — The only functions that perform I/O are in the `/parser` layer (`createGitParser`, `getCommits`, `getBranches`, `getCommitsSince`). Every analyzer and infrastructure function is a pure transformation.

**Zero Binary Dependencies** — No native addons, no Go binaries, no Python. Ships as standard ESM/CJS TypeScript.

---

## Signal Quality — Noise Filtering

Before any analysis runs, `@git-compass/core` filters the commit stream to remove noise that would corrupt downstream results. This is the most important step and runs before any analyzer.

### The Problem

Raw Git history contains four categories of noise:

- **Bot commits** — Dependabot, Renovate, GitHub Actions bots inflating contributor counts and churn metrics
- **Merge commits** — auto-generated commits inflating file change frequency
- **Lockfile-only commits** — `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` changes with no signal value
- **Generated files** — `*.snap`, `dist/**`, `openapi.json` treated as hotspots when they're auto-generated

### The Solution

```typescript
import {
  createFilterPipeline,
  classifyCommit,
  classifyFile,
  computeSignalIntegrity,
  deduplicateContributors,
} from '@git-compass/core';

// Full pipeline — sensible defaults out of the box
const pipeline = createFilterPipeline({
  excludeCommitTypes: ['merge', 'bot', 'revert', 'release'],
  excludeFileCategories: ['lockfile', 'generated', 'asset'],
  excludePatterns: ['**/migrations/**', 'src/generated/**'],
  customBotPatterns: ['release-bot', 'my-org-automation'],
  identityMap: {
    'john@personal.com': 'john@company.com', // merge split identities
  },
});

const cleanCommits = pipeline.filter(rawCommits);

// Understand how much noise was removed
const integrity = computeSignalIntegrity(rawCommits, cleanCommits);
console.log(integrity);
// {
//   totalCommits: 1240,
//   cleanCommits: 928,
//   filteredOut: 312,
//   noiseRatio: 0.2516,
//   topNoiseSources: [
//     { reason: 'bot_author', count: 180, topOffender: 'dependabot[bot]' },
//     { reason: 'lockfile_only', count: 89, topOffender: null },
//     { reason: 'merge_commit', count: 43, topOffender: null },
//   ],
//   affectedAnalyzers: ['blastRadius', 'churn', 'contributors', 'hotspots', ...]
// }

// Resolve split contributor identities
const { canonical, botsRemoved } = deduplicateContributors(contributors, {
  identityMap: { 'john@personal.com': 'john@company.com' },
});
```

### File Classification

Every file path is classified before reaching an analyzer:

```typescript
import { classifyFile } from '@git-compass/core';

classifyFile('package-lock.json');
// { category: 'lockfile', isNoise: true, noiseReason: 'lockfile' }

classifyFile('src/auth/login.ts');
// { category: 'source', isNoise: false, noiseReason: null }

classifyFile('.github/workflows/ci.yml');
// { category: 'ci', isNoise: false, noiseReason: null }
// Note: ci/config/docs are NOT noise by default — they carry signal for some analyzers
```

**File categories:** `source` · `config` · `lockfile` · `generated` · `test` · `docs` · `asset` · `ci`

---

## API Reference

### Parsers

Functions in the parser layer perform I/O. All other functions are pure.

```typescript
import {
  createGitParser,
  getCommits,
  getBranches,
  getCommitsSince,
} from '@git-compass/core';

const git = createGitParser('/path/to/repo');

// Fetch commits within a rolling window
const commits = await getCommits(git, { windowDays: 90 });

// Fetch branch metadata
const branches = await getBranches(git);

// Fetch only commits since a SHA or date (for incremental analysis)
const newCommits = await getCommitsSince(git, 'a3f8c21');
const newCommits2 = await getCommitsSince(git, '2024-06-01');
```

---

### Hotspots & Risk Scoring

Identify the files that pose the greatest risk to your codebase.

```typescript
import {
  analyzeHotspots,
  computeRiskScores,
} from '@git-compass/core';

const hotspots = analyzeHotspots(commits);
// Returns files ranked by change frequency and author diversity

const riskScores = computeRiskScores(hotspots);
// [
//   { filePath: 'src/payments/processor.ts', score: 94, level: 'critical' },
//   { filePath: 'src/auth/session.ts', score: 78, level: 'high' },
//   ...
// ]
```

---

### Churn & Contributors

Understand velocity, net churn, and developer engagement.

```typescript
import {
  analyzeChurn,
  analyzeContributors,
  deduplicateContributors,
} from '@git-compass/core';

const churn = analyzeChurn(commits);
// Lines added/removed per file, net churn, rolling trend

const contributors = analyzeContributors(commits);
// Developer engagement, impact scores, activity timelines

const { canonical, botsRemoved } = deduplicateContributors(contributors);
// Merges split identities, removes bots from counts
```

---

### Knowledge Silos & Bus Factor

Find files owned by a single person — your highest bus-factor risk.

```typescript
import { detectKnowledgeSilos } from '@git-compass/core';

const silos = detectKnowledgeSilos(commits);
// [
//   { filePath: 'src/billing/stripe.ts', owner: 'alice@co.com', ownershipShare: 0.97 },
//   ...
// ]
```

---

### Temporal Coupling

Detect files that consistently change together — hidden logical dependencies.

```typescript
import { analyzeTemporalCoupling } from '@git-compass/core';

const coupling = analyzeTemporalCoupling(commits);
// [
//   { fileA: 'src/api/routes.ts', fileB: 'src/api/types.ts', couplingScore: 0.87 },
//   ...
// ]
```

---

### Blast Radius

Measure the average collateral impact when a specific file changes.

```typescript
import { computeBlastRadius } from '@git-compass/core';

const blastRadius = computeBlastRadius(commits);
// [
//   { filePath: 'src/types/index.ts', avgFilesAffected: 18.3 },
//   ...
// ]
```

---

### Rot Detection

Surface abandoned code not touched in over 180 days.

```typescript
import { detectRot } from '@git-compass/core';

const rot = detectRot(commits);
// Files with no commits in 180+ days — candidates for deletion or documentation
```

---

### Burnout Detection

Identify high-intensity work patterns per contributor.

```typescript
import { analyzeBurnout } from '@git-compass/core';

const burnout = analyzeBurnout(commits);
// After-hours and weekend commit ratios per author
// { authorEmail, afterHoursRatio, weekendRatio, intensityLevel }
```

---

### Branch Analytics

```typescript
import {
  getBranches,
  analyzeBranchLifecycles,
  detectStaleBranches,
  computeMergeFrequency,
} from '@git-compass/core';

const branches  = await getBranches(git);
const lifecycle = analyzeBranchLifecycles(branches, commits);
// status: 'active' | 'stale' | 'abandoned'
// daysToMerge, daysSinceLastCommit, isAbandoned

const stale     = detectStaleBranches(branches, { thresholdDays: 60 });
const frequency = computeMergeFrequency(commits);
```

---

### Commit Quality

Score every commit for message quality, atomicity, and review signals.

```typescript
import {
  scoreCommitMessage,
  detectAtomicity,
  computeReviewSignals,
  analyzeCommitQuality,
} from '@git-compass/core';

const quality = analyzeCommitQuality(commits);
// {
//   goodMessageRatio: 0.72,
//   atomicRatio: 0.85,
//   noReviewRatio: 0.14,
//   commits: [
//     {
//       hash: 'a3f8c21',
//       message: { score: 85, qualityLevel: 'good', reasons: [] },
//       atomicity: { level: 'atomic', fileCount: 3, crossesConcernBoundary: false },
//       review: { mergedWithoutReview: false, prNumber: 142 },
//     }
//   ]
// }
```

---

### Velocity & Delivery Consistency

Rolling window velocity with statistical anomaly detection.

```typescript
import {
  analyzeVelocity,
  computeVelocityTrend,
  detectVelocityAnomalies,
  computeDeliveryConsistency,
} from '@git-compass/core';

const report = analyzeVelocity(commits, 14); // 14-day windows

report.anomalies;
// [{ type: 'dip', zScore: -2.4, description: 'Unusually low activity...' }]

report.teamConsistency;
// { rating: 'consistent', teamConsistencyScore: 0.18 }
```

---

### Ownership Drift

Track how file ownership changes over time — not just who owns a file now, but the full trajectory.

```typescript
import {
  computeOwnershipTransitions,
  detectOrphanedFiles,
  computeOwnershipConcentration,
  analyzeOwnershipDrift,
} from '@git-compass/core';

const report = analyzeOwnershipDrift(commits, activeContributorEmails);

report.transitions[0];
// {
//   filePath: 'src/payments/processor.ts',
//   hasTransitioned: true,
//   ownerCount: 3,
//   periods: [
//     { ownerEmail: 'alice@co.com', from: '2022-01-01', to: '2023-06-12', ownershipShare: 0.91 },
//     { ownerEmail: 'bob@co.com',   from: '2023-06-13', to: '2024-01-01', ownershipShare: 0.88 },
//   ]
// }

report.orphanedFiles[0];
// { filePath: 'src/legacy/parser.ts', hasNoSuccessor: true, daysSinceOwnerActivity: 341 }

report.concentration;
// { giniCoefficient: 0.71, rating: 'concentrated', dominantOwnerEmail: 'alice@co.com' }
```

---

### Dependency Churn Correlation

Detect co-change relationships and how they evolve over time.

```typescript
import {
  correlateChangeFrequency,
  detectCouplingDrift,
  analyzeDependencyChurn,
} from '@git-compass/core';

const report = analyzeDependencyChurn(currentCommits, previousCommits);

report.couplings[0];
// {
//   fileA: 'src/api/routes.ts', fileB: 'src/api/handlers.ts',
//   couplingScore: 0.83, trend: 'strengthening'
// }

report.drifts[0];
// {
//   fileA: 'src/old/parser.ts', fileB: 'src/old/lexer.ts',
//   previousScore: 0.74, currentScore: 0.12,
//   delta: -0.62, status: 'decoupled'  // refactor candidate
// }
```

---

### Onboarding Score

A composite score for how easy a repository is to onboard into — unique to `@git-compass/core`.

```typescript
import {
  computeOnboardingScore,
  generateLearningPath,
  analyzeOnboarding,
} from '@git-compass/core';

const score = computeOnboardingScore(rotSummary, siloSummary, blastSummary, churnSummary);
// {
//   score: 67,
//   rating: 'good',
//   weakestArea: 'knowledgeDistributionScore',
//   breakdown: {
//     codeHealthScore: 82,
//     knowledgeDistributionScore: 41,
//     safetyScore: 74,
//     approachabilityScore: 71,
//   }
// }

const path = generateLearningPath(commits, { maxFiles: 10 });
// Ordered list of files a new contributor should explore first
// Ranked by: low churn, few authors, recent activity, shallow path depth
// [
//   { order: 1, filePath: 'src/utils/format.ts', reason: 'Low churn — stable and predictable' },
//   { order: 2, filePath: 'src/types/index.ts',  reason: 'Few authors — clear ownership' },
//   ...
// ]
```

---

### Review Debt

Surface gaps in code review coverage and reviewer bottlenecks.

```typescript
import { analyzeReviewDebt } from '@git-compass/core';

const report = analyzeReviewDebt(commits);

report.coverage;
// { coverageRatio: 0.73, rating: 'at-risk', directPushCommits: 27 }

report.concentration;
// { isBottlenecked: true, topReviewerEmail: 'alice@co.com', topReviewerShare: 0.64 }

report.health;
// { score: 58, rating: 'at-risk' }
```

---

### Compass — Onboarding File Prioritization

```typescript
import { analyzeCompass } from '@git-compass/core';

const compass = analyzeCompass(commits);
// Prioritised file list for onboarding — low blast radius, low churn, clear ownership
```

---

## AI Engine

The AI layer provides structured, prose, and comparative analytics via a provider-agnostic abstraction. It supports multiple LLM engines out of the box, with built-in environment-based discovery.

### Supported Providers

| Provider | Environment Variable | Peer Dependency |
|---|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` | `@ai-sdk/anthropic` |
| **OpenAI** | `OPENAI_API_KEY` | `@ai-sdk/openai` |
| **Gemini** | `GOOGLE_GENAI_API_KEY` | `@ai-sdk/google` |

### Provider Configuration

All AI functions (`generateInsightPack`, `generatePRContext`, `compareSnapshots`) allow you to specify the provider in three ways:

1. **Environment Discovery (Default)**: Automatically picks a provider based on your available API keys.
2. **Explicit Type**: Pass `providerType` and an optional `apiKey`.
3. **Custom Instance**: Pass a full `AIProvider` instance for complete control (e.g., custom models, endpoints).

```typescript
import { generateInsightPack, AIProviderType } from '@git-compass/core';

// 1. Automatic (uses ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GENAI_API_KEY)
const insights = await generateInsightPack(data);

// 2. Explicit Type
const insights = await generateInsightPack(data, {
  providerType: AIProviderType.OPENAI,
  apiKey: 'sk-...'
});

// 3. Custom Instance (via factory)
import { getAIProvider } from '@git-compass/core';
const myProvider = getAIProvider(AIProviderType.GEMINI, 'key...', { model: 'gemini-1.5-flash' });
const insights = await generateInsightPack(data, { provider: myProvider });
```

### Insight Packs

```typescript
import { generateInsightPack, DEFAULT_TEMPLATE, EXECUTIVE_TEMPLATE } from '@git-compass/core';

// Returns a structured object — no parsing required by the consumer
const insights = await generateInsightPack(analyticsResult);
// {
//   critical: [
//     {
//       severity: 'critical',
//       title: 'Payments module: single-author silo',
//       description: 'src/payments/ has had one author for 14 months...',
//       evidence: ['src/payments/processor.ts', 'alice@co.com', '97% ownership'],
//       recommendation: 'Schedule a knowledge-transfer session this sprint.'
//     }
//   ],
//   warnings: [...],
//   opportunities: [...],
// }

// Tailor output for executives
const execInsights = await generateInsightPack(analyticsResult, {
  template: EXECUTIVE_TEMPLATE,
});
```

### PR Context Briefs

Surfaces the risk profile of a pull request based on historical analytics — ideal for VS Code or CI integration.

```typescript
import { generatePRContext } from '@git-compass/core';

const brief = await generatePRContext({
  changedFiles: ['src/auth/session.ts', 'src/payments/processor.ts'],
  fileRiskScores:    { 'src/auth/session.ts': 78 },
  fileHotspotScores: { 'src/auth/session.ts': 82 },
  siloFiles:         ['src/payments/processor.ts'],
  fileBlastRadius:   { 'src/auth/session.ts': 14 },
});

brief.overallRisk;       // 'high'
brief.reviewFocusAreas;  // ['Check session invalidation logic', 'Verify payment rollback...']
brief.fileSummaries;     // Pure-computed, never overridden by AI
```

### Snapshot Comparison

Compare two point-in-time analytics snapshots and generate a narrative of what changed.

```typescript
import { detectRegressions, compareSnapshots } from '@git-compass/core';

// Pure — no AI call
const { regressions, improvements } = detectRegressions(snapshotJan, snapshotFeb);
// regressions: [{ metricName: 'knowledgeSiloCount', delta: 4, percentChange: 66.67, severity: 'critical' }]
// improvements: [{ metricName: 'reviewCoverageRatio', delta: 0.12, direction: 'improved' }]

// With AI narrative
const delta = await compareSnapshots(snapshotJan, snapshotFeb);
delta.narrative;
// "The codebase regressed significantly on knowledge distribution in February.
//  Four new silo files emerged, all in the payments module, coinciding with..."
```

### Configurable Templates

```typescript
import {
  createSummarizerWithTemplate,
  DEFAULT_TEMPLATE,
  EXECUTIVE_TEMPLATE,
  ONBOARDING_TEMPLATE,
} from '@git-compass/core';

// Factory — bake a template into a reusable summarizer
const execSummarizer = createSummarizerWithTemplate(EXECUTIVE_TEMPLATE);
const insights = await execSummarizer.summarize(analyticsResult);

// Or build a custom template
import { resolveTemplateInstructions } from '@git-compass/core';

const custom = resolveTemplateInstructions({
  audience: 'technical',
  length: 'detailed',
  customInstructions: 'Always reference specific file paths. Include line count estimates.',
});
```

**Built-in templates:**

| Template | Audience | Length |
|---|---|---|
| `DEFAULT_TEMPLATE` | Technical | Standard |
| `EXECUTIVE_TEMPLATE` | Executive | Brief |
| `ONBOARDING_TEMPLATE` | New team member | Detailed |

---

## Infrastructure

### Incremental Analysis

Avoid re-processing full history on every run. Fetch only new commits since a given SHA or date, merge with a cached baseline.

```typescript
import {
  getCommitsSince,
  createIncrementalContext,
  serializeSnapshot,
  deserializeSnapshot,
} from '@git-compass/core';

// 1. On first run — full analysis, then persist the baseline
const commits  = await getCommits(git, { windowDays: 30 });
const baseline = { headCommitHash: commits[0].hash, commits, windowDays: 30, ... };
fs.writeFileSync('baseline.json', serializeSnapshot(baseline));

// 2. On subsequent runs — fetch only new commits
const newCommits = await getCommitsSince(git, baseline.headCommitHash);
const storedBaseline = deserializeSnapshot(fs.readFileSync('baseline.json', 'utf8'));

const ctx = createIncrementalContext(newCommits, {
  since: storedBaseline.headCommitHash,
  baseline: storedBaseline,
  windowDays: 30,
});

ctx.hasNewData;       // true/false
ctx.newCommits;       // only the net-new commits
ctx.mergedCommits;    // full window: new + baseline, deduplicated, capped
ctx.updatedBaseline;  // persist this for the next run
```

### Pipeline Composition

Chain analyzer functions into a single callable pipeline.

```typescript
import { compose, composeSync, withErrorHandler } from '@git-compass/core';

// Async pipeline — awaits every step, handles sync and async uniformly
const pipeline = compose(
  analyzeHotspots,
  computeRiskScores,
  detectKnowledgeSilos,
  generateInsightPack,
);

pipeline.stepCount; // 4
const result = await pipeline(commits);

// Sync pipeline
const syncPipeline = composeSync(
  analyzeHotspots,
  computeRiskScores,
);

// With error handling
const safePipeline = withErrorHandler(pipeline, (error, input) => {
  console.error('Pipeline failed:', error);
  return fallbackResult;
});
```

### Serializable Snapshots

Persist and restore any analytics result with built-in integrity checking.

```typescript
import {
  serializeSnapshot,
  deserializeSnapshot,
  isValidSnapshot,
} from '@git-compass/core';

// Serialize — produces a checksum-signed JSON string
const serialized = serializeSnapshot(analyticsResult);

// Validate before deserializing (e.g. reading from disk)
if (isValidSnapshot(serialized)) {
  const restored = deserializeSnapshot(serialized);
}

// Typed errors on corruption or version mismatch
try {
  const restored = deserializeSnapshot(tamperedString);
} catch (e) {
  if (e instanceof SnapshotCorruptionError) { /* checksum mismatch */ }
  if (e instanceof SnapshotVersionError)    { /* schema version mismatch */ }
}
```

---

## TypeScript

`@git-compass/core` is written in TypeScript and ships full type definitions. No `@types/` package needed.

```typescript
import type {
  // Signal Quality (P0)
  GitCommit, ClassifiedCommit, ClassifiedFile,
  FileCategory, CommitType, FilterPipelineOptions,
  SignalIntegrityReport,

  // Analytics (P1)
  BranchLifecycle, StaleBranch, CommitQualityReport,
  VelocityReport, VelocityAnomaly, DeliveryConsistency,

  // Insights (P2)
  OwnershipDriftReport, OwnershipTransition, OrphanedFile,
  DependencyChurnReport, CouplingStrength, CouplingDrift,
  OnboardingReport, OnboardingScore, LearningPathEntry,
  ReviewDebtReport, ReviewCoverage, ReviewHealthScore,

  // AI (P3)
  InsightPack, Insight, PRContextBrief,
  AnalyticsSnapshot, SnapshotDelta, Regression,
  PromptTemplate, TemplateAudience,

  // Infrastructure (P4)
  AnalysisBaseline, IncrementalContext,
  ComposedPipeline, PipelineStep,
  SnapshotEnvelope,
} from '@git-compass/core';
```

---

## Module Map

All exports are independently importable. Nothing is bundled together — import only what your application uses.

```
@git-compass/core
│
├── Parser (I/O)
│   ├── createGitParser         Create a git parser instance for a repo path
│   ├── getCommits              Fetch commits within a rolling window
│   ├── getBranches             Fetch branch metadata
│   ├── getCommitsSince         Fetch commits after a SHA or date
│   ├── isValidRepo             Check if a path is a valid git repo
│   ├── classifyCommit          Classify a single commit (pure)
│   ├── classifyFile            Classify a single file path (pure)
│   └── createFilterPipeline    Build a configurable noise-filter pipeline
│
├── Analyzers (Pure)
│   ├── analyzeHotspots         High-churn files with author diversity
│   ├── computeRiskScores       Weighted 0–100 risk score per file
│   ├── analyzeChurn            Lines added/removed, net churn over time
│   ├── analyzeContributors     Developer engagement and impact
│   ├── analyzeBurnout          After-hours and weekend intensity patterns
│   ├── analyzeCompass          File prioritization for onboarding
│   ├── analyzeTemporalCoupling Files that consistently change together
│   ├── detectKnowledgeSilos    Files owned by a single author
│   ├── computeBlastRadius      Average files affected per file change
│   ├── detectRot               Files untouched for 180+ days
│   ├── computeSignalIntegrity  Noise ratio and affected analyzer report
│   ├── deduplicateContributors Merge split identities, remove bots
│   ├── analyzeBranchLifecycles Branch status and merge timeline
│   ├── detectStaleBranches     Branches inactive beyond threshold
│   ├── computeMergeFrequency   Merge cadence and idle ratios
│   ├── scoreCommitMessage      Commit message quality score (0–100)
│   ├── detectAtomicity         God-commit and concern-boundary detection
│   ├── computeReviewSignals    Review coverage extraction from metadata
│   ├── analyzeCommitQuality    Composite commit quality report
│   ├── computeVelocityTrend    Rolling window output metrics
│   ├── detectVelocityAnomalies Z-score anomaly detection on velocity
│   ├── computeContributorVelocity Per-contributor velocity windows
│   ├── computeDeliveryConsistency CV-based team consistency rating
│   ├── analyzeVelocity         Full velocity report
│   ├── computeOwnershipTransitions Ownership period history per file
│   ├── detectOrphanedFiles     Files with inactive original owners
│   ├── computeOwnershipConcentration Gini-coefficient ownership spread
│   ├── analyzeOwnershipDrift   Full ownership drift report
│   ├── correlateChangeFrequency Jaccard co-change scoring with trends
│   ├── detectCouplingDrift     Coupling changes between two windows
│   ├── analyzeDependencyChurn  Full dependency churn report
│   ├── computeOnboardingScore  Composite onboarding readiness (0–100)
│   ├── generateLearningPath    Prioritised file list for new contributors
│   ├── analyzeOnboarding       Full onboarding report
│   ├── computeReviewCoverage   Review vs. direct push ratio
│   ├── computeReviewConcentration Reviewer bottleneck detection
│   ├── computeReviewHealthScore Composite review health (0–100)
│   └── analyzeReviewDebt       Full review debt report
│
├── AI Engine (Async, requires @anthropic-ai/sdk)
│   ├── generateInsightPack     Structured { critical, warnings, opportunities }
│   ├── generatePRContext       Per-PR risk brief from analyzer scores
│   ├── detectRegressions       Pure metric delta (no AI call)
│   ├── compareSnapshots        Snapshot delta with AI narrative
│   ├── createSummarizerWithTemplate Factory with baked-in template
│   ├── resolveTemplateInstructions Build template instruction string
│   ├── summarizeWithTemplate   Existing summarizer + template injection
│   ├── DEFAULT_TEMPLATE        technical / standard
│   ├── EXECUTIVE_TEMPLATE      executive / brief
│   └── ONBOARDING_TEMPLATE     onboarding / detailed
│
└── Infrastructure (Pure)
    ├── createIncrementalContext Merge new commits with a cached baseline
    ├── mergeBaselines          Combine two baselines into one
    ├── compose                 Async sequential pipeline builder
    ├── composeSync             Sync sequential pipeline builder
    ├── withErrorHandler        Wrap a pipeline with a fallback
    ├── serializeSnapshot       Checksum-signed JSON string
    ├── deserializeSnapshot     Restore and validate a snapshot
    ├── djb2Hash                Deterministic string hash
    └── isValidSnapshot         Non-throwing snapshot validation
```

---

## Environment Variables

No environment variables are required for the core analytics engine. If using the AI layer:

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Required for all /ai functions
```

---

## FAQ

**Does it work on monorepos?**
Yes. Point `createGitParser` at the monorepo root. Use `excludePatterns` to scope analysis to specific packages, or run multiple parser instances in parallel.

**Does it work on private repositories?**
Yes. `@git-compass/core` reads the local Git object store via `simple-git`. No remote API calls are made unless you use the AI engine.

**How is this different from `git-stats`, `cloc`, or `code-maat`?**
Those tools produce flat reports or CSV output. `@git-compass/core` produces structured TypeScript objects designed to be composed, extended, and fed directly to UI or AI layers without intermediate parsing.

**Can I use it without TypeScript?**
Yes. The package ships CommonJS and ESM builds. All functions work in plain JavaScript — you just won't get type inference.

**What's the performance like on large repos?**
Use incremental analysis (`getCommitsSince` + `createIncrementalContext`) for repos with 10k+ commits. The first full run is the expensive one — subsequent runs process only the delta.

**Does it support GitLab / Azure DevOps?**
`@git-compass/core` reads local git history — it's host-agnostic. Clone any repo locally and point the parser at it.

---

## Keywords

git analytics · git metrics · code quality · technical debt · hotspot detection · knowledge silo · bus factor · burnout detection · temporal coupling · blast radius · ownership drift · code churn · repository health · developer productivity · engineering intelligence · git history analysis · commit analysis · TypeScript · functional programming · AI analytics · onboarding · review debt · incremental git analysis

---

<div align="center">

Built with precision by the **Git Compass** team · [npm](https://www.npmjs.com/package/@git-compass/core) · [GitHub](https://github.com/humblef0ol/git-compass)

</div>