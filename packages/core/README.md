# @git-compass/core

The brain of the **Git Compass** project. This package provides the foundational Git parsing and analytical engine used by the Git Compass CLI, Web Dashboard, and VS Code Extension.

## Philosophy: Strictly Functional

`@git-compass/core` is built with a **strictly functional programming** approach.

- **No Classes**: Logic is organized into pure, stateless functions.
- **Immutability**: Data is transformed, never mutated.
- **Side Effects**: Isolated to the `parser` layer (Git I/O). The `analyzers` layer is composed of pure functions.

## Module Breakdown

### 1. Parsers (`/parser`)

The entry point for raw Git data.

- **GitParser**: Wraps `simple-git` into functional utilities (`createGitParser`, `getCommits`, `isValidRepo`).
- **DiffParser**: Processes raw Git diffs into structured file-change data.

### 2. Analyzers (`/analyzers`)

The core logical engine that transforms raw commits into insights.

- **Hotspots**: Detects high-churn files and author diversity.
- **Risk Scoring**: Calculates a weighted risk level (0-100) for files based on frequency, authors, and recency.
- **Churn**: Tracks lines added/removed and net churn over time.
- **Contributors**: Maps developer engagement, impact, and activity timelines.
- **Burnout**: Identifies high-intensity patterns (after-hours/weekends) per contributor.
- **Compass**: Provides file prioritization logic for onboarding.
- **Temporal Coupling**: Detects files that consistently change together (logical dependencies).
- **Knowledge Silos**: Identifies files owned by a single person (Bus Factor).
- **Blast Radius**: Measures average files affected when a specific file is changed.
- **Rot Detection**: Highlights abandoned code not touched in over 180 days.

### 3. AI Engine (`/ai`)

Functional wrappers for LLM-augmented analytics.

- **AISummarizer**: Generates plain-English repository health digests and handles natural language querying via the Anthropic SDK.

---

## Installation

```bash
pnpm add @git-compass/core
```

## Usage Example

```typescript
import { createGitParser, getCommits, analyzeHotspots, computeRiskScores } from "@git-compass/core";

// 1. Initialize parser
const git = createGitParser("./my-repo");

// 2. Fetch commits
const commits = await getCommits(git, { window: "30d" });

// 3. Analyze
const hotspots = analyzeHotspots(commits);
const risk = computeRiskScores(hotspots);

console.log(risk);
```

## Development

### Scripts

- `pnpm build`: Compiles TypeScript.
- `pnpm test`: Runs the Vitest suite.
- `pnpm type-check`: Validates type safety.

### Testing

Tests are located in `packages/core/__tests__`. We enforce 100% logic coverage for all analytical functions.

---

## License

MIT
