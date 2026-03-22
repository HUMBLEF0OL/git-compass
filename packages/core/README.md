# @git-compass/core

The analytical engine and "brain" of the **Git Compass** ecosystem. This package provides the foundational Git parsing and deep-analytics engine used by the Git Compass CLI, Web Dashboard, and VS Code Extension.

## Philosophy: Strictly Functional

- **Pure Functions**: All analytical logic (analyzers) consists of pure, stateless functions.
- **Immutability**: Data is transformed through pipelines, never mutated in place.
- **Isolated Side Effects**: All I/O (Git commands, file system access) is isolated within the `parser` and `utils` modules.

---

## Deep Dive: Analytics & Metrics Engine

The core of this package is its suite of analyzers. Each one transforms raw Git commit data into tactical insights.

### 1. Risk Scoring (`risk.ts`)

Calculates a weighted technical debt indicator (0–100) for every file in the repository.

- **Formula**: `(Freq * 0.3) + (Impact * 0.3) + (Authors * 0.2) + (Recency * 0.2)`
- **Factors**:
  - **Change Frequency**: How often the file is modified relative to the most active file.
  - **Impact (Churn Volume)**: The total number of insertions and deletions.
  - **Unique Authors**: Developer diversity; higher diversity on complex files increases coordination risk.
  - **Recency**: Weighted towards files changed in the last 30 days.
- **Levels**: `low` (<40), `medium` (40-60), `high` (60-80), `critical` (>80).

### 2. Hotspots (`hotspot.ts`)

Identifies the "complex" parts of your system by cross-referencing change frequency with author diversity. High-frequency files with many authors are prime candidates for refactoring.

### 3. Temporal Coupling (`coupling.ts`)

Detects logical dependencies between files that aren't necessarily linked in code but consistently change together in the same commits.

- **Metric**: **Jaccard Index** (`shared_commits / (commits_A + commits_B - shared_commits)`).
- **Threshold**: Returns pairs with a coupling score > 0.3 and at least 2 shared commits.

### 4. Knowledge Silos (`knowledge.ts`)

Measures the "Bus Factor" at a file level. It identifies files where a single contributor owns a disproportionate amount of the history.

- **Threshold**: Flags files where one author has >70% of all commits (min. 5 commits total).
- **Risk**: `high` (>=90%), `medium` (>=80%), `low` (>=70%).

### 5. Blast Radius (`impact.ts`)

Calculates the average number of files affected when a specific file is changed. High blast radius files are "brittle" and can cause cascading regressions.

- **Metric**: `total_files_changed_alongside / total_commits_for_file`.

### 6. Contributor Burnout (`burnout.ts`)

Heuristic-based detection of potential developer fatigue based on commit patterns.

- **After-Hours**: Commits between 22:00 and 06:00.
- **Weekends**: Saturday and Sunday activity.
- **Risk**: High risk flagged if >40% of an author's activity occurs during these windows.

### 7. Repository Health (`health.ts`)

A holistic 0–100 score across five dimensions:

- **Stability**: Inverse of churn intensity (churn per commit).
- **Velocity**: Commit frequency over the analysis window.
- **Simplicity**: Proxy via average files changed per commit (lower is better).
- **Coverage**: Heuristic based on the ratio of test/spec files to core files.
- **Decoupling**: Evaluates the prevalence of strong temporal couplings.

---

## Module Structure

### `/parser`

The entry point for raw Git data. Wraps `simple-git` into functional utilities.

- `createGitParser(repoPath)`: Initializes the Git context.
- `getCommits(parser, options)`: Fetches and parses commit history into a structured format.

### `/analyzers`

The logic layer. Contains all the metrics described in the Deep Dive section.

### `/ai`

LLM-augmented analytics using the user selected SDK.

- **AISummarizer**: Generates a natural-language executive summary of the repository's health, hotspots, and risks.

---

## Installation & Usage

```bash
pnpm add @git-compass/core
```

### Basic Example

```typescript
import { createGitParser, getCommits, analyzeHotspots, computeRiskScores } from "@git-compass/core";

const git = createGitParser("./path-to-repo");
const commits = await getCommits(git, { window: "30d" });

const hotspots = analyzeHotspots(commits);
const risk = computeRiskScores(hotspots);

console.log(risk[0].level); // "critical"
```

## 🧪 Development

### Scripts

- `pnpm build`: Compiles TypeScript to ESM.
- `pnpm test`: Runs the Vitest suite.
- `pnpm type-check`: Performs static type analysis.

### Testing Policy

We enforce a strict testing policy for the `analyzers` layer. Since these are pure functions, we maintain 100% logic coverage to ensure the accuracy of the mathematical models.

---
